import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendBaseUrl } from './aiChatService';

export interface DailyHealthSyncData {
  local_date: string;
  steps: number;
  step_goal?: number;
  calories_in?: number;
  calorie_target?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  water_ml?: number;
  workouts_done?: number;
  plan_day_completed?: boolean;
  source?: string;
}

export class HealthSyncService {
  private static lastSyncTimestamp = 0;

  /**
   * Syncs daily snapshot to server idempotently.
   */
  public static async syncDailySnapshot(
    userId: string = 'user_local',
    data?: Partial<DailyHealthSyncData>
  ): Promise<boolean> {
    const now = Date.now();
    // Debounce to at most once every 10 seconds unless forced
    if (now - this.lastSyncTimestamp < 10000 && !data) {
      return true;
    }
    this.lastSyncTimestamp = now;

    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const baseUrl = getBackendBaseUrl();
      const isLocalhostOnNative =
        Platform.OS !== 'web' && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'));

      if (isLocalhostOnNative) {
        return false;
      }

      // Read local cached metrics if not provided
      let steps = data?.steps ?? 0;
      let waterMl = data?.water_ml ?? 0;

      if (!data) {
        const cachedSteps = await AsyncStorage.getItem('@healthfreak_steps_today');
        if (cachedSteps) steps = parseInt(cachedSteps, 10) || 0;

        const cachedWater = await AsyncStorage.getItem('@healthfreak_water_today');
        if (cachedWater) waterMl = parseInt(cachedWater, 10) || 0;
      }

      const payload: DailyHealthSyncData = {
        local_date: data?.local_date || todayStr,
        steps: steps || data?.steps || 0,
        step_goal: data?.step_goal || 10000,
        calories_in: data?.calories_in || 0,
        calorie_target: data?.calorie_target || 2000,
        protein_g: data?.protein_g || 0,
        carbs_g: data?.carbs_g || 0,
        fat_g: data?.fat_g || 0,
        fiber_g: data?.fiber_g || 0,
        water_ml: waterMl || data?.water_ml || 0,
        workouts_done: data?.workouts_done || 0,
        plan_day_completed: data?.plan_day_completed || false,
        source: Platform.OS === 'web' ? 'web' : 'mobile_app',
      };

      const res = await fetch(`${baseUrl}/health/daily-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({
          userId,
          ...payload,
        }),
      });

      return res.ok;
    } catch {
      return false;
    }
  }
}

