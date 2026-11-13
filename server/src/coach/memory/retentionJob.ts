import fs from 'fs';
import path from 'path';
import { SupabaseDb } from '../../db/supabaseClient.js';
import { db } from '../../db/index.js';

export interface PruneCallAudit {
  callId: string;
  userId: string;
  startedAt: string | Date;
  userTurnCount: number;
  extractionStatus: string;
  eligible: boolean;
  reason: string;
  transcriptTurnsCount: number;
  hasSummary: boolean;
  notesCount: number;
  commitmentsPreservedCount: number;
}

export interface UserRetentionResult {
  userId: string;
  keepLastN: number;
  totalCallsWithUserTurns: number;
  protectedCallIds: string[];
  eligibleCallsPruned: string[];
  skippedCalls: Array<{ callId: string; reason: string }>;
  stats: {
    turnsPruned: number;
    summariesNulled: number;
    notesPruned: number;
    commitmentsPreserved: number;
    failedOldExtractionsPruned: number;
  };
}

export interface SweepRetentionResult {
  enabled: boolean;
  dryRun: boolean;
  keepLastN: number;
  usersProcessed: number;
  totalCallsPruned: number;
  totalTurnsPruned: number;
  totalSummariesNulled: number;
  totalNotesPruned: number;
  totalCommitmentsPreserved: number;
  failedOldExtractionsPruned: number;
  details: UserRetentionResult[];
}

/**
 * Keep-Last-N Transcript Retention Job (Rules R1 - R6).
 * Replaces day-based retention.
 * For each user, retains raw transcripts only for the N most recent calls (default 3)
 * with at least 1 user turn, ordered by started_at DESC.
 * Disabled by default via TRANSCRIPT_RETENTION_ENABLED=1 flag.
 */
export class TranscriptRetentionJob {
  public static getKeepLastN(): number {
    const raw = process.env.TRANSCRIPT_KEEP_LAST_N;
    const parsed = raw ? parseInt(raw, 10) : 3;
    return isNaN(parsed) || parsed <= 0 ? 3 : parsed;
  }

  public static isEnabled(): boolean {
    return process.env.TRANSCRIPT_RETENTION_ENABLED === '1';
  }

  /**
   * Evaluates and prunes eligible calls for a specific user (Rule R1 - R4).
   * Event-driven trigger runs this immediately after call extraction completes (Rule R6).
   */
  public static async pruneUserCalls(
    userId: string,
    dryRun = true
  ): Promise<UserRetentionResult> {
    const keepLastN = this.getKeepLastN();
    const result: UserRetentionResult = {
      userId,
      keepLastN,
      totalCallsWithUserTurns: 0,
      protectedCallIds: [],
      eligibleCallsPruned: [],
      skippedCalls: [],
      stats: {
        turnsPruned: 0,
        summariesNulled: 0,
        notesPruned: 0,
        commitmentsPreserved: 0,
        failedOldExtractionsPruned: 0,
      },
    };

    const pool = SupabaseDb.getPool();
    if (!pool) {
      // In-memory prune for dev sessions
      this.pruneInMemorySessions(userId, keepLastN);
      return result;
    }

    const client = await pool.connect();
    try {
      if (!dryRun) {
        await client.query('BEGIN');
      }

      // Check schema capability for pending migrations (e.g. 005)
      const checkTablesRes = await client.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('call_transcript_turns', 'call_extraction_jobs')`
      );
      const existingTables = new Set(checkTablesRes.rows.map((r) => r.table_name));
      const hasTurnsTable = existingTables.has('call_transcript_turns');
      const hasJobsTable = existingTables.has('call_extraction_jobs');

      const turnCountExpr = hasTurnsTable
        ? `COALESCE((SELECT COUNT(*)::int FROM call_transcript_turns t WHERE t.call_id = c.id AND t.role = 'user'), 0)`
        : `0`;
      const jobStatusExpr = hasJobsTable
        ? `(SELECT status FROM call_extraction_jobs j WHERE j.call_id = c.id LIMIT 1)`
        : `NULL`;
      const jobCreatedExpr = hasJobsTable
        ? `(SELECT created_at FROM call_extraction_jobs j WHERE j.call_id = c.id LIMIT 1)`
        : `NULL`;

      // 1. Fetch calls for this user ordered by started_at DESC
      // Only count calls that have at least 1 user turn (Rule R1)
      const callsRes = await client.query(
        `SELECT c.id, c.started_at, c.transcript, c.summary_status,
                ${turnCountExpr} as turn_user_count,
                ${jobStatusExpr} as extraction_status,
                ${jobCreatedExpr} as extraction_created_at
         FROM calls c
         WHERE c.user_id = $1
         ORDER BY c.started_at DESC;`,
        [userId]
      );

      // Filter to calls with at least 1 user turn (either in call_transcript_turns or transcript jsonb)
      const callsWithUserTurns = callsRes.rows.filter((r) => {
        if (r.turn_user_count > 0) return true;
        if (Array.isArray(r.transcript)) {
          return r.transcript.some((t: any) => t.role === 'user');
        }
        return false;
      });

      result.totalCallsWithUserTurns = callsWithUserTurns.length;

      // 2. Identify Protected Calls (latest N) vs Candidate Calls (outside latest N)
      const protectedCalls = callsWithUserTurns.slice(0, keepLastN);
      const candidateCalls = callsWithUserTurns.slice(keepLastN);
      result.protectedCallIds = protectedCalls.map((c) => c.id);

      // 3. Evaluate eligibility for candidate calls (Rule R2)
      for (const call of candidateCalls) {
        const extStatus = call.extraction_status || 'completed'; // default completed if legacy call
        const extCreatedAt = call.extraction_created_at ? new Date(call.extraction_created_at).getTime() : new Date(call.started_at).getTime();
        const ageInDays = (Date.now() - extCreatedAt) / (1000 * 60 * 60 * 24);

        if (extStatus === 'pending' || extStatus === 'processing') {
          result.skippedCalls.push({
            callId: call.id,
            reason: `Extraction job is ${extStatus} (pending/processing protected)`,
          });
          continue;
        }

        if (extStatus === 'failed') {
          if (ageInDays < 7) {
            result.skippedCalls.push({
              callId: call.id,
              reason: `Extraction failed ${Math.round(ageInDays)}d ago (<7d; retry first, do not prune)`,
            });
            continue;
          } else {
            // Failed for > 7 days: prune anyway and log counter (no text)
            result.stats.failedOldExtractionsPruned++;
            console.warn(`[RetentionJob] Pruning call ${call.id} with extraction failed > 7 days (counter: ${result.stats.failedOldExtractionsPruned})`);
          }
        }

        // Call is eligible for retention pruning
        // Audit rows affected
        const turnsCountRes = await client.query(
          `SELECT COUNT(*)::int as count FROM call_transcript_turns WHERE call_id = $1`,
          [call.id]
        );
        const turnsCount = turnsCountRes.rows[0]?.count || 0;

        const commitmentsRes = await client.query(
          `SELECT COUNT(*)::int as count FROM call_notes WHERE call_id = $1 AND checkpoint_type = 'commitment_made'`,
          [call.id]
        );
        const commitmentsCount = commitmentsRes.rows[0]?.count || 0;

        const freeNotesRes = await client.query(
          `SELECT COUNT(*)::int as count FROM call_notes WHERE call_id = $1 AND checkpoint_type != 'commitment_made'`,
          [call.id]
        );
        const freeNotesCount = freeNotesRes.rows[0]?.count || 0;

        result.stats.turnsPruned += turnsCount;
        result.stats.summariesNulled += 1;
        result.stats.notesPruned += freeNotesCount;
        result.stats.commitmentsPreserved += commitmentsCount;
        result.eligibleCallsPruned.push(call.id);

        if (!dryRun) {
          // Perform live prune inside transaction with savepoints (Rule R3, R4)
          await client.query('SAVEPOINT sp_prune_call');
          try {
            // A. Backfill commitments to user_commitments if table exists
            try {
              await client.query('SAVEPOINT sp_commit_bk');
              await client.query(
                `INSERT INTO user_commitments (user_id, call_id, commitment, status, created_at)
                 SELECT user_id, call_id, note, 'pending', created_at
                 FROM call_notes
                 WHERE call_id = $1 AND checkpoint_type = 'commitment_made'
                 ON CONFLICT DO NOTHING;`,
                [call.id]
              );
              await client.query('RELEASE SAVEPOINT sp_commit_bk');
            } catch {
              await client.query('ROLLBACK TO SAVEPOINT sp_commit_bk').catch(() => {});
            }

            // B. Delete transcript turns
            await client.query(
              `DELETE FROM call_transcript_turns WHERE call_id = $1`,
              [call.id]
            );

            // C. Null transcript, summary, key_takeaways on calls table (KEEP calls row intact!)
            try {
              await client.query('SAVEPOINT sp_call_null');
              await client.query(
                `UPDATE calls
                 SET transcript = '[]'::jsonb,
                     summary = NULL,
                     key_takeaways = NULL
                 WHERE id = $1`,
                [call.id]
              );
              await client.query('RELEASE SAVEPOINT sp_call_null');
            } catch {
              await client.query('ROLLBACK TO SAVEPOINT sp_call_null').catch(() => {});
              // Fallback if summary/key_takeaways columns do not exist
              await client.query(
                `UPDATE calls SET transcript = '[]'::jsonb WHERE id = $1`,
                [call.id]
              );
            }

            // D. Delete from call_summaries if present
            try {
              await client.query('SAVEPOINT sp_summaries');
              await client.query(`DELETE FROM call_summaries WHERE call_id = $1`, [call.id]);
              await client.query('RELEASE SAVEPOINT sp_summaries');
            } catch {
              await client.query('ROLLBACK TO SAVEPOINT sp_summaries').catch(() => {});
            }

            // E. Delete free-text call_notes, strictly PRESERVING checkpoint_type = 'commitment_made'
            await client.query(
              `DELETE FROM call_notes WHERE call_id = $1 AND checkpoint_type != 'commitment_made'`,
              [call.id]
            );

            await client.query('RELEASE SAVEPOINT sp_prune_call');
          } catch (pruneErr: any) {
            await client.query('ROLLBACK TO SAVEPOINT sp_prune_call').catch(() => {});
            console.error(`[RetentionJob] Error pruning call ${call.id}:`, pruneErr.message);
          }
        }
      }

      if (!dryRun) {
        await client.query('COMMIT');
      }
    } catch (err: any) {
      if (!dryRun) {
        await client.query('ROLLBACK').catch(() => {});
      }
      throw err;
    } finally {
      client.release();
    }

    // Prune dev transcript logs and in-memory sessions (Rule R6)
    if (!dryRun) {
      this.pruneDevTranscriptFile(result.protectedCallIds);
      this.pruneInMemorySessions(userId, keepLastN);
    }

    return result;
  }

  /**
   * Daily sweep for all users across the system (Rule R6).
   */
  public static async runDailySweep(forceDryRun = true): Promise<SweepRetentionResult> {
    const keepLastN = this.getKeepLastN();
    const enabled = this.isEnabled();

    const sweepResult: SweepRetentionResult = {
      enabled,
      dryRun: forceDryRun,
      keepLastN,
      usersProcessed: 0,
      totalCallsPruned: 0,
      totalTurnsPruned: 0,
      totalSummariesNulled: 0,
      totalNotesPruned: 0,
      totalCommitmentsPreserved: 0,
      failedOldExtractionsPruned: 0,
      details: [],
    };

    if (!enabled && !forceDryRun) {
      console.log('[RetentionJob] Daily sweep skipped: TRANSCRIPT_RETENTION_ENABLED!=1');
      return sweepResult;
    }

    const pool = SupabaseDb.getPool();
    if (!pool) {
      return sweepResult;
    }

    try {
      const usersRes = await pool.query(
        `SELECT DISTINCT user_id FROM calls WHERE user_id IS NOT NULL`
      );

      for (const row of usersRes.rows) {
        const uRes = await this.pruneUserCalls(row.user_id, forceDryRun);
        sweepResult.usersProcessed++;
        sweepResult.totalCallsPruned += uRes.eligibleCallsPruned.length;
        sweepResult.totalTurnsPruned += uRes.stats.turnsPruned;
        sweepResult.totalSummariesNulled += uRes.stats.summariesNulled;
        sweepResult.totalNotesPruned += uRes.stats.notesPruned;
        sweepResult.totalCommitmentsPreserved += uRes.stats.commitmentsPreserved;
        sweepResult.failedOldExtractionsPruned += uRes.stats.failedOldExtractionsPruned;
        sweepResult.details.push(uRes);
      }
    } catch (err: any) {
      console.warn('[RetentionJob] Daily sweep error:', err.message);
    }

    return sweepResult;
  }

  /**
   * Prunes in-memory callSessions to drop sessions older than latest N (Rule R6).
   */
  public static pruneInMemorySessions(userId: string, keepLastN = 3): void {
    try {
      const userSessions: Array<{ id: string; startedAt: Date }> = [];
      const memDb = db as any;
      if (memDb && memDb.callSessions instanceof Map) {
        for (const [id, s] of memDb.callSessions.entries()) {
          if (s.userId === userId) {
            userSessions.push({ id, startedAt: s.startedAt ? new Date(s.startedAt) : new Date(0) });
          }
        }
        userSessions.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
        const toDrop = userSessions.slice(keepLastN);
        for (const s of toDrop) {
          memDb.callSessions.delete(s.id);
        }
      }
    } catch {}
  }

  /**
   * Prunes dev transcripts.jsonl when DEV_TRANSCRIPT_LOG=1 to retain only protected call records (Rule R6).
   */
  public static pruneDevTranscriptFile(protectedCallIds: string[]): void {
    if (process.env.DEV_TRANSCRIPT_LOG !== '1') return;
    try {
      const candidates = [
        path.resolve(process.cwd(), 'transcripts.jsonl'),
        path.resolve(process.cwd(), 'server/voice-agent/transcripts.jsonl'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const lines = fs.readFileSync(p, 'utf-8').split('\n').filter(Boolean);
          const preservedLines: string[] = [];
          for (const l of lines) {
            try {
              const rec = JSON.parse(l);
              if (!rec.call_id || protectedCallIds.includes(rec.call_id)) {
                preservedLines.push(l);
              }
            } catch {
              preservedLines.push(l);
            }
          }
          fs.writeFileSync(p, preservedLines.join('\n') + '\n', 'utf-8');
        }
      }
    } catch {}
  }
}
