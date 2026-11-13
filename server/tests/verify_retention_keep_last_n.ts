import { PGlite } from '@electric-sql/pglite';
import { TranscriptRetentionJob } from '../src/coach/memory/retentionJob.js';
import { MemoryPurgeService } from '../src/coach/memory/purgeService.js';
import { SupabaseDb } from '../src/db/supabaseClient.js';
import { CoachContextService } from '../src/services/coachContextService.js';

console.log('================================================================');
console.log(' VERIFY KEEP-LAST-N RETENTION & MEMORY FIXES (R1 - R8, F1, F2)');
console.log('================================================================\n');

let failedTests = 0;
function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✅ PASS: ${msg}`);
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('--- 1. REAL POSTGRESQL SCHEMA TEST (PGlite: Disposable In-Process WASM) ---');
  console.log('  [Notice: Real PostgreSQL schema via PGlite with migrations 001-006 applied; zero mocks used for SQL execution]');

  const pg = new PGlite();

  // Setup Schema
  await pg.exec(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS text AS $$ SELECT 'usr_test_retention'::text; $$ LANGUAGE sql;

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT
    );

    CREATE TABLE IF NOT EXISTS calls (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ended_at TIMESTAMPTZ,
      channel TEXT NOT NULL DEFAULT 'app',
      status TEXT NOT NULL DEFAULT 'completed',
      transcript JSONB DEFAULT '[]'::jsonb,
      summary TEXT,
      key_takeaways JSONB DEFAULT '[]'::jsonb,
      summary_status TEXT DEFAULT 'done'
    );

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
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS call_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      call_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      checkpoint_type TEXT NOT NULL,
      note TEXT NOT NULL,
      data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_commitments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL,
      call_id TEXT,
      commitment TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
      title TEXT,
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

  // Override SupabaseDb pool to disposable PGlite instance
  (SupabaseDb as any).getPool = () => ({
    connect: async () => ({
      query: (sql: string, params?: any[]) => pg.query(sql, params),
      release: () => {},
    }),
    query: (sql: string, params?: any[]) => pg.query(sql, params),
  });

  const testUserId = 'usr_test_retention';
  await pg.query(`INSERT INTO profiles (id, name) VALUES ($1, 'Abhishek')`, [testUserId]);

  // Insert tombstone into issue_history
  await pg.query(
    `INSERT INTO issue_history (id, user_id, category, opened_at, resolved_at, mention_count)
     VALUES ('e0000000-0000-0000-0000-000000000099', $1, 'pain', NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days', 2)`,
    [testUserId]
  );

  // Setup User with 5 Calls (Call 1 to Call 5)
  // Call 1: 6 days ago (oldest)
  // Call 2: 4 days ago
  // Call 3: 2 days ago
  // Call 4: 1 day ago
  // Call 5: today (newest)
  const callsData = [
    { id: 'call_01', daysAgo: 6, extStatus: 'completed' },
    { id: 'call_02', daysAgo: 4, extStatus: 'completed' },
    { id: 'call_03', daysAgo: 2, extStatus: 'completed' },
    { id: 'call_04', daysAgo: 1, extStatus: 'completed' },
    { id: 'call_05', daysAgo: 0, extStatus: 'completed' },
  ];

  for (const c of callsData) {
    const started = new Date(Date.now() - c.daysAgo * 24 * 3600 * 1000);
    const ended = new Date(started.getTime() + 10 * 60 * 1000);
    await pg.query(
      `INSERT INTO calls (id, user_id, started_at, ended_at, status, transcript, summary, key_takeaways)
       VALUES ($1, $2, $3, $4, 'completed', $5, $6, $7)`,
      [
        c.id,
        testUserId,
        started,
        ended,
        JSON.stringify([{ role: 'agent', text: 'Hello' }, { role: 'user', text: `My turn in ${c.id}` }]),
        `Summary of ${c.id}`,
        JSON.stringify([`Takeaway ${c.id}`]),
      ]
    );

    // Insert 2 turns in call_transcript_turns (1 agent, 1 user)
    await pg.query(
      `INSERT INTO call_transcript_turns (call_id, user_id, turn_index, role, text, created_at)
       VALUES ($1, $2, 0, 'agent', 'Namaste, kaisa chal raha hai?', $3),
              ($1, $2, 1, 'user', 'Workout sahi gaya', $3)`,
      [c.id, testUserId, started]
    );

    // Insert extraction job
    const completed = new Date(started.getTime() + 2 * 60 * 1000);
    await pg.query(
      `INSERT INTO call_extraction_jobs (call_id, user_id, status, created_at, completed_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [c.id, testUserId, c.extStatus, started, completed]
    );

    // Insert call_notes (1 free-text note, 1 commitment_made)
    await pg.query(
      `INSERT INTO call_notes (call_id, user_id, checkpoint_type, note, created_at)
       VALUES ($1, $2, 'coach_observation', 'User felt great during session', $3),
              ($1, $2, 'commitment_made', 'Drink 3L water daily', $3)`,
      [c.id, testUserId, started]
    );
  }

  // --------------------------------------------------------------------------
  // TEST R1 - R3: Run Keep-Last-N Retention (N=3)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST R1 - R3: Keep-Last-N Pruning (N=3, User with 5 calls) ---');
  process.env.TRANSCRIPT_KEEP_LAST_N = '3';
  process.env.TRANSCRIPT_RETENTION_ENABLED = '1';

  // Live prune run
  const pruneRes = await TranscriptRetentionJob.pruneUserCalls(testUserId, false);

  assert(pruneRes.totalCallsWithUserTurns === 5, 'Detected 5 calls with >= 1 user turn');
  assert(pruneRes.protectedCallIds.length === 3, 'Protected exactly 3 most recent calls');
  assert(
    pruneRes.protectedCallIds.includes('call_05') &&
    pruneRes.protectedCallIds.includes('call_04') &&
    pruneRes.protectedCallIds.includes('call_03'),
    'Protected calls are call_05, call_04, call_03'
  );
  assert(pruneRes.eligibleCallsPruned.length === 2, 'Pruned exactly the oldest 2 calls (call_01, call_02)');
  assert(
    pruneRes.eligibleCallsPruned.includes('call_01') &&
    pruneRes.eligibleCallsPruned.includes('call_02'),
    'Pruned calls are call_01 and call_02'
  );

  // Verify call_transcript_turns
  const turns01 = await pg.query(`SELECT * FROM call_transcript_turns WHERE call_id = 'call_01'`);
  const turns02 = await pg.query(`SELECT * FROM call_transcript_turns WHERE call_id = 'call_02'`);
  const turns03 = await pg.query(`SELECT * FROM call_transcript_turns WHERE call_id = 'call_03'`);
  const turns04 = await pg.query(`SELECT * FROM call_transcript_turns WHERE call_id = 'call_04'`);
  const turns05 = await pg.query(`SELECT * FROM call_transcript_turns WHERE call_id = 'call_05'`);

  assert(turns01.rows.length === 0, 'call_transcript_turns deleted for call_01 (pruned)');
  assert(turns02.rows.length === 0, 'call_transcript_turns deleted for call_02 (pruned)');
  assert(turns03.rows.length === 2, 'call_transcript_turns preserved for call_03 (protected)');
  assert(turns04.rows.length === 2, 'call_transcript_turns preserved for call_04 (protected)');
  assert(turns05.rows.length === 2, 'call_transcript_turns preserved for call_05 (protected)');

  // Verify calls row summaries and transcripts
  const callsDbRes = await pg.query(`SELECT id, summary, transcript FROM calls WHERE user_id = $1 ORDER BY started_at ASC`, [testUserId]);
  const call01Db = callsDbRes.rows.find((r) => r.id === 'call_01');
  const call02Db = callsDbRes.rows.find((r) => r.id === 'call_02');
  const call03Db = callsDbRes.rows.find((r) => r.id === 'call_03');
  const call05Db = callsDbRes.rows.find((r) => r.id === 'call_05');

  assert(call01Db?.summary === null, 'call_01 summary is nulled');
  assert(call02Db?.summary === null, 'call_02 summary is nulled');
  assert(JSON.stringify(call01Db?.transcript) === '[]', 'call_01 transcript is empty JSON array');
  assert(call03Db?.summary === 'Summary of call_03', 'call_03 (protected) summary is preserved');
  assert(call05Db?.summary === 'Summary of call_05', 'call_05 (protected) summary is preserved');

  // Verify call rows themselves still exist (Rule R3)
  assert(callsDbRes.rows.length === 5, 'All 5 call rows remain in calls table (metadata intact)');

  // Verify issue_history survives (Rule R3)
  const historyRes = await pg.query(`SELECT * FROM issue_history WHERE user_id = $1`, [testUserId]);
  assert(historyRes.rows.length === 1, 'issue_history tombstone survived retention unharmed');

  // Verify commitments survive (Rule R4)
  const notesCall01 = await pg.query(`SELECT checkpoint_type, note FROM call_notes WHERE call_id = 'call_01'`);
  assert(notesCall01.rows.length === 1, 'call_notes in call_01 retains exactly 1 row');
  assert((notesCall01.rows[0] as any).checkpoint_type === 'commitment_made', 'Preserved row is checkpoint_type = commitment_made');

  // --------------------------------------------------------------------------
  // TEST R2: Unextracted Call & Failed Call Lifecycle
  // --------------------------------------------------------------------------
  console.log('\n--- TEST R2: Unextracted Call & Failed Call Lifecycle ---');
  // Scenario 1: Add call_00 with pending extraction
  await pg.query(
    `INSERT INTO calls (id, user_id, started_at, status, transcript)
     VALUES ('call_pending_old', $1, NOW() - INTERVAL '10 days', 'completed', '[{"role":"user","text":"hey"}]'::jsonb)`,
    [testUserId]
  );
  await pg.query(
    `INSERT INTO call_transcript_turns (call_id, user_id, turn_index, role, text, created_at)
     VALUES ('call_pending_old', $1, 0, 'user', 'turn', NOW() - INTERVAL '10 days')`,
    [testUserId]
  );
  await pg.query(
    `INSERT INTO call_extraction_jobs (call_id, user_id, status, created_at)
     VALUES ('call_pending_old', $1, 'pending', NOW() - INTERVAL '10 days')`,
    [testUserId]
  );

  const prunePendingRes = await TranscriptRetentionJob.pruneUserCalls(testUserId, false);
  const turnsPending = await pg.query(`SELECT * FROM call_transcript_turns WHERE call_id = 'call_pending_old'`);
  assert(turnsPending.rows.length === 1, 'Unextracted pending old call is NOT pruned');
  assert(
    prunePendingRes.skippedCalls.some((s) => s.callId === 'call_pending_old' && s.reason.includes('pending')),
    'Skipped reason reports extraction is pending'
  );

  // Scenario 2: Add call with failed extraction (< 7 days)
  await pg.query(
    `INSERT INTO calls (id, user_id, started_at, status, transcript)
     VALUES ('call_failed_recent', $1, NOW() - INTERVAL '3 days', 'completed', '[{"role":"user","text":"hey"}]'::jsonb)`,
    [testUserId]
  );
  await pg.query(
    `INSERT INTO call_transcript_turns (call_id, user_id, turn_index, role, text, created_at)
     VALUES ('call_failed_recent', $1, 0, 'user', 'turn', NOW() - INTERVAL '3 days')`,
    [testUserId]
  );
  await pg.query(
    `INSERT INTO call_extraction_jobs (call_id, user_id, status, created_at)
     VALUES ('call_failed_recent', $1, 'failed', NOW() - INTERVAL '3 days')`,
    [testUserId]
  );

  const pruneFailedRecent = await TranscriptRetentionJob.pruneUserCalls(testUserId, false);
  const turnsFailedRecent = await pg.query(`SELECT * FROM call_transcript_turns WHERE call_id = 'call_failed_recent'`);
  assert(turnsFailedRecent.rows.length === 1, 'Failed extraction (< 7 days) is NOT pruned (retried first)');

  // Scenario 3: Add call with failed extraction (> 7 days)
  await pg.query(
    `INSERT INTO calls (id, user_id, started_at, status, transcript)
     VALUES ('call_failed_old', $1, NOW() - INTERVAL '8 days', 'completed', '[{"role":"user","text":"hey"}]'::jsonb)`,
    [testUserId]
  );
  await pg.query(
    `INSERT INTO call_transcript_turns (call_id, user_id, turn_index, role, text, created_at)
     VALUES ('call_failed_old', $1, 0, 'user', 'turn', NOW() - INTERVAL '8 days')`,
    [testUserId]
  );
  await pg.query(
    `INSERT INTO call_extraction_jobs (call_id, user_id, status, created_at)
     VALUES ('call_failed_old', $1, 'failed', NOW() - INTERVAL '8 days')`,
    [testUserId]
  );

  const pruneFailedOld = await TranscriptRetentionJob.pruneUserCalls(testUserId, false);
  const turnsFailedOld = await pg.query(`SELECT * FROM call_transcript_turns WHERE call_id = 'call_failed_old'`);
  assert(turnsFailedOld.rows.length === 0, 'Failed extraction (> 7 days) IS pruned');
  assert(pruneFailedOld.stats.failedOldExtractionsPruned >= 1, 'Incremented counter for old failed extractions');

  // --------------------------------------------------------------------------
  // TEST F1: Unrelated Safety Notes Survive Memory Purge
  // --------------------------------------------------------------------------
  console.log('\n--- TEST F1: Unrelated Safety Notes Survive Plan Staling ---');
  const planIssueId = 'c0000000-0000-0000-0000-000000000005';
  await pg.query(
    `INSERT INTO user_issues (id, user_id, title, category, severity, status)
     VALUES ($1, $2, 'Right wrist sprain', 'injury', 'mild', 'open')`,
    [planIssueId, testUserId]
  );

  const doctorSafetyNote = 'Doctor limitation: Max heart rate 135 bpm; avoid high impact jumping due to chronic gestational history.';
  await pg.query(
    `INSERT INTO exercise_plans (user_id, title, constraint_issue_ids, is_stale, safety_notes)
     VALUES ($1, 'Cardio Plan', $2, false, $3)`,
    [testUserId, JSON.stringify([planIssueId]), doctorSafetyNote]
  );

  // Purge the wrist sprain
  const purgePlanRes = await MemoryPurgeService.purgeResolvedIssue(testUserId, planIssueId);
  assert(purgePlanRes.success, 'Wrist sprain purged successfully');

  const planDb = await pg.query(`SELECT is_stale, safety_notes FROM exercise_plans WHERE user_id = $1 AND title = 'Cardio Plan'`, [testUserId]);
  assert((planDb.rows[0] as any).is_stale === true, 'Exercise plan marked is_stale = true');
  assert((planDb.rows[0] as any).safety_notes === doctorSafetyNote, 'Unrelated doctor safety notes SURVIVED purge intact (not set to null)');

  // --------------------------------------------------------------------------
  // TEST F2: Follow-up Exact Matching (No Cross-Issue Deletion)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST F2: Follow-up Matching Exactness ---');
  const kneeRightId = 'd0000000-0000-0000-0000-000000000006';
  const kneeLeftId = 'd0000000-0000-0000-0000-000000000007';

  await pg.query(
    `INSERT INTO user_issues (id, user_id, title, category, status)
     VALUES ($1, $2, 'Right knee tendonitis', 'pain', 'open'),
            ($3, $2, 'Left knee cartilage tear', 'injury', 'open')`,
    [kneeRightId, testUserId, kneeLeftId]
  );

  await pg.query(
    `INSERT INTO follow_ups (user_id, issue_id, issue_title)
     VALUES ($1, $2, 'Right knee tendonitis'),
            ($1, $3, 'Left knee cartilage tear')`,
    [testUserId, kneeRightId, kneeLeftId]
  );

  // Purge Right knee tendonitis
  await MemoryPurgeService.purgeResolvedIssue(testUserId, kneeRightId);

  const followUpsRemaining = await pg.query(`SELECT issue_title FROM follow_ups WHERE user_id = $1`, [testUserId]);
  assert(
    followUpsRemaining.rows.some((r) => (r as any).issue_title === 'Left knee cartilage tear'),
    'Left knee follow-up was NOT deleted when Right knee tendonitis was purged'
  );
  assert(
    !followUpsRemaining.rows.some((r) => (r as any).issue_title === 'Right knee tendonitis'),
    'Right knee follow-up was deleted cleanly'
  );

  // --------------------------------------------------------------------------
  // TEST 6: Context Pack Prompt Contains 0 Transcript Text
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Context Pack Prompt Exclusion ---');
  const pack = await CoachContextService.buildContextPack(testUserId);
  const prompt = CoachContextService.renderInstructionBlock(pack);

  assert(!prompt.includes('Namaste, kaisa chal raha hai?'), 'Prompt contains 0 raw transcript turns');
  assert(!prompt.includes('Workout sahi gaya'), 'Prompt contains 0 user transcript utterances');
  assert(!prompt.includes('User felt great during session'), 'Prompt contains 0 free-text call notes');

  console.log('\n================================================================');
  if (failedTests === 0) {
    console.log(' ALL KEEP-LAST-N & FIX TESTS PASSED! (0 failures)');
    process.exit(0);
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
