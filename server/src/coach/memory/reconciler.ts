import { SupabaseDb } from '../../db/supabaseClient.js';

export interface StaleCallReconciliationResult {
  closedCallsCount: number;
  extractedCallsCount: number;
  skippedOldCallsCount: number;
}

export class CallMemoryReconciler {
  /**
   * Identifies calls stuck in 'initiating' or 'active' for over maxStaleMinutes
   * and closes them with status 'completed', queuing post-call extraction jobs.
   * Gated: Never reprocesses calls older than maxReprocessHours (Rule 10).
   */
  public static async reconcileStaleCalls(
    maxStaleMinutes = 15,
    maxReprocessHours = 24
  ): Promise<StaleCallReconciliationResult> {
    const pool = SupabaseDb.getPool();
    const result: StaleCallReconciliationResult = {
      closedCallsCount: 0,
      extractedCallsCount: 0,
      skippedOldCallsCount: 0,
    };

    if (!pool) return result;

    try {
      // 1. Find stale calls stuck in 'initiating' or 'active'
      const staleRes = await pool.query(
        `SELECT id, user_id, started_at, status
         FROM calls
         WHERE status IN ('initiating', 'active')
           AND started_at <= NOW() - ($1 || ' minutes')::INTERVAL
           AND started_at >= NOW() - ($2 || ' hours')::INTERVAL
         LIMIT 20;`,
        [maxStaleMinutes.toString(), maxReprocessHours.toString()]
      );

      for (const call of staleRes.rows) {
        // Mark call completed and set ended_at
        await pool.query(
          `UPDATE calls
           SET status = 'completed',
               ended_at = COALESCE(ended_at, NOW())
           WHERE id = $1`,
          [call.id]
        );
        result.closedCallsCount += 1;

        // Queue extraction job if not already queued
        try {
          await pool.query(
            `INSERT INTO call_extraction_jobs (call_id, user_id, status, created_at)
             VALUES ($1, $2, 'pending', NOW())
             ON CONFLICT (call_id) DO NOTHING`,
            [call.id, call.user_id]
          );
          result.extractedCallsCount += 1;
        } catch {}
      }

      // Count calls older than maxReprocessHours that are skipped
      const skippedRes = await pool.query(
        `SELECT COUNT(*)::int as count
         FROM calls
         WHERE status IN ('initiating', 'active')
           AND started_at < NOW() - ($1 || ' hours')::INTERVAL;`,
        [maxReprocessHours.toString()]
      );
      result.skippedOldCallsCount = skippedRes.rows[0]?.count || 0;
    } catch (err: any) {
      console.warn('[CallMemoryReconciler] Notice:', err.message);
    }

    return result;
  }
}
