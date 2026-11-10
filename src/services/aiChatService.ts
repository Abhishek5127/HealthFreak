import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface AudioChunkPayload {
  sequence: number;
  text: string;
  audioBase64?: string;
  mimeType?: string;
  sampleRate?: number;
}

export function getBackendBaseUrl(): string {
  // If running in browser on localhost or local IP, always prioritize local dev server
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.')) {
      return `http://${host}:3001`;
    }
  }

  // In development mode on physical devices (Expo Go), prioritize local laptop IP running backend
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return `http://${ip}:3001`;
      }
    }
  }

  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/$/, '');
  }
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3001`;
  }
  return 'https://healthfreak-1.onrender.com';
}

export async function askHealthCoachAI(
  message: string,
  userName = 'there',
  conditions: string[] = [],
  activityContext?: {
    todaySteps?: number;
    stepGoal?: number;
    distanceMeters?: number;
    caloriesBurned?: number;
    activeMinutes?: number;
  },
  userId: string = 'usr_synthetic_alex'
): Promise<{ text: string; suggestions: string[]; audioBase64?: string; audioMime?: string; audioUrl?: string }> {
  const backendUrl = getBackendBaseUrl();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${backendUrl}/api/voice/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        userId: userId || 'usr_synthetic_alex',
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
    // Backend unreachable from current network
  }

  // Fast, intelligent offline fallback matching Coach Alex Hinglish persona
  const lower = message.toLowerCase();
  if (lower.includes('knee') || lower.includes('pain') || lower.includes('dard')) {
    return {
      text: `Arre ${userName}, please stop heavy leg movements right now! Rest your knee, apply an ice pack, and stick to gentle stretches today.`,
      suggestions: ['Gentle leg stretch', 'Rest day routine', 'Log pain severity'],
    };
  }
  if (lower.includes('dinner') || lower.includes('khana') || lower.includes('food') || lower.includes('eat')) {
    return {
      text: `For a healthy dinner ${userName}, go for light protein and veggies like grilled paneer, dal, and a bowl of salad. Avoid heavy carbs late at night!`,
      suggestions: ['High protein dinner', 'Low carb recipes', 'Log my dinner'],
    };
  }
  if (lower.includes('workout') || lower.includes('exercise') || lower.includes('gym')) {
    return {
      text: `Great enthusiasm ${userName}! Let's focus on a 20-minute brisk walk followed by light mobility work to keep your joints healthy.`,
      suggestions: ['Start 20m walk', 'Mobility warmup', 'Log workout'],
    };
  }
  if (lower.includes('sleep') || lower.includes('tired') || lower.includes('thak') || lower.includes('neend')) {
    return {
      text: `Recovery is key, ${userName}! Make sure to drink a glass of water, keep screens away 30 minutes before bed, and get 7-8 hours of quality sleep tonight.`,
      suggestions: ['Sleep meditation', 'Log bedtime', 'Set wake-up goal'],
    };
  }

  return {
    text: `Namaste ${userName}! Main Coach Alex bol raha hoon. Maine aapka message note kar liya hai—aaj diet ya workout mein kis cheez par help karoon?`,
    suggestions: [
      'Log my lunch',
      'Check today\'s workout',
      'Suggest high protein snack',
    ],
  };
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
  const { message, userId = 'usr_synthetic_alex', userName, activityContext, onTextDelta, onAudioChunk, onComplete, signal } = params;

  try {
    const res = await fetch(`${backendUrl}/api/voice/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, userId, userName, activityContext }),
      signal,
    });

    if (res.ok && res.body) {
      const reader = res.body.getReader();
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
    }
  } catch (err: any) {
    if (signal?.aborted) {
      return { text: '', suggestions: [] };
    }
    console.warn('[streamHealthCoachAI] Stream error, falling back to askHealthCoachAI:', err?.message || err);
  }

  // Fallback to standard request
  const fallback = await askHealthCoachAI(message, 'friend', [], activityContext, userId);
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
  userId = 'usr_synthetic_alex'
): Promise<{ userTranscript: string; coachReply: string; audioBase64?: string; audioMime?: string; audioUrl?: string; isEcho?: boolean }> {
  const backendUrl = getBackendBaseUrl();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(`${backendUrl}/api/voice/audio-turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64: base64Audio,
        mimeType,
        userId: userId || 'usr_synthetic_alex',
        userName,
        lastCoachReply,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        userTranscript: data.userTranscript || 'Voice note received',
        coachReply: data.coachReply || 'नमस्ते! मैं सुन रहा हूँ।',
        audioBase64: data.audioBase64,
        audioMime: data.audioMime,
        audioUrl: data.audioUrl,
        isEcho: data.isEcho || false,
      };
    }
  } catch {
    // Backend unreachable
  }

  return {
    userTranscript: 'Voice query received',
    coachReply: 'नमस्ते! मैं HealthFreak voice coach हूँ। आज आपकी fitness और diet में क्या help करूँ?',
    isEcho: false,
  };
}
