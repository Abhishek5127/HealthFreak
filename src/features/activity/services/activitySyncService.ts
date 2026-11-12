import { StepSummary } from '../types/pedometer.types';
import { StepPersistenceService } from './stepPersistenceService';
import { getBackendBaseUrl } from '../../../services/aiChatService';
import { supabase } from '../../../services/supabaseClient';

export class ActivitySyncService {
  private static isSyncing = false;

  /**
   * Synchronizes today's activity and any queued offline records with the backend / Supabase.
   */
  public static async syncActivities(
    userId?: string | null
  ): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    if (this.isSyncing) {
      return { success: false, syncedCount: 0, error: 'Sync already in progress' };
    }

    if (!userId) {
      return { success: false, syncedCount: 0, error: 'No user ID' };
    }

    this.isSyncing = true;

    try {
      const pending = await StepPersistenceService.getPendingSyncs();
      if (pending.length === 0) {
        this.isSyncing = false;
        return { success: true, syncedCount: 0 };
      }

      // 1. Try syncing via local Express Backend API
      let syncedSuccessfully = false;
      try {
        const backendUrl = getBackendBaseUrl();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(`${backendUrl}/api/activity/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            records: pending.map((p) => ({
              activity_date: p.date,
              steps: p.steps,
              step_goal: p.stepGoal,
              distance_meters: p.distanceMeters,
              active_minutes: p.activeMinutes,
              calories_burned: p.caloriesBurned,
              water_intake_ml: p.waterIntakeMl,
              water_target_ml: p.waterTargetMl,
              source: p.source,
            })),
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          syncedSuccessfully = true;
        }
      } catch {
        // Backend not reachable, try Supabase directly
      }

      // 2. Direct Supabase Upsert fallback if backend didn't handle it
      if (!syncedSuccessfully && supabase) {
        try {
          const rows = pending.map((p) => ({
            user_id: userId,
            activity_date: p.date,
            steps: p.steps,
            step_goal: p.stepGoal,
            distance_meters: p.distanceMeters,
            active_minutes: p.activeMinutes,
            calories_burned: p.caloriesBurned,
            water_intake_ml: p.waterIntakeMl ?? 0,
            water_target_ml: p.waterTargetMl ?? 3000,
            source: p.source,
            updated_at: new Date().toISOString(),
          }));

          const { error } = await supabase
            .from('daily_activity')
            .upsert(rows, { onConflict: 'user_id,activity_date' });

          if (!error) {
            syncedSuccessfully = true;
          }
        } catch (supabaseErr) {
          console.warn('[ActivitySyncService] Direct Supabase upsert error:', supabaseErr);
        }
      }

      if (syncedSuccessfully) {
        const syncedDates = pending.map((p) => p.date);
        await StepPersistenceService.markSynced(syncedDates);
        this.isSyncing = false;
        return { success: true, syncedCount: pending.length };
      }

      this.isSyncing = false;
      return { success: false, syncedCount: 0, error: 'Network / server unavailable' };
    } catch (err: any) {
      this.isSyncing = false;
      return { success: false, syncedCount: 0, error: err?.message || 'Sync failed' };
    }
  }

  /**
   * Fetches remote activity history for the authenticated user and merges into local cache.
   */
  public static async fetchCloudHistory(
    userId: string,
    daysCount: number = 7
  ): Promise<StepSummary[]> {
    if (!userId) return [];

    try {
      const backendUrl = getBackendBaseUrl();
      const res = await fetch(`${backendUrl}/api/activity/history?userId=${userId}&days=${daysCount}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.records)) {
          for (const item of data.records) {
            await StepPersistenceService.saveDailySummary({
              date: item.activity_date,
              steps: item.steps,
              stepGoal: item.step_goal || 10000,
              distanceMeters: item.distance_meters || 0,
              caloriesBurned: item.calories_burned || 0,
              activeMinutes: item.active_minutes || 0,
              source: 'cloud',
              updatedAt: item.updated_at || new Date().toISOString(),
            });
          }
        }
      }
    } catch {}

    return await StepPersistenceService.getRecentHistory(daysCount);
  }

  /**
   * Synchronizes daily hydration intake directly to Express backend and Supabase daily_activity table.
   */
  public static async syncDailyWater(
    userId?: string | null,
    waterLoggedMl: number = 0,
    waterTargetMl: number = 3000,
    dateStr?: string
  ): Promise<boolean> {
    const effectiveUserId = userId || '';
    if (!effectiveUserId) return false;
    const date = dateStr || new Date().toISOString().split('T')[0];
    let synced = false;

    // 1. Try syncing via local Express Backend API
    try {
      const backendUrl = getBackendBaseUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${backendUrl}/api/activity/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveUserId,
          records: [
            {
              activity_date: date,
              water_intake_ml: waterLoggedMl,
              water_target_ml: waterTargetMl,
            },
          ],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        synced = true;
      }
    } catch {
      // Backend not reachable, fall back to direct Supabase
    }

    // 2. Direct Supabase Upsert fallback
    if (supabase) {
      try {
        const { error } = await supabase.from('daily_activity').upsert(
          {
            user_id: effectiveUserId,
            activity_date: date,
            water_intake_ml: waterLoggedMl,
            water_target_ml: waterTargetMl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,activity_date' }
        );
        if (!error) {
          synced = true;
        }
      } catch (err) {
        console.warn('[ActivitySyncService] Direct Supabase water sync error:', err);
      }
    }

    return synced;
  }
}
