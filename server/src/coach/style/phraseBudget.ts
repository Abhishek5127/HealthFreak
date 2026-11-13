import fs from 'fs';
import path from 'path';
import { VarietyController } from './varietyController.js';

export interface ProcessedReplyResult {
  text: string;
  originalText: string;
  hasStockPhrase: boolean;
  phraseStripped: boolean;
  sentencesSinceLastPhrase: number;
  sentenceCount: number;
  needsRegeneration: boolean;
  trigramOverlap: number;
}

export class PhraseBudget {
  private static instanceMap: Map<string, PhraseBudget> = new Map();

  private sessionId: string;
  private sentencesSinceLastPhrase: number = 999; // Allow on turn 0
  private phraseMinGapSentences: number;

  private static stockPatternsCache: RegExp[] | null = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    const envGap = process.env.PHRASE_MIN_GAP_SENTENCES;
    this.phraseMinGapSentences = envGap ? parseInt(envGap, 10) : 8;
  }

  public static get(sessionId: string): PhraseBudget {
    if (!this.instanceMap.has(sessionId)) {
      this.instanceMap.set(sessionId, new PhraseBudget(sessionId));
    }
    return this.instanceMap.get(sessionId)!;
  }

  public static clear(sessionId?: string): void {
    if (sessionId) {
      this.instanceMap.delete(sessionId);
    } else {
      this.instanceMap.clear();
    }
  }

  /**
   * Load stock acknowledgement/encouragement phrases to detect at start of reply
   */
  private static getStockPatterns(): RegExp[] {
    if (this.stockPatternsCache) return this.stockPatternsCache;

    const patterns: RegExp[] = [];
    try {
      const vocabPath = path.resolve(__dirname, '../vocab/voice_hi.json');
      if (fs.existsSync(vocabPath)) {
        const vocab = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
        const phrases: string[] = [
          ...(vocab.intents?.acknowledge || []),
          ...(vocab.intents?.encourage || []),
        ];

        for (const p of phrases) {
          const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          patterns.push(new RegExp(`^\\s*${escaped}\\s*[,|।]?\\s*`, 'i'));
        }
      }
    } catch {
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
  public static countSentences(text: string): number {
    if (!text || !text.trim()) return 0;
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
  public static isExempt(text: string): boolean {
    const lower = text.toLowerCase();
    // Crisis / helpline indicators
    if (
      lower.includes('14416') ||
      lower.includes('112') ||
      lower.includes('tele-manas') ||
      lower.includes('helpline') ||
      lower.includes('doctor') ||
      lower.includes('डॉक्टर')
    ) {
      return true;
    }

    // Confirmation read-back pattern: "तो ... नहीं है, सही?" / "noted, confirm?"
    if (
      lower.includes('सही?') ||
      lower.includes('हटा दूँ?') ||
      lower.includes('नोट कर लेता हूँ') ||
      lower.includes('right?')
    ) {
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
  public processReply(
    reply: string,
    isChatPath: boolean = false
  ): ProcessedReplyResult {
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

    let detectedMatch: RegExp | null = null;
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
        const stripped = trimmed.replace(detectedMatch!, '').trim();
        if (stripped.length > 0) {
          processedText = stripped.charAt(0).toUpperCase() + stripped.slice(1);
          phraseStripped = true;
        }
      } else {
        // Allowed: reset counter
        this.sentencesSinceLastPhrase = 0;
      }
    }

    const sentenceCount = PhraseBudget.countSentences(processedText);
    if (!hasStockPhrase || phraseStripped) {
      this.sentencesSinceLastPhrase += sentenceCount;
    }

    // Trigram overlap check (for chat/audio-turn text paths)
    const variety = VarietyController.get(this.sessionId);
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

