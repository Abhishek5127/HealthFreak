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
  return 'http://192.168.43.249:3001';
}

export async function askDishaAI(
  message: string,
  userName = 'there',
  conditions: string[] = []
): Promise<{ text: string; suggestions: string[]; audioBase64?: string; audioMime?: string; audioUrl?: string }> {
  // 1. First try local backend server
  try {
    const backendUrl = getBackendBaseUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const res = await fetch(`${backendUrl}/api/voice/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, userId: 'usr_synthetic_alex', generateCloudAudio: true }),
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
          audioBase64: data.audioBase64,
          audioMime: data.audioMime,
          audioUrl: data.audioUrl,
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

      const candidateModels = Array.from(
        new Set([
          GEMINI_MODEL,
          'gemini-3.8-flash',
          'gemini-3.5-flash',
          'gemini-3.1-flash-lite',
        ])
      ).filter(Boolean);

      for (const modelCandidate of candidateModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelCandidate}:generateContent?key=${DIRECT_GEMINI_KEY}`;

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
          if (data.error) {
            console.warn(`[Disha AI Direct ${modelCandidate} Busy]: ${data.error.message}`);
            continue;
          }

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
        } catch (mErr) {
          console.warn(`[Disha AI Direct ${modelCandidate} Failed]:`, mErr);
        }
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
    'main disha bol rahi hoon',
    'main disha bol rahi',
    'main disha hoon',
    'disha bol rahi hoon',
    'disha here',
    'aapki ai health coach',
    'aapki health coach',
    'disha health coach',
    'ai health coach from disha',
    'taking a quick wellness check in',
    'time for a peaceful wind down',
  ];

  for (const phrase of coachIdentityPhrases) {
    if (cleanUser.includes(phrase)) {
      return true;
    }
  }

  if (cleanUser.length >= 10 && cleanCoach.includes(cleanUser)) {
    return true;
  }

  const userWords = cleanUser.split(' ').filter((w) => w.length > 2);
  if (userWords.length >= 3) {
    const matchingWords = userWords.filter((w) => cleanCoach.includes(w));
    const ratio = matchingWords.length / userWords.length;
    if (ratio >= 0.65) {
      return true;
    }
  }

  return false;
}

/**
 * Strips any accidental JSON wrappers, userTranscript, or speaker labels
 * so the AI coach ONLY speaks their own clinical answer to the user.
 */
export function cleanCoachReplyOnly(text: string): string {
  if (!text) return '';
  let cleaned = text.trim();

  // If text starts with JSON or contains userTranscript, strip out only the coachReply
  if (cleaned.includes('"coachReply"') || cleaned.includes('"userTranscript"')) {
    const coachMatch =
      cleaned.match(/"coachReply"\s*:\s*"([\s\S]*?)(?:""|",|"\s*}|"\s*$|$)/i) ||
      cleaned.match(/"coachReply"\s*:\s*"([\s\S]*?)"/i);
    if (coachMatch && coachMatch[1]) {
      cleaned = coachMatch[1];
    } else {
      const idx = cleaned.indexOf('"coachReply"');
      if (idx !== -1) {
        cleaned = cleaned.slice(idx).replace(/^"coachReply"\s*:\s*"/i, '');
      }
    }
  }

  // Strip any accidental markdown formatting, JSON residue or userTranscript markers
  cleaned = cleaned
    .replace(/^\{[\s\S]*?"coachReply"\s*:\s*"/i, '')
    .replace(/^[{\[\s"]+|["}\]\s]+$/g, '')
    .replace(/"userTranscript"[\s\S]*$/gi, '')
    .replace(/userTranscript\s*:[\s\S]*?coachReply\s*:/gi, '')
    .trim();

  return cleaned;
}

export async function transcribeAndReplyAudio(
  base64Audio: string,
  mimeType = 'audio/webm',
  userName = 'Alex',
  conditions: string[] = [],
  lastCoachReply = ''
): Promise<{ userTranscript: string; coachReply: string; audioBase64?: string; audioMime?: string; audioUrl?: string; isEcho?: boolean }> {
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
        lastCoachReply,
        generateCloudAudio: true,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.isEcho) {
        return {
          userTranscript: data.userTranscript || '(Speaker feedback suppressed)',
          coachReply: '',
          isEcho: true,
        };
      }
      if (data.coachReply) {
        return {
          userTranscript: data.userTranscript || 'Voice note recorded',
          coachReply: data.coachReply,
          audioBase64: data.audioBase64,
          audioMime: data.audioMime,
          audioUrl: data.audioUrl,
          isEcho: false,
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

      const antiEchoPrompt = lastCoachReply
        ? `CRITICAL ANTI-ECHO GUARD:
The AI coach (Disha) just finished speaking this exact phrase through the phone loudspeaker:
"${lastCoachReply}"
If the attached audio recording is just the microphone picking up the coach's own previous words or echo repeating back from the loudspeaker:
- Set userTranscript: "(Speaker echo)"
- Set coachReply: ""
DO NOT reply to your own voice or previous words! Never create a self-conversation echo loop!

Otherwise, if a real human user is speaking:`
        : '';

      const instruction = `You are Disha, an AI Health and Wellness Coach created by Disha Health.
You are listening directly to a voice note from ${userName}.
${conditionsStr}
${antiEchoPrompt}
Listen carefully to the audio.
1. Transcribe what the user said verbatim (support English, Hindi, Hinglish). If silent or unintelligible, set userTranscript to "(Ambient sound or brief pause)".
2. As Disha, generate a warm, concise, empathetic 1-2 sentence response guiding their nutrition, movement, or daily health habits.
3. Return STRICTLY a valid JSON object with keys:
{
  "userTranscript": "<exact words user spoke or (Speaker echo)>",
  "coachReply": "<your 1-2 sentence response as Disha or empty string if echo>"
}`;

      const candidateModels = Array.from(
        new Set([
          GEMINI_MODEL,
          'gemini-3.8-flash',
          'gemini-3.5-flash',
          'gemini-3.1-flash-lite',
        ])
      ).filter(Boolean);

      for (const modelCandidate of candidateModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelCandidate}:generateContent?key=${DIRECT_GEMINI_KEY}`;

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
                maxOutputTokens: 300,
                temperature: 0.6,
                responseMimeType: 'application/json',
              },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.error) {
              console.warn(`[Disha Audio Direct ${modelCandidate} Busy]: ${data.error.message}`);
              continue;
            }
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
              let userTranscript = 'Voice message';
              let coachReply = '';

              try {
                const parsed = JSON.parse(cleaned);
                if (parsed.userTranscript) userTranscript = parsed.userTranscript.trim();
                if (parsed.coachReply) coachReply = parsed.coachReply.trim();
              } catch {
                const userMatch =
                  cleaned.match(/"userTranscript"\s*:\s*"([\s\S]*?)(?:",|"\s*\n|"\s*})/i) ||
                  cleaned.match(/"userTranscript"\s*:\s*"([\s\S]*?)"/i);
                if (userMatch && userMatch[1]) {
                  userTranscript = userMatch[1].trim();
                }

                const coachMatch =
                  cleaned.match(/"coachReply"\s*:\s*"([\s\S]*?)(?:""|",|"\s*}|"\s*$|$)/i);
                if (coachMatch && coachMatch[1]) {
                  coachReply = coachMatch[1].trim();
                } else {
                  const idx = cleaned.indexOf('"coachReply"');
                  if (idx !== -1) {
                    const sub = cleaned.slice(idx);
                    const m = sub.match(/:\s*"*([\s\S]*?)(?:""|"|}|\n|$)/);
                    if (m && m[1]) coachReply = m[1].trim();
                  }
                }
              }

              // Safety Guard: Strip user query or JSON echo from coachReply
              if (coachReply.includes('"userTranscript"') || coachReply.includes('userTranscript:')) {
                const idx = coachReply.indexOf('"coachReply"');
                if (idx !== -1) {
                  coachReply = coachReply.slice(idx).replace(/^"coachReply"\s*:\s*"/i, '');
                }
              }

              coachReply = coachReply
                .replace(/^\{[\s\S]*?"coachReply"\s*:\s*"/i, '')
                .replace(/^[{\[\s"]+|["}\]\s]+$/g, '')
                .replace(/"userTranscript"[\s\S]*$/gi, '')
                .replace(/userTranscript\s*:[\s\S]*?coachReply\s*:/gi, '')
                .trim();

              if (!coachReply || coachReply.includes('{') || coachReply.includes('}')) {
                coachReply = 'Main sun rahi hoon Alex! Aapka routine bilkul sahi ja raha hai.';
              }

              if (
                userTranscript === '(Speaker echo)' ||
                !coachReply.trim() ||
                (lastCoachReply && isSelfEcho(userTranscript, lastCoachReply))
              ) {
                return {
                  userTranscript: '(Speaker feedback suppressed)',
                  coachReply: '',
                  isEcho: true,
                };
              }

              return {
                userTranscript: userTranscript || 'Voice note recorded',
                coachReply,
                isEcho: false,
              };
            }
          }
        } catch (mErr) {
          console.warn(`[Disha Audio Direct ${modelCandidate} Failed]:`, mErr);
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

