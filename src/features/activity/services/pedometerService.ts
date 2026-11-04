import { Platform, AppState, AppStateStatus } from 'react-native';
import { Pedometer } from 'expo-sensors';
import {
  PedometerPermissionState,
  StepSummary,
  PedometerTrackingSession,
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

export type StepUpdateListener = (summary: StepSummary) => void;

export class PedometerService {
  private static instance: PedometerService;
  private isAvailable: boolean | null = null;
  private permissionState: PedometerPermissionState = 'unknown';
  private subscription: { remove: () => void } | null = null;
  private listeners: Set<StepUpdateListener> = new Set();
  private currentSession: PedometerTrackingSession | null = null;
  private isTrackingActive: boolean = false;
  private appStateSubscription: { remove: () => void } | null = null;

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
   * Starts tracking steps. Reconnects hardware listener and loads persistent state.
   */
  public async startTracking(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    const perm = await this.getPermissionStatus();
    if (perm !== 'granted') {
      const requested = await this.requestPermissions();
      if (requested !== 'granted') {
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
    if (this.subscription) {
      try {
        this.subscription.remove();
      } catch {}
      this.subscription = null;
    }

    await this.persistCurrentState();
  }

  /**
   * Returns current day's active step summary.
   */
  public async getCurrentTodaySummary(): Promise<StepSummary> {
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
      stepGoal: goal,
      distanceMeters: distance,
      caloriesBurned: calories,
      activeMinutes: activeMins,
      source: 'device',
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Subscribes to live step updates. Returns an unsubscribe function.
   */
  public subscribe(listener: StepUpdateListener): () => void {
    this.listeners.add(listener);
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
          await StepPersistenceService.saveCurrentSession(this.currentSession);
          await StepPersistenceService.saveDailySummary(summary);
        }
      });
    } catch (err) {
      console.warn('[PedometerService] Failed to register watchStepCount:', err);
    }
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

  private notifyListeners(summary: StepSummary): void {
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
