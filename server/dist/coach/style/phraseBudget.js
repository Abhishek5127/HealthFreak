"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhraseBudget = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const varietyController_js_1 = require("./varietyController.js");
class PhraseBudget {
    static instanceMap = new Map();
    sessionId;
    sentencesSinceLastPhrase = 999; // Allow on turn 0
    phraseMinGapSentences;
    static stockPatternsCache = null;
    constructor(sessionId) {
        this.sessionId = sessionId;
        const envGap = process.env.PHRASE_MIN_GAP_SENTENCES;
        this.phraseMinGapSentences = envGap ? parseInt(envGap, 10) : 8;
    }
    static get(sessionId) {
        if (!this.instanceMap.has(sessionId)) {
            this.instanceMap.set(sessionId, new PhraseBudget(sessionId));
        }
        return this.instanceMap.get(sessionId);
    }
    static clear(sessionId) {
        if (sessionId) {
            this.instanceMap.delete(sessionId);
        }
        else {
            this.instanceMap.clear();
        }
    }
    /**
     * Load stock acknowledgement/encouragement phrases to detect at start of reply
     */
    static getStockPatterns() {
        if (this.stockPatternsCache)
            return this.stockPatternsCache;
        const patterns = [];
        try {
            const vocabPath = path_1.default.resolve(__dirname, '../vocab/voice_hi.json');
            if (fs_1.default.existsSync(vocabPath)) {
                const vocab = JSON.parse(fs_1.default.readFileSync(vocabPath, 'utf8'));
                const phrases = [
                    ...(vocab.intents?.acknowledge || []),
                    ...(vocab.intents?.encourage || []),
                ];
                for (const p of phrases) {
                    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    patterns.push(new RegExp(`^\\s*${escaped}\\s*[,|।]?\\s*`, 'i'));
                }
            }
        }
        catch {
            // fallback
        }
        // Default basic patterns if file missing
        if (patterns.length === 0) {
            const defaults = [
                'ठीक है', 'समझ गया', 'बढ़िया', 'अच्छा', 'नोट कर लिया',
                'theek hai', 'samajh gaya', 'badhiya', 'understood', 'got it'
            ];
            for (const d of defaults) {
                patterns.push(new RegExp(`^\\s*${d}\\s*[,|।]?\\s*`, 'i'));
            }
        }
        this.stockPatternsCache = patterns;
        return this.stockPatternsCache;
    }
    /**
     * Shared sentence counter (ignoring decimals like 2.5 and abbreviations like Dr.)
     */
    static countSentences(text) {
        if (!text || !text.trim())
            return 0;
        // Replace decimals like 2.5 with X
        let cleaned = text.replace(/(\d+)\.(\d+)/g, '$1X$2');
        // Replace common abbreviations
        cleaned = cleaned.replace(/\b(dr|mr|mrs|ms|prof|vs|approx|eg|ie)\./gi, '$1');
        const matches = cleaned.match(/[.!।?]+/g);
        if (!matches) {
            return 1;
        }
        return Math.max(1, matches.length);
    }
    /**
     * Check if text is an exempt message (red-flag, crisis, medical disclaimer, or confirmation read-back)
     */
    static isExempt(text) {
        const lower = text.toLowerCase();
        // Crisis / helpline indicators
        if (lower.includes('14416') ||
            lower.includes('112') ||
            lower.includes('tele-manas') ||
            lower.includes('helpline') ||
            lower.includes('doctor') ||
            lower.includes('डॉक्टर')) {
            return true;
        }
        // Confirmation read-back pattern: "तो ... नहीं है, सही?" / "noted, confirm?"
        if (lower.includes('सही?') ||
            lower.includes('हटा दूँ?') ||
            lower.includes('नोट कर लेता हूँ') ||
            lower.includes('right?')) {
            return true;
        }
        return false;
    }
    /**
     * Process a generated reply:
     * 1. Check for leading stock phrase.
     * 2. If under gap, strip leading stock phrase.
     * 3. Update sentence counter.
     * 4. Check trigram overlap for chat paths.
     */
    processReply(reply, isChatPath = false) {
        const trimmed = reply.trim();
        if (!trimmed) {
            return {
                text: reply,
                originalText: reply,
                hasStockPhrase: false,
                phraseStripped: false,
                sentencesSinceLastPhrase: this.sentencesSinceLastPhrase,
                sentenceCount: 0,
                needsRegeneration: false,
                trigramOverlap: 0,
            };
        }
        if (PhraseBudget.isExempt(trimmed)) {
            const sentenceCount = PhraseBudget.countSentences(trimmed);
            this.sentencesSinceLastPhrase += sentenceCount;
            return {
                text: reply,
                originalText: reply,
                hasStockPhrase: false,
                phraseStripped: false,
                sentencesSinceLastPhrase: this.sentencesSinceLastPhrase,
                sentenceCount,
                needsRegeneration: false,
                trigramOverlap: 0,
            };
        }
        let detectedMatch = null;
        for (const pat of PhraseBudget.getStockPatterns()) {
            if (pat.test(trimmed)) {
                detectedMatch = pat;
                break;
            }
        }
        let processedText = trimmed;
        let phraseStripped = false;
        const hasStockPhrase = detectedMatch !== null;
        if (hasStockPhrase) {
            if (this.sentencesSinceLastPhrase < this.phraseMinGapSentences) {
                // Budget exceeded: strip leading stock clause
                const stripped = trimmed.replace(detectedMatch, '').trim();
                if (stripped.length > 0) {
                    processedText = stripped.charAt(0).toUpperCase() + stripped.slice(1);
                    phraseStripped = true;
                }
            }
            else {
                // Allowed: reset counter
                this.sentencesSinceLastPhrase = 0;
            }
        }
        const sentenceCount = PhraseBudget.countSentences(processedText);
        if (!hasStockPhrase || phraseStripped) {
            this.sentencesSinceLastPhrase += sentenceCount;
        }
        // Trigram overlap check (for chat/audio-turn text paths)
        const variety = varietyController_js_1.VarietyController.get(this.sessionId);
        const trigramOverlap = variety.calculateTrigramOverlap(processedText, 6);
        const needsRegeneration = isChatPath && trigramOverlap > 0.35;
        // Record into variety controller ring buffer if not regenerating
        if (!needsRegeneration) {
            variety.recordAssistantReply(processedText);
        }
        return {
            text: processedText,
            originalText: trimmed,
            hasStockPhrase,
            phraseStripped,
            sentencesSinceLastPhrase: this.sentencesSinceLastPhrase,
            sentenceCount,
            needsRegeneration,
            trigramOverlap,
        };
    }
}
exports.PhraseBudget = PhraseBudget;
