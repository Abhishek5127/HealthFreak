import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DIRECT_GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-3.5-flash-lite';

export function getBackendBaseUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:3001`;
  }
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:3001`;
  }
  return 'http://192.168.43.250:3001';
}

export async function askDishaAI(
  message: string,
  userName = 'there',
  conditions: string[] = []
): Promise<{ text: string; suggestions: string[] }> {
  // 1. First try local backend server
  try {
    const backendUrl = getBackendBaseUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const res = await fetch(`${backendUrl}/api/voice/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, userId: 'usr_synthetic_alex' }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.text) {
        return {
          text: data.text,
          suggestions: data.suggestions || [
            'Help me plan my day',
            'Suggest a balanced dinner',
            'Check my active plan',
          ],
        };
      }
    }
  } catch {
    // Backend unreachable from current device/network; proceed to direct Gemini call
  }

  // 2. Direct HTTPS Gemini API (Works when EXPO_PUBLIC_GEMINI_API_KEY is configured)
  if (DIRECT_GEMINI_KEY) {
    try {
      const conditionsStr =
        conditions.length > 0 ? `User reported health conditions: ${conditions.join(', ')}.` : '';

      const systemPrompt = `You are Disha, an AI Health and Wellness Coach created by Disha Health.
You are speaking directly with ${userName}.
You understand English, Hindi, and everyday Hinglish.
${conditionsStr}
Rules:
1. Always be conversational, warm, empathetic, and encouraging.
2. Reply concisely in 1-2 sentences.
3. If user speaks in Hindi/Hinglish, reply in friendly natural Hinglish.
4. Never prescribe medication or give clinical medical diagnosis.
5. Provide actionable wellness, nutrition, or movement guidance.`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${DIRECT_GEMINI_KEY}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `${systemPrompt}\n\nUser: "${message}"\nDisha:`,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 100,
            temperature: 0.6,
          },
        }),
      });

      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) {
        return {
          text: reply.trim(),
          suggestions: [
            'Help me plan my day',
            'Suggest a balanced dinner',
            'Check my active plan',
          ],
        };
      }
    } catch (err) {
      console.error('[Disha AI] Gemini error:', err);
    }
  }

  // 3. Ultra-safe offline fallback
  return {
    text: `Namaste ${userName}! Main sun rahi hoon. Aapka message mil gaya—aaj aap kaisa feel kar rahe hain? Any specific health goal we should work on today?`,
    suggestions: ['Help me plan my day', 'Suggest a balanced dinner', 'Explain my recent lab report'],
  };
}

export async function transcribeAndReplyAudio(
  base64Audio: string,
  mimeType = 'audio/webm',
  userName = 'Alex',
  conditions: string[] = []
): Promise<{ userTranscript: string; coachReply: string }> {
  // 1. First attempt backend server (logs to server terminal in real-time)
  try {
    const backendUrl = getBackendBaseUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const res = await fetch(`${backendUrl}/api/voice/audio-turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioBase64: base64Audio,
        mimeType,
        userId: 'usr_synthetic_alex',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.coachReply) {
        return {
          userTranscript: data.userTranscript || 'Voice note recorded',
          coachReply: data.coachReply,
        };
      }
    }
  } catch {
    // Backend unreachable from this device, fallback to direct Gemini HTTPS
  }

  // 2. Direct HTTPS Gemini API Fallback (Works when EXPO_PUBLIC_GEMINI_API_KEY is configured)
  if (DIRECT_GEMINI_KEY) {
    try {
      const conditionsStr =
        conditions.length > 0 ? `User reported health conditions: ${conditions.join(', ')}.` : '';

      let cleanMime = (mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
      if (cleanMime === 'audio/m4a' || cleanMime === 'audio/x-m4a' || cleanMime.endsWith('m4a')) {
        cleanMime = 'audio/mp4';
      }
      const instruction = `You are Disha, an AI Health and Wellness Coach created by Disha Health.
You are listening directly to a voice note from ${userName}.
${conditionsStr}
Listen carefully to the audio.
1. Transcribe what the user said verbatim (support English, Hindi, Hinglish). If silent or unintelligible, set userTranscript to "(Ambient sound or brief pause)".
2. As Disha, generate a warm, concise, empathetic 1-2 sentence response guiding their nutrition, movement, or daily health habits.
3. Return STRICTLY a valid JSON object with keys:
{
  "userTranscript": "<exact words user spoke>",
  "coachReply": "<your 1-2 sentence response as Disha>"
}`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${DIRECT_GEMINI_KEY}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: instruction },
                {
                  inlineData: {
                    mimeType: cleanMime,
                    data: base64Audio,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 100,
            temperature: 0.6,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
          try {
            const parsed = JSON.parse(cleaned);
            if (parsed.coachReply) {
              return {
                userTranscript: parsed.userTranscript || 'Voice note recorded',
                coachReply: parsed.coachReply,
              };
            }
          } catch {
            return {
              userTranscript: 'Voice query received',
              coachReply: rawText.trim(),
            };
          }
        }
      }
    } catch (err) {
      console.error('[transcribeAndReplyAudio error]', err);
    }
  }

  return {
    userTranscript: 'Voice message received',
    coachReply: `Namaste ${userName}! Main sun rahi hoon. Aapka audio mil gaya—aaj aap kaisa feel kar rahe hain? Any specific health goal today?`,
  };
}

