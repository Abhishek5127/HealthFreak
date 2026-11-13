import { SupabaseDb } from '../../db/supabaseClient.js';

export interface RetentionJobResult {
  enabled: boolean;
  dryRun: boolean;
  retentionDays: number;
  prunedCount: number;
  message: string;
}

/**
 * Transcript retention cleanup job (Rule E5).
 * Disabled by default via TRANSCRIPT_RETENTION_ENABLED=1 flag.
 * Runs in dry-run mode by default, logging actions without deleting records.
 */
export class TranscriptRetentionJob {
  public static getRetentionDays(): number {
    const raw = process.env.TRANSCRIPT_RETENTION_DAYS;
    const parsed = raw ? parseInt(raw, 10) : 30;
    return isNaN(parsed) || parsed <= 0 ? 30 : parsed;
  }

  public static isEnabled(): boolean {
    return process.env.TRANSCRIPT_RETENTION_ENABLED === '1';
  }

  public static async runCleanup(forceDryRun = true): Promise<RetentionJobResult> {
    const retentionDays = this.getRetentionDays();
    const enabled = this.isEnabled();

    if (!enabled) {
      const msg = `Transcript retention job is disabled by default (set TRANSCRIPT_RETENTION_ENABLED=1 to enable).`;
      return {
        enabled: false,
        dryRun: forceDryRun,
        retentionDays,
        prunedCount: 0,
        message: msg,
      };
    }

    const pool = SupabaseDb.getPool();
    if (!pool) {
      return {
        enabled: true,
        dryRun: forceDryRun,
        retentionDays,
        prunedCount: 0,
        message: 'Postgres pool unavailable; skipping retention cleanup.',
      };
    }

    try {
      const countRes = await pool.query(
        `SELECT COUNT(*)::int as count FROM call_transcript_turns
         WHERE created_at < NOW() - make_interval(days => $1)`,
        [retentionDays]
      );
      const eligibleCount = countRes.rows[0]?.count || 0;

      if (forceDryRun) {
        const msg = `[RetentionJob] DRY RUN: Found ${eligibleCount} transcript turns older than ${retentionDays} days. No rows deleted.`;
        return {
          enabled: true,
          dryRun: true,
          retentionDays,
          prunedCount: eligibleCount,
          message: msg,
        };
      }

      // Live prune only when explicitly not in dry run
      const deleteRes = await pool.query(
        `DELETE FROM call_transcript_turns
         WHERE created_at < NOW() - make_interval(days => $1)`,
        [retentionDays]
      );
      const pruned = deleteRes.rowCount || 0;
      return {
        enabled: true,
        dryRun: false,
        retentionDays,
        prunedCount: pruned,
        message: `[RetentionJob] Successfully pruned ${pruned} transcript turns older than ${retentionDays} days.`,
      };
    } catch (err: any) {
      return {
        enabled: true,
        dryRun: forceDryRun,
        retentionDays,
        prunedCount: 0,
        message: `Retention job query notice: ${err?.message || err}`,
      };
    }
  }
}
