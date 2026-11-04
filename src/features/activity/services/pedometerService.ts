import { Platform, AppState, AppStateStatus } from 'react-native';
import { Pedometer, Accelerometer } from 'expo-sensors';
import {
  PedometerPermissionState,
  StepSummary,
  PedometerTrackingSession,
  PedometerState,
} from '../types/pedometer.types';
import { StepPersistenceService } from './stepPersistenceService';
import {
  getLocalDateString,
  getStartOfDay,
  getEndOfDay,
} from '../utils/stepDateUtils';
import {
  calculateDistanceMeters,
  calculateActiveCalories,
  calculateActiveMinutes,
} from '../utils/activityCalculations';

export type StepUpdateListener = (summary: PedometerState) => void;
export type PedometerListener = StepUpdateListener;
export type { PedometerState } from '../types/pedometer.types';

export class PedometerService {
  private static instance: PedometerService;
  private isAvailable: boolean | null = null;
  private permissionState: PedometerPermissionState = 'unknown';
  private subscription: { remove: () => void } | null = null;
  private accelSubscription: { remove: () => void } | null = null;
  private listeners: Set<StepUpdateListener> = new Set();
  private currentSession: PedometerTrackingSession | null = null;
  private isTrackingActive: boolean = false;
  private trackingEngine: 'hardware' | 'motion' | 'idle' = 'idle';
  private appStateSubscription: { remove: () => void } | null = null;

  // Accelerometer step detector state
  private lastStepTimestamp: number = 0;
  private inValley: boolean = true;
  private lastHardwareTimestamp: number = 0;
  private persistTimer: any = null;
  private isInitialized: boolean = false;

  private userHeightCm: number = 170;
  private userWeightKg: number = 70;
  private userSex: string = 'other';

  private constructor() {
    this.setupAppStateListener();
  }

  public static getInstance(): PedometerService {
    if (!PedometerService.instance) {
      PedometerService.instance = new PedometerService();
    }
    return PedometerService.instance;
  }

  /**
   * Initializes the pedometer service, loads today's session, and begins tracking.
   */
  public async initialize(): Promise<PedometerState> {
    if (this.isInitialized) {
      return this.getState();
    }
    this.isInitialized = true;
    this.currentSession = await StepPersistenceService.getOrCreateTodaySession();

    if (Platform.OS === 'web') {
      this.isAvailable = false;
      this.trackingEngine = 'idle';
      this.notifyListeners(await this.getCurrentTodaySummary());
      return this.getState();
    }

    await this.startTracking();
    return this.getState();
  }

  /**
   * Returns current synchronous snapshot of PedometerState.
   */
  public getState(): PedometerState {
    const totalSteps = this.currentSession
      ? (this.currentSession.accumulatedSteps || 0) + (this.currentSession.sessionSteps || 0)
      : 0;
    const distance = calculateDistanceMeters(totalSteps, this.userHeightCm, this.userSex);
    const calories = calculateActiveCalories(totalSteps, this.userWeightKg) || 0;
    const activeMins = calculateActiveMinutes(totalSteps);

    return {
      todaySteps: totalSteps,
      steps: totalSteps,
      stepGoal: 8000,
      distanceMeters: distance,
      caloriesBurned: calories,
      calories: calories,
      activeMinutes: activeMins,
      permissionStatus: this.permissionState,
      hasPermission: this.permissionState === 'granted',
      isAvailable: this.isAvailable ?? (Platform.OS !== 'web'),
      isTracking: this.isTrackingActive,
      trackingEngine: this.trackingEngine,
      history: [],
      lastSyncedAt: null,
      lastUpdated: new Date().toISOString(),
      date: getLocalDateString(),
      source: 'device',
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Configures user biometrics for accurate distance and calorie estimates.
   */
  public setUserBiometrics(heightCm?: number, weightKg?: number, sex?: string): void {
    if (heightCm && heightCm > 50) this.userHeightCm = heightCm;
    if (weightKg && weightKg > 20) this.userWeightKg = weightKg;
    if (sex) this.userSex = sex;
  }

  /**
   * Checks whether hardware pedometer motion sensing is supported on this device.
   */
  public async checkAvailability(): Promise<boolean> {
    if (Platform.OS === 'web') {
      this.isAvailable = false;
      this.permissionState = 'unavailable';
      return false;
    }

    try {
      const available = await Pedometer.isAvailableAsync();
      this.isAvailable = available;
      if (!available) {
        this.permissionState = 'unavailable';
      }
      return available;
    } catch (err) {
      console.warn('[PedometerService] Availability check failed:', err);
      this.isAvailable = false;
      this.permissionState = 'unavailable';
      return false;
    }
  }

  /**
   * Checks current permission status without prompting the user.
   */
  public async getPermissionStatus(): Promise<PedometerPermissionState> {
    if (Platform.OS === 'web') {
      this.permissionState = 'unavailable';
      return 'unavailable';
    }

    try {
      const isAvail = await this.checkAvailability();
      if (!isAvail) {
        this.permissionState = 'unavailable';
        return 'unavailable';
      }

      const response = await Pedometer.getPermissionsAsync();
      this.permissionState = this.mapPermissionStatus(response.status);
      return this.permissionState;
    } catch (err) {
      console.warn('[PedometerService] Permission status check failed:', err);
      return 'unknown';
    }
  }

  /**
   * Prompts the user for Activity Recognition (Android) or Motion (iOS) permission.
   */
  public async requestPermissions(): Promise<PedometerPermissionState> {
    if (Platform.OS === 'web') {
      this.permissionState = 'unavailable';
      return 'unavailable';
    }

    try {
      const response = await Pedometer.requestPermissionsAsync();
      this.permissionState = this.mapPermissionStatus(response.status);
      return this.permissionState;
    } catch (err) {
      console.warn('[PedometerService] Request permission failed:', err);
      this.permissionState = 'denied';
      return 'denied';
    }
  }

  /**
   * Boolean wrapper for permission requests.
   */
  public async requestPermission(): Promise<boolean> {
    const res = await this.requestPermissions();
    return res === 'granted';
  }

  /**
   * Starts tracking steps. Reconnects hardware listener, accelerometer fallback, and loads persistent state.
   */
  public async startTracking(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    const perm = await this.getPermissionStatus();
    if (perm !== 'granted') {
      const requested = await this.requestPermissions();
      if (requested !== 'granted') {
        // Even without hardware pedometer permission, attempt accelerometer tracking if available
        this.startAccelerometerTracking();
        return false;
      }
    }

    this.currentSession = await StepPersistenceService.getOrCreateTodaySession();
    this.isTrackingActive = true;

    // iOS: Query authoritative hardware steps since start of today
    if (Platform.OS === 'ios') {
      await this.syncIosStepsToday();
    }

    // Register active real-time step counter listener
    this.registerHardwareListener();

    // Register real-time accelerometer step detector as zero-latency fallback
    this.startAccelerometerTracking();

    // Broadcast current state to all subscribers
    const currentSummary = await this.getCurrentTodaySummary();
    this.notifyListeners(currentSummary);

    return true;
  }

  /**
   * Stops tracking steps and commits accumulated steps to disk.
   */
  public async stopTracking(): Promise<void> {
    this.isTrackingActive = false;
    this.trackingEngine = 'idle';

    if (this.subscription) {
      try {
        this.subscription.remove();
      } catch {}
      this.subscription = null;
    }

    if (this.accelSubscription) {
      try {
        this.accelSubscription.remove();
      } catch {}
      this.accelSubscription = null;
    }

    await this.persistCurrentState();
  }

  /**
   * Returns current day's active step summary with unified fields.
   */
  public async getCurrentTodaySummary(): Promise<PedometerState> {
    const today = getLocalDateString();
    if (!this.currentSession || this.currentSession.date !== today) {
      this.currentSession = await StepPersistenceService.getOrCreateTodaySession();
    }

    const totalSteps =
      (this.currentSession.accumulatedSteps || 0) + (this.currentSession.sessionSteps || 0);
    const goal = await StepPersistenceService.getStepGoal();

    const distance = calculateDistanceMeters(totalSteps, this.userHeightCm, this.userSex);
    const calories = calculateActiveCalories(totalSteps, this.userWeightKg) || 0;
    const activeMins = calculateActiveMinutes(totalSteps);

    return {
      date: today,
      steps: totalSteps,
      todaySteps: totalSteps,
      stepGoal: goal,
      distanceMeters: distance,
      caloriesBurned: calories,
      calories: calories,
      activeMinutes: activeMins,
      source: 'device',
      isTracking: this.isTrackingActive,
      trackingEngine: this.trackingEngine,
      hasPermission: this.permissionState === 'granted',
      permissionStatus: this.permissionState,
      isAvailable: this.isAvailable ?? (Platform.OS !== 'web'),
      history: [],
      lastSyncedAt: null,
      updatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Subscribes to live step updates. Returns an unsubscribe function.
   */
  public subscribe(listener: StepUpdateListener): () => void {
    this.listeners.add(listener);
    // Send immediate initial state
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Queries historical step count for past dates.
   * On iOS, queries Core Motion CMPedometer directly for past 7 days.
   * On Android, reads persisted local history records.
   */
  public async getHistory(daysCount: number = 7): Promise<StepSummary[]> {
    if (Platform.OS === 'ios') {
      return await this.fetchIosHistoricalSteps(daysCount);
    }
    return await StepPersistenceService.getRecentHistory(daysCount);
  }

  /**
   * Adds simulated steps for manual testing, emulator testing, or quick verification.
   */
  public async addSimulatedSteps(count: number): Promise<PedometerState> {
    const today = getLocalDateString();
    if (!this.currentSession || this.currentSession.date !== today) {
      this.currentSession = await StepPersistenceService.getOrCreateTodaySession();
    }
    this.currentSession.accumulatedSteps = Math.max(
      0,
      (this.currentSession.accumulatedSteps || 0) + count
    );
    this.currentSession.lastUpdated = new Date().toISOString();
    await StepPersistenceService.saveCurrentSession(this.currentSession);

    const summary = await this.getCurrentTodaySummary();
    await StepPersistenceService.saveDailySummary(summary);
    this.notifyListeners(summary);
    return this.getState();
  }

  /**
   * Resets today's steps to zero.
   */
  public async resetTodaySteps(): Promise<PedometerState> {
    const today = getLocalDateString();
    if (!this.currentSession || this.currentSession.date !== today) {
      this.currentSession = await StepPersistenceService.getOrCreateTodaySession();
    }
    this.currentSession.accumulatedSteps = 0;
    this.currentSession.sessionSteps = 0;
    this.currentSession.lastUpdated = new Date().toISOString();
    await StepPersistenceService.saveCurrentSession(this.currentSession);

    const summary = await this.getCurrentTodaySummary();
    await StepPersistenceService.saveDailySummary(summary);
    this.notifyListeners(summary);
    return this.getState();
  }

  // ================= PRIVATE ENGINE METHODS =================

  private mapPermissionStatus(status: string): PedometerPermissionState {
    switch (status) {
      case 'granted':
        return 'granted';
      case 'denied':
        return 'denied';
      case 'restricted':
        return 'restricted';
      default:
        return 'unknown';
    }
  }

  private registerHardwareListener(): void {
    if (this.subscription) {
      try {
        this.subscription.remove();
      } catch {}
      this.subscription = null;
    }

    try {
      this.subscription = Pedometer.watchStepCount(async (result) => {
        if (!this.isTrackingActive) return;

        this.lastHardwareTimestamp = Date.now();
        this.trackingEngine = 'hardware';

        // Check for midnight rollover
        const today = getLocalDateString();
        if (this.currentSession && this.currentSession.date !== today) {
          await this.handleMidnightRollover();
        }

        if (this.currentSession) {
          // result.steps is the step count delta since listener registered
          this.currentSession.sessionSteps = Math.max(0, Math.round(result.steps));
          this.currentSession.lastUpdated = new Date().toISOString();

          // Broadcast live update
          const summary = await this.getCurrentTodaySummary();
          this.notifyListeners(summary);

          // Debounced / periodic persistence
          this.persistDebounced(this.currentSession, summary);
        }
      });
    } catch (err) {
      console.warn('[PedometerService] Failed to register watchStepCount:', err);
    }
  }

  private startAccelerometerTracking(): void {
    if (this.accelSubscription) {
      try {
        this.accelSubscription.remove();
      } catch {}
      this.accelSubscription = null;
    }

    try {
      // 50ms interval = 20Hz sampling rate (optimal for walking cadence without battery drain)
      Accelerometer.setUpdateInterval(50);

      this.accelSubscription = Accelerometer.addListener(async ({ x, y, z }) => {
        if (!this.isTrackingActive) return;

        // If hardware sensor fired within the last 4 seconds, prioritize hardware to prevent double-counting
        if (Date.now() - this.lastHardwareTimestamp < 4000) {
          return;
        }

        // Calculate 3D acceleration magnitude (earth gravity is ~1.0g at rest)
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();

        // Walking Step Algorithm:
        // A human walking step produces an acceleration peak (>1.16g) followed by a valley (<0.96g).
        // Max human cadence is ~3.5 steps/sec (refractory window >= 260ms).
        if (magnitude > 1.16 && this.inValley && (now - this.lastStepTimestamp > 260)) {
          this.lastStepTimestamp = now;
          this.inValley = false;
          this.trackingEngine = 'motion';

          if (this.currentSession) {
            this.currentSession.sessionSteps = (this.currentSession.sessionSteps || 0) + 1;
            this.currentSession.lastUpdated = new Date().toISOString();

            const summary = await this.getCurrentTodaySummary();
            this.notifyListeners(summary);

            this.persistDebounced(this.currentSession, summary);
          }
        } else if (magnitude < 0.96) {
          this.inValley = true;
        }
      });
    } catch (err) {
      console.warn('[PedometerService] Failed to start Accelerometer listener:', err);
    }
  }

  private persistDebounced(session: PedometerTrackingSession, summary: StepSummary): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(async () => {
      await StepPersistenceService.saveCurrentSession(session);
      await StepPersistenceService.saveDailySummary(summary);
    }, 1500);
  }

  /**
   * iOS CMPedometer query for today's authoritative steps.
   */
  private async syncIosStepsToday(): Promise<void> {
    try {
      const startOfDay = getStartOfDay(new Date());
      const now = new Date();
      const result = await Pedometer.getStepCountAsync(startOfDay, now);
      if (result && typeof result.steps === 'number') {
        const goal = await StepPersistenceService.getStepGoal();
        const summary: StepSummary = {
          date: getLocalDateString(),
          steps: result.steps,
          stepGoal: goal,
          distanceMeters: calculateDistanceMeters(result.steps, this.userHeightCm, this.userSex),
          caloriesBurned: calculateActiveCalories(result.steps, this.userWeightKg) || 0,
          activeMinutes: calculateActiveMinutes(result.steps),
          source: 'device',
          updatedAt: new Date().toISOString(),
        };

        if (this.currentSession) {
          this.currentSession.accumulatedSteps = result.steps;
          this.currentSession.sessionSteps = 0;
          await StepPersistenceService.saveCurrentSession(this.currentSession);
        }
        await StepPersistenceService.saveDailySummary(summary);
      }
    } catch (err) {
      console.warn('[PedometerService] iOS getStepCountAsync error:', err);
    }
  }

  /**
   * iOS CMPedometer query for the last 7 calendar days.
   */
  private async fetchIosHistoricalSteps(daysCount: number): Promise<StepSummary[]> {
    const history: StepSummary[] = [];
    const goal = await StepPersistenceService.getStepGoal();
    const today = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const dayDate = new Date(today);
      dayDate.setDate(today.getDate() - i);
      const dateStr = getLocalDateString(dayDate);

      // Today is handled by current live session
      if (i === 0) {
        const todaySummary = await this.getCurrentTodaySummary();
        history.push(todaySummary);
        continue;
      }

      // Past days: query CMPedometer
      try {
        const start = getStartOfDay(dayDate);
        const end = getEndOfDay(dayDate);
        const res = await Pedometer.getStepCountAsync(start, end);
        const steps = res && typeof res.steps === 'number' ? res.steps : 0;
        const summary: StepSummary = {
          date: dateStr,
          steps,
          stepGoal: goal,
          distanceMeters: calculateDistanceMeters(steps, this.userHeightCm, this.userSex),
          caloriesBurned: calculateActiveCalories(steps, this.userWeightKg) || 0,
          activeMinutes: calculateActiveMinutes(steps),
          source: 'device',
          updatedAt: new Date().toISOString(),
        };
        await StepPersistenceService.saveDailySummary(summary);
        history.push(summary);
      } catch {
        // Fallback to local stored history if Core Motion query fails
        const stored = await StepPersistenceService.getDailySummary(dateStr);
        if (stored) {
          history.push(stored);
        } else {
          history.push({
            date: dateStr,
            steps: 0,
            stepGoal: goal,
            distanceMeters: 0,
            caloriesBurned: 0,
            activeMinutes: 0,
            source: 'device',
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }

    return history;
  }

  private async handleMidnightRollover(): Promise<void> {
    await this.persistCurrentState();
    this.currentSession = await StepPersistenceService.getOrCreateTodaySession();
    // Restart hardware listener to clear delta offsets cleanly
    this.registerHardwareListener();
  }

  private async persistCurrentState(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.accumulatedSteps =
        (this.currentSession.accumulatedSteps || 0) + (this.currentSession.sessionSteps || 0);
      this.currentSession.sessionSteps = 0;
      await StepPersistenceService.saveCurrentSession(this.currentSession);

      const summary = await this.getCurrentTodaySummary();
      await StepPersistenceService.saveDailySummary(summary);
    }
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      async (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active' && this.isTrackingActive) {
          // App came back to foreground: check date and sync steps
          const today = getLocalDateString();
          if (this.currentSession && this.currentSession.date !== today) {
            await this.handleMidnightRollover();
          } else if (Platform.OS === 'ios') {
            await this.syncIosStepsToday();
          }
          const summary = await this.getCurrentTodaySummary();
          this.notifyListeners(summary);
        } else if (nextAppState === 'background' || nextAppState === 'inactive') {
          // App backgrounded: commit accumulated session steps
          await this.persistCurrentState();
        }
      }
    );
  }

  private notifyListeners(summary: PedometerState): void {
    this.listeners.forEach((listener) => {
      try {
        listener(summary);
      } catch (err) {
        console.error('[PedometerService] Error in listener callback:', err);
      }
    });
  }
}

export const pedometerService = PedometerService.getInstance();
