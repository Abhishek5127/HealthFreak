import { stripFormulaicOpener } from '../src/services/sarvamService.js';
import { config } from '../src/config/index.js';
import { GoogleGenAI } from '@google/genai';

async function main() {
  console.log('=== VERIFYING STAGE 4: 20-REPLY OPENER TEST ===\n');

  const apiKey = config.gemini.apiKey;
  if (!apiKey) {
    console.error('No Gemini API key available for 20-reply test');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  const userName = 'Abhishek';

  const userMessages = [
    'Main kal raat ache se so nahi paya, kya karoon?',
    'Aaj shaam ko workout karne ka mann nahi kar raha',
    'Subah nashte mein poha khana theek hai kya?',
    'Mera hydration goal kitna hona chahiye?',
    'Legs mein thoda tightness feel ho raha hai',
    'Dinner mein protein kaise badhaun bina non-veg ke?',
    'Kya main walk par ja sakta hoon khane ke turant baad?',
    'Office mein pura din baithna padta hai, koi tips?',
    'Chai mein cheeni band karne ke fayde kya hain?',
    'Core workout ke liye best exercises kaun si hain?',
    'Weight loss ke liye sabse important habit kya hai?',
    'Subah uthkar warm water peena kaisa rehta hai?',
    'Evening snack mein kya khana chahiye jo healthy ho?',
    'Knee strain ke baad kaun si exercise safe hai?',
    'Metabolism boost karne ke natural tareeqe kya hain?',
    'Kya roz 10,000 steps chalna zaroori hai?',
    'Dahi khane ka sabse accha samay kaun sa hai?',
    'Stress kam karne ke liye breathing exercise bataiye',
    'Posture improve karne ke liye kya exercises hain?',
    'Sleep cycle theek karne ke liye routine kaisa banayein?',
  ];

  let lastCoachReply = '';
  const results: Array<{ index: number; user: string; reply: string; firstTwoWords: string }> = [];

  for (let i = 0; i < userMessages.length; i++) {
    const msg = userMessages[i];
    const prevWords = lastCoachReply ? lastCoachReply.trim().split(/\s+/).slice(0, 3).join(' ') : '';
    const antiRepeatInstruction = prevWords ? `\n5. Do not start with these words: "${prevWords}".` : '';

    const systemPrompt = `You are Coach Mack, an elite AI Health and Wellness Coach at HealthFreak speaking directly with ${userName}.
Rules:
1. Use the user's name at most once per conversation, in the greeting only. Never start a reply with 'Arre' or the user's name. Never start two consecutive replies with the same word or phrase. Start by reacting to or answering what the user just said.
2. Keep your answer concise: exactly 2 to 3 short sentences. Motivating, clinically sound, and actionable.
3. Plain spoken conversational text only. No markdown, asterisks, or emoji.${antiRepeatInstruction}`;

    let rawText = '';
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const resp = await ai.models.generateContent({
          model: 'gemini-3.5-flash-lite',
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nUser says: ${msg}` }],
            },
          ],
        });
        rawText = resp.text?.trim() || '';
        if (rawText) break;
      } catch (err: any) {
        if (attempt < 3) {
          await new Promise((res) => setTimeout(res, 2000));
        } else {
          console.error(`Error on turn ${i + 1}:`, err?.message || err);
        }
      }
    }
    const cleanedReply = stripFormulaicOpener(rawText, userName);

    const words = cleanedReply.split(/\s+/);
    const firstTwo = words.slice(0, 2).join(' ').toLowerCase();

    results.push({
      index: i + 1,
      user: msg,
      reply: cleanedReply,
      firstTwoWords: firstTwo,
    });
    console.log(`[Turn ${i + 1}/20] Coach: "${cleanedReply.slice(0, 60)}..."`);

    lastCoachReply = cleanedReply;
  }

  console.log('--- 20 REPLIES GENERATED ---\n');
  let failures = 0;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    console.log(`[Turn ${r.index}] User: "${r.user}"`);
    console.log(`Coach: "${r.reply}"`);
    console.log(`First 2 words: "${r.firstTwoWords}"\n`);

    // Check 1: Does not start with "Arre" or variants
    if (/^(arre|are|arey|oye|hey)\b/i.test(r.reply)) {
      console.error(`FAIL Turn ${r.index}: Starts with Arre/variant!`);
      failures++;
    }

    // Check 2: Does not start with user's name
    if (new RegExp(`^${userName}\\b`, 'i').test(r.reply)) {
      console.error(`FAIL Turn ${r.index}: Starts with user name ${userName}!`);
      failures++;
    }

    // Check 3: No two consecutive replies share first two words
    if (i > 0) {
      const prev = results[i - 1];
      if (r.firstTwoWords === prev.firstTwoWords) {
        console.error(`FAIL Turn ${r.index}: Shares first two words with previous turn ("${r.firstTwoWords}")!`);
        failures++;
      }
    }
  }

  if (failures === 0) {
    console.log('✅ ALL 20 REPLIES PASSED! None started with "Arre" or user name, and no two consecutive replies shared their first two words.');
  } else {
    console.error(`❌ Total failures: ${failures}`);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
