import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { fetchWithAuth } from './apiClient';

export interface AudioChunkPayload {
  sequence: number;
  text: string;
  audioBase64?: string;
  mimeType?: string;
  sampleRate?: number;
}

export function getBackendBaseUrl(): string {
  // If running in browser on localhost or local IP, prioritize local dev server
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.')) {
      return `http://${host}:3001`;
    }
  }

  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/$/, '');
  }

  // Standalone APK and mobile devices connect directly to live Render deployment
  return 'https://healthfreak-1.onrender.com';
}

/**
 * Direct client-side Gemini fallback.
 * Guarantees Coach Alex answers dynamically and intelligently in warm Hinglish
 * even when the local backend server is not running or unreachable from the phone.
 */
export async function askGeminiDirect(
  message: string,
  userName = 'Abhishek'
): Promise<{ text: string; suggestions: string[] }> {
  const apiKey = (process.env.EXPO_PUBLIC_GEMINI_API_KEY || '').trim();
  const lower = message.toLowerCase();

  if (apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
      const systemPrompt = `You are Coach Alex, an elite AI Health and Wellness Coach at HealthFreak speaking directly with ${userName}.
Rules:
1. Respond in natural, warm, motivating Hinglish (Hindi + English blended in Latin alphabet, e.g. 'Arre ${userName}!').
2. Keep your answer concise: exactly 2 to 3 short sentences. Be clinically sound, encouraging, and actionable.
3. Suggest 3 short relevant follow-up actions (under 4 words each).
4. No markdown, asterisks, hashtags, or emojis. Plain conversational text only.
5. Provide strict JSON output: { "text": "...", "suggestions": ["...", "...", "..."] }`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${systemPrompt}\n\nUser says: ${message}` }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.6,
            maxOutputTokens: 200,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (rawText) {
          const parsed = JSON.parse(rawText);
          if (parsed.text) {
            return {
              text: parsed.text.trim(),
              suggestions: Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0
                ? parsed.suggestions
                : ['Check my workout plan', 'Hydration target', 'Log today meal'],
            };
          }
        }
      }
    } catch (err) {
      console.warn('[askGeminiDirect] Direct Gemini notice:', err);
    }
  }

  // If direct Gemini fails or is unconfigured, return error — no canned fallback strings
  return {
    text: 'Error: Coach Alex could not connect to AI. Please check your internet connection.',
    suggestions: ['Try asking again', 'Check connection'],
  };
}

export async function askHealthCoachAI(
  message: string,
  userName = 'Abhishek',
  conditions: string[] = [],
  activityContext?: {
    todaySteps?: number;
    stepGoal?: number;
    distanceMeters?: number;
    caloriesBurned?: number;
    activeMinutes?: number;
  },
  userId: string = 'user_local'
): Promise<{ text: string; suggestions: string[]; audioBase64?: string; audioMime?: string; audioUrl?: string }> {
  const backendUrl = getBackendBaseUrl();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${backendUrl}/api/voice/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        userId: userId || 'user_local',
        userName,
        activityContext,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.text) {
        return {
          text: data.text,
          suggestions: data.suggestions || [
            'Log my meal',
            'Check my workout plan',
            'How is my hydration today?',
          ],
          audioBase64: data.audioBase64,
          audioMime: data.audioMime,
          audioUrl: data.audioUrl,
        };
      }
    }
  } catch {
    // Backend unreachable from current network — proceed to direct client fallback
  }

  // Dynamic direct fallback
  const directReply = await askGeminiDirect(message, userName);
  return directReply;
}

/**
 * Genuine SSE streaming client for Coach Alex.
 * Streams token deltas to UI and emits chunked audio events for instant playback.
 */
export async function streamHealthCoachAI(params: {
  message: string;
  userId?: string;
  userName?: string;
  activityContext?: any;
  onTextDelta?: (delta: string) => void;
  onAudioChunk?: (chunk: AudioChunkPayload) => void;
  onComplete?: (result: { fullText: string; suggestions: string[] }) => void;
  signal?: AbortSignal;
}): Promise<{ text: string; suggestions: string[] }> {
  const backendUrl = getBackendBaseUrl();
  const { message, userId = 'user_local', userName, activityContext, onTextDelta, onAudioChunk, onComplete, signal } = params;

  try {
    const res = await fetch(`${backendUrl}/api/voice/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, userId, userName, activityContext }),
      signal,
    });

    if (res.ok && res.body && typeof (res.body as any).getReader === 'function') {
      const reader = (res.body as any).getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedText = '';
      let finalSuggestions: string[] = [];

      while (true) {
        if (signal?.aborted) {
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
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.slice(5).trim();

          try {
            const data = JSON.parse(dataStr);
            if (data.delta) {
              accumulatedText += data.delta;
              onTextDelta?.(data.delta);
            }
            if (data.audioBase64) {
              onAudioChunk?.({
                sequence: data.sequence,
                text: data.text,
                audioBase64: data.audioBase64,
                mimeType: data.mimeType || 'audio/wav',
                sampleRate: data.sampleRate || 22050,
              });
            }
            if (data.fullText) {
              accumulatedText = data.fullText;
              finalSuggestions = data.suggestions || [];
            }
          } catch {}
        }
      }

      if (accumulatedText.trim()) {
        const suggestions = finalSuggestions.length > 0 ? finalSuggestions : ['Check my active plan', 'Hydration target', 'Log my workout'];
        onComplete?.({ fullText: accumulatedText.trim(), suggestions });
        return {
          text: accumulatedText.trim(),
          suggestions,
        };
      }
    } else if (res.ok) {
      // React Native (iOS / Android) standard text response handling
      const rawText = await res.text();
      let accumulatedText = '';
      let finalSuggestions: string[] = [];

      const lines = rawText.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();
        try {
          const data = JSON.parse(dataStr);
          if (data.delta) {
            accumulatedText += data.delta;
            onTextDelta?.(data.delta);
          }
          if (data.audioBase64) {
            onAudioChunk?.({
              sequence: data.sequence,
              text: data.text,
              audioBase64: data.audioBase64,
              mimeType: data.mimeType || 'audio/wav',
              sampleRate: data.sampleRate || 22050,
            });
          }
          if (data.fullText) {
            accumulatedText = data.fullText;
            finalSuggestions = data.suggestions || [];
          }
        } catch {}
      }

      if (accumulatedText.trim()) {
        const suggestions = finalSuggestions.length > 0 ? finalSuggestions : ['Check my active plan', 'Hydration target', 'Log my workout'];
        onComplete?.({ fullText: accumulatedText.trim(), suggestions });
        return {
          text: accumulatedText.trim(),
          suggestions,
        };
      }
    }
  } catch (err: any) {
    if (signal?.aborted) {
      return { text: '', suggestions: [] };
    }
    console.warn('[streamHealthCoachAI] Stream error, falling back to askHealthCoachAI:', err?.message || err);
  }

  // Fallback to standard request
  const fallback = await askHealthCoachAI(message, userName || 'Abhishek', [], activityContext, userId);
  onComplete?.({ fullText: fallback.text, suggestions: fallback.suggestions });
  return fallback;
}

export function isSelfEcho(userText: string, coachText: string): boolean {
  if (!userText || !coachText) return false;

  const cleanUser = userText
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const cleanCoach = coachText
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanUser || !cleanCoach) return false;

  if (cleanUser.includes('(speaker echo') || cleanUser.includes('speaker feedback')) {
    return true;
  }

  const coachIdentityPhrases = [
    'main alex bol raha hoon',
    'main alex bol raha',
    'main alex hoon',
    'alex bol raha hoon',
    'coach alex here',
    'aapki ai health coach',
    'aapki health coach',
    'healthfreak voice coach',
    'healthfreak coach',
  ];

  for (const phrase of coachIdentityPhrases) {
    if (cleanUser.includes(phrase)) {
      return true;
    }
  }

  if (cleanUser.length >= 10 && cleanCoach.includes(cleanUser)) {
    return true;
  }

  return false;
}

export function cleanCoachReplyOnly(text: string): string {
  if (!text) return '';
  let cleaned = text.trim();

  if (cleaned.includes('"coachReply"') || cleaned.includes('"userTranscript"')) {
    const coachMatch =
      cleaned.match(/"coachReply"\s*:\s*"([\s\S]*?)(?:""|",|"\s*}|"\s*$|$)/i) ||
      cleaned.match(/"coachReply"\s*:\s*"([\s\S]*?)"/i);
    if (coachMatch && coachMatch[1]) {
      cleaned = coachMatch[1];
    }
  }

  cleaned = cleaned
    .replace(/^\{[\s\S]*?"coachReply"\s*:\s*"/i, '')
    .replace(/^[{\[\s"]+|["}\]\s]+$/g, '')
    .replace(/"userTranscript"[\s\S]*$/gi, '')
    .trim();

  return cleaned;
}

export async function transcribeAndReplyAudio(
  base64Audio: string,
  mimeType = 'audio/webm',
  userName = 'Alex',
  conditions: string[] = [],
  lastCoachReply = '',
  userId = 'user_local'
): Promise<{ userTranscript: string; coachReply: string; audioBase64?: string; audioMime?: string; audioUrl?: string; isEcho?: boolean }> {
  const backendUrl = getBackendBaseUrl();

  try {
    const controller = new AbortController();
    // Allow up to 35 seconds for end-to-end Sarvam STT -> 105B LLM -> Bulbul TTS generation
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    const res = await fetchWithAuth(`${backendUrl}/api/voice/audio-turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64: base64Audio,
        mimeType,
        userName,
        lastCoachReply,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        userTranscript: (data.userTranscript || '').trim(),
        coachReply: (data.coachReply || '').trim(),
        audioBase64: data.audioBase64,
        audioMime: data.audioMime,
        audioUrl: data.audioUrl,
        isEcho: data.isEcho || false,
      };
    }
  } catch (err: any) {
    console.warn('[transcribeAndReplyAudio] Turn request error:', err?.message || err);
  }

  return {
    userTranscript: '',
    coachReply: '',
    isEcho: false,
  };
}
