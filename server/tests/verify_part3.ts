import { PendingOpsManager, PendingMemoryOp } from '../src/coach/memory/pendingOpsManager.js';
import { FollowUpGenerator } from '../src/coach/memory/followupGenerator.js';
import { MemoryPurgeService } from '../src/coach/memory/purgeService.js';
import { CallMemoryReconciler } from '../src/coach/memory/reconciler.js';
import { db } from '../src/db/index.js';
import { healthMemoryStore } from '../src/db/healthMemoryStore.js';

let passed = 0;
let failed = 0;

function assert(cond: boolean, name: string) {
  if (cond) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}`);
    failed++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('=== PART 3 VERIFICATION: MEMORY HYGIENE & PURGE ===');
  console.log('====================================================\n');

  // --- SUITE 1: FALSE-POSITIVE GUARD (RULE 3) ---
  console.log('--- TEST SUITE 1: FALSE-POSITIVE GUARD ---');
  const dummyIssues = [{ id: 'iss_1', title: 'Knee Pain', category: 'pain' }];
  const testUser = 'user_test_guard_1';

  // Positive statement creates nothing
  const pos1 = PendingOpsManager.detectCandidate('My energy is great today!', dummyIssues, 1, testUser);
  assert(pos1 === null, '"My energy is great" creates nothing');

  const pos2 = PendingOpsManager.detectCandidate('Feeling energetic and sab badhiya hai', dummyIssues, 1, testUser);
  assert(pos2 === null, '"Feeling energetic and sab badhiya" creates nothing');

  // Negation creates nothing
  const neg1 = PendingOpsManager.detectCandidate('There is no pain in my shoulder', dummyIssues, 1, testUser);
  assert(neg1 === null, '"no pain in shoulder" creates nothing');

  const neg2 = PendingOpsManager.detectCandidate('Ghutne me ab dard nahi hai', dummyIssues, 1, testUser);
  assert(neg2 !== null && neg2.type === 'resolve_issue', '"Ghutne me ab dard nahi hai" detects resolution candidate');

  const neg3 = PendingOpsManager.detectCandidate('Kandhe me dard nahi ho raha', dummyIssues, 1, testUser);
  assert(neg3 === null, '"dard nahi ho raha" for unlisted issue creates no new issue');

  // Explicit symptom report creates candidate
  const sym1 = PendingOpsManager.detectCandidate('Kandhe me dard ho raha hai kal se', dummyIssues, 1, testUser);
  assert(sym1 !== null && sym1.type === 'add_issue', 'Genuine symptom report creates candidate add_issue');
  assert(sym1?.payload.title === 'Shoulder Pain', 'Candidate title identified as Shoulder Pain');

  // --- SUITE 2: RESOLUTION CANDIDATE & CONFIRMATION GATING ---
  console.log('\n--- TEST SUITE 2: RESOLUTION & CONFIRMATION GATING ---');
  const openIssues = [
    { id: 'iss_knee', title: 'Knee Pain', category: 'pain' },
    { id: 'iss_shoulder', title: 'Shoulder Strain', category: 'pain' },
  ];

  const resCand = PendingOpsManager.detectCandidate(
    'Mera kandhe ka dard ab theek ho gaya hai',
    openIssues,
    1,
    testUser
  );
  assert(resCand !== null, 'Detects resolution candidate');
  assert(resCand?.type === 'resolve_issue', 'Operation type is resolve_issue');
  assert(resCand?.payload.issueId === 'iss_shoulder', 'Correctly matches target issueId');

  // Strict confirmation classification
  assert(PendingOpsManager.classifyConfirmation('yes') === 'yes', 'Classifies "yes" as yes');
  assert(PendingOpsManager.classifyConfirmation('Haan, bilkul') === 'yes', 'Classifies "Haan, bilkul" as yes');
  assert(PendingOpsManager.classifyConfirmation('sahi hai, hata do') === 'yes', 'Classifies "sahi hai, hata do" as yes');
  assert(PendingOpsManager.classifyConfirmation('हाँजी, बिल्कुल हटा दो') === 'yes', 'Classifies Devanagari "हाँजी, बिल्कुल हटा दो" as yes');

  // Hard requirement: "theek hai" alone DOES NOT delete
  assert(PendingOpsManager.classifyConfirmation('theek hai') === 'unrelated', '"theek hai" alone DOES NOT classify as yes (returns unrelated)');
  assert(PendingOpsManager.classifyConfirmation('ok theek hai') === 'unrelated', '"ok theek hai" alone does not confirm');

  // Negatives
  assert(PendingOpsManager.classifyConfirmation('no, still hurts') === 'no', 'Classifies "no, still hurts" as no');
  assert(PendingOpsManager.classifyConfirmation('nahi mat hatao') === 'no', 'Classifies "nahi mat hatao" as no');
  assert(PendingOpsManager.classifyConfirmation('rehne do abhi') === 'no', 'Classifies "rehne do abhi" as no');

  // --- SUITE 3: PENDING OP EXPIRY (3 TURNS) ---
  console.log('\n--- TEST SUITE 3: PENDING OP LIFECYCLE & EXPIRY ---');
  const expUser = 'user_test_exp';
  PendingOpsManager.setPendingOp({
    id: 'op_exp_1',
    userId: expUser,
    type: 'add_issue',
    payload: { title: 'Back Pain', category: 'pain' },
    createdTurn: 1,
    expiresAfterTurn: 4,
    confirmationQuestion: 'Confirm back pain?',
  });

  assert(PendingOpsManager.getPendingOp(expUser) !== null, 'Pending op is active at turn 1');
  PendingOpsManager.incrementTurn(expUser); // 2
  PendingOpsManager.incrementTurn(expUser); // 3
  PendingOpsManager.incrementTurn(expUser); // 4
  assert(PendingOpsManager.getPendingOp(expUser) !== null, 'Pending op is still active at turn 4');
  PendingOpsManager.incrementTurn(expUser); // 5 (turn > 4)
  assert(PendingOpsManager.getPendingOp(expUser) === null, 'Pending op expired after 3 turns');

  // --- SUITE 4: IN-MEMORY PURGE & CLEANUP ---
  console.log('\n--- TEST SUITE 4: IN-MEMORY PURGE & CLEANUP ---');
  const purgeUser = 'user_test_purge';
  healthMemoryStore.healthConditions.set(purgeUser, [
    {
      id: 'cond_knee',
      userId: purgeUser,
      conditionName: 'Knee Pain',
      category: 'orthopedic',
      active: true,
      verificationStatus: 'user_reported',
      confidence: 1.0,
      source: 'user',
      dateReported: new Date().toISOString(),
    } as any,
  ]);

  MemoryPurgeService.purgeInMemory(purgeUser, 'iss_knee_1', 'Knee Pain');
  const userConditions = healthMemoryStore.healthConditions.get(purgeUser) || [];
  assert(
    !userConditions.some((c) => c.conditionName.toLowerCase().includes('knee')),
    'In-memory condition purged completely'
  );

  // --- SUITE 5: DYNAMIC FOLLOW-UP GENERATOR ---
  console.log('\n--- TEST SUITE 5: DYNAMIC FOLLOW-UP GENERATION ---');
  const qEn = FollowUpGenerator.generateQuestion({ title: 'Knee Pain', category: 'pain' }, 'en', 0);
  assert(qEn.includes('Knee Pain'), 'Generates English follow-up question with title');

  const qHi = FollowUpGenerator.generateQuestion({ title: 'पीठ दर्द', category: 'pain' }, 'hi', 0);
  assert(qHi.includes('पीठ दर्द'), 'Generates Hindi follow-up question with title');

  const qHing = FollowUpGenerator.generateQuestion({ title: 'Shoulder Pain', category: 'pain' }, 'hinglish', 1);
  assert(qHing.includes('Shoulder Pain'), 'Generates Hinglish follow-up question with title');

  console.log('\n====================================================');
  console.log(`PART 3 VERIFICATION COMPLETE: ${passed}/${passed + failed} TESTS PASSED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
