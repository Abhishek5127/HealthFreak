"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamingOpenerFilter = exports.OpenerBudget = void 0;
exports.countSentences = countSentences;
exports.detectLeadingOpener = detectLeadingOpener;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
let patternsCache = null;
function loadPatterns() {
    if (patternsCache)
        return patternsCache;
    const candidates = [
        typeof __dirname !== 'undefined' ? path_1.default.resolve(__dirname, 'opener_patterns.json') : '',
        path_1.default.resolve(process.cwd(), 'src/coach/style/opener_patterns.json'),
        path_1.default.resolve(process.cwd(), 'server/src/coach/style/opener_patterns.json'),
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
    patternsCache = {
        interjections_roman: ['arre', 'are', 'arey', 'arrey', 'oye', 'hey', 'oh', 'wah', 'namaste', 'hello', 'hi'],
        interjections_devanagari: ['अरे', 'ओह', 'वाह', 'अरे वाह', 'ओए', 'नमस्ते', 'हैलो', 'हाय'],
        honorifics: ['ji', 'जी'],
        min_gap_sentences_default: 20,
    };
    return patternsCache;
}
/**
 * Counts sentences ignoring decimals (e.g. 2.5) and common abbreviations (e.g. Dr., vs.)
 */
function countSentences(text) {
    if (!text || !text.trim())
        return 0;
    // Mask decimals like 2.5 or 0.75
    let sanitized = text.replace(/(\d+)\.(\d+)/g, '$1_$2');
    // Mask common abbreviations
    sanitized = sanitized.replace(/\b(dr|mr|mrs|ms|vs|approx|e\.g|i\.e|etc|kg|km|ml|min|sec)\./gi, '$1_');
    const matches = sanitized.match(/([.?!।]+)/g);
    if (!matches) {
        return text.trim().length > 0 ? 1 : 0;
    }
    return Math.max(1, matches.length);
}
/**
 * Checks if text starts with a detected interjection or user name (Roman / Devanagari).
 * Only matches at the very beginning of the string. Mid-sentence uses are untouched.
 */
function detectLeadingOpener(text, userName) {
    if (!text || !text.trim()) {
        return { hasOpener: false, matchedClause: '', remainingText: text };
    }
    const patterns = loadPatterns();
    const trimmed = text.trim();
    const interjections = [
        ...patterns.interjections_devanagari,
        ...patterns.interjections_roman,
    ].sort((a, b) => b.length - a.length);
    // Build escaped name regex parts
    const cleanName = userName?.trim();
    const nameParts = [];
    if (cleanName && cleanName.toLowerCase() !== 'friend') {
        const escaped = cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        nameParts.push(escaped);
    }
    // Build honorifics regex part
    const honorificRegex = '(?:\\s+(?:ji|जी))?';
    // 1. Check composite opener: [Interjection] [Name] [Honorific]? [,!:-]?
    for (const inter of interjections) {
        const escInter = inter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (nameParts.length > 0) {
            for (const np of nameParts) {
                const compRegex = new RegExp(`^(${escInter}\\s+${np}${honorificRegex}\\s*[,!:-]?\\s*)`, 'i');
                const match = trimmed.match(compRegex);
                if (match) {
                    const matchedClause = match[1];
                    let remainder = trimmed.slice(matchedClause.length).trim();
                    if (remainder.length > 0) {
                        remainder = remainder.charAt(0).toUpperCase() + remainder.slice(1);
                    }
                    return { hasOpener: true, matchedClause, remainingText: remainder };
                }
            }
        }
        // Generic composite: [Interjection] [Single Word / Name] [Honorific]? [,!:-]
        const genericCompRegex = new RegExp(`^(${escInter}\\s+[\\p{L}\\p{M}]+${honorificRegex}\\s*[,!:-]\\s*)`, 'iu');
        const genMatch = trimmed.match(genericCompRegex);
        if (genMatch) {
            const matchedClause = genMatch[1];
            let remainder = trimmed.slice(matchedClause.length).trim();
            if (remainder.length > 0) {
                remainder = remainder.charAt(0).toUpperCase() + remainder.slice(1);
            }
            return { hasOpener: true, matchedClause, remainingText: remainder };
        }
        // 2. Standalone interjection: [Interjection] [,!:-]?
        const interRegex = new RegExp(`^(${escInter}\\s*[,!:-]?\\s*)`, 'i');
        const matchInter = trimmed.match(interRegex);
        if (matchInter) {
            const matchedClause = matchInter[1];
            let remainder = trimmed.slice(matchedClause.length).trim();
            if (remainder.length > 0) {
                remainder = remainder.charAt(0).toUpperCase() + remainder.slice(1);
            }
            return { hasOpener: true, matchedClause, remainingText: remainder };
        }
    }
    // 3. Standalone Name: [Name] [Honorific]? [,!:-]?
    if (nameParts.length > 0) {
        for (const np of nameParts) {
            const nameRegex = new RegExp(`^(${np}${honorificRegex}\\s*[,!:-]?\\s*)`, 'i');
            const matchName = trimmed.match(nameRegex);
            if (matchName) {
                const matchedClause = matchName[1];
                let remainder = trimmed.slice(matchedClause.length).trim();
                if (remainder.length > 0) {
                    remainder = remainder.charAt(0).toUpperCase() + remainder.slice(1);
                }
                return { hasOpener: true, matchedClause, remainingText: remainder };
            }
        }
    }
    return { hasOpener: false, matchedClause: '', remainingText: text };
}
class OpenerBudget {
    static sessions = new Map();
    static telemetryEvents = [];
    static getMinGap() {
        const envVal = process.env.OPENER_MIN_GAP_SENTENCES;
        if (envVal) {
            const parsed = parseInt(envVal, 10);
            if (!isNaN(parsed) && parsed > 0)
                return parsed;
        }
        return loadPatterns().min_gap_sentences_default || 20;
    }
    static getState(sessionId) {
        let state = this.sessions.get(sessionId);
        if (!state) {
            state = {
                sentencesSinceLastOpener: this.getMinGap(), // Allows turn 0 opener
                turnIndex: 0,
            };
            this.sessions.set(sessionId, state);
        }
        return state;
    }
    static isOpenerAllowed(sessionId) {
        const state = this.getState(sessionId);
        return state.turnIndex === 0 || state.sentencesSinceLastOpener >= this.getMinGap();
    }
    static processReply(params) {
        const { sessionId, text, userName, path: callPath, lang = 'hi' } = params;
        const state = this.getState(sessionId);
        const minGap = this.getMinGap();
        const detection = detectLeadingOpener(text, userName);
        const sentCount = countSentences(detection.hasOpener ? detection.remainingText : text);
        let resultText = text;
        let action = 'none';
        if (detection.hasOpener) {
            // Turn 0 is exempt from the gap check and counts as an allowed opener
            if (state.turnIndex === 0) {
                action = 'allowed';
                state.sentencesSinceLastOpener = 0;
                state.lastOpenerUsed = detection.matchedClause.trim();
                resultText = text;
            }
            else if (state.sentencesSinceLastOpener >= minGap) {
                action = 'allowed';
                state.sentencesSinceLastOpener = 0;
                state.lastOpenerUsed = detection.matchedClause.trim();
                resultText = text;
            }
            else {
                // Budget exhausted: strip leading opener only
                action = 'stripped';
                resultText = detection.remainingText;
            }
            this.recordTelemetry({
                path: callPath,
                lang,
                action: action === 'allowed' ? 'allowed' : 'stripped',
                gap: state.sentencesSinceLastOpener,
            });
        }
        // Add this turn's sentences to sentence budget
        state.sentencesSinceLastOpener += sentCount;
        state.turnIndex += 1;
        return {
            cleanedText: resultText,
            openerAction: action,
            sentenceCount: sentCount,
        };
    }
    static recordTelemetry(event) {
        this.telemetryEvents.push(event);
        if (this.telemetryEvents.length > 500) {
            this.telemetryEvents.shift();
        }
    }
    static getTelemetry() {
        return [...this.telemetryEvents];
    }
    static resetSession(sessionId) {
        this.sessions.delete(sessionId);
    }
    static canUseOpener(sessionId) {
        const state = this.getState(sessionId);
        return state.turnIndex === 0 || state.sentencesSinceLastOpener >= this.getMinGap();
    }
    /**
     * Sanitizes conversation history turns so the model does not learn and repeat
     * leading openers from earlier turns.
     */
    static sanitizeHistory(messages, userName) {
        return messages.map((m) => {
            if (m.role === 'assistant' || m.role === 'coach') {
                const raw = m.content || m.text || '';
                const det = detectLeadingOpener(raw, userName);
                if (det.hasOpener) {
                    const cleaned = det.remainingText;
                    return {
                        ...m,
                        content: m.content !== undefined ? cleaned : undefined,
                        text: m.text !== undefined ? cleaned : undefined,
                    };
                }
            }
            return m;
        });
    }
}
exports.OpenerBudget = OpenerBudget;
class StreamingOpenerFilter {
    buffer = '';
    fullText = '';
    prefixDecided = false;
    skipFiltering = false;
    turnProcessed = false;
    options;
    candidatePatterns = [];
    constructor(options) {
        this.options = options;
        if (OpenerBudget.canUseOpener(options.sessionId)) {
            // Budget allows opener: skip filtering entirely
            this.prefixDecided = true;
            this.skipFiltering = true;
        }
        else {
            const pats = loadPatterns();
            const allInterjections = [
                ...pats.interjections_devanagari,
                ...pats.interjections_roman,
            ];
            const name = (options.userName || '').trim().toLowerCase();
            const list = [];
            for (const p of allInterjections) {
                list.push(p.toLowerCase());
                if (name && name !== 'friend') {
                    list.push(`${p.toLowerCase()} ${name}`);
                }
            }
            if (name && name !== 'friend') {
                list.push(name);
            }
            this.candidatePatterns = list;
        }
    }
    async push(token) {
        this.fullText += token;
        if (this.prefixDecided) {
            await this.options.onToken(token);
            return;
        }
        this.buffer += token;
        const trimmed = this.buffer.trimStart().toLowerCase();
        if (trimmed.length === 0) {
            return;
        }
        // Buffer is a prefix of at least one candidate pattern
        const isPrefix = this.candidatePatterns.some((p) => p.startsWith(trimmed));
        if (isPrefix) {
            // Check if it already matches a complete opener followed by delimiter or boundary
            const det = detectLeadingOpener(this.buffer, this.options.userName);
            if (det.hasOpener) {
                this.prefixDecided = true;
                this.turnProcessed = true;
                const res = OpenerBudget.processReply({
                    sessionId: this.options.sessionId,
                    text: this.buffer,
                    userName: this.options.userName,
                    path: this.options.path,
                    lang: this.options.lang,
                });
                if (res.cleanedText) {
                    await this.options.onToken(res.cleanedText);
                }
                this.buffer = '';
            }
            return;
        }
        // NOT a prefix of any opener pattern: flush immediately!
        this.prefixDecided = true;
        this.turnProcessed = true;
        const det = detectLeadingOpener(this.buffer, this.options.userName);
        if (det.hasOpener) {
            const res = OpenerBudget.processReply({
                sessionId: this.options.sessionId,
                text: this.buffer,
                userName: this.options.userName,
                path: this.options.path,
                lang: this.options.lang,
            });
            if (res.cleanedText) {
                await this.options.onToken(res.cleanedText);
            }
        }
        else {
            OpenerBudget.processReply({
                sessionId: this.options.sessionId,
                text: this.buffer,
                userName: this.options.userName,
                path: this.options.path,
                lang: this.options.lang,
            });
            await this.options.onToken(this.buffer);
        }
        this.buffer = '';
    }
    async flush() {
        if (!this.turnProcessed) {
            this.turnProcessed = true;
            if (this.skipFiltering) {
                OpenerBudget.processReply({
                    sessionId: this.options.sessionId,
                    text: this.fullText,
                    userName: this.options.userName,
                    path: this.options.path,
                    lang: this.options.lang,
                });
            }
            else if (this.buffer) {
                const res = OpenerBudget.processReply({
                    sessionId: this.options.sessionId,
                    text: this.buffer,
                    userName: this.options.userName,
                    path: this.options.path,
                    lang: this.options.lang,
                });
                if (res.cleanedText) {
                    await this.options.onToken(res.cleanedText);
                }
                this.buffer = '';
            }
        }
    }
}
exports.StreamingOpenerFilter = StreamingOpenerFilter;
