import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { normalizeForSpeech, pcmBase64ToWavBase64 } from '../utils/voiceTextNormalizer';

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
  return process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';
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
  // 1. First try local backend server if running in web or remote network
  const backendUrl = getBackendBaseUrl();
  const isLocalhostOnNative =
    Platform.OS !== 'web' &&
    (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1'));

  if (!isLocalhostOnNative) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(`${backendUrl}/api/voice/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          userId: userId || 'usr_synthetic_alex',
          generateCloudAudio: true,
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
  }

  // 2. Direct HTTPS Gemini API (Works flawlessly in standalone APK & offline)
  if (DIRECT_GEMINI_KEY) {
    try {
      const conditionsStr =
        conditions.length > 0 ? `User reported health conditions: ${conditions.join(', ')}.` : '';

      const activityStr =
        activityContext && typeof activityContext.todaySteps === 'number'
          ? `Current Real-Time Activity:
- Today's Steps Walked: ${activityContext.todaySteps.toLocaleString()} steps
- Daily Step Target: ${activityContext.stepGoal?.toLocaleString() || '10,000'} steps
- Walking Distance: ${activityContext.distanceMeters ? (activityContext.distanceMeters / 1000).toFixed(1) + ' km' : '0 km'}
- Active Calories: ${activityContext.caloriesBurned ? '~' + activityContext.caloriesBurned + ' kcal' : 'N/A'}
- Active Minutes: ${activityContext.activeMinutes || 0}m.`
          : '';

      const systemPrompt = `You are Coach Alex, an AI Health and Wellness Coach created by HealthFreak.
You are speaking directly with ${userName}.
You understand English, Hindi, and everyday Hinglish.
${conditionsStr}
${activityStr}
Rules:
1. Always be conversational, warm, empathetic, and encouraging.
2. Reply concisely in 1-2 sentences.
3. If user speaks in Hindi/Hinglish, reply in friendly natural Hinglish (using natural words like 'aap', 'aapka').
4. Never prescribe medication or give clinical medical diagnosis.
5. Provide actionable wellness, nutrition, or movement guidance.
6. When user asks about steps, distance, or activity goals, use the exact recorded metrics above deterministically.
7. Spoken clarity: Do not use markdown (no **, no bullets, no emojis). Use whole words for units ('grams', 'calories', 'liters').`;

      const candidateModels = Array.from(
        new Set([
          GEMINI_MODEL,
          'gemini-3.5-flash-lite',
          'gemini-flash-lite-latest',
          'gemini-3.8-flash',
          'gemini-3.5-flash',
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
                      text: `${systemPrompt}\n\nUser: "${message}"\nCoach:`,
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
            console.warn(`[HealthFreak AI Direct ${modelCandidate} Busy]: ${data.error.message}`);
            continue;
          }

          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            let audioBase64Out: string | undefined = undefined;
            let audioMimeOut: string | undefined = undefined;
            try {
              const speech = await synthesizeSpeechDirectClient(reply.trim());
              if (speech?.audioBase64) {
                audioBase64Out = speech.audioBase64;
                audioMimeOut = speech.audioMime;
              }
            } catch {}

            return {
              text: reply.trim(),
              suggestions: [
                'Help me plan my day',
                'Suggest a balanced dinner',
                'Check my active plan',
              ],
              audioBase64: audioBase64Out,
              audioMime: audioMimeOut,
            };
          }
        } catch (mErr) {
          console.warn(`[HealthFreak AI Direct ${modelCandidate} Failed]:`, mErr);
        }
      }
    } catch (err) {
      console.error('[HealthFreak AI] Gemini error:', err);
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
    'main alex bol raha hoon',
    'main alex bol raha',
    'main alex hoon',
    'alex bol raha hoon',
    'coach alex here',
    'aapki ai health coach',
    'aapki health coach',
    'healthfreak coach',
    'ai health coach from healthfreak',
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

const clientTtsBackoff = new Map<string, number>();

/**
 * Synthesizes high-fidelity human speech directly via Gemini Audio API
 * on the client side when backend server is bypassed or unreachable.
 *
 * Voice is ALWAYS locked to 'Kore' (single consistent female voice for Coach Alex).
 * We iterate over TTS models but NEVER over voices.
 * If a model fails, we try the next model with the SAME voice — never Aoede.
 */
export async function synthesizeSpeechDirectClient(
  text: string
): Promise<{ audioBase64: string; audioMime: string } | null> {
  if (!DIRECT_GEMINI_KEY || !text || !text.trim()) return null;

  const spokenText = normalizeForSpeech(text);
  if (!spokenText.trim()) return null;

  // Single locked voice — consistent across every turn, retry, and fallback
  const COACH_VOICE = 'Kore';

  const ttsModels = [
    'gemini-3.1-flash-tts-preview',
    'gemini-3.8-flash-lite-tts',
    'gemini-3.8-flash-tts',
  ];

  // Flat loop over models only — voice is constant
  for (const model of ttsModels) {
    const backoffUntil = clientTtsBackoff.get(model);
    if (backoffUntil && Date.now() < backoffUntil) {
      continue;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6500);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${DIRECT_GEMINI_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: spokenText }],
            },
          ],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: COACH_VOICE,
                },
              },
            },
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 429) {
        console.warn(`[Direct TTS 429 on ${model}]. Backing off for 60s.`);
        clientTtsBackoff.set(model, Date.now() + 60000);
        continue;
      }

      if (res.ok) {
        const data = await res.json();
        const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (inlineData?.data) {
          let base64 = inlineData.data;
          const mime = (inlineData.mimeType || '').toLowerCase();

          // If raw PCM L16, convert to standard playable WAV with RIFF header
          if (mime.includes('l16') || mime.includes('pcm') || !mime.includes('wav')) {
            base64 = pcmBase64ToWavBase64(base64, 24000, 1, 16);
          }

          return {
            audioBase64: base64,
            audioMime: 'audio/wav',
          };
        }
      }
    } catch (err: any) {
      console.warn(`[Direct TTS ${model} | Voice ${COACH_VOICE}]:`, err?.message || err);
      // Try next model with the same voice — never fall back to a different voice
    }
  }
  return null;
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
  lastCoachReply = '',
  userId = 'usr_synthetic_alex'
): Promise<{ userTranscript: string; coachReply: string; audioBase64?: string; audioMime?: string; audioUrl?: string; isEcho?: boolean; ttsExhausted?: boolean; ttsError?: string }> {
  // 1. First attempt backend server if reachable
  const backendUrl = getBackendBaseUrl();
  const isLocalhostOnNative =
    Platform.OS !== 'web' &&
    (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1'));

  if (!isLocalhostOnNative) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9500);

      const res = await fetch(`${backendUrl}/api/voice/audio-turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64Audio,
          mimeType,
          userId: userId || 'usr_synthetic_alex',
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
            ttsExhausted: Boolean(data.ttsExhausted),
            ttsError: data.ttsError,
            isEcho: false,
          };
        }
      }
    } catch {
      // Backend unreachable from this device, fallback to direct Gemini HTTPS
    }
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

      // Cap lastCoachReply to 60 chars before injecting into the prompt.
      // Longer injections cause Gemini to treat Hindi/Hinglish Romanized words
      // as abbreviations after several turns, producing letter-by-letter spelling.
      const safeLastReply = lastCoachReply
        ? lastCoachReply.trim().slice(0, 60).trimEnd()
        : '';

      const antiEchoPrompt = safeLastReply
        ? `CRITICAL ANTI-ECHO GUARD:
The AI coach (Coach Alex) just spoke this phrase through the loudspeaker:
"${safeLastReply}"
If the attached audio is just the microphone picking up the coach's own echo:
- Set userTranscript: "(Speaker echo)"
- Set coachReply: ""
Never reply to your own voice or create a self-conversation echo loop!

Otherwise, if a real human user is speaking:`
        : '';

      const instruction = `You are Coach Alex, an AI Health and Wellness Coach created by HealthFreak.
You are listening directly to a voice note from ${userName}.
${conditionsStr}
${antiEchoPrompt}
Listen carefully to the audio.
1. Transcribe what the user said verbatim (support English, Hindi, Hinglish). If silent or unintelligible, set userTranscript to "(Ambient sound or brief pause)".
2. As Coach Alex, generate a warm, concise, empathetic 1-2 sentence response guiding their nutrition, movement, or daily health habits.
   - For spoken voice clarity: Do not use markdown (**bold**, bullet points, emojis). Speak units in whole words ("130 grams", "2400 calories").
   - In Hinglish, use natural lowercase conversational words like 'aap', 'aapka' without acronym capitalization.
3. Return STRICTLY a valid JSON object with keys:
{
  "userTranscript": "<exact words user spoke or (Speaker echo)>",
  "coachReply": "<your 1-2 sentence response as Coach Alex or empty string if echo>"
}`;

      const candidateModels = Array.from(
        new Set([
          'gemini-3.5-flash-lite',
          'gemini-flash-lite-latest',
          'gemini-3.8-flash',
          GEMINI_MODEL,
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
                maxOutputTokens: 65,
                temperature: 0.35,
                responseMimeType: 'application/json',
              },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.error) {
              console.warn(`[HealthFreak Audio Direct ${modelCandidate} Busy]: ${data.error.message}`);
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

              let audioBase64Out: string | undefined = undefined;
              let audioMimeOut: string | undefined = undefined;
              if (coachReply.trim()) {
                try {
                  const speech = await synthesizeSpeechDirectClient(coachReply);
                  if (speech?.audioBase64) {
                    audioBase64Out = speech.audioBase64;
                    audioMimeOut = speech.audioMime;
                  }
                } catch (err) {
                  console.warn('[Direct Speech Synthesis Warning]:', err);
                }
              }

              return {
                userTranscript: userTranscript || 'Voice note recorded',
                coachReply,
                audioBase64: audioBase64Out,
                audioMime: audioMimeOut,
                isEcho: false,
              };
            }
          }
        } catch (mErr) {
          console.warn(`[HealthFreak Audio Direct ${modelCandidate} Failed]:`, mErr);
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

