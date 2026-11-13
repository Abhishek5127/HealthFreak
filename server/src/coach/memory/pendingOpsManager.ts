import { SupabaseDb } from '../../db/supabaseClient.js';
import { MemoryPurgeService } from './purgeService.js';

export interface PendingMemoryOp {
  id: string;
  userId: string;
  type: 'add_issue' | 'resolve_issue' | 'add_fact' | 'remove_fact';
  payload: {
    issueId?: string;
    title?: string;
    category?: string;
    severity?: string;
    factCategory?: string;
    factKey?: string;
    factValue?: any;
  };
  createdTurn: number;
  expiresAfterTurn: number;
  confirmationQuestion: string;
}

const AFFIRMATIVE_RESPONSES = new Set([
  'yes', 'yeah', 'yep', 'yup', 'ha', 'haan', 'haanji', 'sahi', 'sahi hai', 'bilkul', 'hata do', 'hata dijiye',
  'correct', 'sure', 'right', 'ha hata do', 'haan hata do', 'yes please', 'theek hai hata do', 'bilkul theek hai hata do',
  'हां', 'हाँ', 'हाँजी', 'सही', 'बिल्कुल', 'हटा दो', 'हटा दीजिए', 'हाँ हटा दो'
]);

const NEGATIVE_RESPONSES = new Set([
  'no', 'nah', 'nahi', 'na', 'mat hatao', 'rehne do', 'not yet', 'nope', 'still hurts', 'abhi hai',
  'abhi bhi dard hai', 'nahi abhi theek nahi', 'thoda dard hai', 'नहीं', 'ना', 'मत हटाओ', 'रहने दो', 'अभी भी दर्द है'
]);

export class PendingOpsManager {
  private static ops = new Map<string, PendingMemoryOp>();
  private static userTurnCounters = new Map<string, number>();

  public static getTurn(userId: string): number {
    return this.userTurnCounters.get(userId) || 0;
  }

  public static incrementTurn(userId: string): number {
    const next = (this.userTurnCounters.get(userId) || 0) + 1;
    this.userTurnCounters.set(userId, next);

    // Expire pending ops older than 3 turns
    const op = this.ops.get(userId);
    if (op && next > op.expiresAfterTurn) {
      this.ops.delete(userId);
    }
    return next;
  }

  public static getPendingOp(userId: string): PendingMemoryOp | null {
    const op = this.ops.get(userId);
    if (!op) return null;
    const currentTurn = this.getTurn(userId);
    if (currentTurn > op.expiresAfterTurn) {
      this.ops.delete(userId);
      return null;
    }
    return op;
  }

  public static setPendingOp(op: PendingMemoryOp): void {
    if (!this.userTurnCounters.has(op.userId)) {
      this.userTurnCounters.set(op.userId, op.createdTurn);
    }
    this.ops.set(op.userId, op);
  }

  public static discardPendingOp(userId: string): void {
    this.ops.delete(userId);
  }

  /**
   * Strict classification of confirmation response.
   * "theek hai" alone DOES NOT delete or confirm anything.
   */
  public static classifyConfirmation(message: string): 'yes' | 'no' | 'unrelated' {
    const trimmed = message.trim().toLowerCase().replace(/[.,!?:।]/g, '');

    // Check strict affirmative
    if (AFFIRMATIVE_RESPONSES.has(trimmed)) {
      return 'yes';
    }

    // Check affirmative phrases
    for (const aff of AFFIRMATIVE_RESPONSES) {
      if (trimmed.startsWith(`${aff} `) || trimmed.endsWith(` ${aff}`)) {
        return 'yes';
      }
    }

    // Check strict negative
    if (NEGATIVE_RESPONSES.has(trimmed)) {
      return 'no';
    }

    for (const neg of NEGATIVE_RESPONSES) {
      if (trimmed.startsWith(`${neg} `) || trimmed.endsWith(` ${neg}`)) {
        return 'no';
      }
    }

    // "theek hai" alone without "hata do" or affirmative qualifier is considered unrelated/neutral
    return 'unrelated';
  }

  /**
   * Evaluates incoming message for memory mutation candidates.
   * Enforces False-Positive Guard (Rule 3) and resolution matching.
   */
  public static detectCandidate(
    message: string,
    openIssues: Array<{ id: string; title: string; category?: string }>,
    currentTurn: number,
    userId: string
  ): PendingMemoryOp | null {
    const lower = message.toLowerCase();

    // 1. Check for Resolution Candidates against open issues
    // Pattern examples: "kandhe ka dard ab theek hai", "ghutne me ab dard nahi hai", "knee pain is gone"
    const resolutionWords = [
      'theek ho gaya', 'theek hai', 'dard khatam', 'bilkul theek', 'gone', 'cured', 'no more',
      'resolved', 'recovered', 'hurt nahi kar raha', 'dard nahi', 'dard nahi hai', 'pain nahi', 'no pain', 'not hurting'
    ];
    const isResolutionStatement = resolutionWords.some((w) => lower.includes(w));

    const BODY_SYNONYMS: Record<string, string[]> = {
      shoulder: ['shoulder', 'kandha', 'kandhe', 'strain'],
      knee: ['knee', 'ghutna', 'ghutne', 'patella'],
      back: ['back', 'kamar', 'peeth', 'spine'],
      acne: ['acne', 'pimple', 'muhase'],
      digestion: ['digestion', 'pet', 'kabz', 'acidity', 'constipation'],
      energy: ['energy', 'thakaan', 'fatigue', 'tiredness'],
    };

    if (isResolutionStatement) {
      for (const issue of openIssues) {
        const titleLower = issue.title.toLowerCase();
        let matchesIssue = false;

        // Direct substring check
        if (lower.includes(titleLower)) {
          matchesIssue = true;
        } else {
          // Check body part / synonym match
          for (const [key, syns] of Object.entries(BODY_SYNONYMS)) {
            const issueHasKey = syns.some((s) => titleLower.includes(s));
            const msgHasKey = syns.some((s) => lower.includes(s));
            if (issueHasKey && msgHasKey) {
              matchesIssue = true;
              break;
            }
          }
        }

        if (matchesIssue) {
          return {
            id: `op_${Date.now()}_res`,
            userId,
            type: 'resolve_issue',
            payload: {
              issueId: issue.id,
              title: issue.title,
              category: issue.category,
            },
            createdTurn: currentTurn,
            expiresAfterTurn: currentTurn + 3,
            confirmationQuestion: `तो ${issue.title} अब पूरी तरह ठीक है, सही? मैं इसे आपके हेल्थ रिकॉर्ड से हटा देता हूँ।`,
          };
        }
      }
    }

    // 2. False-Positive Guard for Issue Addition:
    // Never create an issue from positive statements like "my energy is great"
    const positiveStatements = ['energy is great', 'energy achhi hai', 'feeling energetic', 'mast lag raha', 'sab badhiya', 'feel great', 'feel good'];
    if (positiveStatements.some((p) => lower.includes(p))) {
      return null;
    }

    // Never create an issue from negated words like "no pain", "dard nahi hai"
    const negations = ['no pain', 'dard nahi', 'pain nahi', 'not hurting', 'takleef nahi', 'bilkul dard nahi'];
    if (negations.some((n) => lower.includes(n))) {
      return null;
    }

    // Check for explicit negative symptom report
    const symptomPatterns = [
      { pattern: /(?:knee|ghutne)\s*(?:me|mein)?\s*(?:dard|pain|injury)/i, title: 'Knee Pain', category: 'pain' },
      { pattern: /(?:shoulder|kandhe)\s*(?:me|mein)?\s*(?:dard|pain|strain)/i, title: 'Shoulder Pain', category: 'pain' },
      { pattern: /(?:back|kamar)\s*(?:me|mein)?\s*(?:dard|pain|stiffness)/i, title: 'Back Pain', category: 'pain' },
      { pattern: /(?:acne|pimple)\s*(?:flare|problem|aagaye)/i, title: 'Acne Flare', category: 'dermatology' },
      { pattern: /(?:constipation|pet saaf nahi|kabz)/i, title: 'Constipation', category: 'digestion' },
      { pattern: /(?:low energy|bahut thakaan|exhausted|zero energy)/i, title: 'Low Energy', category: 'energy' },
    ];

    for (const sp of symptomPatterns) {
      if (sp.pattern.test(message)) {
        // Check if already open
        const alreadyOpen = openIssues.some(
          (o) => o.title.toLowerCase() === sp.title.toLowerCase()
        );
        if (alreadyOpen) {
          return null;
        }

        return {
          id: `op_${Date.now()}_add`,
          userId,
          type: 'add_issue',
          payload: {
            title: sp.title,
            category: sp.category,
            severity: lower.includes('severe') || lower.includes('bahut zyada') ? 'severe' : 'mild',
          },
          createdTurn: currentTurn,
          expiresAfterTurn: currentTurn + 3,
          confirmationQuestion: `Aapne ${sp.title} mention kiya. Kya main ise workout safety ke liye track karu?`,
        };
      }
    }

    return null;
  }

  /**
   * Applies confirmed pending memory operation.
   */
  public static async applyOp(op: PendingMemoryOp): Promise<{ success: boolean; details?: any }> {
    if (op.type === 'resolve_issue' && op.payload.issueId) {
      const res = await MemoryPurgeService.purgeResolvedIssue(op.userId, op.payload.issueId);
      return { success: res.success, details: res };
    }

    if (op.type === 'add_issue' && op.payload.title) {
      const pool = SupabaseDb.getPool();
      if (pool) {
        // Dedupe against open issues
        const existing = await pool.query(
          `SELECT id, mention_count FROM user_issues
           WHERE user_id = $1 AND title ILIKE $2 AND status IN ('open', 'improving')`,
          [op.userId, op.payload.title]
        );

        if (existing.rows.length > 0) {
          // Increment mention count
          await pool.query(
            `UPDATE user_issues
             SET mention_count = mention_count + 1, last_mentioned_at = NOW()
             WHERE id = $1`,
            [existing.rows[0].id]
          );
          return { success: true, details: 'incremented_existing' };
        }

        // Insert new confirmed issue
        await pool.query(
          `INSERT INTO user_issues (user_id, title, category, severity, status, first_reported_at, last_mentioned_at, mention_count)
           VALUES ($1, $2, $3, $4, 'open', NOW(), NOW(), 1)`,
          [op.userId, op.payload.title, op.payload.category || 'pain', op.payload.severity || 'mild']
        );
        return { success: true, details: 'inserted_new' };
      }
    }

    if (op.type === 'remove_fact' && op.payload.factKey) {
      const res = await MemoryPurgeService.purgeFact(op.userId, op.payload.factKey, op.payload.factCategory);
      return { success: res.success, details: res };
    }

    return { success: false, details: 'unsupported_op' };
  }
}
