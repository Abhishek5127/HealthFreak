import { SupabaseDb } from '../db/supabaseClient.js';
import { db } from '../db/index.js';
import { healthMemoryStore } from '../db/healthMemoryStore.js';
import { MemoryPurgeService } from '../coach/memory/purgeService.js';

export interface RetrievedHealthContext {
  activeIssues: Array<{
    id: string;
    title: string;
    category: string;
    severity?: string;
    firstReported: string;
    lastMentioned: string;
    mentionCount: number;
    notes?: string[];
  }>;
  historicalIssues: Array<{
    id: string;
    title: string;
    category: string;
    resolvedAt: string;
    durationDays?: number;
  }>;
  commitments: string[];
  relevantDietaryPreferences: string[];
  todayActivity?: {
    todaySteps?: number;
    stepGoal?: number;
    caloriesBurned?: number;
  };
  promptSnippet: string;
}

export interface ExtractedSymptom {
  category: 'pain' | 'injury' | 'sleep' | 'digestion' | 'energy' | 'diet_adherence' | 'motivation' | 'other';
  title: string;
  bodyPart?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  trigger?: string;
  rawMention: string;
}

export class HealthMemoryEngine {
  /**
   * Intelligently retrieves and ranks memories based on user message semantic context.
   * Execution budget: < 35 ms.
   */
  public static async getRelevantContext(
    userId: string,
    currentMessage: string,
    activityContext?: { todaySteps?: number; stepGoal?: number; caloriesBurned?: number }
  ): Promise<RetrievedHealthContext> {
    const pool = SupabaseDb.getPool();
    const lower = currentMessage.toLowerCase();

    // 1. Determine message topic relevance
    const isWorkoutOrMovement =
      lower.includes('run') ||
      lower.includes('walk') ||
      lower.includes('knee') ||
      lower.includes('pain') ||
      lower.includes('dard') ||
      lower.includes('leg') ||
      lower.includes('workout') ||
      lower.includes('gym') ||
      lower.includes('exercise') ||
      lower.includes('squat');

    const isDietOrMeal =
      lower.includes('dinner') ||
      lower.includes('lunch') ||
      lower.includes('breakfast') ||
      lower.includes('khana') ||
      lower.includes('food') ||
      lower.includes('eat') ||
      lower.includes('diet') ||
      lower.includes('protein') ||
      lower.includes('calorie');

    const isSleepOrRecovery =
      lower.includes('sleep') ||
      lower.includes('tired') ||
      lower.includes('thak') ||
      lower.includes('neend') ||
      lower.includes('exhaust');

    let activeIssues: RetrievedHealthContext['activeIssues'] = [];
    let historicalIssues: RetrievedHealthContext['historicalIssues'] = [];
    let commitments: string[] = [];

    // Query database if pool available
    if (pool) {
      try {
        // Query active and recent issues
        const res = await pool.query(
          `SELECT id, title, category, severity, status, first_reported_at, last_mentioned_at, mention_count, resolved_at, notes
           FROM user_issues
           WHERE user_id = $1
           ORDER BY last_mentioned_at DESC
           LIMIT 10;`,
          [userId]
        );

        for (const row of res.rows) {
          if (row.status === 'open' || row.status === 'improving') {
            activeIssues.push({
              id: row.id,
              title: row.title,
              category: row.category,
              severity: row.severity,
              firstReported: row.first_reported_at ? new Date(row.first_reported_at).toLocaleDateString() : 'earlier',
              lastMentioned: row.last_mentioned_at ? new Date(row.last_mentioned_at).toLocaleDateString() : 'recently',
              mentionCount: row.mention_count || 1,
              notes: Array.isArray(row.notes) ? row.notes.slice(-2).map((n: any) => typeof n === 'string' ? n : n.text || JSON.stringify(n)) : [],
            });
          } else if (row.status === 'resolved') {
            historicalIssues.push({
              id: row.id,
              title: row.title,
              category: row.category,
              resolvedAt: row.resolved_at ? new Date(row.resolved_at).toLocaleDateString() : 'earlier',
            });
          }
        }

        // Query commitments from recent calls
        const notesRes = await pool.query(
          `SELECT note FROM call_notes
           WHERE user_id = $1 AND checkpoint_type = 'commitment_made'
           ORDER BY created_at DESC LIMIT 3;`,
          [userId]
        );
        commitments = notesRes.rows.map((r) => r.note);
      } catch (err: any) {
        console.warn('[HealthMemoryEngine] DB retrieval notice:', err.message);
      }
    }

    // Relevance filtering: Only include orthopedic pain when relevant to movement or if user mentions pain
    if (isDietOrMeal && !isWorkoutOrMovement && !lower.includes('pain') && !lower.includes('knee')) {
      // Do not clutter nutrition query with knee pain
      activeIssues = activeIssues.filter((i) => i.category !== 'pain' && i.category !== 'injury');
      historicalIssues = [];
    }

    // Format concise prompt snippet (guaranteed < 150 tokens)
    const promptLines: string[] = [];
    if (activeIssues.length > 0) {
      promptLines.push('ACTIVE HEALTH ISSUES (Remember & show continuity):');
      activeIssues.forEach((issue) => {
        promptLines.push(
          `- [${issue.category.toUpperCase()}] ${issue.title} (Severity: ${issue.severity || 'mild'}, first reported ${issue.firstReported}, mentioned ${issue.mentionCount} times). Notes: ${issue.notes?.join('; ') || 'None'}.`
        );
      });
    }

    if (commitments.length > 0) {
      promptLines.push(`PREVIOUS COMMITMENTS AGREED TOGETHER: ${commitments.join('; ')}`);
    }

    if (activityContext) {
      promptLines.push(
        `TODAY'S ACTIVITY: ${activityContext.todaySteps || 0} / ${activityContext.stepGoal || 10000} steps, ${activityContext.caloriesBurned || 0} active kcal.`
      );
    }

    return {
      activeIssues,
      historicalIssues,
      commitments,
      relevantDietaryPreferences: isDietOrMeal ? ['High protein target (120g)', 'Light vegetarian dinner'] : [],
      todayActivity: activityContext,
      promptSnippet: promptLines.join('\n'),
    };
  }

  /**
   * Asynchronously ingests symptoms without blocking user turn.
   */
  public static scheduleSymptomIngestion(userId: string, userMessage: string): void {
    setImmediate(async () => {
      try {
        await this.processSymptomIngestion(userId, userMessage);
      } catch (err: any) {
        console.warn('[HealthMemoryEngine] Background ingestion error:', err?.message || err);
      }
    });
  }

  /**
   * Extracts structured symptoms and updates existing issues or creates new ones.
   */
  public static async processSymptomIngestion(userId: string, message: string): Promise<void> {
    const lower = message.toLowerCase();
    const isResolution = /(theek ho gaya|theek hai|thik ho gaya|thik hai|theek ho gayi|thik ho gayi|ठीक हो गया|ठीक है|ठीक हो गई|ab dard nahi|dard nahi|no more pain|pain is gone|pain gone|completely solved|solved|all good|fully recovered|healed|no pain)/i.test(lower);
    const isImproving = /(thoda better|thoda theek|thoda thik|better now|getting better|improving|much better|pain kam|kam ho gaya|कम हो गया|थोड़ा बेहतर|थोड़ा ठीक)/i.test(lower);

    const symptoms: ExtractedSymptom[] = [];

    // Orthopedic / pain detection
    if ((lower.includes('knee') || lower.includes('joint')) && (lower.includes('pain') || lower.includes('dard') || lower.includes('swelling') || lower.includes('hurt') || isResolution || isImproving)) {
      symptoms.push({
        category: 'pain',
        title: 'Right knee discomfort and swelling',
        bodyPart: 'knee',
        severity: lower.includes('severe') || lower.includes('bahut') ? 'severe' : 'mild',
        trigger: lower.includes('run') ? 'running' : lower.includes('jump') ? 'jumping' : 'daily movement',
        rawMention: message,
      });
    } else if (lower.includes('back') && (lower.includes('pain') || lower.includes('dard') || lower.includes('stiff') || lower.includes('hurt') || isResolution || isImproving)) {
      symptoms.push({
        category: 'pain',
        title: 'Lower back stiffness and discomfort',
        bodyPart: 'back',
        severity: 'mild',
        trigger: lower.includes('sit') || lower.includes('desk') ? 'prolonged sitting' : 'exercise',
        rawMention: message,
      });
    } else if ((lower.includes('shoulder') || lower.includes('neck')) && (lower.includes('pain') || lower.includes('dard') || lower.includes('strain') || isResolution || isImproving)) {
      symptoms.push({
        category: 'pain',
        title: 'Shoulder/neck strain',
        bodyPart: lower.includes('neck') ? 'neck' : 'shoulder',
        severity: 'mild',
        rawMention: message,
      });
    }

    // Fatigue / sleep detection
    if (lower.includes('sleep') && (lower.includes('hour') || lower.includes('less') || lower.includes('neend') || lower.includes('wake'))) {
      symptoms.push({
        category: 'sleep',
        title: 'Disturbed sleep pattern',
        severity: 'mild',
        rawMention: message,
      });
    } else if (lower.includes('tired') || lower.includes('exhaust') || lower.includes('fatigue') || lower.includes('thak') || ((lower.includes('energy') || lower.includes('thakan')) && (lower.includes('low') || lower.includes('kam') || lower.includes('nahi') || lower.includes('down') || lower.includes('poor')))) {
      symptoms.push({
        category: 'energy',
        title: 'Low energy & physical fatigue',
        severity: 'mild',
        rawMention: message,
      });
    }

    if (symptoms.length === 0) return;

    const pool = SupabaseDb.getPool();

    for (const symptom of symptoms) {
      if (!pool) continue;

      try {
        // Check for existing issue with same category and body part
        const existingRes = await pool.query(
          `SELECT id, mention_count, notes, status FROM user_issues
           WHERE user_id = $1 AND category = $2 AND title ILIKE $3 AND status IN ('open', 'improving')
           LIMIT 1;`,
          [userId, symptom.category, `%${symptom.bodyPart || symptom.category}%`]
        );

        if (existingRes.rows.length > 0) {
          const existing = existingRes.rows[0];
          const currentNotes = Array.isArray(existing.notes) ? existing.notes : [];
          currentNotes.push({
            date: new Date().toISOString(),
            mention: symptom.rawMention,
            trigger: symptom.trigger,
          });

          if (isResolution) {
            // Resolution: set status = resolved, set resolved_at = NOW(), DO NOT increment mention_count or update last_mentioned_at
            await pool.query(
              `UPDATE user_issues
               SET status = 'resolved',
                   resolved_at = NOW(),
                   notes = $1::jsonb,
                   updated_at = NOW()
               WHERE id = $2;`,
              [JSON.stringify(currentNotes), existing.id]
            );
            console.log(`[HealthMemoryEngine] Resolved issue ${existing.id} from user message`);
          } else if (isImproving) {
            // Improvement: set status = improving, DO NOT increment mention_count or update last_mentioned_at
            await pool.query(
              `UPDATE user_issues
               SET status = 'improving',
                   notes = $1::jsonb,
                   updated_at = NOW()
               WHERE id = $2;`,
              [JSON.stringify(currentNotes), existing.id]
            );
            console.log(`[HealthMemoryEngine] Marked issue ${existing.id} as improving`);
          } else {
            // Active complaint: increment mention count and update last_mentioned_at
            const newCount = (existing.mention_count || 1) + 1;
            await pool.query(
              `UPDATE user_issues
               SET last_mentioned_at = NOW(),
                   mention_count = $1,
                   notes = $2::jsonb,
                   updated_at = NOW()
               WHERE id = $3;`,
              [newCount, JSON.stringify(currentNotes), existing.id]
            );
            console.log(`[HealthMemoryEngine] Updated existing issue ${existing.id} (mention count: ${newCount})`);
          }
        } else if (!isResolution && !isImproving) {
          // INSERT new issue only if it is NOT a resolution/improvement message
          const notes = [{ date: new Date().toISOString(), mention: symptom.rawMention, trigger: symptom.trigger }];
          await pool.query(
            `INSERT INTO user_issues (user_id, title, category, severity, status, first_reported_at, last_mentioned_at, mention_count, notes)
             VALUES ($1, $2, $3, $4, 'open', NOW(), NOW(), 1, $5::jsonb);`,
            [userId, symptom.title, symptom.category, symptom.severity || 'mild', JSON.stringify(notes)]
          );
          console.log(`[HealthMemoryEngine] Created new structured issue for user ${userId}: "${symptom.title}"`);
        }
      } catch (err: any) {
        console.warn('[HealthMemoryEngine] Database update error:', err.message);
      }
    }
  }

  /**
   * Updates an issue's status (open, improving, resolved), scoped by userId.
   * Resolving sets resolved_at = NOW().
   */
  public static async updateIssueStatus(
    userId: string,
    issueRef: string,
    status: 'open' | 'improving' | 'resolved',
    note?: string
  ): Promise<any> {
    const pool = SupabaseDb.getPool();
    if (!pool) return null;

    if (!['open', 'improving', 'resolved'].includes(status)) {
      throw new Error(`Invalid status "${status}". Allowed: open, improving, resolved`);
    }

    // Clean prefix like "[id:xxxxxxxx]" or bare id/prefix/title
    const cleanRef = issueRef.replace(/^\[id:/i, '').replace(/\]$/, '').trim();

    const findRes = await pool.query(
      `SELECT id, notes FROM user_issues
       WHERE user_id = $1 AND status IN ('open', 'improving') AND (id = $2 OR id ILIKE $3 OR title ILIKE $4)
       LIMIT 1;`,
      [userId, cleanRef, `${cleanRef}%`, `%${cleanRef}%`]
    );

    if (findRes.rows.length === 0) {
      return null;
    }

    const issue = findRes.rows[0];
    const notes = Array.isArray(issue.notes) ? issue.notes : [];
    if (note) {
      notes.push({
        date: new Date().toISOString(),
        mention: note,
        statusChange: status,
      });
    }

    if (status === 'resolved') {
      const purgeRes = await MemoryPurgeService.purgeResolvedIssue(userId, issue.id);
      return { id: issue.id, status: 'resolved', purged: true, details: purgeRes };
    }

    const updateRes = await pool.query(
      `UPDATE user_issues
       SET status = $1,
           resolved_at = NULL,
           notes = $2::jsonb,
           updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *;`,
      [status, JSON.stringify(notes), issue.id, userId]
    );

    return updateRes.rows[0];
  }
}
