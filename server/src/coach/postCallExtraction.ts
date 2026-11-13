import { SupabaseDb } from '../db/supabaseClient.js';
import { db } from '../db/index.js';
import { healthMemoryStore } from '../db/healthMemoryStore.js';
import { HealthMemoryEngine } from '../services/healthMemoryEngine.js';
import { ProfileFactEntity } from '../types/healthMemory.js';
import { TranscriptRetentionJob } from './memory/retentionJob.js';

export interface TranscriptTurn {
  callId: string;
  userId: string;
  turnIndex: number;
  role: 'user' | 'agent';
  text: string;
  createdAt: Date;
}

export interface CallExtractionJob {
  id: string;
  callId: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface ExtractedFact {
  category: 'dietary_preference' | 'routine' | 'symptom' | 'injury' | 'schedule' | 'goal' | 'family';
  key: string;
  value: string;
}

export interface IssueUpdate {
  issue_ref: string;
  status: 'open' | 'improving' | 'resolved';
  evidence: string;
}

export interface ExtractionResult {
  topics: string[];
  commitments: string[];
  facts: ExtractedFact[];
  issues: Array<{ category: string; title: string; severity?: string }>;
  issue_updates?: IssueUpdate[];
}

// In-memory caches for low-latency retrieval & fallback
const inMemoryTurns = new Map<string, Map<number, TranscriptTurn>>();
const inMemoryJobs = new Map<string, CallExtractionJob>();

/**
 * Persist an individual dialogue turn idempotently.
 */
export async function saveTranscriptTurn(
  callId: string,
  userId: string,
  turnIndex: number,
  role: 'user' | 'agent',
  text: string
): Promise<TranscriptTurn> {
  const turn: TranscriptTurn = {
    callId,
    userId,
    turnIndex,
    role,
    text: text.trim(),
    createdAt: new Date(),
  };

  // 1. In-memory storage
  if (!inMemoryTurns.has(callId)) {
    inMemoryTurns.set(callId, new Map());
  }
  inMemoryTurns.get(callId)!.set(turnIndex, turn);

  // Sync to db session transcript
  const session = db.getCallSession(callId);
  if (session) {
    const speaker = role === 'agent' ? 'coach' : 'user';
    const alreadyExists = session.transcript.some(
      (t) => t.speaker === speaker && t.text === turn.text
    );
    if (!alreadyExists) {
      db.appendTranscript(callId, speaker, turn.text);
    }
  }

  // 2. Persist to Postgres if available
  try {
    const pool = SupabaseDb.getPool();
    if (pool) {
      await pool.query(
        `INSERT INTO call_transcript_turns (call_id, user_id, turn_index, role, text, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (call_id, turn_index) DO UPDATE SET
           text = EXCLUDED.text,
           role = EXCLUDED.role`,
        [callId, userId, turnIndex, role, turn.text]
      );
    }
  } catch (err: any) {
    // Non-blocking: log warning only so caller is never broken by DB connectivity
    console.warn(`[postCallExtraction] Postgres turn write warning (${callId}, ${turnIndex}):`, err?.message || err);
  }

  return turn;
}

/**
 * Retrieve all turns for a call ordered by turnIndex ascending.
 */
export async function getCallTranscriptTurns(callId: string): Promise<TranscriptTurn[]> {
  const turns: TranscriptTurn[] = [];

  // Try Postgres first
  try {
    const pool = SupabaseDb.getPool();
    if (pool) {
      const res = await pool.query(
        `SELECT call_id, user_id, turn_index, role, text, created_at
         FROM call_transcript_turns
         WHERE call_id = $1
         ORDER BY turn_index ASC`,
        [callId]
      );
      if (res.rows && res.rows.length > 0) {
        return res.rows.map((r: any) => ({
          callId: r.call_id,
          userId: r.user_id,
          turnIndex: r.turn_index,
          role: r.role as 'user' | 'agent',
          text: r.text,
          createdAt: new Date(r.created_at),
        }));
      }
    }
  } catch (err: any) {
    console.warn(`[postCallExtraction] Postgres fetch turns warning (${callId}):`, err?.message || err);
  }

  // Fallback to in-memory cache
  const cachedMap = inMemoryTurns.get(callId);
  if (cachedMap) {
    const sorted = Array.from(cachedMap.values()).sort((a, b) => a.turnIndex - b.turnIndex);
    return sorted;
  }

  return turns;
}

/**
 * Get or create extraction job state.
 */
export async function getCallExtractionJob(callId: string): Promise<CallExtractionJob | undefined> {
  // Check memory
  const cached = inMemoryJobs.get(callId);
  if (cached) return cached;

  // Check Postgres
  try {
    const pool = SupabaseDb.getPool();
    if (pool) {
      const res = await pool.query(
        `SELECT id, call_id, user_id, status, attempts, created_at, completed_at
         FROM call_extraction_jobs
         WHERE call_id = $1`,
        [callId]
      );
      if (res.rows && res.rows[0]) {
        const r = res.rows[0];
        const job: CallExtractionJob = {
          id: r.id,
          callId: r.call_id,
          userId: r.user_id,
          status: r.status,
          attempts: r.attempts,
          createdAt: new Date(r.created_at),
          completedAt: r.completed_at ? new Date(r.completed_at) : undefined,
        };
        inMemoryJobs.set(callId, job);
        return job;
      }
    }
  } catch (err: any) {
    console.warn(`[postCallExtraction] Postgres get job warning (${callId}):`, err?.message || err);
  }

  return undefined;
}

/**
 * Execute post-call extraction job.
 * Safe to re-run multiple times on the same call without duplicating facts, notes or issues.
 */
export async function processCallExtraction(
  callId: string,
  userId: string
): Promise<{ job: CallExtractionJob; result: ExtractionResult }> {
  const existingJob = inMemoryJobs.get(callId);
  const attempts = (existingJob?.attempts || 0) + 1;
  const jobId = existingJob?.id || `ext_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const job: CallExtractionJob = {
    id: jobId,
    callId,
    userId,
    status: 'processing',
    attempts,
    createdAt: existingJob?.createdAt || new Date(),
  };
  inMemoryJobs.set(callId, job);

  // Sync processing status to Postgres
  try {
    const pool = SupabaseDb.getPool();
    if (pool) {
      await pool.query(
        `INSERT INTO call_extraction_jobs (call_id, user_id, status, attempts, created_at)
         VALUES ($1, $2, 'processing', $3, NOW())
         ON CONFLICT (call_id) DO UPDATE SET
           status = 'processing',
           attempts = call_extraction_jobs.attempts + 1`,
        [callId, userId, attempts]
      );
    }
  } catch (err: any) {
    console.warn(`[postCallExtraction] Postgres job init warning:`, err?.message || err);
  }

  try {
    // 1. Retrieve dialogue turns
    const turns = await getCallTranscriptTurns(callId);
    const userTurns = turns.filter((t) => t.role === 'user');
    const userText = userTurns.map((t) => t.text).join(' ');
    const allText = turns.map((t) => `${t.role}: ${t.text}`).join('\n');
    const lower = allText.toLowerCase();

    // 2. Extract topics covered
    const topics: string[] = [];
    if (lower.includes('food') || lower.includes('meal') || lower.includes('roti') || lower.includes('diet') || lower.includes('protein') || lower.includes('calorie')) {
      topics.push('nutrition');
    }
    if (lower.includes('walk') || lower.includes('step') || lower.includes('workout') || lower.includes('exercise') || lower.includes('squat') || lower.includes('gym')) {
      topics.push('activity');
    }
    if (lower.includes('water') || lower.includes('paani') || lower.includes('hydrat') || lower.includes('liquid') || lower.includes('glass')) {
      topics.push('hydration');
    }
    if (lower.includes('pain') || lower.includes('dard') || lower.includes('knee') || lower.includes('back') || lower.includes('shoulder') || lower.includes('injury')) {
      topics.push('pain_management');
    }
    if (lower.includes('sleep') || lower.includes('neend') || lower.includes('rest') || lower.includes('tired')) {
      topics.push('sleep_recovery');
    }

    // 3. Extract commitments
    const commitments: string[] = [];
    for (const t of turns) {
      const txt = t.text.toLowerCase();
      if (txt.includes('steps') || txt.includes('walk')) {
        const match = t.text.match(/(\d{3,5})\s*steps/i) || t.text.match(/(\d{1,3})\s*minute\s*walk/i);
        if (match && !commitments.includes(match[0])) {
          commitments.push(`Walk goal: ${match[0]}`);
        }
      }
      if (txt.includes('water') || txt.includes('paani')) {
        const match = t.text.match(/(\d+(\.\d+)?)\s*(litre|liter|l|glass)/i);
        if (match && !commitments.includes(match[0])) {
          commitments.push(`Hydration: ${match[0]}`);
        }
      }
    }

    // 4. Extract facts stated
    const facts: ExtractedFact[] = [];
    if (userText.toLowerCase().includes('vegetarian') || userText.toLowerCase().includes('shakahari')) {
      facts.push({ category: 'dietary_preference', key: 'diet_type', value: 'vegetarian' });
    } else if (userText.toLowerCase().includes('vegan')) {
      facts.push({ category: 'dietary_preference', key: 'diet_type', value: 'vegan' });
    } else if (userText.toLowerCase().includes('non-veg') || userText.toLowerCase().includes('nonveg')) {
      facts.push({ category: 'dietary_preference', key: 'diet_type', value: 'non_vegetarian' });
    }

    if (userText.toLowerCase().includes('lactose') || userText.toLowerCase().includes('milk problem') || userText.toLowerCase().includes('doodh se allergy')) {
      facts.push({ category: 'dietary_preference', key: 'lactose_intolerance', value: 'positive' });
    }
    if (userText.toLowerCase().includes('peanut')) {
      facts.push({ category: 'dietary_preference', key: 'peanut_allergy', value: 'positive' });
    }
    if (userText.toLowerCase().includes('diabetes') || userText.toLowerCase().includes('sugar problem')) {
      facts.push({ category: 'symptom', key: 'diabetes', value: 'type_2' });
    }
    if (userText.toLowerCase().includes('thyroid')) {
      facts.push({ category: 'symptom', key: 'thyroid', value: 'hypothyroid' });
    }

    // Persist facts into HealthMemoryStore profileFacts (idempotent upsert by category & key)
    const existingFacts = healthMemoryStore.profileFacts.get(userId) || [];
    for (const fact of facts) {
      const idx = existingFacts.findIndex((f) => f.category === fact.category && f.key === fact.key);
      if (idx >= 0) {
        existingFacts[idx].value = fact.value;
        existingFacts[idx].updatedAt = new Date().toISOString();
      } else {
        const newEntity: ProfileFactEntity = {
          id: `fact_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId,
          category: fact.category,
          key: fact.key,
          value: fact.value,
          confidence: 0.95,
          verificationStatus: 'user_reported',
          sourceSessionId: callId,
          effectiveFrom: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        existingFacts.push(newEntity);
      }
    }
    healthMemoryStore.profileFacts.set(userId, existingFacts);

    // 5. Extract issue updates and symptoms mentioned
    const issueUpdates: IssueUpdate[] = [];
    const isResolution = /(theek ho gaya|theek hai|thik ho gaya|thik hai|theek ho gayi|thik ho gayi|ठीक हो गया|ठीक है|ठीक हो गई|ab dard nahi|dard nahi|no more pain|pain is gone|pain gone|completely solved|solved|all good|fully recovered|healed|no pain)/i;
    const isImproving = /(thoda better|thoda theek|thoda thik|better now|getting better|improving|much better|pain kam|kam ho gaya|कम हो गया|थोड़ा बेहतर|थोड़ा ठीक)/i;

    for (const turn of turns) {
      if (turn.role !== 'user') continue;
      const t = turn.text;
      const lowerT = t.toLowerCase();
      let matchedStatus: 'resolved' | 'improving' | null = null;
      if (isResolution.test(lowerT)) {
        matchedStatus = 'resolved';
      } else if (isImproving.test(lowerT)) {
        matchedStatus = 'improving';
      }

      if (matchedStatus) {
        let targetRef = '';
        if (lowerT.includes('shoulder') || lowerT.includes('neck')) targetRef = 'shoulder';
        else if (lowerT.includes('knee') || lowerT.includes('joint')) targetRef = 'knee';
        else if (lowerT.includes('back')) targetRef = 'back';
        else if (lowerT.includes('energy') || lowerT.includes('fatigue') || lowerT.includes('thak')) targetRef = 'energy';

        if (targetRef) {
          const updated = await HealthMemoryEngine.updateIssueStatus(userId, targetRef, matchedStatus, t);
          if (updated) {
            issueUpdates.push({
              issue_ref: updated.id,
              status: matchedStatus,
              evidence: t,
            });
          }
        }
      }
    }

    if (userText.trim().length > 0) {
      await HealthMemoryEngine.processSymptomIngestion(userId, userText);
    }

    // Read back active issues
    const retrieved = await HealthMemoryEngine.getRelevantContext(userId, userText);
    const issues = retrieved.activeIssues.map((i) => ({
      category: i.category,
      title: i.title,
      severity: i.severity,
    }));

    // 6. Idempotent save to call_notes (upsert / replace for this call)
    try {
      const pool = SupabaseDb.getPool();
      if (pool) {
        await pool.query(
          `DELETE FROM call_notes WHERE call_id = $1 AND checkpoint_type = 'extraction'`,
          [callId]
        );
        await pool.query(
          `INSERT INTO call_notes (call_id, user_id, checkpoint_type, note, data, created_at)
           VALUES ($1, $2, 'extraction', $3, $4, NOW())`,
          [
            callId,
            userId,
            `Post-call extraction: ${topics.join(', ')}`,
            JSON.stringify({ topics, commitments, facts, issues, issue_updates: issueUpdates }),
          ]
        );
      }
    } catch (err: any) {
      console.warn(`[postCallExtraction] Postgres call_notes upsert warning:`, err?.message || err);
    }

    const result: ExtractionResult = {
      topics,
      commitments,
      facts,
      issues,
      issue_updates: issueUpdates,
    };

    // 7. Mark job completed
    job.status = 'completed';
    job.completedAt = new Date();
    inMemoryJobs.set(callId, job);

    try {
      const pool = SupabaseDb.getPool();
      if (pool) {
        await pool.query(
          `UPDATE call_extraction_jobs
           SET status = 'completed', completed_at = NOW()
           WHERE call_id = $1`,
          [callId]
        );
      }
    } catch (err: any) {
      console.warn(`[postCallExtraction] Postgres job complete warning:`, err?.message || err);
    }

    // R6 Trigger: event-driven retention check right after extraction completes
    if (TranscriptRetentionJob.isEnabled()) {
      try {
        await TranscriptRetentionJob.pruneUserCalls(userId, false);
      } catch (retErr: any) {
        console.warn(`[postCallExtraction] Event-driven retention notice:`, retErr?.message || retErr);
      }
    }

    return { job, result };
  } catch (err: any) {
    job.status = 'failed';
    job.error = err?.message || String(err);
    inMemoryJobs.set(callId, job);

    try {
      const pool = SupabaseDb.getPool();
      if (pool) {
        await pool.query(
          `UPDATE call_extraction_jobs
           SET status = 'failed'
           WHERE call_id = $1`,
          [callId]
        );
      }
    } catch {
      // Ignore
    }

    throw err;
  }
}
