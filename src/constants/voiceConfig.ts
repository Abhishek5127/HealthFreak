/**
 * Centralized voice configuration for HealthFreak AI Coach.
 *
 * COACH_VOICE is the single locked female voice used for every TTS request,
 * every retry, and every fallback. It never changes between conversation turns.
 *
 * To change the AI voice, update ONLY this file.
 */

/** The one and only voice used for all Coach Alex speech. Never overridden by retry logic. */
export const COACH_VOICE = 'Kore' as const;

/**
 * Device Voice Fallback:
 * When Google Cloud TTS daily free quota (10 turns/day) is exhausted,
 * the application uses the session-locked Indian female voice on the device
 * so the voice call never goes silent.
 */
export const ALLOW_DEVICE_TTS_FALLBACK = true;

/**
 * TTS model priority list (fastest → slowest).
 * On each attempt the SAME COACH_VOICE is used.
 * If a model fails we try the next model — never a different voice.
 */
export const TTS_MODELS_ORDERED = [
  'gemini-3.1-flash-tts-preview',
  'gemini-3.8-flash-lite-tts',
  'gemini-3.8-flash-tts',
] as const;

/**
 * Maximum characters of the previous coach reply injected into the
 * anti-echo prompt. Keeping this short prevents Gemini from treating
 * Hindi/Hinglish Romanized words as abbreviations after several turns.
 */
export const ANTI_ECHO_REPLY_MAX_CHARS = 60;

