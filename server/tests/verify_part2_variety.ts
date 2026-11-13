import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { VarietyController } from '../src/coach/style/varietyController.js';
import { PhraseBudget } from '../src/coach/style/phraseBudget.js';
import { runStyleReport } from '../scripts/coach_style_report.js';

let passedCount = 0;
let failedCount = 0;

function pass(testName: string) {
  console.log(`  ✅ PASS: ${testName}`);
  passedCount++;
}

function fail(testName: string, err: any) {
  console.error(`  ❌ FAIL: ${testName}`, err);
  failedCount++;
}

async function runTests() {
  console.log('================================================================');
  console.log(' VERIFY PART 2: VOCABULARY BANKS, VARIETY CONTROLLER, PHRASE BUDGET');
  console.log('================================================================\n');

  // 1. Vocabulary Banks Coverage
  console.log('--- TEST 1: Vocabulary Banks Coverage & Schemas ---');
  const banks = [
    { file: 'voice_hi.json', lang: 'Hindi Devanagari' },
    { file: 'chat_roman.json', lang: 'Roman Hinglish' },
    { file: 'chat_en.json', lang: 'English' },
  ];

  for (const b of banks) {
    const filePath = path.resolve(__dirname, `../src/coach/vocab/${b.file}`);
    assert(fs.existsSync(filePath), `Vocabulary file ${b.file} must exist`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Check intents
    const intents = ['acknowledge', 'transition', 'encourage', 'nudge', 'followup_checkin', 'clarify', 'closing'];
    for (const intent of intents) {
      const list = data.intents?.[intent];
      assert(Array.isArray(list), `${b.file} must have intent array ${intent}`);
      assert(list.length >= 15, `${b.file} intent ${intent} must have at least 15 entries (got ${list.length})`);
    }

    // Check domains
    const domains = ['food', 'movement', 'body', 'wellness'];
    for (const domain of domains) {
      const list = data.domain?.[domain];
      assert(Array.isArray(list), `${b.file} must have domain array ${domain}`);
      assert(list.length >= 60, `${b.file} domain ${domain} must have at least 60 entries (got ${list.length})`);
    }

    pass(`${b.lang} (${b.file}) has >= 15 entries across all 7 intents and >= 60 entries across all 4 domains`);
  }

  // 2. VarietyController Ring Buffer & Deterministic Seeded Sampling
  console.log('\n--- TEST 2: VarietyController Ring Buffer & Seeded Sampling ---');
  const testSession = 'test_sess_variety_01';
  VarietyController.clear(testSession);
  const controller = VarietyController.get(testSession);

  // Initial state
  assert.strictEqual(controller.getHistory().length, 0);
  const emptyBlock = controller.buildStyleVarietyBlock();
  assert.strictEqual(emptyBlock.blockText, '');

  // Add 15 replies to test 12-reply ring buffer cap
  for (let i = 1; i <= 15; i++) {
    controller.recordAssistantReply(`Reply number ${i}: keep moving forward.`);
  }

  assert.strictEqual(controller.getHistory().length, 12, 'Ring buffer must cap at 12 replies');
  assert(controller.getHistory()[0].includes('Reply number 4'), 'Ring buffer drops oldest entries');
  assert(controller.getHistory()[11].includes('Reply number 15'), 'Ring buffer keeps latest entry');
  pass('Ring buffer caps at exactly 12 replies and evicts oldest');

  // Deterministic sampling test
  const blockA = controller.buildStyleVarietyBlock(12345);
  const blockB = controller.buildStyleVarietyBlock(12345);
  const blockC = controller.buildStyleVarietyBlock(99999);
  assert.strictEqual(blockA.blockText, blockB.blockText, 'Seeded block generation must be 100% reproducible');
  assert(blockA.tokenCountEstimate <= 80, `Style block tokens (${blockA.tokenCountEstimate}) must be <= 80`);
  pass('Seeded sampling produces 100% deterministic, reproducible output within token limit');

  // 3. Trigram Overlap Calculation
  console.log('\n--- TEST 3: Trigram Overlap & Repetition Detection ---');
  const overlapA = controller.calculateTrigramOverlap('keep moving forward with your daily steps', 6);
  assert(overlapA > 0, `Expected positive trigram overlap for shared phrase (got ${overlapA})`);

  const overlapB = controller.calculateTrigramOverlap('completely unique sentence without any historical match', 6);
  assert.strictEqual(overlapB, 0, 'Unique text must have 0 trigram overlap');
  pass('Trigram overlap correctly detects historical phrase repetition and novelty');

  // 4. PhraseBudget: Gap Enforcement & Clause Removal
  console.log('\n--- TEST 4: PhraseBudget Soft Budget & Leading Clause Stripping ---');
  const budgetSession = 'test_sess_phrase_budget_01';
  PhraseBudget.clear(budgetSession);
  const pBudget = PhraseBudget.get(budgetSession);

  // Turn 0: initial stock phrase allowed
  const r0 = pBudget.processReply('ठीक है, आज 20 मिनट वॉक कर लीजिए।');
  assert.strictEqual(r0.hasStockPhrase, true);
  assert.strictEqual(r0.phraseStripped, false, 'Initial turn allowed stock phrase');
  assert(r0.text.startsWith('ठीक है'), 'Original text preserved when allowed');
  pass('Turn 0 stock phrase allowed under initial budget');

  // Turn 1: under 8-sentence gap, stock phrase stripped
  const r1 = pBudget.processReply('बढ़िया, शाम को पानी पूरा पीजिएगा।');
  assert.strictEqual(r1.hasStockPhrase, true);
  assert.strictEqual(r1.phraseStripped, true, 'Stock phrase stripped when gap not met');
  assert(!r1.text.startsWith('बढ़िया'), 'Stock phrase removed');
  assert(r1.text.startsWith('शाम को') || r1.text.startsWith('Sh'), 'Remaining text starts clean and capitalised');
  pass('Subsequent stock phrase cleanly stripped when under 8-sentence gap');

  // 5. Exemption of Safety & Crisis Messages
  console.log('\n--- TEST 5: Safety, Crisis & Read-Back Exemptions ---');
  const crisisText = 'अगर आपको बहुत परेशानी महसूस हो रही है तो Tele-MANAS 14416 पर संपर्क करें।';
  const crisisRes = pBudget.processReply(crisisText);
  assert.strictEqual(crisisRes.text, crisisText, 'Crisis message must never be altered');

  const readBackText = 'घुटने का दर्द अब नहीं है, सही? नोट कर लेता हूँ।';
  const readBackRes = pBudget.processReply(readBackText);
  assert.strictEqual(readBackRes.text, readBackText, 'Confirmation read-back must never be altered');
  pass('Crisis and confirmation read-back messages are 100% exempt from phrase budget stripping');

  // 6. Style Report Execution
  console.log('\n--- TEST 6: Style Report & Metrics Audit Script ---');
  runStyleReport();
  pass('Style report executed and generated statistical metrics successfully');

  console.log('================================================================');
  console.log(` ALL PART 2 TESTS PASSED! (${passedCount} passed, ${failedCount} failed)`);
  console.log('================================================================\n');

  if (failedCount > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

