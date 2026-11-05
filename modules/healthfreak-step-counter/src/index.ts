import { EventEmitter, EventSubscription } from 'expo-modules-core';
import { requireNativeModule } from 'expo';
import { Platform } from 'react-native';

interface NativeStepCounterModule {
  isSensorAvailable(): Promise<boolean>;
  getTodaySteps(): Promise<number>;
  startBackgroundService(): Promise<boolean>;
  stopBackgroundService(): Promise<boolean>;
  isBackgroundServiceRunning(): Promise<boolean>;
  setDailyStepGoal(goal: number): Promise<void>;
  resetTodaySteps(): Promise<void>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

type StepEvents = {
  onStepCountChange: (event: { steps: number }) => void;
};

let nativeModule: NativeStepCounterModule | null = null;
let emitter: EventEmitter<StepEvents> | null = null;

try {
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    nativeModule = requireNativeModule<NativeStepCounterModule>('HealthfreakStepCounter');
    if (nativeModule) {
      emitter = new EventEmitter<StepEvents>(nativeModule as any);
    }
  }
} catch (err) {
  // Graceful fallback for Expo Go, Web, or test environments where native code is mocked
  console.log('[HealthfreakStepCounter] Native module not bound, fallback mode active:', err);
}

export async function isSensorAvailable(): Promise<boolean> {
  if (!nativeModule) return false;
  try {
    return await nativeModule.isSensorAvailable();
  } catch {
    return false;
  }
}

/**
 * Returns today's authoritative step count directly from the device's hardware sensor hub.
 * Automatically accounts for steps taken while the app was closed or not running.
 */
export async function getTodaySteps(): Promise<number> {
  if (!nativeModule) return 0;
  try {
    const steps = await nativeModule.getTodaySteps();
    return Math.max(0, Math.round(steps));
  } catch (err) {
    console.warn('[HealthfreakStepCounter] Failed to get today steps:', err);
    return 0;
  }
}

/**
 * Starts the native persistent background step tracking service (Foreground Service).
 * Keeps counting steps 24/7 with zero battery drain even when the app is completely closed.
 */
export async function startBackgroundService(): Promise<boolean> {
  if (!nativeModule) return false;
  try {
    return await nativeModule.startBackgroundService();
  } catch (err) {
    console.warn('[HealthfreakStepCounter] Failed to start background service:', err);
    return false;
  }
}

/**
 * Stops the native background step tracking service.
 */
export async function stopBackgroundService(): Promise<boolean> {
  if (!nativeModule) return false;
  try {
    return await nativeModule.stopBackgroundService();
  } catch (err) {
    console.warn('[HealthfreakStepCounter] Failed to stop background service:', err);
    return false;
  }
}

/**
 * Checks whether the native background step service is currently active.
 */
export async function isBackgroundServiceRunning(): Promise<boolean> {
  if (!nativeModule) return false;
  try {
    return await nativeModule.isBackgroundServiceRunning();
  } catch {
    return false;
  }
}

export async function setDailyStepGoal(goal: number): Promise<void> {
  if (!nativeModule) return;
  try {
    await nativeModule.setDailyStepGoal(goal);
  } catch {}
}

export async function resetTodaySteps(): Promise<void> {
  if (!nativeModule) return;
  try {
    await nativeModule.resetTodaySteps();
  } catch {}
}

export function addStepListener(
  listener: (event: { steps: number }) => void
): EventSubscription | { remove: () => void } {
  if (!emitter) {
    return { remove: () => {} };
  }
  return emitter.addListener('onStepCountChange', listener);
}
