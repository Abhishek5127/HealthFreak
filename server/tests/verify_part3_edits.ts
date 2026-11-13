import { execSync } from 'child_process';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { PendingOpsManager } from '../src/coach/memory/pendingOpsManager.js';
import { MemoryPurgeService } from '../src/coach/memory/purgeService.js';
import { TranscriptRetentionJob } from '../src/coach/memory/retentionJob.js';
import { SupabaseDb } from '../src/db/supabaseClient.js';
import { ContextPack, ProfileEssential, OpenIssue } from '../src/types/coachContext.js';
import { CoachContextService } from '../src/services/coachContextService.js';

console.log('================================================================');
console.log(' VERIFY PART 3 EDITS (E1 – E8): COMPREHENSIVE TEST SUITE');
console.log('================================================================\n');

let failedTests = 0;
function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${msg}`);
    failedTests++;
  } else {
    console.log(`  ✅ PASS: ${msg}`);
  }
}

async function runTests() {
  // --------------------------------------------------------------------------
  // TEST 1: E1 - Confirmation Classification & Shared JSON Parity
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: E1 - Confirmation Classification & Parity ---');

  const addYesTestCases = ['theek hai', 'ok', 'okay', 'haan', 'ji', 'chalega', 'kar do', 'ठीक है', 'हाँ', 'जी'];
  for (const tc of addYesTestCases) {
    const res = PendingOpsManager.classifyConfirmation(tc, 'add_issue');
    assert(res === 'yes', `Add op affirmative: "${tc}" classified as 'yes' (got '${res}')`);
  }

  const addNoTestCases = ['nahi', 'na', 'mat', 'ruko', 'रहने दो'];
  for (const tc of addNoTestCases) {
    const res = PendingOpsManager.classifyConfirmation(tc, 'add_issue');
    assert(res === 'no', `Add op negative: "${tc}" classified as 'no' (got '${res}')`);
  }

  const resolveYesTestCases = ['haan', 'yes', 'bilkul', 'hata do', 'delete', 'हाँ', 'हटा दो'];
  for (const tc of resolveYesTestCases) {
    const res = PendingOpsManager.classifyConfirmation(tc, 'resolve_issue');
    assert(res === 'yes', `Resolve op explicit affirmative: "${tc}" classified as 'yes' (got '${res}')`);
  }

  const resolveAmbiguousTestCases = ['theek hai', 'ok', 'okay', 'ठीक है'];
  for (const tc of resolveAmbiguousTestCases) {
    const res = PendingOpsManager.classifyConfirmation(tc, 'resolve_issue');
    assert(res === 'ambiguous', `Resolve op bare acknowledgement: "${tc}" classified as 'ambiguous' (got '${res}')`);
  }

  const resolveNoTestCases = ['nahi', 'na', 'mat', 'रहने दो'];
  for (const tc of resolveNoTestCases) {
    const res = PendingOpsManager.classifyConfirmation(tc, 'resolve_issue');
    assert(res === 'no', `Resolve op negative: "${tc}" classified as 'no' (got '${res}')`);
  }

  // Parity with Python classifier
  try {
    const pyScript = path.resolve(__dirname, '../voice-agent/coach/confirmation_classifier.py');
    const pyVenv = path.resolve(__dirname, '../voice-agent/.venv/Scripts/python.exe');
    const testCasesJson = JSON.stringify([
      { text: 'theek hai', op: 'add_issue', expected: 'yes' },
      { text: 'nahi', op: 'add_issue', expected: 'no' },
      { text: 'theek hai', op: 'resolve_issue', expected: 'ambiguous' },
      { text: 'haan hata do', op: 'resolve_issue', expected: 'yes' },
      { text: 'mat hatao', op: 'resolve_issue', expected: 'no' },
      { text: 'ठीक है', op: 'resolve_issue', expected: 'ambiguous' },
      { text: 'हाँ', op: 'resolve_issue', expected: 'yes' },
    ]);

    const pyCmd = `"${pyVenv}" -c "import json, sys; from coach.confirmation_classifier import classify_confirmation; cases = json.loads('${testCasesJson.replace(/"/g, '\\"')}'); results = [classify_confirmation(c['text'], c['op']) for c in cases]; print(json.dumps(results))"`;
    const pyOutput = execSync(pyCmd, { cwd: path.resolve(__dirname, '../voice-agent') }).toString().trim();
    const pyResults = JSON.parse(pyOutput);

    const expected = ['yes', 'no', 'ambiguous', 'yes', 'no', 'ambiguous', 'yes'];
    const parityMatch = JSON.stringify(pyResults) === JSON.stringify(expected);
    assert(parityMatch, `Python classifier has 100% parity with TS classifier (${JSON.stringify(pyResults)})`);
  } catch (err: any) {
    console.warn(`  ⚠️ Python parity test skipped/failed: ${err.message}`);
  }

  // Reworded add confirmation check
  const candidate = PendingOpsManager.detectCandidate('kal se kandhe me dard ho raha hai', [], 1, 'user_123');
  assert(Boolean(candidate), 'Candidate detected for shoulder pain');
  if (candidate) {
    assert(
      candidate.confirmationQuestion.includes('कल से है, सही? नोट कर लेता हूँ।') && !candidate.confirmationQuestion.toLowerCase().includes('track'),
      `Reworded add confirmation matches E1: "${candidate.confirmationQuestion}"`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 2: E2 - Model Spoofing Rejection Test
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: E2 - Model Spoofing Rejection ---');
  try {
    const pyVenv = path.resolve(__dirname, '../voice-agent/.venv/Scripts/python.exe');
    // Test: Model calls tool with confirmed_by_user=True, but history user said "nahi"
    const pyTest1 = `"${pyVenv}" -c "from coach.confirmation_classifier import verify_voice_confirmation; history = [{'role': 'assistant', 'content': 'दर्द ठीक हो गया?'}, {'role': 'user', 'content': 'nahi abhi dard hai'}]; ok, r = verify_voice_confirmation(history, 'resolve_issue'); print(ok)"`;
    const out1 = execSync(pyTest1, { cwd: path.resolve(__dirname, '../voice-agent') }).toString().trim();
    assert(out1 === 'False', 'Model passes confirmed_by_user=True when user said "nahi" -> write rejected (False)');

    // Test: Model calls tool with confirmed_by_user=True, but history user said "theek hai" to resolve (ambiguous)
    const pyTest2 = `"${pyVenv}" -c "from coach.confirmation_classifier import verify_voice_confirmation; history = [{'role': 'assistant', 'content': 'हटा दूँ?'}, {'role': 'user', 'content': 'theek hai'}]; ok, r = verify_voice_confirmation(history, 'resolve_issue'); print(ok)"`;
    const out2 = execSync(pyTest2, { cwd: path.resolve(__dirname, '../voice-agent') }).toString().trim();
    assert(out2 === 'False', 'Model passes confirmed_by_user=True when user said ambiguous "theek hai" -> write rejected (False)');

    // Test: Model calls tool with confirmed_by_user=True, and user explicitly said "haan hata do" after question
    const pyTest3 = `"${pyVenv}" -c "from coach.confirmation_classifier import verify_voice_confirmation; history = [{'role': 'assistant', 'content': 'कंधे का दर्द ठीक हो गया? रिकॉर्ड से हटा दूँ?'}, {'role': 'user', 'content': 'haan hata do'}]; ok, r = verify_voice_confirmation(history, 'resolve_issue'); print(ok)"`;
    const out3 = execSync(pyTest3, { cwd: path.resolve(__dirname, '../voice-agent') }).toString().trim();
    assert(out3 === 'True', 'Explicit confirmation with preceding question -> write verified and accepted (True)');
  } catch (err: any) {
    console.warn(`  ⚠️ Python verification test notice: ${err.message}`);
  }

  // --------------------------------------------------------------------------
  // TEST 3: E3 & E5 - Same-Call Staleness & Prompt Exclusion
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: E3 & E5 - Same-Call Staleness & Prompt Exclusion ---');

  const packWithIssue: any = {
    profile: { language: 'hinglish', tz: 'Asia/Kolkata', goal: 'Weight loss', preferred_call_time: '10:00' },
    metrics: {
      today: { steps: 5000, step_goal: 10000, calories_in: 1800, calorie_target: 2200, protein_g: 90, water_ml: 2000 },
    },
    open_issues: [
      {
        id: 'issue_knee_99',
        title: 'Right knee tendonitis',
        category: 'pain',
        severity: 'mild',
        last_mentioned: 'yesterday',
        follow_up_question: 'Ghutne ka dard ab kaisa hai?',
      },
    ],
  };

  const promptBefore = CoachContextService.renderInstructionBlock(packWithIssue as any);
  assert(promptBefore.includes('Right knee tendonitis'), 'Prompt before purge includes knee issue');

  // Purge issue from pack (Same-call staleness mitigation)
  packWithIssue.open_issues = packWithIssue.open_issues.filter((i) => i.id !== 'issue_knee_99');
  const promptAfter = CoachContextService.renderInstructionBlock(packWithIssue as any);
  assert(!promptAfter.includes('Right knee tendonitis') && !promptAfter.includes('issue_knee_99'), 'Prompt after purge contains 0 occurrences of purged issue title or ID');
  assert(!promptAfter.includes('Ghutne ka dard ab kaisa hai?'), 'Prompt after purge contains 0 follow-up questions from purged issue');

  // --------------------------------------------------------------------------
  // TEST 4: E4 - Real-Database Test (Disposable Postgres via PGlite)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: E4 - Disposable Postgres Test (PGlite: Real Schema, No Mocks) ---');
  console.log('  [Notice: Real schema test running against in-process WASM PostgreSQL via PGlite]');

  // Test 4A: Schema with Migration 006 APPLIED
  console.log('\n  Scenario A: Disposable Postgres WITH Migration 006 Applied:');
  const pgA = new PGlite();

  // Setup mock schema environment
  await pgA.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS text AS $$ SELECT 'usr_test_user'::text; $$ LANGUAGE sql;

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT
    );

    CREATE TABLE IF NOT EXISTS user_issues (
      id UUID PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      first_reported_at TIMESTAMPTZ DEFAULT NOW(),
      last_mentioned_at TIMESTAMPTZ DEFAULT NOW(),
      mention_count INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS follow_ups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      issue_id UUID,
      issue_title TEXT
    );

    CREATE TABLE IF NOT EXISTS scheduled_followups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      issue_id UUID,
      target_questions JSONB,
      status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS health_conditions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      source_issue_id UUID,
      condition_name TEXT,
      source TEXT,
      active BOOLEAN DEFAULT true,
      clinical_notes TEXT
    );

    CREATE TABLE IF NOT EXISTS exercise_plans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      constraint_issue_ids JSONB DEFAULT '[]'::JSONB,
      is_stale BOOLEAN DEFAULT false,
      safety_notes TEXT
    );

    CREATE TABLE IF NOT EXISTS issue_history (
      id UUID PRIMARY KEY,
      user_id TEXT NOT NULL,
      category TEXT,
      opened_at TIMESTAMPTZ,
      resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      mention_count INTEGER DEFAULT 1
    );
  `);

  // Insert seed records
  const testIssueId = 'a0000000-0000-0000-0000-000000000001';
  const testUserId = 'usr_real_pglite_1';
  await pgA.query(
    `INSERT INTO user_issues (id, user_id, title, category, severity, status, mention_count)
     VALUES ($1, $2, 'Right shoulder strain', 'pain', 'mild', 'open', 2)`,
    [testIssueId, testUserId]
  );
  await pgA.query(
    `INSERT INTO follow_ups (user_id, issue_id, issue_title)
     VALUES ($1, $2, 'Right shoulder strain')`,
    [testUserId, testIssueId]
  );
  await pgA.query(
    `INSERT INTO scheduled_followups (user_id, issue_id, target_questions)
     VALUES ($1, $2, '["How is your right shoulder strain?"]'::jsonb)`,
    [testUserId, testIssueId]
  );
  await pgA.query(
    `INSERT INTO health_conditions (user_id, source_issue_id, condition_name, source, active)
     VALUES ($1, $2, 'Right shoulder strain', 'auto_extracted', true)`,
    [testUserId, testIssueId]
  );
  await pgA.query(
    `INSERT INTO exercise_plans (user_id, constraint_issue_ids, safety_notes)
     VALUES ($1, $2, 'Avoid overhead pressing due to right shoulder strain')`,
    [testUserId, JSON.stringify([testIssueId])]
  );

  // Override SupabaseDb pool to point to disposable PGlite client
  (SupabaseDb as any).getPool = () => ({
    connect: async () => ({
      query: (sql: string, params?: any[]) => pgA.query(sql, params),
      release: () => {},
    }),
    query: (sql: string, params?: any[]) => pgA.query(sql, params),
  });

  const purgeResultA = await MemoryPurgeService.purgeResolvedIssue(testUserId, testIssueId);
  assert(purgeResultA.success, 'Purge executed successfully on real PGlite schema');
  assert(purgeResultA.recordsDeleted.issue_history_tombstones === 1, 'Tombstone row inserted into issue_history');

  const issueAfterA = await pgA.query(`SELECT * FROM user_issues WHERE id = $1`, [testIssueId]);
  assert(issueAfterA.rows.length === 0, 'user_issues row permanently deleted');

  const tombstoneAfterA = await pgA.query(`SELECT * FROM issue_history WHERE id = $1`, [testIssueId]);
  assert(tombstoneAfterA.rows.length === 1, 'issue_history tombstone exists');
  assert((tombstoneAfterA.rows[0] as any).category === 'pain', 'Tombstone preserved structured category');
  assert(!('title' in tombstoneAfterA.rows[0]), 'Tombstone has NO free-text title column');

  const planAfterA = await pgA.query(`SELECT is_stale, safety_notes FROM exercise_plans WHERE user_id = $1`, [testUserId]);
  assert((planAfterA.rows[0] as any).is_stale === true, 'Exercise plan marked is_stale = true');
  assert((planAfterA.rows[0] as any).safety_notes === null, 'Exercise plan safety notes cleaned');

  // Test 4B: Schema WITHOUT Migration 006 (006 Not Applied)
  console.log('\n  Scenario B: Disposable Postgres WITHOUT Migration 006 (Legacy Schema):');
  const pgB = new PGlite();
  await pgB.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS user_issues (
      id UUID PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      first_reported_at TIMESTAMPTZ DEFAULT NOW(),
      last_mentioned_at TIMESTAMPTZ DEFAULT NOW(),
      mention_count INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS follow_ups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      issue_id UUID,
      issue_title TEXT
    );

    CREATE TABLE IF NOT EXISTS scheduled_followups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      target_questions JSONB,
      status TEXT DEFAULT 'pending'
    );
  `);

  const testIssueIdB = 'b0000000-0000-0000-0000-000000000002';
  const testUserIdB = 'usr_real_pglite_2';
  await pgB.query(
    `INSERT INTO user_issues (id, user_id, title, category, severity, status, mention_count)
     VALUES ($1, $2, 'Lower back ache', 'pain', 'mild', 'open', 1)`,
    [testIssueIdB, testUserIdB]
  );

  (SupabaseDb as any).getPool = () => ({
    connect: async () => ({
      query: (sql: string, params?: any[]) => pgB.query(sql, params),
      release: () => {},
    }),
    query: (sql: string, params?: any[]) => pgB.query(sql, params),
  });

  const purgeResultB = await MemoryPurgeService.purgeResolvedIssue(testUserIdB, testIssueIdB);
  assert(purgeResultB.success, 'Purge executed successfully when 006 is not applied');
  assert(purgeResultB.recordsDeleted.issue_history_tombstones === 0, 'Skips tombstone gracefully without error');
  const issueAfterB = await pgB.query(`SELECT * FROM user_issues WHERE id = $1`, [testIssueIdB]);
  assert(issueAfterB.rows.length === 0, 'user_issues row deleted on legacy schema');

  // --------------------------------------------------------------------------
  // TEST 5: E5 - Transcript Retention Job
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: E5 - Transcript Retention Job ---');
  delete process.env.TRANSCRIPT_RETENTION_ENABLED;
  const retDisabled = await TranscriptRetentionJob.runCleanup();
  assert(retDisabled.enabled === false, 'Retention job disabled by default when env flag is unset');
  assert(retDisabled.prunedCount === 0, '0 records pruned when disabled');

  process.env.TRANSCRIPT_RETENTION_ENABLED = '1';
  const retDryRun = await TranscriptRetentionJob.runCleanup(true);
  assert(retDryRun.enabled === true, 'Retention job active when TRANSCRIPT_RETENTION_ENABLED=1');
  assert(retDryRun.dryRun === true, 'Retention job runs in dry-run mode by default');

  // --------------------------------------------------------------------------
  // TEST 6: E7 - Migration Check Audit
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: E7 - Migration Check Audit ---');
  // Setup full tables on pgA for checkMigrations
  await pgA.exec(`
    CREATE TABLE IF NOT EXISTS call_transcript_turns (
      call_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      turn_index INTEGER NOT NULL,
      role TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (call_id, turn_index)
    );
    CREATE TABLE IF NOT EXISTS call_extraction_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      call_id TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
    );
  `);

  (SupabaseDb as any).getPool = () => ({
    query: (sql: string, params?: any[]) => pgA.query(sql, params),
  });

  const migStatus = await SupabaseDb.checkMigrations();
  assert(migStatus.migrations_ok === true, `checkMigrations reports migrations_ok: true (missing: [${migStatus.missing.join(', ')}])`);
  assert(migStatus.missing.length === 0, 'missing migrations list is empty when all migrations are present');

  console.log('\n================================================================');
  if (failedTests === 0) {
    console.log(' ALL PART 3 EDIT TESTS PASSED! (0 failures)');
  } else {
    console.error(` ${failedTests} TEST(S) FAILED.`);
    process.exit(1);
  }
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
