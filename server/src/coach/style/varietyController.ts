import fs from 'fs';
import path from 'path';

export interface StyleVarietyBlock {
  blockText: string;
  tokenCountEstimate: number;
}

export interface VarietyStats {
  openersUsed: string[];
  stockPhrasesUsed: string[];
  repeatedTrigrams: string[];
  repeatedQuestionStems: string[];
}

// Seeded linear congruential generator for reproducible sampling in tests
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export class VarietyController {
  private static instanceMap: Map<string, VarietyController> = new Map();

  private sessionId: string;
  private ringBuffer: string[] = []; // Last 12 assistant replies
  private maxBufferSize = 12;
  private turnCount = 0;

  private static vocabCache: any = null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  public static get(sessionId: string): VarietyController {
    if (!this.instanceMap.has(sessionId)) {
      this.instanceMap.set(sessionId, new VarietyController(sessionId));
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

  private static getVocab(): any {
    if (this.vocabCache) return this.vocabCache;
    try {
      const vocabPath = path.resolve(__dirname, '../vocab/voice_hi.json');
      if (fs.existsSync(vocabPath)) {
        this.vocabCache = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
      }
    } catch {
      this.vocabCache = { intents: {}, domain: {} };
    }
    return this.vocabCache || { intents: {}, domain: {} };
  }

  public recordAssistantReply(reply: string): void {
    const trimmed = reply.trim();
    if (!trimmed) return;
    this.ringBuffer.push(trimmed);
    if (this.ringBuffer.length > this.maxBufferSize) {
      this.ringBuffer.shift();
    }
    this.turnCount++;
  }

  public getHistory(): string[] {
    return [...this.ringBuffer];
  }

  public getTurnCount(): number {
    return this.turnCount;
  }

  /**
   * Extract lowercase normalized words
   */
  public static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[।,?!.:;'"()[\]{}]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  /**
   * Extract trigrams from text
   */
  public static getTrigrams(text: string): string[] {
    const tokens = this.tokenize(text);
    const trigrams: string[] = [];
    for (let i = 0; i < tokens.length - 2; i++) {
      trigrams.push(`${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`);
    }
    return trigrams;
  }

  /**
   * Calculate Jaccard trigram overlap between text and previous replies
   */
  public calculateTrigramOverlap(text: string, lookbackTurns: number = 6): number {
    const textTrigrams = new Set(VarietyController.getTrigrams(text));
    if (textTrigrams.size === 0) return 0;

    const recentTurns = this.ringBuffer.slice(-lookbackTurns);
    if (recentTurns.length === 0) return 0;

    const historyTrigrams = new Set<string>();
    for (const turn of recentTurns) {
      for (const tri of VarietyController.getTrigrams(turn)) {
        historyTrigrams.add(tri);
      }
    }

    if (historyTrigrams.size === 0) return 0;

    let overlapCount = 0;
    for (const tri of textTrigrams) {
      if (historyTrigrams.has(tri)) {
        overlapCount++;
      }
    }

    return overlapCount / textTrigrams.size;
  }

  /**
   * Extract statistics from the ring buffer
   */
  public getStats(): VarietyStats {
    const openers: string[] = [];
    const questionStems: string[] = [];
    const allTrigrams: string[] = [];
    const repeatedTrigrams: string[] = [];
    const stockPhrasesUsed: string[] = [];

    const vocab = VarietyController.getVocab();
    const stockPhrases: string[] = [];
    if (vocab.intents) {
      for (const intentList of Object.values(vocab.intents) as string[][]) {
        if (Array.isArray(intentList)) {
          stockPhrases.push(...intentList);
        }
      }
    }

    for (const reply of this.ringBuffer) {
      const tokens = VarietyController.tokenize(reply);
      if (tokens.length >= 2) {
        openers.push(`${tokens[0]} ${tokens[1]}`);
      } else if (tokens.length === 1) {
        openers.push(tokens[0]);
      }

      // Check stock phrases
      const lower = reply.toLowerCase();
      for (const phrase of stockPhrases) {
        if (lower.includes(phrase.toLowerCase())) {
          stockPhrasesUsed.push(phrase);
        }
      }

      // Check question stems if ends with '?'
      if (reply.includes('?')) {
        const sentences = reply.split(/[.!।?]/).map((s) => s.trim()).filter(Boolean);
        for (const s of sentences) {
          const sTokens = VarietyController.tokenize(s);
          if (sTokens.length >= 2) {
            questionStems.push(`${sTokens[0]} ${sTokens[1]}`);
          }
        }
      }

      // Trigrams
      const tris = VarietyController.getTrigrams(reply);
      for (const tri of tris) {
        if (allTrigrams.includes(tri) && !repeatedTrigrams.includes(tri)) {
          repeatedTrigrams.push(tri);
        }
        allTrigrams.push(tri);
      }
    }

    return {
      openersUsed: Array.from(new Set(openers)),
      stockPhrasesUsed: Array.from(new Set(stockPhrasesUsed)),
      repeatedTrigrams,
      repeatedQuestionStems: Array.from(new Set(questionStems)),
    };
  }

  /**
   * Build the soft ~80 token STYLE VARIETY block for prompt injection
   */
  public buildStyleVarietyBlock(seedOverride?: number): StyleVarietyBlock {
    if (this.ringBuffer.length === 0) {
      return { blockText: '', tokenCountEstimate: 0 };
    }

    const stats = this.getStats();
    const vocab = VarietyController.getVocab();

    // Sample 3-5 alternative phrases deterministically using session seed + turnCount
    let seed = 0;
    if (seedOverride !== undefined) {
      seed = seedOverride;
    } else {
      for (let i = 0; i < this.sessionId.length; i++) {
        seed = (seed * 31 + this.sessionId.charCodeAt(i)) >>> 0;
      }
      seed = (seed + this.turnCount * 97) >>> 0;
    }

    const rand = seededRandom(seed);

    const candidates: string[] = [];
    const intents = ['acknowledge', 'transition', 'nudge'];
    for (const intent of intents) {
      const list: string[] = vocab.intents?.[intent] || [];
      const unused = list.filter((p) => !stats.stockPhrasesUsed.includes(p));
      const pool = unused.length >= 2 ? unused : list;
      if (pool.length > 0) {
        const idx = Math.floor(rand() * pool.length);
        candidates.push(pool[idx]);
      }
    }

    const recentUsedSample = stats.openersUsed.slice(-3).join(', ');
    const alternativesSample = candidates.slice(0, 4).join(', ');

    const lines: string[] = ['[STYLE VARIETY]'];
    if (recentUsedSample) {
      lines.push(`Recently used (vary wording, reuse only rarely): ${recentUsedSample}`);
    }
    if (alternativesSample) {
      lines.push(
        `If you need an acknowledgement/transition/nudge, consider ones like: [${alternativesSample}]. Reword freely; never copy mechanically.`
      );
    }

    const blockText = lines.join('\n');
    // Estimate tokens (roughly words * 1.3 for mixed Hindi/English)
    const tokenCountEstimate = Math.round(blockText.split(/\s+/).length * 1.3);

    return { blockText, tokenCountEstimate };
  }
}

