# Coach Mack Vocabulary Banks

This directory contains bilingual vocabulary and intent banks shared across TypeScript and Python runtimes for Coach Mack (LiveKit voice agent, Express server chat, and Expo mobile client).

## Files:
- `voice_hi.json`: Spoken Hinglish in Devanagari script for Hindi words and Latin script for English loanwords. Masculine verb forms (सकता, करूँगा) for voice synthesis.
- `chat_roman.json`: Spoken Hinglish transcribed in Roman Latin script.
- `chat_en.json`: Professional, natural conversational English.

## Content & Intent Categories:
- **Intents** ($\ge 15$ entries per intent):
  - `acknowledge`: Acknowledgement openers and validation clauses.
  - `transition`: Conversation pivot and bridging phrases.
  - `encourage`: Sparse, natural encouragement (not excessive or formulaic).
  - `nudge`: Low-friction actionable suggestions.
  - `followup_checkin`: Progress inquiries and symptom status checks.
  - `clarify`: Clarifying context questions.
  - `closing`: Sign-off and call/chat wrap-up statements.
- **Domains** ($\ge 60$ entries per domain category):
  - `food`: Common Indian home foods, ingredients, and staples.
  - `movement`: Bodyweight, yoga, and walking exercises.
  - `body`: Body parts, joints, muscle groups, and physical locations.
  - `wellness`: Sleep, stress, breathwork, and general lifestyle habits.
- **by_goal**: Category-specific vocabulary for targeted goals (weight loss, muscle gain, metabolic energy, gut health, mindful rest).

> [!IMPORTANT]
> **Pre-Launch Native Speaker Review Required:**
> A native Hindi speaker must review all Hindi phrases before commercial release to ensure natural regional cadence, idiom validity, and polite respectful tone.

> [!NOTE]
> **No Medical Claims:**
> These banks contain solely common nutritional, movement, and wellness vocabulary. No medical claims, diagnoses, or pharmaceutical advice are contained within these files.
