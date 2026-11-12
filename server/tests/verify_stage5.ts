import { EXERCISE_CATALOG, getSuggestedExercises } from '../src/coach/exerciseCatalog.js';
import { PlanGenerationService } from '../src/plans/planGenerationService.js';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runStage5Verification() {
  console.log('=== STAGE 5 VERIFICATION ===\n');

  // Test 1: Exercise Catalog filtering & contraindications
  console.log('--- Test 1: Exercise Catalog & Contraindication Filtering ---');
  console.log(`Total exercises in catalog: ${EXERCISE_CATALOG.length}`);
  
  const allShoulder = getSuggestedExercises({ body_part: 'shoulders', limit: 10 });
  console.log(`Unfiltered shoulder exercises (${allShoulder.length}):`, allShoulder.map(e => e.id));
  const hasOverheadDefault = allShoulder.some(e => e.id === 'shoulder_overhead_press');
  console.log(`Overhead press present by default: ${hasOverheadDefault}`);

  const filteredShoulder = getSuggestedExercises({
    body_part: 'shoulders',
    userIssues: [{ title: 'Left shoulder strain / neck pain', category: 'injury' }],
    limit: 10,
  });
  console.log(`Filtered shoulder exercises with shoulder strain (${filteredShoulder.length}):`, filteredShoulder.map(e => e.id));
  const hasOverheadWhenStrained = filteredShoulder.some(e => e.id === 'shoulder_overhead_press');
  console.log(`Overhead press present when shoulder strain exists: ${hasOverheadWhenStrained}`);

  if (hasOverheadWhenStrained) {
    throw new Error('FAILED: Overhead press was NOT filtered out for shoulder strain issue!');
  }
  console.log('PASS: Overhead pressing is strictly filtered out when shoulder strain is present.\n');

  // Test 2: Plan draft creation
  console.log('--- Test 2: Plan Draft Creation Tool / Service ---');
  process.env.SYNTHETIC_DATA_MODE = 'true';
  try {
    const draft = await PlanGenerationService.generatePersonalizedPlanDraft({
      userId: 'usr_synthetic_alex',
      requestedLevel: 2,
      triggerReason: 'Stage 5 verification test',
    });
    console.log(`Draft generated successfully: Plan ID = ${draft.draftPlan.id}, Title = "${draft.draftPlan.title}", Items = ${draft.draftPlan.items.length}`);
    console.log('PASS: create_plan_draft service generates valid draft.\n');
  } catch (err: any) {
    console.error('Plan draft generation error:', err?.message || err);
    throw err;
  }

  // Test 3: LLM Concrete Exercise Prescription & Safety Rule
  console.log('--- Test 3: LLM Concrete Prescription & Safety Guidance ---');
  const apiKey = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.log('GEMINI_API_KEY not found, skipping live LLM call.');
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  const systemPrompt = `You are Coach Mack, an elite AI Health and Wellness Coach at HealthFreak.
Rules:
1. Use the user's name at most once per conversation, in the greeting only. Never start a reply with 'Arre' or the user's name. Never start two consecutive replies with the same word or phrase. Start by reacting to or answering what the user just said.
2. Length & style: Keep ordinary conversation short (2 to 3 sentences). When user asks for an exercise, a routine, or what to do, give a concrete prescription immediately: 3 to 4 exercises with sets and reps or duration, plus rest, home-only (up to 5 short sentences allowed). In voice, deliver 2 exercises per turn and ask "aage bataun?".
3. Safety: Urgent-care advice ONLY for red flags (chest pain, breathlessness, fainting, numbness or tingling spreading down an arm or leg, sudden severe pain, trauma). For mild muscle strain or soreness, give safe mobility and strengthening guidance.
4. Plain spoken conversational text only. No markdown, asterisks, or emoji.`;

  const userQuery = 'Can you recommend a shoulder exercise? My left shoulder has mild soreness after laptop work.';
  
  let reply = '';
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const resp = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nUser says: ${userQuery}` }],
          },
        ],
        config: {
          maxOutputTokens: 400,
        },
      });
      reply = resp.text?.trim() || '';
      if (reply) break;
    } catch (err: any) {
      console.warn(`Attempt ${attempt} notice:`, err?.message || err);
      if (attempt < 4) await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('User query:', userQuery);
  console.log('Coach reply:\n', reply);

  // Assertions on LLM reply:
  const hasDoctorDisclaimer = /see a doctor|consult a physician|visit an emergency|immediate medical|rush to the/i.test(reply);
  console.log(`Doctor/ER disclaimer present: ${hasDoctorDisclaimer}`);
  if (hasDoctorDisclaimer) {
    throw new Error('FAILED: Coach gave unnecessary doctor disclaimer for mild laptop shoulder soreness!');
  }

  const hasSetsOrReps = /sets?|reps?|seconds|sec|times/i.test(reply);
  console.log(`Contains concrete sets/reps/duration: ${hasSetsOrReps}`);
  if (!hasSetsOrReps) {
    throw new Error('FAILED: Coach did not give concrete sets, reps, or duration prescription!');
  }

  const hasOverheadPress = /overhead press|military press|shoulder press/i.test(reply);
  console.log(`Prescribed heavy overhead press: ${hasOverheadPress}`);
  if (hasOverheadPress) {
    throw new Error('FAILED: Coach prescribed overhead press despite shoulder soreness!');
  }

  console.log('\nALL STAGE 5 VERIFICATIONS PASSED SUCCESSFULLY!');
}

runStage5Verification().catch((err) => {
  console.error('Stage 5 verification failed:', err);
  process.exit(1);
});
