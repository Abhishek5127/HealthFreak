import { SupabaseDb } from '../src/db/supabaseClient.js';
import { db } from '../src/db/index.js';
import { healthMemoryStore } from '../src/db/healthMemoryStore.js';
import { MealStore } from '../src/db/mealStore.js';

const GUEST_PATTERNS = ['user_local', 'guest%', 'usr_guest%', 'usr_synthetic%'];

async function countGuestRows() {
  console.log('=== DRY RUN: GUEST / LOCAL-PATTERN ROWS COUNT ===\n');

  // 1. PostgreSQL DB Check
  const pool = SupabaseDb.getPool();
  if (pool) {
    console.log('--- PostgreSQL / Supabase Tables ---');
    const tables = [
      'profiles',
      'user_preferences',
      'user_goals',
      'health_conditions',
      'user_consents',
      'daily_health_snapshots',
      'daily_activity',
      'meals',
      'meal_items',
      'daily_nutrition_summaries',
      'user_issues',
      'follow_ups',
      'call_notes',
      'calls',
      'exercise_plans',
      'scheduled_calls',
      'app_messages',
      'call_transcript_turns',
      'call_extraction_jobs',
    ];

    for (const table of tables) {
      try {
        const idCol = table === 'profiles' ? 'id' : 'user_id';
        const query = `
          SELECT count(*) as cnt FROM "${table}"
          WHERE ${idCol} = 'user_local'
             OR ${idCol} LIKE 'guest%'
             OR ${idCol} LIKE 'usr_guest%'
             OR ${idCol} LIKE 'usr_synthetic%'
        `;
        const res = await pool.query(query);
        const count = parseInt(res.rows[0]?.cnt || '0', 10);
        console.log(`  Table "${table}": ${count} rows`);
      } catch (err: any) {
        console.log(`  Table "${table}": table does not exist or inaccessible (${err?.message || err})`);
      }
    }
  } else {
    console.log('--- PostgreSQL not connected; checking in-memory stores ---');
  }

  // 2. In-Memory Store Check
  console.log('\n--- In-Memory Stores ---');
  const isGuestId = (id?: string) =>
    id &&
    (id === 'user_local' ||
      id.startsWith('guest') ||
      id.startsWith('usr_guest') ||
      id.startsWith('usr_synthetic'));

  let inMemCalls = 0;
  for (const s of (db as any).callSessions?.values?.() || []) {
    if (isGuestId(s.userId)) inMemCalls++;
  }
  console.log(`  In-memory call sessions: ${inMemCalls}`);

  let inMemMeals = 0;
  for (const m of (MealStore.getInstance() as any).meals?.values?.() || []) {
    if (isGuestId(m.userId)) inMemMeals++;
  }
  console.log(`  In-memory meals: ${inMemMeals}`);

  let inMemFacts = 0;
  for (const [uid, facts] of healthMemoryStore.profileFacts.entries()) {
    if (isGuestId(uid)) inMemFacts += facts.length;
  }
  console.log(`  In-memory profile facts: ${inMemFacts}`);

  console.log('\n=== DRY RUN COMPLETED (READ-ONLY: NO ROWS DELETED) ===');
  process.exit(0);
}

countGuestRows().catch((err) => {
  console.error('Count guest rows error:', err);
  process.exit(1);
});
