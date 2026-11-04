import { Platform } from 'react-native';
import { Pedometer, Accelerometer } from 'expo-sensors';
import { expoSecureStoreAdapter } from './auth/secureStorageAdapter';

export interface PedometerState {
  isAvailable: boolean;
  hasPermission: boolean;
  isTracking: boolean;
  trackingEngine: 'hardware' | 'motion' | 'idle';
  steps: number;
  calories: number;
  distanceMeters: number;
  activeMinutes: number;
  lastUpdated: string;
}

export type PedometerListener = (state: PedometerState) => void;

const STORAGE_KEY = 'HEALTHFREAK_PEDOMETER_TODAY_V1';
const HISTORY_KEY = 'HEALTHFREAK_WEEKLY_STEPS_HISTORY_V1';

export function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class PedometerService {
  private static instance: PedometerService;

  private state: PedometerState = {
    isAvailable: true,
    hasPermission: true,
    isTracking: false,
    trackingEngine: 'idle',
    steps: 0,
    calories: 0,
    distanceMeters: 0,
    activeMinutes: 0,
    lastUpdated: new Date().toISOString(),
  };

  private listeners: Set<PedometerListener> = new Set();
  private hardwareSubscription: { remove: () => void } | null = null;
  private accelSubscription: { remove: () => void } | null = null;

  private baselineStoredSteps: number = 0;
  private sessionDeltaSteps: number = 0;
  private isInitialized: boolean = false;
  private currentDateKey: string = getTodayKey();
  private midnightCheckInterval: any = null;

  // Accelerometer step detector state
  private lastStepTimestamp: number = 0;
  private inValley: boolean = true;
  private lastHardwareTimestamp: number = 0;
  private persistTimer: any = null;

  private constructor() {}

  public static getInstance(): PedometerService {
    if (!PedometerService.instance) {
      PedometerService.instance = new PedometerService();
    }
    return PedometerService.instance;
  }

  public getState(): PedometerState {
    return { ...this.state };
  }

  public subscribe(listener: PedometerListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const currentState = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch (err) {
        console.warn('[PedometerService] Listener notification error:', err);
      }
    });
  }

  private calculateMetrics(totalSteps: number): void {
    const safeSteps = Math.max(0, totalSteps);
    // 1 step is ~0.04 kcal burned
    const calories = Math.round(safeSteps * 0.04);
    // 1 step is ~0.762 meters (average human stride)
    const distanceMeters = Math.round(safeSteps * 0.762);
    // ~100 steps per active minute of walking
    const activeMinutes = Math.round(safeSteps / 100);

    this.state = {
      ...this.state,
      steps: safeSteps,
      calories,
      distanceMeters,
      activeMinutes,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Archives previous day steps into weekly history.
   */
  private async archiveDaySteps(dateKey: string, steps: number): Promise<void> {
    try {
      const raw = await expoSecureStoreAdapter.getItem(HISTORY_KEY);
      const history = raw ? JSON.parse(raw) : {};
      history[dateKey] = steps;
      await expoSecureStoreAdapter.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('[PedometerService] Error archiving day steps:', e);
    }
  }

  /**
   * Midnight auto-reset: Checks if date changed (e.g. 12:00 AM passed).
   * Archives yesterday's final steps and starts fresh from 0.
   */
  private async checkMidnightRollover(): Promise<boolean> {
    const today = getTodayKey();
    if (today !== this.currentDateKey) {
      const prevSteps = this.baselineStoredSteps + this.sessionDeltaSteps;
      await this.archiveDaySteps(this.currentDateKey, prevSteps);

      this.currentDateKey = today;
      this.baselineStoredSteps = 0;
      this.sessionDeltaSteps = 0;
      this.calculateMetrics(0);
      await this.persistSteps(0);
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Load today's persisted steps from SecureStore.
   * Auto-resets to 0 if the date changed (past midnight).
   */
  private async loadPersistedSteps(): Promise<number> {
    try {
      const raw = await expoSecureStoreAdapter.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const today = getTodayKey();
        if (parsed && typeof parsed.steps === 'number') {
          if (parsed.date === today) {
            return parsed.steps;
          } else {
            // New day detected on launch: archive previous steps
            await this.archiveDaySteps(parsed.date, parsed.steps);
          }
        }
      }
    } catch (err) {
      console.warn('[PedometerService] Error reading stored steps:', err);
    }
    return 0;
  }

  private async persistSteps(steps: number): Promise<void> {
    try {
      const payload = {
        date: getTodayKey(),
        steps,
        timestamp: new Date().toISOString(),
      };
      await expoSecureStoreAdapter.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('[PedometerService] Error saving steps:', err);
    }
  }

  private persistStepsDebounced(steps: number): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => {
      this.persistSteps(steps);
    }, 1500);
  }

  public async initialize(): Promise<PedometerState> {
    if (this.isInitialized) {
      return this.getState();
    }
    this.isInitialized = true;
    this.currentDateKey = getTodayKey();

    // Load persisted steps for today
    this.baselineStoredSteps = await this.loadPersistedSteps();
    this.sessionDeltaSteps = 0;
    this.calculateMetrics(this.baselineStoredSteps);

    // Periodic check every 30 seconds for midnight date change
    if (!this.midnightCheckInterval) {
      this.midnightCheckInterval = setInterval(() => {
        this.checkMidnightRollover().catch(() => {});
      }, 30000);
    }

    if (Platform.OS === 'web') {
      this.state.isAvailable = false;
      this.state.trackingEngine = 'idle';
      this.notifyListeners();
      return this.getState();
    }

    // Initialize tracking engines
    await this.startTrackingEngines();

    this.notifyListeners();
    return this.getState();
  }

  public async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    try {
      const result = await Pedometer.requestPermissionsAsync().catch(() => null);
      const granted = result?.granted ?? false;
      this.state.hasPermission = granted;

      if (granted) {
        this.startHardwareTracking();
      }
      this.startAccelerometerTracking();
      this.notifyListeners();
      return granted;
    } catch (err) {
      console.warn('[PedometerService] Permission request failed:', err);
      return false;
    }
  }

  private async startTrackingEngines(): Promise<void> {
    try {
      const isAvailable = await Pedometer.isAvailableAsync().catch(() => false);

      if (isAvailable) {
        const permission = await Pedometer.getPermissionsAsync().catch(() => null);
        let granted = permission?.granted ?? false;

        if (!granted && permission?.canAskAgain) {
          const req = await Pedometer.requestPermissionsAsync().catch(() => null);
          granted = req?.granted ?? false;
        }

        this.state.hasPermission = granted;

        if (granted) {
          this.startHardwareTracking();
        }
      }
    } catch (err) {
      console.warn('[PedometerService] Hardware pedometer check error:', err);
    }

    // Always start real-time Accelerometer Step Detector
    this.startAccelerometerTracking();
  }

  private startHardwareTracking(): void {
    if (this.hardwareSubscription) {
      this.hardwareSubscription.remove();
      this.hardwareSubscription = null;
    }

    try {
      this.hardwareSubscription = Pedometer.watchStepCount((result) => {
        this.checkMidnightRollover().catch(() => {});
        this.lastHardwareTimestamp = Date.now();
        this.state.trackingEngine = 'hardware';
        this.state.isTracking = true;

        this.sessionDeltaSteps = result.steps;
        const totalSteps = this.baselineStoredSteps + this.sessionDeltaSteps;
        this.calculateMetrics(totalSteps);
        this.persistStepsDebounced(totalSteps);
        this.notifyListeners();
      });

      this.state.isTracking = true;
      this.state.trackingEngine = 'hardware';
    } catch (err) {
      console.warn('[PedometerService] Failed to start watchStepCount:', err);
    }
  }

  private startAccelerometerTracking(): void {
    if (this.accelSubscription) {
      this.accelSubscription.remove();
      this.accelSubscription = null;
    }

    try {
      Accelerometer.setUpdateInterval(50);

      this.accelSubscription = Accelerometer.addListener(({ x, y, z }) => {
        this.checkMidnightRollover().catch(() => {});

        // Prioritize hardware sensor if active within 4s
        if (Date.now() - this.lastHardwareTimestamp < 4000) {
          return;
        }

        const magnitude = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();

        // Walking Step Algorithm
        if (magnitude > 1.16 && this.inValley && (now - this.lastStepTimestamp > 260)) {
          this.lastStepTimestamp = now;
          this.inValley = false;
          this.sessionDeltaSteps += 1;

          const totalSteps = this.baselineStoredSteps + this.sessionDeltaSteps;
          this.calculateMetrics(totalSteps);
          this.persistStepsDebounced(totalSteps);

          this.state.isTracking = true;
          this.state.trackingEngine = 'motion';
          this.notifyListeners();
        } else if (magnitude < 0.96) {
          this.inValley = true;
        }
      });

      this.state.isTracking = true;
      if (this.state.trackingEngine === 'idle') {
        this.state.trackingEngine = 'motion';
      }
    } catch (err) {
      console.warn('[PedometerService] Failed to start Accelerometer listener:', err);
    }
  }

  /**
   * Returns steps array for current week [Mon, Tue, Wed, Thu, Fri, Sat, Sun].
   * Unwalked / past unrecorded days return 0.
   */
  public async getWeeklyStepsData(): Promise<number[]> {
    const now = new Date();
    const currentDayIdx = (now.getDay() + 6) % 7; // Mon = 0, Sun = 6
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDayIdx);

    let history: Record<string, number> = {};
    try {
      const raw = await expoSecureStoreAdapter.getItem(HISTORY_KEY);
      if (raw) history = JSON.parse(raw);
    } catch {}

    const todayKey = getTodayKey();
    const weeklyData: number[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      const dateKey = `${yr}-${mo}-${da}`;

      if (dateKey === todayKey) {
        weeklyData.push(this.state.steps);
      } else if (history[dateKey] !== undefined) {
        weeklyData.push(history[dateKey]);
      } else {
        weeklyData.push(0);
      }
    }

    return weeklyData;
  }

  public stopTracking(): void {
    if (this.hardwareSubscription) {
      this.hardwareSubscription.remove();
      this.hardwareSubscription = null;
    }
    if (this.accelSubscription) {
      this.accelSubscription.remove();
      this.accelSubscription = null;
    }
    if (this.midnightCheckInterval) {
      clearInterval(this.midnightCheckInterval);
      this.midnightCheckInterval = null;
    }
    this.baselineStoredSteps += this.sessionDeltaSteps;
    this.sessionDeltaSteps = 0;
    this.state.isTracking = false;
    this.state.trackingEngine = 'idle';
    this.notifyListeners();
  }

  /**
   * Adds steps manually or via simulation.
   */
  public async addSimulatedSteps(count: number): Promise<PedometerState> {
    this.baselineStoredSteps = Math.max(0, this.baselineStoredSteps + count);
    const totalSteps = this.baselineStoredSteps + this.sessionDeltaSteps;
    this.calculateMetrics(totalSteps);
    await this.persistSteps(totalSteps);
    this.notifyListeners();
    return this.getState();
  }

  /**
   * Resets today's steps to zero.
   */
  public async resetTodaySteps(): Promise<PedometerState> {
    this.baselineStoredSteps = 0;
    this.sessionDeltaSteps = 0;
    this.calculateMetrics(0);
    await this.persistSteps(0);
    this.notifyListeners();
    return this.getState();
  }
}

export const pedometerService = PedometerService.getInstance();
