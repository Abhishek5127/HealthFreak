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

function getTodayKey(): string {
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
   * Load today's persisted steps from SecureStore.
   * Auto-resets to 0 if the date changed (e.g. past midnight).
   */
  private async loadPersistedSteps(): Promise<number> {
    try {
      const raw = await expoSecureStoreAdapter.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const today = getTodayKey();
        if (parsed && parsed.date === today && typeof parsed.steps === 'number') {
          return parsed.steps;
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

    // Load persisted steps for today
    this.baselineStoredSteps = await this.loadPersistedSteps();
    this.sessionDeltaSteps = 0;
    this.calculateMetrics(this.baselineStoredSteps);

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
    // This provides zero-latency step counts even if hardware pedometer is batching,
    // delayed, or unavailable on the specific Android device.
    this.startAccelerometerTracking();
  }

  private startHardwareTracking(): void {
    if (this.hardwareSubscription) {
      this.hardwareSubscription.remove();
      this.hardwareSubscription = null;
    }

    try {
      this.hardwareSubscription = Pedometer.watchStepCount((result) => {
        this.lastHardwareTimestamp = Date.now();
        this.state.trackingEngine = 'hardware';
        this.state.isTracking = true;

        // On hardware updates, align session delta
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
      // 50ms interval = 20Hz sampling rate (optimal for walking cadence without battery drain)
      Accelerometer.setUpdateInterval(50);

      this.accelSubscription = Accelerometer.addListener(({ x, y, z }) => {
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

  public stopTracking(): void {
    if (this.hardwareSubscription) {
      this.hardwareSubscription.remove();
      this.hardwareSubscription = null;
    }
    if (this.accelSubscription) {
      this.accelSubscription.remove();
      this.accelSubscription = null;
    }
    this.baselineStoredSteps += this.sessionDeltaSteps;
    this.sessionDeltaSteps = 0;
    this.state.isTracking = false;
    this.state.trackingEngine = 'idle';
    this.notifyListeners();
  }

  /**
   * Adds steps manually or via simulation.
   * Crucial for emulators, treadmill testing, or manual testing.
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
