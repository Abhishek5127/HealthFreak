import { config } from '../config/index.js';

export interface SarvamChatResult {
  text: string;
  suggestions: string[];
  audioBase64?: string;
}

export class SarvamService {
  private static getApiKey(): string {
    return (process.env.SARVAM_API_KEY || config.sarvam?.apiKey || '').trim();
  }

  public static isConfigured(): boolean {
    return !!this.getApiKey();
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
          max_tokens: 150,
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

      // Clean reply of prefixes like "Coach Alex: " or "Assistant: "
      const cleanReply = rawReply
        .replace(/^(Coach\s*Alex|Alex|Coach|Assistant):\s*/i, '')
        .replace(/[*_#]/g, '')
        .trim();

      // Generate contextual follow-up suggestions
      const lower = message.toLowerCase();
      let suggestions = ['Check my workout plan', 'Log today meal', 'Hydration target'];
      if (lower.includes('knee') || lower.includes('pain') || lower.includes('dard')) {
        suggestions = ['Gentle leg stretch', 'Rest day routine', 'Log pain severity'];
      } else if (lower.includes('dinner') || lower.includes('khana') || lower.includes('diet') || lower.includes('eat')) {
        suggestions = ['High protein dinner', 'Low carb ideas', 'Log my dinner'];
      } else if (lower.includes('workout') || lower.includes('exercise') || lower.includes('gym')) {
        suggestions = ['20 min brisk walk', 'Mobility routine', 'Log workout'];
      } else if (lower.includes('sleep') || lower.includes('tired') || lower.includes('thak')) {
        suggestions = ['Sleep meditation', 'Set wake-up goal', 'Log bedtime'];
      }

      // Generate neural speech audio via Sarvam bulbul:v3
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
   * Synthesizes audio using Sarvam AI Bulbul neural TTS.
   */
  public static async synthesizeSpeech(text: string, speaker?: string): Promise<string | undefined> {
    const apiKey = this.getApiKey();
    if (!apiKey || !text || !text.trim()) return undefined;

    try {
      const response = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-subscription-key': apiKey,
        },
        body: JSON.stringify({
          inputs: [text.trim()],
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
}
