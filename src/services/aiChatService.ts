import { Platform } from 'react-native';
import Constants from 'expo-constants';

export function getBackendBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/$/, '');
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (envUrl) return envUrl.replace(/\/$/, '');
    const host = window.location.hostname || 'localhost';
    return `http://${host}:3001`;
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
    const timeoutId = setTimeout(() => controller.abort(), 5000);

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

  // Fast, instant offline fallback matching Sarvam voice coach persona
  return {
    text: `नमस्ते ${userName}! मैं HealthFreak voice coach हूँ। आपका message note हो गया है—आज आपकी diet और workout में क्या help करूँ?`,
    suggestions: [
      'Log my lunch',
      'Check today\'s workout',
      'Suggest high protein snack',
    ],
  };
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
