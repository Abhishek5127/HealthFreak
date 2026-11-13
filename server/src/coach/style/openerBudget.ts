import fs from 'fs';
import path from 'path';

export interface OpenerPatterns {
  interjections_roman: string[];
  interjections_devanagari: string[];
  honorifics: string[];
  min_gap_sentences_default: number;
}

let patternsCache: OpenerPatterns | null = null;

function loadPatterns(): OpenerPatterns {
  if (patternsCache) return patternsCache;
  const candidates = [
    typeof __dirname !== 'undefined' ? path.resolve(__dirname, 'opener_patterns.json') : '',
    path.resolve(process.cwd(), 'src/coach/style/opener_patterns.json'),
    path.resolve(process.cwd(), 'server/src/coach/style/opener_patterns.json'),
  ].filter(Boolean);

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        patternsCache = JSON.parse(fs.readFileSync(p, 'utf-8'));
        return patternsCache!;
      }
    } catch {}
  }
  patternsCache = {
    interjections_roman: ['arre', 'are', 'arey', 'arrey', 'oye', 'hey', 'oh', 'wah', 'namaste', 'hello', 'hi'],
    interjections_devanagari: ['अरे', 'ओह', 'वाह', 'अरे वाह', 'ओए', 'नमस्ते', 'हैलो', 'हाय'],
    honorifics: ['ji', 'जी'],
    min_gap_sentences_default: 20,
  };
  return patternsCache!;
}

/**
 * Counts sentences ignoring decimals (e.g. 2.5) and common abbreviations (e.g. Dr., vs.)
 */
export function countSentences(text: string): number {
  if (!text || !text.trim()) return 0;
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

export interface OpenerMatchResult {
  hasOpener: boolean;
  matchedClause: string;
  remainingText: string;
}

/**
 * Checks if text starts with a detected interjection or user name (Roman / Devanagari).
 * Only matches at the very beginning of the string. Mid-sentence uses are untouched.
 */
export function detectLeadingOpener(text: string, userName?: string): OpenerMatchResult {
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
  const nameParts: string[] = [];
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

export interface SessionOpenerState {
  sentencesSinceLastOpener: number;
  lastOpenerUsed?: string;
  turnIndex: number;
}

export class OpenerBudget {
  private static sessions: Map<string, SessionOpenerState> = new Map();
  private static telemetryEvents: Array<{ path: string; lang: string; action: 'allowed' | 'stripped'; gap: number }> = [];

  public static getMinGap(): number {
    const envVal = process.env.OPENER_MIN_GAP_SENTENCES;
    if (envVal) {
      const parsed = parseInt(envVal, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return loadPatterns().min_gap_sentences_default || 20;
  }

  public static getState(sessionId: string): SessionOpenerState {
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

  public static isOpenerAllowed(sessionId: string): boolean {
    const state = this.getState(sessionId);
    return state.turnIndex === 0 || state.sentencesSinceLastOpener >= this.getMinGap();
  }

  public static processReply(params: {
    sessionId: string;
    text: string;
    userName?: string;
    path: string;
    lang?: string;
  }): { cleanedText: string; openerAction: 'allowed' | 'stripped' | 'none'; sentenceCount: number } {
    const { sessionId, text, userName, path: callPath, lang = 'hi' } = params;
    const state = this.getState(sessionId);
    const minGap = this.getMinGap();
    const detection = detectLeadingOpener(text, userName);
    const sentCount = countSentences(detection.hasOpener ? detection.remainingText : text);

    let resultText = text;
    let action: 'allowed' | 'stripped' | 'none' = 'none';

    if (detection.hasOpener) {
      // Turn 0 is exempt from the gap check and counts as an allowed opener
      if (state.turnIndex === 0) {
        action = 'allowed';
        state.sentencesSinceLastOpener = 0;
        state.lastOpenerUsed = detection.matchedClause.trim();
        resultText = text;
      } else if (state.sentencesSinceLastOpener >= minGap) {
        action = 'allowed';
        state.sentencesSinceLastOpener = 0;
        state.lastOpenerUsed = detection.matchedClause.trim();
        resultText = text;
      } else {
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

  public static recordTelemetry(event: { path: string; lang: string; action: 'allowed' | 'stripped'; gap: number }): void {
    this.telemetryEvents.push(event);
    if (this.telemetryEvents.length > 500) {
      this.telemetryEvents.shift();
    }
  }

  public static getTelemetry(): Array<{ path: string; lang: string; action: 'allowed' | 'stripped'; gap: number }> {
    return [...this.telemetryEvents];
  }

  public static resetSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Sanitizes conversation history turns so the model does not learn and repeat
   * leading openers from earlier turns.
   */
  public static sanitizeHistory<T extends { role: string; content?: string; text?: string }>(
    messages: T[],
    userName?: string
  ): T[] {
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

export interface StreamingFilterOptions {
  sessionId: string;
  userName?: string;
  path: string;
  lang?: string;
  onToken: (token: string) => void | Promise<void>;
}

export class StreamingOpenerFilter {
  private buffer = '';
  private prefixDecided = false;
  private options: StreamingFilterOptions;
  private delimiterRegex = /[,!?:।\n]/;

  constructor(options: StreamingFilterOptions) {
    this.options = options;
  }

  public async push(token: string): Promise<void> {
    if (this.prefixDecided) {
      await this.options.onToken(token);
      return;
    }

    this.buffer += token;
    const hasDelimiter = this.delimiterRegex.test(this.buffer);
    const words = this.buffer.trim().split(/\s+/);

    if (hasDelimiter || words.length >= 4 || this.buffer.length >= 35) {
      this.prefixDecided = true;
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

  public async flush(): Promise<void> {
    if (!this.prefixDecided && this.buffer) {
      this.prefixDecided = true;
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
