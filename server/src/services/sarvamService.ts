import { config } from '../config/index.js';

export interface SarvamChatResult {
  text: string;
  suggestions: string[];
  audioBase64?: string;
}

export interface AudioChunkEvent {
  sequence: number;
  text: string;
  audioBase64?: string;
  mimeType: string;
  sampleRate: number;
}

export class SarvamService {
  private static getApiKey(): string {
    return (process.env.SARVAM_API_KEY || config.sarvam?.apiKey || '').trim();
  }

  public static isConfigured(): boolean {
    return !!this.getApiKey();
  }

  /**
   * Normalizes raw LLM output text for clean, natural phonetic pronunciation by Sarvam Bulbul TTS.
   * Strips markdown, expands measurement units and ranges into spoken words.
   */
  public static normalizeForSpokenTTS(raw: string): string {
    if (!raw) return '';

    return raw
      // Remove prefixes like "Coach Alex: " or "Assistant: "
      .replace(/^(Coach\s*Alex|Alex|Coach|Assistant):\s*/gi, '')
      // Remove markdown asterisks, hashes, backticks, tildes, brackets
      .replace(/[*_#`~[\]]/g, '')
      // Convert number ranges (e.g. "10-12" or "10 - 12") to "10 to 12"
      .replace(/(\d+)\s*[-–—]\s*(\d+)/g, '$1 to $2')
      // Expand common units to natural spoken forms
      .replace(/(\d+)\s*g\b/gi, '$1 grams')
      .replace(/(\d+)\s*kg\b/gi, '$1 kilograms')
      .replace(/(\d+)\s*ml\b/gi, '$1 milliliters')
      .replace(/(\d+)\s*km\b/gi, '$1 kilometers')
      .replace(/(\d+)\s*kcal\b/gi, '$1 calories')
      .replace(/(\d+)\s*min\b/gi, '$1 minutes')
      .replace(/(\d+)\s*sec\b/gi, '$1 seconds')
      // Clean duplicate whitespace and orphan punctuation
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generates a conversational Hinglish reply using Sarvam AI's 105B Conversations model.
   */
  public static async generateChatReply(params: {
    message: string;
    userName?: string;
    conditions?: string[];
    memorySnippet?: string;
    activitySnippet?: string;
    synthesizeVoice?: boolean;
  }): Promise<SarvamChatResult | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    const {
      message,
      userName = 'friend',
      conditions = [],
      memorySnippet = '',
      activitySnippet = '',
      synthesizeVoice = true,
    } = params;

    const systemPrompt = `You are Coach Alex, an elite AI Health and Wellness Coach at HealthFreak.
You are speaking directly with ${userName}.
User Profile:
- Known conditions/injuries: ${conditions.join(', ') || 'None'}
- Memory facts: ${memorySnippet || 'None'}
- Physical activity today: ${activitySnippet || 'Not synced'}

Rules:
1. Respond in natural, warm, motivating Hinglish (Hindi + English blend, written in Latin script, e.g., "Arre ${userName}!").
2. Keep your answer concise: 2 to 3 short sentences maximum. Be clinically sensible, supportive, and actionable.
3. Suggest 3 short relevant follow-up actions (under 4 words each).
4. Do NOT use emojis, asterisks, bullet points or markdown. Plain spoken conversational text only.`;

    try {
      const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': apiKey,
        },
        body: JSON.stringify({
          model: config.sarvam?.chatModel || 'sarvam-105b-conversations',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
          ],
          temperature: 0.6,
          max_tokens: 160,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[SarvamService] Chat error (status ${response.status}):`, errText);
        return null;
      }

      const data: any = await response.json();
      const rawReply = data?.choices?.[0]?.message?.content?.trim();
      if (!rawReply) return null;

      const cleanReply = this.normalizeForSpokenTTS(rawReply);
      const suggestions = this.generateSuggestions(message);

      let audioBase64: string | undefined;
      if (synthesizeVoice) {
        audioBase64 = await this.synthesizeSpeech(cleanReply);
      }

      return {
        text: cleanReply,
        suggestions,
        audioBase64,
      };
    } catch (err: any) {
      console.warn('[SarvamService] Chat completion exception:', err?.message || err);
      return null;
    }
  }

  /**
   * Genuine Server-Sent Events (SSE) streaming chat completion with Sarvam 105B Conversations.
   */
  public static async streamChatCompletion(params: {
    messages: Array<{ role: string; content: string }>;
    onToken: (token: string) => void;
    abortSignal?: AbortSignal;
    maxTokens?: number;
  }): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('Sarvam API key not configured');

    const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({
        model: config.sarvam?.chatModel || 'sarvam-105b-conversations',
        messages: params.messages,
        temperature: 0.6,
        max_tokens: params.maxTokens || 160,
        stream: true,
      }),
      signal: params.abortSignal,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Sarvam streaming error (${response.status}): ${errText}`);
    }

    if (!response.body) {
      throw new Error('Sarvam streaming response body is empty');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    try {
      while (true) {
        if (params.abortSignal?.aborted) {
          await reader.cancel();
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataPayload = trimmed.slice(5).trim();
          if (dataPayload === '[DONE]') continue;

          try {
            const parsed = JSON.parse(dataPayload);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullText += delta;
              params.onToken(delta);
            }
          } catch {
            // Partial JSON chunk, will be resolved with next line
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullText;
  }

  /**
   * Synthesizes audio using Sarvam AI Bulbul neural TTS (single consistent identity: Shubh).
   */
  public static async synthesizeSpeech(text: string, speaker?: string): Promise<string | undefined> {
    const apiKey = this.getApiKey();
    if (!apiKey || !text || !text.trim()) return undefined;

    const spokenText = this.normalizeForSpokenTTS(text);
    if (!spokenText) return undefined;

    try {
      const response = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': apiKey,
        },
        body: JSON.stringify({
          inputs: [spokenText],
          target_language_code: 'hi-IN',
          speaker: speaker || config.sarvam?.speaker || 'shubh',
          pitch: 0,
          pace: 1.0,
          loudness: 1.5,
          speech_sample_rate: 22050,
          enable_preprocessing: true,
          model: config.sarvam?.ttsModel || 'bulbul:v3',
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[SarvamService] TTS error (${response.status}):`, errText);
        return undefined;
      }

      const data: any = await response.json();
      if (data?.audios && Array.isArray(data.audios) && data.audios.length > 0) {
        return data.audios[0];
      }
    } catch (err: any) {
      console.warn('[SarvamService] TTS synthesis exception:', err?.message || err);
    }

    return undefined;
  }

  /**
   * Generates contextual follow-up chips based on user query topic.
   */
  public static generateSuggestions(message: string): string[] {
    const lower = message.toLowerCase();
    if (lower.includes('knee') || lower.includes('pain') || lower.includes('dard')) {
      return ['Gentle leg stretch', 'Rest day routine', 'Log pain severity'];
    }
    if (lower.includes('dinner') || lower.includes('khana') || lower.includes('diet') || lower.includes('eat')) {
      return ['High protein dinner', 'Low carb ideas', 'Log my dinner'];
    }
    if (lower.includes('workout') || lower.includes('exercise') || lower.includes('gym')) {
      return ['20 min brisk walk', 'Mobility routine', 'Log workout'];
    }
    if (lower.includes('sleep') || lower.includes('tired') || lower.includes('thak')) {
      return ['Sleep meditation', 'Set wake-up goal', 'Log bedtime'];
    }
    return ['Check my workout plan', 'Log today meal', 'Hydration target'];
  }
}

/**
 * Sentence-aware TTS Buffer.
 * Collects incoming tokens and splits along natural punctuation boundaries (6-12 words).
 * Dispatches each complete sentence to Bulbul TTS immediately so chunk 0 plays with minimal TTFA.
 */
export class SentenceTTSBuffer {
  private buffer: string = '';
  private sequence: number = 0;
  private isFinished: boolean = false;
  private readonly onChunkReady: (chunk: AudioChunkEvent) => void;
  private readonly speaker: string;

  constructor(onChunkReady: (chunk: AudioChunkEvent) => void, speaker: string = 'shubh') {
    this.onChunkReady = onChunkReady;
    this.speaker = speaker;
  }

  /**
   * Feeds a newly arrived text token into the buffer.
   */
  public async addToken(token: string): Promise<void> {
    if (this.isFinished) return;
    this.buffer += token;

    // Check for natural sentence boundaries
    const sentence = this.extractNextSentence();
    if (sentence) {
      await this.synthesizeAndEmit(sentence);
    }
  }

  /**
   * Finalizes the buffer when LLM generation completes, synthesizing any remaining text.
   */
  public async flush(): Promise<void> {
    this.isFinished = true;
    const remaining = this.buffer.trim();
    this.buffer = '';
    if (remaining) {
      await this.synthesizeAndEmit(remaining);
    }
  }

  private extractNextSentence(): string | null {
    // Natural punctuation boundaries: '.', '!', '?', '।', or newline
    const match = this.buffer.match(/^(.*?[.!?।\n])\s+/s);
    if (match) {
      const sentence = match[1].trim();
      this.buffer = this.buffer.slice(match[0].length);
      return sentence;
    }

    // Secondary boundary: comma or semicolon with >= 8 words buffered
    const words = this.buffer.trim().split(/\s+/);
    if (words.length >= 8) {
      const commaMatch = this.buffer.match(/^(.*?[,;])\s+/s);
      if (commaMatch) {
        const sentence = commaMatch[1].trim();
        this.buffer = this.buffer.slice(commaMatch[0].length);
        return sentence;
      }
    }

    return null;
  }

  private async synthesizeAndEmit(text: string): Promise<void> {
    const currentSeq = this.sequence++;
    const normalized = SarvamService.normalizeForSpokenTTS(text);
    if (!normalized) return;

    try {
      const audioBase64 = await SarvamService.synthesizeSpeech(normalized, this.speaker);
      this.onChunkReady({
        sequence: currentSeq,
        text: normalized,
        audioBase64,
        mimeType: 'audio/wav',
        sampleRate: 22050,
      });
    } catch (err: any) {
      console.warn(`[SentenceTTSBuffer] Chunk ${currentSeq} synthesis failed:`, err?.message || err);
      // Emit text chunk even if voice synthesis fails
      this.onChunkReady({
        sequence: currentSeq,
        text: normalized,
        mimeType: 'audio/wav',
        sampleRate: 22050,
      });
    }
  }
}
