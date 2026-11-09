import { z } from 'zod';
import { SupabaseDb } from '../db/supabaseClient.js';

export const DailySyncPayloadSchema = z.object({
  local_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  steps: z.number().int().nonnegative().default(0),
  step_goal: z.number().int().positive().default(10000),
  calories_in: z.number().nonnegative().default(0),
  calorie_target: z.number().nonnegative().default(2000),
  protein_g: z.number().nonnegative().default(0),
  carbs_g: z.number().nonnegative().default(0),
  fat_g: z.number().nonnegative().default(0),
  fiber_g: z.number().nonnegative().default(0),
  water_ml: z.number().int().nonnegative().default(0),
  workouts_done: z.number().int().nonnegative().default(0),
  plan_day_completed: z.boolean().default(false),
  source: z.string().default('device'),
});

export type DailySyncPayload = z.infer<typeof DailySyncPayloadSchema>;

export interface DailySnapshotRecord extends DailySyncPayload {
  id?: string;
  user_id: string;
  synced_at?: string;
  created_at?: string;
  updated_at?: string;
}

export class HealthSnapshotService {
  // In-memory fallback cache when PostgreSQL is in mock/offline mode
  private static mockSnapshots: Map<string, Map<string, DailySnapshotRecord>> = new Map();

  /**
   * Idempotent sync of daily health snapshot
   */
  public static async syncDailySnapshot(userId: string, payload: DailySyncPayload): Promise<DailySnapshotRecord> {
    const validated = DailySyncPayloadSchema.parse(payload);
    const pool = SupabaseDb.getPool();

    if (pool) {
      try {
        // Ensure user profile exists to avoid FK error
        await pool.query(
          `INSERT INTO profiles (id, name, height_cm, created_at, updated_at)
           VALUES ($1, $2, 175.0, NOW(), NOW())
           ON CONFLICT (id) DO NOTHING;`,
          [userId, userId.replace('usr_', '')]
        );

        const res = await pool.query(
          `INSERT INTO daily_health_snapshots (
             user_id, local_date, steps, step_goal,
             calories_in, calorie_target, protein_g, carbs_g, fat_g, fiber_g,
             water_ml, workouts_done, plan_day_completed, source, synced_at, updated_at
           ) VALUES (
             $1, $2, $3, $4,
             $5, $6, $7, $8, $9, $10,
             $11, $12, $13, $14, NOW(), NOW()
           )
           ON CONFLICT (user_id, local_date) DO UPDATE SET
             steps = EXCLUDED.steps,
             step_goal = EXCLUDED.step_goal,
             calories_in = EXCLUDED.calories_in,
             calorie_target = EXCLUDED.calorie_target,
             protein_g = EXCLUDED.protein_g,
             carbs_g = EXCLUDED.carbs_g,
             fat_g = EXCLUDED.fat_g,
             fiber_g = EXCLUDED.fiber_g,
             water_ml = EXCLUDED.water_ml,
             workouts_done = EXCLUDED.workouts_done,
             plan_day_completed = EXCLUDED.plan_day_completed,
             source = EXCLUDED.source,
             synced_at = NOW(),
             updated_at = NOW()
           RETURNING *;`,
          [
            userId,
            validated.local_date,
            validated.steps,
            validated.step_goal,
            validated.calories_in,
            validated.calorie_target,
            validated.protein_g,
            validated.carbs_g,
            validated.fat_g,
            validated.fiber_g,
            validated.water_ml,
            validated.workouts_done,
            validated.plan_day_completed,
            validated.source,
          ]
        );

        if (res.rows[0]) {
          return res.rows[0];
        }
      } catch (err: any) {
        console.warn('[HealthSnapshotService] Postgres sync error, saving to fallback cache:', err.message);
      }
    }

    // Fallback in-memory
    if (!this.mockSnapshots.has(userId)) {
      this.mockSnapshots.set(userId, new Map());
    }
    const userMap = this.mockSnapshots.get(userId)!;
    const record: DailySnapshotRecord = {
      ...validated,
      user_id: userId,
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    userMap.set(validated.local_date, record);
    return record;
  }

  /**
   * Fetches snapshots for the last N days
   */
  public static async getRecentSnapshots(userId: string, days: number = 7): Promise<DailySnapshotRecord[]> {
    const pool = SupabaseDb.getPool();
    if (pool) {
      try {
        const res = await pool.query(
          `SELECT * FROM daily_health_snapshots
           WHERE user_id = $1
           ORDER BY local_date DESC
           LIMIT $2;`,
          [userId, days]
        );
        return res.rows;
      } catch (err: any) {
        console.warn('[HealthSnapshotService] Postgres read error, falling back:', err.message);
      }
    }

    const userMap = this.mockSnapshots.get(userId);
    if (!userMap) {
      // Seed synthetic recent snapshots for Alex if requested
      if (userId === 'usr_synthetic_alex') {
        return this.getSyntheticSnapshots(days);
      }
      return [];
    }
    return Array.from(userMap.values())
      .sort((a, b) => b.local_date.localeCompare(a.local_date))
      .slice(0, days);
  }

  private static getSyntheticSnapshots(days: number): DailySnapshotRecord[] {
    const list: DailySnapshotRecord[] = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      list.push({
        user_id: 'usr_synthetic_alex',
        local_date: dateStr,
        steps: i === 0 ? 8240 : i === 1 ? 9500 : 7800 + (i % 3) * 500,
        step_goal: 10000,
        calories_in: 1950,
        calorie_target: 2100,
        protein_g: 112,
        carbs_g: 210,
        fat_g: 58,
        fiber_g: 28,
        water_ml: 2600,
        workouts_done: i === 1 ? 1 : 0,
        plan_day_completed: i === 1,
        source: 'device',
        synced_at: new Date().toISOString(),
      });
    }
    return list;
  }
}

