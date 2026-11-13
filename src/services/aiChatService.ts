import { Platform } from 'react-native';
import { fetchWithAuth } from './apiClient';
import { PROMPT_VERSION } from '../constants/version';

export interface AudioChunkPayload {
  sequence: number;
  text: string;
  audioBase64?: string;
  mimeType?: string;
  sampleRate?: number;
}

const OPENER_INTERJECTIONS = [
  'arre', 'are', 'arey', 'arrey', 'oye', 'hey', 'oh', 'wah', 'namaste', 'hello', 'hi',
  'अरे', 'ओह', 'वाह', 'अरे वाह', 'ओए', 'नमस्ते', 'हैलो', 'हाय'
];

export function stripFormulaicOpener(text: string, userName?: string): string {
  if (!text) return '';
  let cleaned = text.trim();

  const cleanName = userName && userName !== 'Friend' ? userName.trim() : '';
  const escapedName = cleanName ? cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
  const honorific = '(?:\\s+(?:ji|जी))?';

  for (const inter of OPENER_INTERJECTIONS) {
    const escInter = inter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (escapedName) {
      const compRegex = new RegExp(`^(${escInter}\\s+${escapedName}${honorific}\\s*[,!:-]?\\s*)`, 'i');
      const match = cleaned.match(compRegex);
      if (match) {
        cleaned = cleaned.slice(match[1].length).trim();
        return cleaned.length > 0 ? (cleaned.charAt(0).toUpperCase() + cleaned.slice(1)) : '';
      }
    }
    const interRegex = new RegExp(`^(${escInter}\\s*[,!:-]?\\s*)`, 'i');
    const matchInter = cleaned.match(interRegex);
    if (matchInter) {
      cleaned = cleaned.slice(matchInter[1].length).trim();
      return cleaned.length > 0 ? (cleaned.charAt(0).toUpperCase() + cleaned.slice(1)) : '';
    }
  }

  if (escapedName) {
    const nameRegex = new RegExp(`^(${escapedName}${honorific}\\s*[,!:-]?\\s*)`, 'i');
    const matchName = cleaned.match(nameRegex);
    if (matchName) {
      cleaned = cleaned.slice(matchName[1].length).trim();
      return cleaned.length > 0 ? (cleaned.charAt(0).toUpperCase() + cleaned.slice(1)) : '';
    }
  }

  return cleaned;
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

export async function askHealthCoachAI(
  message: string,
  userName = 'Friend',
  conditions: string[] = [],
  activityContext?: {
    todaySteps?: number;
    stepGoal?: number;
    distanceMeters?: number;
    caloriesBurned?: number;
    activeMinutes?: number;
  },
  userId: string = '',
  history?: { role: string; content?: string; text?: string }[],
  sessionId?: string
): Promise<{ text: string; suggestions: string[]; audioBase64?: string; audioMime?: string; audioUrl?: string }> {
  const backendUrl = getBackendBaseUrl();

  if (__DEV__) {
    console.log('[aiChatService] Hitting backend /api/voice/chat at:', backendUrl, 'Version:', PROMPT_VERSION);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetchWithAuth(`${backendUrl}/api/voice/chat`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        userId: userId || '',
        userName,
        activityContext,
        history,
        sessionId,
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
  } catch (err: any) {
    if (__DEV__) {
      console.warn('[aiChatService] Backend request failed:', err?.message || err);
    }
  }

  // C7 / E8: Direct Gemini calls removed from client; all chat routes through backend.
  return {
    text: 'Coach Mack is temporarily unreachable. Please check your network connection or try again shortly.',
    suggestions: ['Try asking again', 'Check connection'],
  };
}

/**
 * Genuine SSE streaming client for Coach Mack.
 * Streams token deltas to UI and emits chunked audio events for instant playback.
 */
export async function streamHealthCoachAI(params: {
  message: string;
  userId?: string;
  userName?: string;
  activityContext?: any;
  history?: { role: string; content?: string; text?: string }[];
  sessionId?: string;
  onTextDelta?: (delta: string) => void;
  onAudioChunk?: (chunk: AudioChunkPayload) => void;
  onComplete?: (result: { fullText: string; suggestions: string[] }) => void;
  signal?: AbortSignal;
}): Promise<{ text: string; suggestions: string[] }> {
  const backendUrl = getBackendBaseUrl();
  const { message, userId = '', userName, activityContext, history, sessionId, onTextDelta, onAudioChunk, onComplete, signal } = params;

  try {
    const res = await fetchWithAuth(`${backendUrl}/api/voice/chat/stream`, {
      method: 'POST',
      body: JSON.stringify({ message, userId, userName, activityContext, history, sessionId }),
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
    'main mack bol raha hoon',
    'main mack bol raha',
    'main mack hoon',
    'mack bol raha hoon',
    'coach mack here',
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
  userName = 'Friend',
  conditions: string[] = [],
  lastCoachReply = '',
  userId = ''
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
