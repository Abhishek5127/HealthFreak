/**
 * Voice Text Normalizer for HealthFreak AI Voice Companion
 *
 * Transforms raw AI-generated text (Hinglish, English, metrics, markdown)
 * into clean, natural, phonetically unambiguous spoken language.
 *
 * Key protections:
 * 1. Prevents letter-by-letter acronym pronunciation (e.g. "AAP" / "Aap" -> "aap").
 * 2. Expands fitness and nutritional units ("130g" -> "130 grams", "2965 kcal" -> "2965 calories").
 * 3. Strips markdown tokens, emojis, and non-phonetic symbols that cause robotic pauses.
 * 4. Inserts natural cadence and sentence-level breathing pauses.
 */

// Common Hinglish words prone to all-caps or capitalized acronym mistreatment by TTS tokenizers
const HINGLISH_CASING_MAP: Record<string, string> = {
  AAP: 'aap',
  Aap: 'aap',
  AAPKA: 'aapka',
  Aapka: 'aapka',
  AAPKE: 'aapke',
  Aapke: 'aapke',
  AAPKI: 'aapki',
  Aapki: 'aapki',
  AAPKO: 'aapko',
  Aapko: 'aapko',
  MAIN: 'main',
  Main: 'main',
  HAAN: 'haan',
  Haan: 'haan',
  HAIN: 'hain',
  Hain: 'hain',
  HOON: 'hoon',
  Hoon: 'hoon',
  NAHI: 'nahi',
  Nahi: 'nahi',
  KAREIN: 'karein',
  Karein: 'karein',
  THEEK: 'theek',
  Theek: 'theek',
  ROTI: 'roti',
  Roti: 'roti',
  DAL: 'dal',
  Dal: 'dal',
  PANEER: 'paneer',
  Paneer: 'paneer',
  CHAWAL: 'chawal',
  Chawal: 'chawal',
  SABZI: 'sabzi',
  Sabzi: 'sabzi',
  NAMASTE: 'Namaste',
  Namaste: 'Namaste',
};

const KNOWN_COLLAPSIBLE_HINDI_WORDS = new Set([
  'aap', 'aapka', 'aapke', 'aapki', 'aapko', 'main', 'haan', 'hain', 'hoon',
  'nahi', 'theek', 'karein', 'karna', 'karo', 'kaisa', 'kaisi', 'kaise',
  'paani', 'pani', 'roti', 'chawal', 'dal', 'sabzi', 'khana', 'accha',
  'achha', 'sahi', 'namaste', 'dhyan', 'rakhein', 'rakho', 'bolo', 'sun',
  'rahi', 'raha', 'rahe', 'hum', 'mera', 'meri', 'mere', 'tum', 'tera',
  'teri', 'tere', 'yeh', 'voh', 'hoga', 'hogi', 'hoge'
]);

/**
 * Normalizes conversational text for speech synthesis engines (Gemini Neural TTS & Device TTS).
 */
export function normalizeForSpeech(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let normalized = text;

  // 1. Strip role prefixes or JSON leakage
  normalized = normalized
    .replace(/^(?:coach alex|coach|healthfreak ai|ai|assistant|user)\s*:\s*/i, '')
    .replace(/^\{[\s\S]*?"coachReply"\s*:\s*"/i, '')
    .replace(/^[{\[\s"]+|["}\]\s]+$/g, '')
    .replace(/"userTranscript"[\s\S]*$/gi, '');

  // 2. Strip Markdown formatting
  normalized = normalized
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold **text**
    .replace(/\*(.*?)\*/g, '$1') // Italic *text*
    .replace(/__(.*?)__/g, '$1') // Bold __text__
    .replace(/_(.*?)_/g, '$1') // Italic _text_
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Markdown link [text](url) -> text
    .replace(/^[#>-]+\s*/gm, '') // Heading markers, blockquotes, bullets
    .replace(/^\s*[-*•]\s+/gm, '') // Unordered lists
    .replace(/^\s*\d+\.\s+/gm, ''); // Numbered lists

  // 3. Strip Emojis and decorative pictograms (prevent TTS from saying "fire emoji", "sparkles", etc.)
  normalized = normalized.replace(
    /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}]/gu,
    ''
  );

  // 4. Expand ratios and fractions commonly used in macros (e.g. "43/130g" -> "43 of 130 grams")
  normalized = normalized
    .replace(/(\d+)\s*\/\s*(\d+)\s*g\b/gi, '$1 of $2 grams')
    .replace(/(\d+)\s*\/\s*(\d+)\s*kcal\b/gi, '$1 of $2 calories')
    .replace(/(\d+)\s*\/\s*(\d+)\b/g, '$1 of $2');

  // 5. Expand fitness and nutrition measurements
  normalized = normalized
    .replace(/\b(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:kcal|calories?)\b/gi, '$1 calories')
    .replace(/\b(\d+(?:,\d+)*(?:\.\d+)?)\s*cal\b/gi, '$1 calories')
    .replace(/\b(\d+(?:,\d+)*(?:\.\d+)?)\s*kg\b/gi, '$1 kilograms')
    .replace(/\b(\d+(?:,\d+)*(?:\.\d+)?)\s*g\b/gi, '$1 grams')
    .replace(/\b(\d+(?:,\d+)*(?:\.\d+)?)\s*mg\b/gi, '$1 milligrams')
    .replace(/\b(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:ml|millilitres?|milliliters?)\b/gi, '$1 milliliters')
    .replace(/\b(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:l|litres?|liters?)\b/gi, '$1 liters')
    .replace(/\b(\d+(?:,\d+)*(?:\.\d+)?)\s*km\b/gi, '$1 kilometers')
    .replace(/\b(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:mins?|minutes?)\b/gi, '$1 minutes')
    .replace(/\b(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:secs?|seconds?)\b/gi, '$1 seconds')
    .replace(/\b(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:hrs?|hours?)\b/gi, '$1 hours')
    .replace(/\b(\d+)\s*bpm\b/gi, '$1 beats per minute')
    .replace(/\b(\d+)k\s*steps\b/gi, '$1 thousand steps')
    .replace(/\b(\d+)\s*%\b/g, '$1 percent');

  // 6. Common Health Acronyms (space out for clear letter pronunciation)
  normalized = normalized
    .replace(/\bBMR\b/g, 'B M R')
    .replace(/\bBMI\b/g, 'B M I')
    .replace(/\bHRV\b/g, 'H R V')
    .replace(/\bVO2\s*max\b/gi, 'V O 2 max')
    .replace(/\bPCOS\b/g, 'P C O S')
    .replace(/\bPCOD\b/g, 'P C O D');

  // 7. De-hyphenate corrupted acronym-spelled words (e.g. "A-A-P" -> "Aap", "M-A-I-N" -> "Main")
  normalized = normalized.replace(/\b([a-zA-Z])(?:-([a-zA-Z])){1,10}\b/g, (match) => {
    const word = match.replace(/-/g, '').toLowerCase();
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  // 8. Collapse space-separated letters when they form known Hindi/Hinglish words (e.g. "A A P" -> "Aap", "M A I N" -> "Main")
  // Preserves legitimate health acronyms like "B M I" and "B M R".
  normalized = normalized.replace(/\b([A-Za-z])(?:\s+([A-Za-z])){1,8}\b/g, (match) => {
    const candidate = match.replace(/\s+/g, '').toLowerCase();
    if (KNOWN_COLLAPSIBLE_HINDI_WORDS.has(candidate)) {
      return candidate.charAt(0).toUpperCase() + candidate.slice(1);
    }
    return match;
  });

  // 9. Hinglish Acronym & Casing Guard (prevent "Aap" -> "A-A-P" letter-by-letter spelling)
  for (const [key, replacement] of Object.entries(HINGLISH_CASING_MAP)) {
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    normalized = normalized.replace(regex, replacement);
  }

  // 8. Punctuation & sentence cadence
  // Replace ellipses with comma pause
  normalized = normalized.replace(/\.{2,}/g, ', ');
  // Remove non-spoken symbols: ~, ^, |, \, /, _, <, >
  normalized = normalized.replace(/[~^|\\_<>]/g, ' ');
  // Clean dangling dashes
  normalized = normalized.replace(/\s+-\s+/g, ', ');
  // Remove empty parentheses
  normalized = normalized.replace(/\(\s*\)/g, '');

  // 9. Whitespace collapse
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // 10. Ensure sentence has friendly terminal punctuation for natural speech pause
  if (normalized && !/[.?!]$/.test(normalized)) {
    normalized += '.';
  }

  return normalized;
}

/**
 * Checks if text is primarily Hindi or Hinglish written in Latin script or Devanagari.
 */
export function isHinglishOrHindi(text: string): boolean {
  if (!text) return false;
  // Has Devanagari Unicode
  if (/[\u0900-\u097F]/.test(text)) return true;

  // Latin-script Hinglish keywords
  const hinglishMarkers = [
    /\baap\b/i,
    /\baapka\b/i,
    /\baapke\b/i,
    /\baapki\b/i,
    /\bkaisa\b/i,
    /\bkaisi\b/i,
    /\bkaise\b/i,
    /\bhai\b/i,
    /\bhain\b/i,
    /\bhoon\b/i,
    /\bkarein\b/i,
    /\bkarna\b/i,
    /\baaj\b/i,
    /\bkal\b/i,
    /\btheek\b/i,
    /\bsahi\b/i,
    /\bnahi\b/i,
    /\bhaan\b/i,
    /\bsun\b/i,
    /\brahi\b/i,
    /\braha\b/i,
    /\bnamaste\b/i,
    /\bdhyan\b/i,
    /\bpani\b/i,
    /\bpaani\b/i,
    /\bkhao\b/i,
    /\bkhana\b/i,
    /\bbatao\b/i,
    /\bbatayein\b/i,
  ];

  return hinglishMarkers.some((marker) => marker.test(text));
}

/**
 * Converts raw 16-bit linear PCM base64 string into a standard RIFF WAVE (.wav) base64 string.
 * Completely portable across React Native, Web, and Node without Node Buffer dependency.
 */
export function pcmBase64ToWavBase64(
  pcmBase64: string,
  sampleRate = 24000,
  numChannels = 1,
  bitDepth = 16
): string {
  if (!pcmBase64) return '';

  const BufferClass = typeof globalThis !== 'undefined' ? (globalThis as any).Buffer : undefined;

  let rawBytes: Uint8Array;
  if (BufferClass) {
    rawBytes = new Uint8Array(BufferClass.from(pcmBase64, 'base64'));
  } else if (typeof atob === 'function') {
    const binStr = atob(pcmBase64);
    rawBytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) {
      rawBytes[i] = binStr.charCodeAt(i);
    }
  } else {
    return pcmBase64;
  }

  const dataLen = rawBytes.length;
  const header = new Uint8Array(44);
  const view = new DataView(header.buffer);

  // RIFF identifier 'RIFF'
  header[0] = 82; header[1] = 73; header[2] = 70; header[3] = 70;
  // file length 36 + dataLen
  view.setUint32(4, 36 + dataLen, true);
  // 'WAVE'
  header[8] = 87; header[9] = 65; header[10] = 86; header[11] = 69;
  // 'fmt '
  header[12] = 102; header[13] = 109; header[14] = 116; header[15] = 32;
  // Subchunk1Size = 16
  view.setUint32(16, 16, true);
  // AudioFormat = 1 (PCM)
  view.setUint16(20, 1, true);
  // NumChannels
  view.setUint16(22, numChannels, true);
  // SampleRate
  view.setUint32(24, sampleRate, true);
  // ByteRate = SampleRate * NumChannels * BitsPerSample/8
  view.setUint32(28, (sampleRate * numChannels * bitDepth) / 8, true);
  // BlockAlign = NumChannels * BitsPerSample/8
  view.setUint16(32, (numChannels * bitDepth) / 8, true);
  // BitsPerSample
  view.setUint16(34, bitDepth, true);
  // 'data'
  header[36] = 100; header[37] = 97; header[38] = 116; header[39] = 97;
  // Subchunk2Size = dataLen
  view.setUint32(40, dataLen, true);

  // Combine header + rawBytes
  const wavBytes = new Uint8Array(44 + dataLen);
  wavBytes.set(header, 0);
  wavBytes.set(rawBytes, 44);

  // Encode back to base64
  if (BufferClass) {
    return BufferClass.from(wavBytes).toString('base64');
  } else if (typeof btoa === 'function') {
    let binary = '';
    const len = wavBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(wavBytes[i]);
    }
    return btoa(binary);
  }
  return pcmBase64;
}
