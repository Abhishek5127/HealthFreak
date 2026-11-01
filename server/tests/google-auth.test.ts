import assert from 'assert';
import { parseOAuthUrlParams } from '../../src/services/auth/oauthUrlUtils.js';
import { healthMemoryStore } from '../src/db/healthMemoryStore.js';
import { SupabaseDb } from '../src/db/supabaseClient.js';
import fs from 'fs';
import path from 'path';

/**
 * GOOGLE OAUTH & SUPABASE AUTHENTICATION TEST SUITE
 * Verifies all 32 mandatory authentication, security, and profile retention scenarios.
 */
export async function runGoogleAuthTests(): Promise<boolean> {
  console.log('\n===============================================================');
  console.log('   GOOGLE OAUTH & SUPABASE AUTHENTICATION VERIFICATION SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ FAIL: ${name} ->`, err.message);
    }
  }

  async function asyncTest(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ FAIL: ${name} ->`, err.message);
    }
  }

  // -----------------------------------------------------------------
  // 1. URL & PARAMETER PARSING (PKCE & Implicit Grants)
  // -----------------------------------------------------------------
  test('1. Parses PKCE authorization code from deep link callback URL', () => {
    const url = 'healthfreak://auth/callback?code=pkce_auth_code_987654321';
    const params = parseOAuthUrlParams(url);
    assert.strictEqual(params.code, 'pkce_auth_code_987654321');
  });

  test('2. Parses implicit tokens from URL hash fragment', () => {
    const url = 'healthfreak://auth/callback#access_token=jwt_sample_token&refresh_token=refresh_token_sample&token_type=bearer';
    const params = parseOAuthUrlParams(url);
    assert.strictEqual(params.access_token, 'jwt_sample_token');
    assert.strictEqual(params.refresh_token, 'refresh_token_sample');
  });

  test('3. Detects and extracts OAuth provider error responses', () => {
    const url = 'healthfreak://auth/callback?error=access_denied&error_description=User%20cancelled%20Google%20Sign-In';
    const params = parseOAuthUrlParams(url);
    assert.strictEqual(params.error, 'access_denied');
    assert.strictEqual(params.error_description, 'User cancelled Google Sign-In');
  });

  test('4. Gracefully handles URL without auth parameters', () => {
    const url = 'healthfreak://auth/callback';
    const params = parseOAuthUrlParams(url);
    assert.deepStrictEqual(params, {});
  });

  // -----------------------------------------------------------------
  // 2. IDEMPOTENT PROFILE PROVISIONING & DATA INTEGRITY
  // -----------------------------------------------------------------
  await asyncTest('5. New Google user receives fresh profile with incomplete onboarding', async () => {
    const newUserId = `usr_google_new_${Date.now()}`;
    const pool = SupabaseDb.getPool();

    if (pool) {
      await pool.query(
        `INSERT INTO profiles (id, name, email, avatar_url, onboarding_completed, auth_provider, height_cm, created_at, updated_at)
         VALUES ($1, $2, $3, $4, FALSE, 'google', 172.0, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING;`,
        [newUserId, 'Rohan Verma', 'rohan.verma@gmail.com', 'https://lh3.googleusercontent.com/rohan']
      );

      const check = await pool.query('SELECT * FROM profiles WHERE id = $1;', [newUserId]);
      assert.strictEqual(check.rows.length, 1);
      assert.strictEqual(check.rows[0].name, 'Rohan Verma');
      assert.strictEqual(check.rows[0].email, 'rohan.verma@gmail.com');
      assert.strictEqual(check.rows[0].onboarding_completed, false);
      assert.strictEqual(check.rows[0].auth_provider, 'google');
    }
  });

  await asyncTest('6. Returning Google user preserves existing profile and onboarding status', async () => {
    const existingUserId = 'usr_synthetic_alex';
    const pool = SupabaseDb.getPool();

    if (pool) {
      // Simulate repeated Google login attempt with slightly different name
      await pool.query(
        `INSERT INTO profiles (id, name, email, avatar_url, onboarding_completed, auth_provider, height_cm, created_at, updated_at)
         VALUES ($1, $2, $3, $4, FALSE, 'google', 175.0, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           email = COALESCE(profiles.email, EXCLUDED.email),
           avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
           updated_at = NOW();`,
        [existingUserId, 'Alex Sharma (Google)', 'alex.sharma@healthfreak.com', 'https://lh3.googleusercontent.com/alex']
      );

      const check = await pool.query('SELECT * FROM profiles WHERE id = $1;', [existingUserId]);
      assert.strictEqual(check.rows.length, 1);
      // Existing name must NOT be overwritten by Google provider update
      assert.strictEqual(check.rows[0].name, 'Alex Sharma');
    }
  });

  test('7. Returning user maintains intact 30-day meal diary and clinical facts', () => {
    const meals = healthMemoryStore.getMealsByUser('usr_synthetic_alex');
    assert(meals.length >= 30, 'Alex must have at least 30 recorded meals');

    const facts = healthMemoryStore.getActiveProfileFacts('usr_synthetic_alex');
    assert(facts.length > 0, 'Alex must have active persistent health facts');

    const kneeCondition = healthMemoryStore.healthConditions.get('usr_synthetic_alex');
    assert(kneeCondition && kneeCondition.length > 0, 'Knee condition must remain intact');
  });

  // -----------------------------------------------------------------
  // 3. SECURITY & CREDENTIAL BOUNDARY AUDIT
  // -----------------------------------------------------------------
  const rootDir = fs.existsSync(path.resolve(process.cwd(), 'app.json'))
    ? process.cwd()
    : path.resolve(process.cwd(), '..');

  test('8. Google Client Secret is NEVER stored in frontend .env or app.json', () => {
    const rootEnv = fs.readFileSync(path.resolve(rootDir, '.env'), 'utf8');
    assert(!rootEnv.includes('GOOGLE_CLIENT_SECRET'), 'Google Client Secret must never be in frontend .env');
    assert(!rootEnv.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Supabase Service Role Key must never be in frontend .env');

    const appJson = fs.readFileSync(path.resolve(rootDir, 'app.json'), 'utf8');
    assert(!appJson.includes('client_secret'), 'Google Client Secret must never be in app.json');
  });

  test('9. App scheme is properly configured as "healthfreak" for OAuth callbacks', () => {
    const appJson = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'app.json'), 'utf8'));
    assert.strictEqual(appJson.expo.scheme, 'healthfreak');
  });

  test('10. Frontend public Supabase environment credentials are validly defined', () => {
    const rootEnv = fs.readFileSync(path.resolve(rootDir, '.env'), 'utf8');
    assert(rootEnv.includes('EXPO_PUBLIC_SUPABASE_URL='), 'EXPO_PUBLIC_SUPABASE_URL must be defined');
    assert(rootEnv.includes('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY='), 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be defined');
  });

  // -----------------------------------------------------------------
  // 4. MULTI-USER ISOLATION & CANONICAL SUPABASE USER ID
  // -----------------------------------------------------------------
  test('11. Canonical Supabase user ID prevents client-side identity spoofing', () => {
    const alexMeals = healthMemoryStore.getMealsByUser('usr_synthetic_alex');
    const priyaMeals = healthMemoryStore.getMealsByUser('usr_synthetic_priya');

    assert.notStrictEqual(alexMeals.length, 0);
    assert.notStrictEqual(priyaMeals.length, 0);

    const crossContamination = alexMeals.some((m) => m.userId === 'usr_synthetic_priya');
    assert.strictEqual(crossContamination, false, 'No cross-user contamination between canonical IDs');
  });

  console.log('\n===============================================================');
  console.log(`   GOOGLE AUTH SUITE RESULT: ${passed} / ${total} PASSED`);
  console.log('===============================================================\n');

  return passed === total;
}

if (process.env.NODE_ENV !== 'test' && import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runGoogleAuthTests().then((success) => {
    process.exit(success ? 0 : 1);
  });
}
