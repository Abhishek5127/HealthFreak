"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PendingOpsManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const supabaseClient_js_1 = require("../../db/supabaseClient.js");
const purgeService_js_1 = require("./purgeService.js");
const pendingOpStore_js_1 = require("./pendingOpStore.js");
let patternsCache = null;
function loadPatterns() {
    if (patternsCache)
        return patternsCache;
    const candidates = [
        typeof __dirname !== 'undefined' ? path_1.default.resolve(__dirname, 'confirmation_patterns.json') : '',
        path_1.default.resolve(process.cwd(), 'src/coach/memory/confirmation_patterns.json'),
        path_1.default.resolve(process.cwd(), 'server/src/coach/memory/confirmation_patterns.json'),
    ].filter(Boolean);
    for (const p of candidates) {
        try {
            if (fs_1.default.existsSync(p)) {
                patternsCache = JSON.parse(fs_1.default.readFileSync(p, 'utf-8'));
                return patternsCache;
            }
        }
        catch { }
    }
    // Fallback defaults
    patternsCache = {
        add_op: {
            yes: ['theek hai', 'ok', 'okay', 'haan', 'yes', 'ji', 'chalega', 'kar do', 'ठीक है', 'हाँ', 'जी'],
            no: ['nahi', 'na', 'mat', 'ruko', 'रहने दो', 'नहीं', 'ना', 'मत', 'रुको'],
        },
        resolve_op: {
            yes: ['haan', 'yes', 'bilkul', 'hata do', 'delete', 'हाँ', 'हटा दो'],
            ambiguous: ['theek hai', 'ok', 'okay', 'theek', 'ठीक है'],
            no: ['nahi', 'na', 'mat', 'रहने दो', 'नहीं', 'ना', 'मत हटाओ'],
        },
    };
    return patternsCache;
}
class PendingOpsManager {
    static userTurnCounters = new Map();
    static getTurn(userId) {
        return this.userTurnCounters.get(userId) || 0;
    }
    static async incrementTurn(userId, sessionId = 'default') {
        const next = (this.userTurnCounters.get(userId) || 0) + 1;
        this.userTurnCounters.set(userId, next);
        const op = await pendingOpStore_js_1.PendingOpStore.get(userId, sessionId);
        if (op && next > op.expiresAfterTurn) {
            await pendingOpStore_js_1.PendingOpStore.delete(userId, sessionId);
        }
        return next;
    }
    static async getPendingOp(userId, sessionId = 'default') {
        const op = await pendingOpStore_js_1.PendingOpStore.get(userId, sessionId);
        if (!op)
            return null;
        const currentTurn = this.getTurn(userId);
        if (currentTurn > op.expiresAfterTurn) {
            await pendingOpStore_js_1.PendingOpStore.delete(userId, sessionId);
            return null;
        }
        return op;
    }
    static async setPendingOp(op, sessionId = 'default') {
        if (!this.userTurnCounters.has(op.userId)) {
            this.userTurnCounters.set(op.userId, op.createdTurn);
        }
        op.sessionId = sessionId;
        await pendingOpStore_js_1.PendingOpStore.save(op, sessionId, 600); // 10 minutes TTL
    }
    static async discardPendingOp(userId, sessionId = 'default') {
        await pendingOpStore_js_1.PendingOpStore.delete(userId, sessionId);
    }
    /**
     * Context-Aware Confirmation Classifier (Rule E1).
     * Shared parity with Python confirmation_classifier.py via confirmation_patterns.json.
     */
    static classifyConfirmation(message, opType = 'resolve_issue') {
        if (!message || !message.trim())
            return 'unrelated';
        const patterns = loadPatterns();
        const clean = message.trim().toLowerCase().replace(/[.,!?:।\n]/g, '');
        const isAdd = opType === 'add_issue' || opType === 'add_fact';
        const targetConfig = isAdd ? patterns.add_op : patterns.resolve_op;
        // 1. Check strict affirmative
        for (const y of targetConfig.yes) {
            const yClean = y.toLowerCase().trim();
            if (clean === yClean || clean.startsWith(`${yClean} `) || clean.endsWith(` ${yClean}`)) {
                return 'yes';
            }
        }
        // 2. Check ambiguous for resolve/remove ops (e.g. bare "theek hai" or "ok")
        if (!isAdd && targetConfig.ambiguous) {
            for (const a of targetConfig.ambiguous) {
                const aClean = a.toLowerCase().trim();
                if (clean === aClean || clean.startsWith(`${aClean} `) || clean.endsWith(` ${aClean}`)) {
                    return 'ambiguous';
                }
            }
        }
        // 3. Check negative
        for (const n of targetConfig.no) {
            const nClean = n.toLowerCase().trim();
            if (clean === nClean || clean.startsWith(`${nClean} `) || clean.endsWith(` ${nClean}`)) {
                return 'no';
            }
        }
        return 'unrelated';
    }
    /**
     * Evaluates incoming message for memory mutation candidates.
     * Rewords add confirmation as one short statement merged with the next useful question.
     */
    static detectCandidate(message, openIssues, currentTurn, userId, sessionId = 'default') {
        const lower = message.toLowerCase();
        // 1. Resolution Candidates against open issues
        const resolutionWords = [
            'theek ho gaya', 'theek hai', 'dard khatam', 'bilkul theek', 'gone', 'cured', 'no more',
            'resolved', 'recovered', 'hurt nahi kar raha', 'dard nahi', 'dard nahi hai', 'pain nahi', 'no pain', 'not hurting'
        ];
        const isResolutionStatement = resolutionWords.some((w) => lower.includes(w));
        const BODY_SYNONYMS = {
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
                if (lower.includes(titleLower)) {
                    matchesIssue = true;
                }
                else {
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
                        sessionId,
                        type: 'resolve_issue',
                        payload: {
                            issueId: issue.id,
                            title: issue.title,
                            category: issue.category,
                        },
                        createdTurn: currentTurn,
                        expiresAfterTurn: currentTurn + 3,
                        confirmationQuestion: `तो ${issue.title} अब पूरी तरह ठीक है, सही? मैं इसे हटा देता हूँ।`,
                        ambiguousAttempts: 0,
                    };
                }
            }
        }
        // 2. False-Positive Guard for Issue Addition:
        // Positive statements: never create an issue
        const positiveStatements = ['energy is great', 'energy achhi hai', 'feeling energetic', 'mast lag raha', 'sab badhiya', 'feel great', 'feel good'];
        if (positiveStatements.some((p) => lower.includes(p))) {
            return null;
        }
        // Negations: never create an issue
        const negations = ['no pain', 'dard nahi', 'pain nahi', 'not hurting', 'takleef nahi', 'bilkul dard nahi'];
        if (negations.some((n) => lower.includes(n))) {
            return null;
        }
        // Explicit negative symptom report (Merged short statement with next useful question, Rule E1)
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
                const alreadyOpen = openIssues.some((o) => o.title.toLowerCase() === sp.title.toLowerCase());
                if (alreadyOpen) {
                    return null;
                }
                // Rule E1: short statement merged with next useful question (e.g. "कंधे का दर्द कल से है, सही? नोट कर लेता हूँ।")
                return {
                    id: `op_${Date.now()}_add`,
                    userId,
                    sessionId,
                    type: 'add_issue',
                    payload: {
                        title: sp.title,
                        category: sp.category,
                        severity: lower.includes('severe') || lower.includes('bahut zyada') ? 'severe' : 'mild',
                    },
                    createdTurn: currentTurn,
                    expiresAfterTurn: currentTurn + 3,
                    confirmationQuestion: `${sp.title} कल से है, सही? नोट कर लेता हूँ।`,
                    ambiguousAttempts: 0,
                };
            }
        }
        return null;
    }
    /**
     * Applies confirmed pending memory operation.
     */
    static async applyOp(op) {
        if (op.type === 'resolve_issue' && op.payload.issueId) {
            const res = await purgeService_js_1.MemoryPurgeService.purgeResolvedIssue(op.userId, op.payload.issueId);
            return { success: res.success, details: res };
        }
        if (op.type === 'add_issue' && op.payload.title) {
            const pool = supabaseClient_js_1.SupabaseDb.getPool();
            if (pool) {
                const existing = await pool.query(`SELECT id, mention_count FROM user_issues
           WHERE user_id = $1 AND title ILIKE $2 AND status IN ('open', 'improving')`, [op.userId, op.payload.title]);
                if (existing.rows.length > 0) {
                    await pool.query(`UPDATE user_issues
             SET mention_count = mention_count + 1, last_mentioned_at = NOW()
             WHERE id = $1`, [existing.rows[0].id]);
                    return { success: true, details: 'incremented_existing' };
                }
                await pool.query(`INSERT INTO user_issues (user_id, title, category, severity, status, first_reported_at, last_mentioned_at, mention_count)
           VALUES ($1, $2, $3, $4, 'open', NOW(), NOW(), 1)`, [op.userId, op.payload.title, op.payload.category || 'pain', op.payload.severity || 'mild']);
                return { success: true, details: 'inserted_new' };
            }
        }
        if (op.type === 'remove_fact' && op.payload.factKey) {
            const res = await purgeService_js_1.MemoryPurgeService.purgeFact(op.userId, op.payload.factKey, op.payload.factCategory);
            return { success: res.success, details: res };
        }
        return { success: false, details: 'unsupported_op' };
    }
}
exports.PendingOpsManager = PendingOpsManager;
