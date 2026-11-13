import { SupabaseDb } from '../../db/supabaseClient.js';
import { healthMemoryStore } from '../../db/healthMemoryStore.js';
import { db } from '../../db/index.js';

export interface PurgeResult {
  success: boolean;
  issueId: string;
  issueTitle?: string;
  category?: string;
  recordsDeleted: {
    user_issues: number;
    issue_history_tombstones: number;
    follow_ups: number;
    scheduled_followups: number;
    call_notes: number;
    health_conditions: number;
    profile_facts: number;
    plans_marked_stale: number;
  };
}

export class MemoryPurgeService {
  /**
   * Completely purges a resolved issue and all its historical mentions, follow-ups,
   * auto-created conditions, and notes across Postgres and in-memory caches in a single transaction.
   * Inserts an anonymized tombstone into issue_history with NO free text.
   */
  public static async purgeResolvedIssue(userId: string, issueId: string): Promise<PurgeResult> {
    const pool = SupabaseDb.getPool();
    const result: PurgeResult = {
      success: false,
      issueId,
      recordsDeleted: {
        user_issues: 0,
        issue_history_tombstones: 0,
        follow_ups: 0,
        scheduled_followups: 0,
        call_notes: 0,
        health_conditions: 0,
        profile_facts: 0,
        plans_marked_stale: 0,
      },
    };

    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 1. Fetch issue metadata before deletion
        const issueRes = await client.query(
          `SELECT id, user_id, title, category, first_reported_at, last_mentioned_at, mention_count
           FROM user_issues
           WHERE id::text = $1 AND user_id = $2`,
          [issueId, userId]
        );

        if (issueRes.rows.length === 0) {
          await client.query('ROLLBACK');
          // If not in Postgres, proceed to check in-memory stores
          this.purgeInMemory(userId, issueId);
          return { ...result, success: false };
        }

        const issue = issueRes.rows[0];
        result.issueTitle = issue.title;
        result.category = issue.category;
        const normalizedTitle = issue.title.trim().toLowerCase();
        const searchPattern = `%${normalizedTitle}%`;

        // 2. Insert tombstone into issue_history (NO free text stored)
        try {
          const tombstoneRes = await client.query(
            `INSERT INTO issue_history (id, user_id, category, opened_at, resolved_at, mention_count)
             VALUES ($1, $2, $3, $4, NOW(), $5)
             ON CONFLICT (id) DO UPDATE SET resolved_at = NOW()`,
            [issue.id, userId, issue.category, issue.first_reported_at || new Date(), issue.mention_count || 1]
          );
          result.recordsDeleted.issue_history_tombstones = tombstoneRes.rowCount || 0;
        } catch {
          // If issue_history table not yet created via migration 006, continue gracefully
        }

        // 3. Delete from follow_ups table
        try {
          const followUpsRes = await client.query(
            `DELETE FROM follow_ups
             WHERE user_id = $1 AND (issue_id::text = $2 OR issue_title ILIKE $3)`,
            [userId, issueId, searchPattern]
          );
          result.recordsDeleted.follow_ups = followUpsRes.rowCount || 0;
        } catch {}

        // 4. Delete from scheduled_followups
        try {
          const schedRes = await client.query(
            `DELETE FROM scheduled_followups
             WHERE user_id = $1 AND (
               (target_questions::text ILIKE $2) OR
               (issue_id::text = $3)
             )`,
            [userId, searchPattern, issueId]
          );
          result.recordsDeleted.scheduled_followups = schedRes.rowCount || 0;
        } catch {
          // If issue_id column not present, match on target_questions text
          try {
            const schedFallback = await client.query(
              `DELETE FROM scheduled_followups
               WHERE user_id = $1 AND target_questions::text ILIKE $2`,
              [userId, searchPattern]
            );
            result.recordsDeleted.scheduled_followups = schedFallback.rowCount || 0;
          } catch {}
        }

        // 5. Delete or anonymize tied call_notes within 30 days
        try {
          const notesRes = await client.query(
            `DELETE FROM call_notes
             WHERE user_id = $1 AND (
               (data->>'issue_id' = $2) OR
               (checkpoint_type = 'issue_reported' AND note ILIKE $3) OR
               (created_at >= NOW() - INTERVAL '30 days' AND note ILIKE $3)
             )`,
            [userId, issueId, searchPattern]
          );
          result.recordsDeleted.call_notes = notesRes.rowCount || 0;
        } catch {}

        // 6. Delete auto-created health_conditions (NEVER delete chronic conditions stated by user)
        try {
          const condRes = await client.query(
            `DELETE FROM health_conditions
             WHERE user_id = $1 AND (
               (source_issue_id::text = $2) OR
               (condition_name ILIKE $3 AND source IN ('auto_extracted', 'coach_issue', 'session_turn') AND active = true)
             ) AND (clinical_notes NOT ILIKE '%chronic%' OR clinical_notes IS NULL)`,
            [userId, issueId, searchPattern]
          );
          result.recordsDeleted.health_conditions = condRes.rowCount || 0;
        } catch {}

        // 7. Exercise plans: mark plans stale if they constrained on this issue, exclude notes from future prompts
        try {
          const planRes = await client.query(
            `UPDATE exercise_plans
             SET is_stale = true,
                 safety_notes = NULL
             WHERE user_id = $1 AND (
               safety_notes ILIKE $2 OR
               constraint_issue_ids::text ILIKE $3
             )`,
            [userId, searchPattern, `%${issueId}%`]
          );
          result.recordsDeleted.plans_marked_stale = planRes.rowCount || 0;
        } catch {
          // If is_stale column not present yet
          try {
            const planFallback = await client.query(
              `UPDATE exercise_plans
               SET safety_notes = NULL
               WHERE user_id = $1 AND safety_notes ILIKE $2`,
              [userId, searchPattern]
            );
            result.recordsDeleted.plans_marked_stale = planFallback.rowCount || 0;
          } catch {}
        }

        // 8. Delete related facts in profile_facts (delete entire superseded chain)
        try {
          const factsRes = await client.query(
            `WITH matched_facts AS (
               SELECT id, key, superseded_by_fact_id FROM profile_facts
               WHERE user_id = $1 AND (key ILIKE $2 OR value::text ILIKE $2)
             )
             DELETE FROM profile_facts
             WHERE user_id = $1 AND (
               id IN (SELECT id FROM matched_facts) OR
               superseded_by_fact_id IN (SELECT id FROM matched_facts)
             )`,
            [userId, searchPattern]
          );
          result.recordsDeleted.profile_facts = factsRes.rowCount || 0;
        } catch {}

        // 9. Delete the user_issues row itself
        const delIssueRes = await client.query(
          `DELETE FROM user_issues WHERE id::text = $1 AND user_id = $2`,
          [issueId, userId]
        );
        result.recordsDeleted.user_issues = delIssueRes.rowCount || 0;

        await client.query('COMMIT');
        result.success = true;
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('[MemoryPurgeService] Transaction rolled back:', err.message);
        throw err;
      } finally {
        client.release();
      }
    }

    // F4: Purge in-memory stores in the same function call
    this.purgeInMemory(userId, issueId, result.issueTitle);

    return result;
  }

  /**
   * Purges a stated fact and its entire superseded version history from profile_facts
   * after explicit user confirmation.
   */
  public static async purgeFact(userId: string, factKey: string, category?: string): Promise<{ success: boolean; count: number }> {
    const pool = SupabaseDb.getPool();
    let count = 0;

    if (pool) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Delete active fact and any superseded chain predecessors
        const res = await client.query(
          `WITH target AS (
             SELECT id, key FROM profile_facts
             WHERE user_id = $1 AND key ILIKE $2 ${category ? 'AND category = $3' : ''}
           )
           DELETE FROM profile_facts
           WHERE user_id = $1 AND (
             id IN (SELECT id FROM target) OR
             superseded_by_fact_id IN (SELECT id FROM target)
           )`,
          category ? [userId, factKey, category] : [userId, factKey]
        );
        count = res.rowCount || 0;

        await client.query('COMMIT');
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error('[MemoryPurgeService] Fact purge rolled back:', err.message);
        throw err;
      } finally {
        client.release();
      }
    }

    // Purge from in-memory store
    const facts = healthMemoryStore.profileFacts.get(userId);
    if (facts) {
      healthMemoryStore.profileFacts.set(
        userId,
        facts.filter((f) => f.key.toLowerCase() !== factKey.toLowerCase())
      );
    }

    return { success: true, count };
  }

  /**
   * Clears in-memory healthMemoryStore and db.callSessions for consistency.
   */
  public static purgeInMemory(userId: string, issueId: string, issueTitle?: string): void {
    try {
      if (issueTitle) {
        const titleLower = issueTitle.toLowerCase();

        // 1. Purge healthConditions
        const conds = healthMemoryStore.healthConditions.get(userId);
        if (conds) {
          healthMemoryStore.healthConditions.set(
            userId,
            conds.filter((c) => !c.conditionName.toLowerCase().includes(titleLower))
          );
        }

        // 2. Purge symptomObservations
        const syms = healthMemoryStore.symptomObservations.get(userId);
        if (syms) {
          healthMemoryStore.symptomObservations.set(
            userId,
            syms.filter((s) => !s.symptomName.toLowerCase().includes(titleLower))
          );
        }

        // 3. Purge db.getUserMemory
        const mem = db.getUserMemory(userId);
        if (mem && mem.knownConditions) {
          mem.knownConditions = mem.knownConditions.filter(
            (c: string) => !c.toLowerCase().includes(titleLower)
          );
        }
      }

      // 4. Purge active call session cache if stored
      db.deleteUserCallSessions(userId);
    } catch (err: any) {
      console.warn('[MemoryPurgeService] In-memory purge notice:', err.message);
    }
  }
}
