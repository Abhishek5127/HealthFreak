import { Router, Request, Response } from 'express';
import { HealthMemoryStore } from '../db/healthMemoryStore.js';
import { SupabaseDb } from '../db/supabaseClient.js';
import { DailyActivityEntity } from '../types/healthMemory.js';
import { authenticateSupabaseToken, AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const activityRouter = Router();

activityRouter.use(authenticateSupabaseToken as any);

const memoryStore = HealthMemoryStore.getInstance();

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * GET /api/activity/today
 * Returns the current day's activity summary for a user.
 */
activityRouter.get('/today', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId!;
    const date = (req.query.date as string) || getTodayDateString();

    // 1. Try Supabase
    if (SupabaseDb.isConfigured()) {
      const client = SupabaseDb.getClient();
      const { data, error } = await client
        .from('daily_activity')
        .select('*')
        .eq('user_id', userId)
        .eq('activity_date', date)
        .maybeSingle();

      if (!error && data) {
        return res.json({ record: data });
      }
    }

    // 2. Fallback to in-memory store
    const key = `${userId}_${date}`;
    const memRecord = memoryStore.dailyActivities.get(key);
    if (memRecord) {
      return res.json({
        record: {
          id: memRecord.id,
          user_id: memRecord.userId,
          activity_date: memRecord.activityDate,
          steps: memRecord.steps,
          step_goal: memRecord.stepGoal,
          distance_meters: memRecord.distanceMeters,
          active_minutes: memRecord.activeMinutes,
          calories_burned: memRecord.caloriesBurned,
          water_intake_ml: memRecord.waterIntakeMl ?? 0,
          water_target_ml: memRecord.waterTargetMl ?? 3000,
          source: memRecord.source,
          updated_at: memRecord.updatedAt,
        },
      });
    }

    return res.json({
      record: {
        user_id: userId,
        activity_date: date,
        steps: 0,
        step_goal: 10000,
        distance_meters: 0,
        active_minutes: 0,
        calories_burned: 0,
        water_intake_ml: 0,
        water_target_ml: 3000,
        source: 'device',
        updated_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch activity' });
  }
});

/**
 * POST /api/activity/sync
 * Upserts a batch of activity records from device offline cache.
 */
activityRouter.post('/sync', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId!;
    const { records } = req.body;
    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'records array is required' });
    }

    const effectiveUserId = userId;
    let upsertedCount = 0;

    for (const rec of records) {
      if (!rec.activity_date) continue;

      const dateStr = rec.activity_date;
      const steps = Math.max(0, parseInt(rec.steps, 10) || 0);
      const stepGoal = Math.max(1000, parseInt(rec.step_goal, 10) || 10000);
      const distance = Math.max(0, Number(rec.distance_meters) || Math.round(steps * 0.74));
      const calories = Math.max(0, Number(rec.calories_burned) || Math.round(steps * 70 * 0.0005));
      const activeMinutes = Math.max(0, parseInt(rec.active_minutes, 10) || Math.round(steps / 105));
      const source = rec.source || 'device';

      // 1. In-memory store upsert
      const key = `${effectiveUserId}_${dateStr}`;
      const existingMem = memoryStore.dailyActivities.get(key);
      const safeSteps = existingMem ? Math.max(existingMem.steps, steps) : steps;
      const waterIntakeMl = rec.water_intake_ml !== undefined
        ? Math.max(0, parseInt(rec.water_intake_ml, 10))
        : (existingMem?.waterIntakeMl ?? 0);
      const waterTargetMl = rec.water_target_ml !== undefined
        ? Math.max(500, parseInt(rec.water_target_ml, 10))
        : (existingMem?.waterTargetMl ?? 3000);

      const memEntity: DailyActivityEntity = {
        id: existingMem?.id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: effectiveUserId,
        activityDate: dateStr,
        steps: safeSteps,
        stepGoal,
        distanceMeters: distance,
        activeMinutes,
        caloriesBurned: calories,
        waterIntakeMl,
        waterTargetMl,
        source,
        createdAt: existingMem?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      memoryStore.dailyActivities.set(key, memEntity);

      // 2. Supabase DB Upsert
      if (SupabaseDb.isConfigured()) {
        try {
          const client = SupabaseDb.getClient();
          await client.from('daily_activity').upsert(
            {
              user_id: effectiveUserId,
              activity_date: dateStr,
              steps: safeSteps,
              step_goal: stepGoal,
              distance_meters: distance,
              active_minutes: activeMinutes,
              calories_burned: calories,
              water_intake_ml: waterIntakeMl,
              water_target_ml: waterTargetMl,
              source,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,activity_date' }
          );
        } catch (supabaseErr) {
          // Log and continue with in-memory persistence
        }
      }

      upsertedCount++;
    }

    return res.json({ success: true, syncedCount: upsertedCount });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Sync failed' });
  }
});

/**
 * GET /api/activity/history
 * Returns the last N days of activity records.
 */
activityRouter.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId!;
    const daysCount = parseInt(req.query.days as string, 10) || 7;

    // 1. Try Supabase
    if (SupabaseDb.isConfigured()) {
      const client = SupabaseDb.getClient();
      const { data, error } = await client
        .from('daily_activity')
        .select('*')
        .eq('user_id', userId)
        .order('activity_date', { ascending: true })
        .limit(daysCount);

      if (!error && Array.isArray(data) && data.length > 0) {
        return res.json({ records: data });
      }
    }

    // 2. Fallback to in-memory store
    const memRecords: any[] = [];
    for (const [key, val] of memoryStore.dailyActivities.entries()) {
      if (val.userId === userId) {
        memRecords.push({
          id: val.id,
          user_id: val.userId,
          activity_date: val.activityDate,
          steps: val.steps,
          step_goal: val.stepGoal,
          distance_meters: val.distanceMeters,
          active_minutes: val.activeMinutes,
          calories_burned: val.caloriesBurned,
          source: val.source,
          updated_at: val.updatedAt,
        });
      }
    }

    memRecords.sort((a, b) => a.activity_date.localeCompare(b.activity_date));
    return res.json({ records: memRecords.slice(-daysCount) });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch history' });
  }
});

/**
 * PUT /api/activity/goal
 * Updates step goal for the user.
 */
activityRouter.put('/goal', async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId!;
    const { stepGoal } = req.body;
    if (!stepGoal || stepGoal <= 0) {
      return res.status(400).json({ error: 'Valid stepGoal is required' });
    }

    const effectiveUserId = userId;
    const today = getTodayDateString();
    const key = `${effectiveUserId}_${today}`;

    const existingMem = memoryStore.dailyActivities.get(key);
    if (existingMem) {
      existingMem.stepGoal = stepGoal;
      existingMem.updatedAt = new Date().toISOString();
      memoryStore.dailyActivities.set(key, existingMem);
    }

    if (SupabaseDb.isConfigured()) {
      const client = SupabaseDb.getClient();
      await client
        .from('daily_activity')
        .update({ step_goal: stepGoal, updated_at: new Date().toISOString() })
        .eq('user_id', effectiveUserId)
        .eq('activity_date', today);
    }

    return res.json({ success: true, stepGoal });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update goal' });
  }
});

