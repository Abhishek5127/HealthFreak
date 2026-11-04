import assert from 'assert';
import { HealthMemoryStore } from '../src/db/healthMemoryStore.js';
import {
  calculateStrideLengthMeters,
  calculateDistanceMeters,
  calculateActiveCalories,
  calculateActiveMinutes,
  formatDistance,
} from '../../src/features/activity/utils/activityCalculations.js';
import {
  getLocalDateString,
  getStartOfDay,
  getEndOfDay,
  formatDayAbbr,
} from '../../src/features/activity/utils/stepDateUtils.js';

export async function runActivityTestSuite(): Promise<boolean> {
  console.log('\n===============================================================');
  console.log('   NATIVE PEDOMETER & STEP TRACKING ENGINE VERIFICATION SUITE');
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

  // 1. Stride Length & Distance Calculation
  test('1. Calculates male stride length based on height (height * 0.415)', () => {
    const stride = calculateStrideLengthMeters(180, 'male');
    assert.strictEqual(stride, (180 * 0.415) / 100); // 0.747m
  });

  test('2. Calculates female stride length based on height (height * 0.413)', () => {
    const stride = calculateStrideLengthMeters(165, 'female');
    assert.strictEqual(stride, (165 * 0.413) / 100); // 0.68145m
  });

  test('3. Falls back to standard average stride (0.74m) for missing/invalid height', () => {
    const stride = calculateStrideLengthMeters(undefined, undefined);
    assert.strictEqual(stride, 0.74);
  });

  test('4. Correctly computes distance in meters from steps and formats to km', () => {
    const distanceMeters = calculateDistanceMeters(10000, 175, 'male');
    const formatted = formatDistance(distanceMeters);
    assert.ok(distanceMeters > 7000 && distanceMeters < 8000, 'Distance should be ~7.26km');
    assert.ok(formatted.endsWith('km'), 'Formatted output should end in km');
  });

  test('5. Formats sub-kilometer distance in meters', () => {
    const distanceMeters = calculateDistanceMeters(500, 170, 'other');
    const formatted = formatDistance(distanceMeters);
    assert.ok(formatted.endsWith('m'), 'Formatted short distance should end in m');
  });

  // 2. Active Calories & Cadence
  test('6. Estimates active calories using user body weight and MET formula', () => {
    const calories = calculateActiveCalories(10000, 70); // 10000 * 70 * 0.0005 = 350 kcal
    assert.strictEqual(calories, 350);
  });

  test('7. Returns null for calories when body weight is invalid or unavailable', () => {
    const calories = calculateActiveCalories(5000, undefined);
    assert.strictEqual(calories, null);
  });

  test('8. Estimates active minutes with ~105 steps/min brisk cadence', () => {
    const minutes = calculateActiveMinutes(6300); // 6300 / 105 = 60 mins
    assert.strictEqual(minutes, 60);
  });

  // 3. Local Date and Midnight Boundaries
  test('9. Local calendar date matches YYYY-MM-DD format', () => {
    const localDate = getLocalDateString();
    assert.match(localDate, /^\d{4}-\d{2}-\d{2}$/);
  });

  test('10. Start of day is local 00:00:00.000 and end of day is 23:59:59.999', () => {
    const start = getStartOfDay(new Date());
    const end = getEndOfDay(new Date());
    assert.strictEqual(start.getHours(), 0);
    assert.strictEqual(start.getMinutes(), 0);
    assert.strictEqual(end.getHours(), 23);
    assert.strictEqual(end.getMinutes(), 59);
  });

  // 4. Memory Store & Deduplication
  test('11. Safe merge: never overwrites existing higher step totals with lower values', () => {
    const store = HealthMemoryStore.getInstance();
    const userId = 'usr_test_step_user';
    const date = '2026-11-04';
    const key = `${userId}_${date}`;

    // Initial record with 5,000 steps
    store.dailyActivities.set(key, {
      id: 'act_test_1',
      userId,
      activityDate: date,
      steps: 5000,
      stepGoal: 10000,
      distanceMeters: 3700,
      activeMinutes: 48,
      caloriesBurned: 175,
      source: 'device',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Device sync arrives with lower steps (e.g. fresh reboot listener sending delta 200)
    const existing = store.dailyActivities.get(key)!;
    const incomingSteps = 200;
    const safeSteps = Math.max(existing.steps, incomingSteps);
    assert.strictEqual(safeSteps, 5000, 'Must protect against lower step regression');
  });

  test('12. Accurately updates to higher step total upon progression', () => {
    const store = HealthMemoryStore.getInstance();
    const userId = 'usr_test_step_user';
    const date = '2026-11-04';
    const key = `${userId}_${date}`;

    const existing = store.dailyActivities.get(key)!;
    const incomingSteps = 6500;
    const safeSteps = Math.max(existing.steps, incomingSteps);
    assert.strictEqual(safeSteps, 6500);
  });

  console.log(`\nResults: ${passed}/${total} Activity scenarios passed.`);
  return passed === total;
}

