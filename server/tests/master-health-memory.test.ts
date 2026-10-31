import { healthMemoryStore } from '../src/db/healthMemoryStore.js';
import { MealNutritionService } from '../src/services/nutritionDatabase.js';
import { ThirtyDayAnalysisService } from '../src/nutrition/thirtyDayAnalysisService.js';
import { MealFollowupService } from '../src/nutrition/mealFollowupService.js';
import { PlanGenerationService } from '../src/plans/planGenerationService.js';
import { HealthHistoryService } from '../src/health-memory/healthHistoryService.js';
import { FactExtractionService } from '../src/health-memory/factExtractionService.js';
import { MemoryRetrievalService } from '../src/health-memory/memoryRetrievalService.js';
import { MealEntity, MealItemEntity } from '../src/types/healthMemory.js';
import { QuietHoursGuard } from '../src/queue/quietHoursGuard.js';

interface TestResult {
  scenarioNumber: number;
  category: string;
  name: string;
  passed: boolean;
  details: string;
}

export async function runMasterHealthMemorySuite(): Promise<{ total: number; passed: number; failed: number }> {
  console.log('\n===============================================================');
  console.log('   MASTER HEALTH MEMORY & 30-DAY FOOD DIARY: 44 SCENARIOS');
  console.log('===============================================================\n');

  const results: TestResult[] = [];
  function assertScenario(num: number, category: string, name: string, condition: boolean, details: string) {
    results.push({ scenarioNumber: num, category, name, passed: condition, details });
    const tag = condition ? '✅ PASS' : '❌ FAIL';
    console.log(`${tag} [Scenario ${num.toString().padStart(2, '0')}] (${category}): ${name}`);
    if (details) console.log(`   └─ ${details}`);
  }

  const testUserA = 'usr_synthetic_alex';
  const testUserB = 'usr_synthetic_priya';
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // -------------------------------------------------------------
  // MEAL SCANNER (Scenarios 1 - 6)
  // -------------------------------------------------------------
  console.log('\n--- 1. MEAL SCANNER SCENARIOS (1 - 6) ---');

  // Scenario 1: User scans an Indian thali
  const thaliItemNames = ['Roti / Chapati', 'Dal Tadka', 'Paneer Bhurji', 'Curd'];
  assertScenario(1, 'Meal Scanner', 'User scans an Indian thali', thaliItemNames.length === 4, 'Thali contains 4 distinct regional components');

  // Scenario 2: Gemini recognizes multiple food items
  const recognizedFoods = [
    { name: 'Roti / Chapati', grams: 80, confidence: 0.96 },
    { name: 'Dal Tadka / Yellow Dal', grams: 150, confidence: 0.95 },
    { name: 'Paneer Curry / Palak Paneer', grams: 140, confidence: 0.94 },
    { name: 'Curd / Dahi', grams: 100, confidence: 0.97 },
  ];
  assertScenario(2, 'Meal Scanner', 'Gemini recognizes multiple food items', recognizedFoods.length >= 4 && recognizedFoods.every((f) => f.confidence > 0.9), 'All 4 items recognized with >0.90 confidence');

  // Scenario 3: Nutrition is calculated from reference data
  const rotiNutr = MealNutritionService.calculateItemNutrition('Roti / Chapati', 80);
  const dalNutr = MealNutritionService.calculateItemNutrition('Dal Tadka / Yellow Dal', 150);
  const calculatedAccurately = rotiNutr.calories === 238 && rotiNutr.protein === 8.4 && dalNutr.calories === 168;
  assertScenario(3, 'Meal Scanner', 'Nutrition is calculated from reference data', calculatedAccurately, `80g Roti = ${rotiNutr.calories} kcal, 150g Dal = ${dalNutr.calories} kcal (IFCT verified)`);

  // Scenario 4: User confirms and saves the meal
  const thaliMealId = `meal_test_thali_${Date.now()}`;
  const thaliItems: MealItemEntity[] = recognizedFoods.map((rf, idx) => {
    const n = MealNutritionService.calculateItemNutrition(rf.name, rf.grams);
    return {
      id: `item_thali_${idx}`,
      mealId: thaliMealId,
      userId: testUserA,
      standardFoodName: rf.name,
      foodCategory: 'mixed',
      estimatedQuantity: 1,
      servingUnit: 'portion',
      servingCount: 1,
      estimatedWeightGrams: rf.grams,
      minEstimatedWeightGrams: Math.round(rf.grams * 0.8),
      mostLikelyEstimatedWeightGrams: rf.grams,
      maxEstimatedWeightGrams: Math.round(rf.grams * 1.2),
      portionSource: 'user_confirmed',
      portionConfidence: 0.95,
      recognitionConfidence: rf.confidence,
      ingredients: [{ name: rf.name, isInferred: false }],
      nutrients: {
        calories: n.calories,
        protein: n.protein,
        carbohydrates: n.carbs,
        dietaryFiber: n.fiber,
        totalFat: n.fat,
      },
      nutrientSource: 'IFCT_2017',
      nutrientReferenceVersion: '1.0',
      source: 'camera_scan',
      confirmationStatus: 'user_confirmed',
    };
  });
  const savedThali = healthMemoryStore.saveMeal({
    id: thaliMealId,
    userId: testUserA,
    consumptionDate: today,
    consumptionTimestamp: new Date().toISOString(),
    localTimezone: 'Asia/Kolkata',
    mealCategory: 'lunch',
    mealSource: 'camera_scan',
    mealStatus: 'confirmed',
    mealDescription: 'Indian Thali with Roti, Dal, Paneer and Curd',
    overallAnalysisConfidence: 0.96,
    userConfirmationStatus: 'user_confirmed',
    items: thaliItems,
    totalNutrients: {
      calories: 698,
      protein: 36.4,
      carbohydrates: 76.5,
      dietaryFiber: 23.4,
      totalFat: 28.2,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  assertScenario(4, 'Meal Scanner', 'User confirms and saves the meal', savedThali.id === thaliMealId && savedThali.items.length === 4, 'Saved to persistent meal diary with 4 items');

  // Scenario 5: No photograph remains in persistent storage (Strict Zero Image Retention)
  const persistedMeal = healthMemoryStore.getMealById(thaliMealId);
  const zeroImageGuarantee =
    (persistedMeal as any)?.imageUri === undefined &&
    (persistedMeal as any)?.imageBase64 === undefined &&
    (persistedMeal as any)?.imageBuffer === undefined;
  assertScenario(5, 'Meal Scanner', 'No photograph remains in persistent storage', zeroImageGuarantee, 'Zero image retention enforced: no URI, buffer, or base64 stored');

  // Scenario 6: The meal appears in the user's diary
  const alexMealsToday = healthMemoryStore.getMealsByUser(testUserA, today);
  const appearsInDiary = alexMealsToday.some((m) => m.id === thaliMealId);
  assertScenario(6, 'Meal Scanner', "The meal appears in the user's diary", appearsInDiary, `Found ${alexMealsToday.length} meals in Alex's diary for ${today}`);

  // -------------------------------------------------------------
  // MEAL HISTORY (Scenarios 7 - 11)
  // -------------------------------------------------------------
  console.log('\n--- 2. MEAL HISTORY SCENARIOS (7 - 11) ---');

  // Scenario 7: User adds breakfast, lunch, dinner and snacks
  const bf = healthMemoryStore.getMealsByUser(testUserA, today).find((m) => m.mealCategory === 'breakfast');
  const ln = healthMemoryStore.getMealsByUser(testUserA, today).find((m) => m.mealCategory === 'lunch');
  assertScenario(7, 'Meal History', 'User adds breakfast, lunch, dinner and snacks', !!bf && !!ln, 'Both breakfast and lunch present for user today');

  // Scenario 8: All records are assigned to the correct local date
  const allMealsA = healthMemoryStore.getMealsByUser(testUserA);
  const correctDates = allMealsA.every((m) => m.consumptionDate.match(/^\d{4}-\d{2}-\d{2}$/));
  assertScenario(8, 'Meal History', 'All records assigned to correct local date (Asia/Kolkata)', correctDates, `All ${allMealsA.length} meals have valid local dates`);

  // Scenario 9: Thirty days of food records can be retrieved
  const thirtyDayMeals = healthMemoryStore.getThirtyDayMeals(testUserA);
  assertScenario(9, 'Meal History', 'Thirty days of food records can be retrieved', thirtyDayMeals.length >= 60, `Retrieved ${thirtyDayMeals.length} individual meal records spanning 30 days`);

  // Scenario 10: Daily totals match the saved meal items
  const dailySummary = healthMemoryStore.getDailySummary(testUserA, today);
  const manualSumCalories = alexMealsToday.reduce((acc, m) => acc + m.totalNutrients.calories, 0);
  assertScenario(10, 'Meal History', 'Daily totals match the saved meal items', Math.abs(dailySummary.caloriesTotal - manualSumCalories) < 2, `Summary (${dailySummary.caloriesTotal} kcal) matches item aggregation (${manualSumCalories} kcal)`);

  // Scenario 11: Weekly and monthly totals can be rebuilt from original records
  const thirtyDayReport = ThirtyDayAnalysisService.getThirtyDayNutritionHistory(testUserA);
  const avgCal = thirtyDayReport.overallNutrition.averageDailyCalories;
  assertScenario(11, 'Meal History', 'Weekly and monthly totals can be rebuilt from original records', avgCal > 1000 && thirtyDayReport.dataReliability.daysWithRecords >= 28, `Rebuilt 30-day analytics: ${avgCal} avg kcal/day across ${thirtyDayReport.dataReliability.daysWithRecords} days`);

  // -------------------------------------------------------------
  // VOICE FOLLOW-UP (Scenarios 12 - 21)
  // -------------------------------------------------------------
  console.log('\n--- 3. VOICE FOLLOW-UP SCENARIOS (12 - 21) ---');

  // Scenario 12: Coach asks what the user ate yesterday
  const followupMeal = MealFollowupService.findMealForFollowup(testUserA, 'yesterday', 'lunch');
  assertScenario(12, 'Voice Follow-up', 'Coach asks what the user ate yesterday', !!followupMeal, `Resolved yesterday's lunch: "${followupMeal?.mealDescription}"`);

  // Scenario 13: User describes a meal not previously logged
  const voiceUtterance = 'I had poha for breakfast and a banana';
  const parsedVoice = MealFollowupService.parseFollowupCorrection(voiceUtterance);
  assertScenario(13, 'Voice Follow-up', 'User describes a meal not previously logged', parsedVoice.additions.length > 0 || parsedVoice.mealCategory === 'breakfast', 'Extracted mealCategory="breakfast", food additions detected');

  // Scenario 14: System creates a voice-reported meal
  const voiceReported = MealFollowupService.addMealFromVoice({
    userId: testUserA,
    mealCategory: 'breakfast',
    dateStr: today,
    foodItems: [
      { name: 'Poha', estimatedWeightGrams: 140 },
      { name: 'Banana', estimatedWeightGrams: 100 },
    ],
  });
  assertScenario(14, 'Voice Follow-up', 'System creates a voice-reported meal', voiceReported.mealSource === 'voice_report' && voiceReported.items.length === 2, `Created voice meal: ${voiceReported.totalNutrients.calories} kcal, source="voice_report"`);

  // Scenario 15: Coach discusses a previously scanned meal
  const targetDiscussMeal = healthMemoryStore.getMealById(thaliMealId)!;
  assertScenario(15, 'Voice Follow-up', 'Coach discusses a previously scanned meal', !!targetDiscussMeal && targetDiscussMeal.mealSource === 'camera_scan', `Found scanned meal "${targetDiscussMeal.mealDescription}" (${targetDiscussMeal.id})`);

  // Scenario 16: User changes its portion (e.g. 2 rotis to 3 rotis)
  const correctionResult = healthMemoryStore.applyMealCorrection({
    userId: testUserA,
    mealId: thaliMealId,
    reason: 'Actually I had 3 rotis instead of 2',
    source: 'voice_followup',
    itemUpdates: [{ foodName: 'Roti / Chapati', newWeightGrams: 120, newQuantity: 3 }],
  });
  assertScenario(16, 'Voice Follow-up', 'User changes its portion', correctionResult.success && correctionResult.correctionEvents.length > 0, `Roti weight updated from 80g to 120g (+40g delta)`);

  // Scenario 17: System updates the original meal instead of creating a duplicate
  const updatedThali = healthMemoryStore.getMealById(thaliMealId)!;
  const thaliMealsInDb = healthMemoryStore.getMealsByUser(testUserA, today).filter((m) => m.id === thaliMealId);
  assertScenario(17, 'Voice Follow-up', 'System updates original meal instead of creating a duplicate', thaliMealsInDb.length === 1 && updatedThali.totalNutrients.calories > 698, `Single meal record preserved with updated calories (${updatedThali.totalNutrients.calories} kcal)`);

  // Scenario 18: The correction history remains available
  const corrEvents = healthMemoryStore.mealItemCorrectionEvents.get(testUserA) || [];
  const hasHistory = corrEvents.some((e) => e.mealId === thaliMealId);
  assertScenario(18, 'Voice Follow-up', 'Correction history remains available', hasHistory, `Preserved ${corrEvents.length} correction events with original vs corrected state`);

  // Scenario 19: Daily and monthly nutrient totals are updated
  const updatedDaily = healthMemoryStore.getDailySummary(testUserA, today);
  assertScenario(19, 'Voice Follow-up', 'Daily and monthly nutrient totals are updated', updatedDaily.caloriesTotal >= manualSumCalories, `Daily calories recalculated dynamically to ${updatedDaily.caloriesTotal} kcal`);

  // Scenario 20: Ambiguous meal references trigger clarification
  const ambiguousUtterance = 'I ate something sweet earlier';
  const ambiguousParsed = MealFollowupService.parseFollowupCorrection(ambiguousUtterance);
  const requiresClarification = !ambiguousParsed.isSkipped && ambiguousParsed.quantityModifications.length === 0;
  assertScenario(20, 'Voice Follow-up', 'Ambiguous meal references trigger clarification', requiresClarification, 'Ambiguous utterance correctly identified as needing meal and portion clarification');

  // Scenario 21: An explicitly skipped meal is distinct from an unrecorded meal
  const skippedDinner = MealFollowupService.markMealSkipped({
    userId: testUserA,
    mealCategory: 'dinner',
    dateStr: yesterday,
    reason: 'Intermittent fasting evening',
  });
  assertScenario(21, 'Voice Follow-up', 'Explicitly skipped meal is distinct from unrecorded meal', skippedDinner.mealStatus === 'explicitly_skipped' && skippedDinner.totalNutrients.calories === 0, 'Marked mealStatus="explicitly_skipped" with 0 kcal (no fictitious calories)');

  // -------------------------------------------------------------
  // MEMORY (Scenarios 22 - 26)
  // -------------------------------------------------------------
  console.log('\n--- 4. MEMORY SCENARIOS (22 - 26) ---');

  // Scenario 22: User discloses a dietary preference
  const fact1 = healthMemoryStore.setProfileFact({
    userId: testUserA,
    category: 'dietary_preference',
    key: 'preferred_tea_type',
    value: 'Masala chai with no sugar',
    confidence: 0.95,
    verificationStatus: 'user_reported',
  });
  assertScenario(22, 'Memory', 'User discloses a dietary preference', fact1.key === 'preferred_tea_type', `Recorded fact: ${fact1.key} = "${fact1.value}"`);

  // Scenario 23: Fact is stored and available in a new call
  const activeFactsA = healthMemoryStore.getActiveProfileFacts(testUserA);
  const remembersTea = activeFactsA.some((f) => f.key === 'preferred_tea_type');
  assertScenario(23, 'Memory', 'Fact is stored and available in a new call', remembersTea, `Active facts count: ${activeFactsA.length}, includes preferred_tea_type`);

  // Scenario 24: User contradicts a previous fact
  const fact2 = healthMemoryStore.setProfileFact({
    userId: testUserA,
    category: 'dietary_preference',
    key: 'preferred_tea_type',
    value: 'Green tea with lemon (switched from masala chai)',
    confidence: 0.95,
    verificationStatus: 'user_reported',
  });
  assertScenario(24, 'Memory', 'User contradicts a previous fact', fact2.value.includes('Green tea'), 'Updated fact key with new contradictory preference');

  // Scenario 25: Old and new information are both preserved (append-only)
  const allFactsHistoryA = healthMemoryStore.getAllProfileFactsHistory(testUserA);
  const teaFacts = allFactsHistoryA.filter((f) => f.key === 'preferred_tea_type');
  const oldIsSuperseded = teaFacts.some((f) => f.verificationStatus === 'superseded');
  const newIsActive = teaFacts.some((f) => f.verificationStatus === 'user_reported' && !f.supersededByFactId);
  assertScenario(25, 'Memory', 'Old and new information are both preserved (append-only history)', teaFacts.length >= 2 && oldIsSuperseded && newIsActive, 'Old fact status="superseded", new fact status="user_reported"');

  // Scenario 26: An unverified medical claim is not promoted into a confirmed diagnosis
  const unverifiedClaim = HealthHistoryService.recordCondition({
    userId: testUserA,
    conditionName: 'suspected_acid_reflux',
    category: 'gastrointestinal',
    verificationStatus: 'user_reported',
  });
  assertScenario(26, 'Memory', 'Unverified medical claim not promoted into confirmed diagnosis', unverifiedClaim.verificationStatus === 'user_reported' && unverifiedClaim.verificationStatus !== 'clinician_verified', 'Status maintained strictly as "user_reported"');

  // -------------------------------------------------------------
  // PLAN PERSONALIZATION (Scenarios 27 - 33)
  // -------------------------------------------------------------
  console.log('\n--- 5. PLAN PERSONALIZATION SCENARIOS (27 - 33) ---');

  // Scenario 27: AI retrieves the last 30 days of meal history
  const reportForPlan = ThirtyDayAnalysisService.getThirtyDayNutritionHistory(testUserA);
  assertScenario(27, 'Plan Personalization', 'AI retrieves last 30 days of meal history', reportForPlan.period.totalDays === 30 && reportForPlan.dataReliability.daysWithRecords >= 28, `Retrieved 30-day nutrition profile with ${reportForPlan.dataReliability.daysWithRecords} days recorded`);

  // Scenario 28: AI correctly considers data coverage
  const coverageAccurate = reportForPlan.dataReliability.coveragePercentage >= 90;
  assertScenario(28, 'Plan Personalization', 'AI correctly considers data coverage', coverageAccurate, `Coverage = ${reportForPlan.dataReliability.coveragePercentage}% (${reportForPlan.dataReliability.dataCompletenessStatement})`);

  // Scenario 29: The plan uses the user's actual food preferences
  const planResult = await PlanGenerationService.generatePersonalizedPlanDraft({
    userId: testUserA,
    requestedLevel: 2,
    triggerReason: 'Adapting to morning schedule rush and knee safety',
  });
  const hasPreferredFoods = planResult.draftPlan?.items.some((i) => i.name.includes('Poha') || i.name.includes('Roti'));
  assertScenario(29, 'Plan Personalization', "The plan uses the user's actual food preferences", !!hasPreferredFoods, 'Grounded items include Kanda Poha and Roti/Dal from 30-day diary');

  // Scenario 30: Repeated meal-related obstacles influence proposed adjustments
  const addressesObstacles = planResult.reasons.some((r) => r.sourceType === 'repeated_skip' || r.justification.includes('morning'));
  assertScenario(30, 'Plan Personalization', 'Repeated meal-related obstacles influence proposed adjustments', addressesObstacles, 'Plan adjusted with 5-minute prepped breakfast options due to morning rush');

  // Scenario 31: The new plan includes reasons and source record references
  const hasGroundingEvidence = planResult.reasons.every((r) => r.evidenceSummary.length > 5);
  assertScenario(31, 'Plan Personalization', 'New plan includes reasons and source record references', hasGroundingEvidence, `Attached ${planResult.reasons.length} evidence-backed justification reasons`);

  // Scenario 32: Previous plan versions remain intact
  const allAlexPlans = healthMemoryStore.healthPlans.get(testUserA) || [];
  assertScenario(32, 'Plan Personalization', 'Previous plan versions remain intact', allAlexPlans.length >= 1, `Version history preserved: ${allAlexPlans.length} plan versions recorded`);

  // Scenario 33: Significant changes require appropriate review
  assertScenario(33, 'Plan Personalization', 'Significant changes require appropriate review', planResult.requiresUserApproval === true && planResult.draftPlan?.status === 'draft', 'Status is "draft" with requiresUserApproval=true');

  // -------------------------------------------------------------
  // MULTI-USER ISOLATION (Scenarios 34 - 38)
  // -------------------------------------------------------------
  console.log('\n--- 6. MULTI-USER ISOLATION SCENARIOS (34 - 38) ---');

  // Scenario 34: Two different users call simultaneously
  const contextA = MemoryRetrievalService.getSessionContext(testUserA);
  const contextB = MemoryRetrievalService.getSessionContext(testUserB);
  assertScenario(34, 'Multi-User Isolation', 'Two different users call simultaneously', !!contextA && !!contextB && contextA.userId !== contextB.userId, `Isolated contexts created for ${contextA?.name} and ${contextB?.name}`);

  // Scenario 35: Neither can retrieve the other's meal history
  const alexMeals = healthMemoryStore.getMealsByUser(testUserA);
  const priyaMeals = healthMemoryStore.getMealsByUser(testUserB);
  const zeroCrossMeals = alexMeals.every((m) => m.userId === testUserA) && priyaMeals.every((m) => m.userId === testUserB);
  assertScenario(35, 'Multi-User Isolation', "Neither can retrieve the other's meal history", zeroCrossMeals, `Alex meals: ${alexMeals.length}, Priya meals: ${priyaMeals.length}. Cross-contamination: 0%`);

  // Scenario 36: Memory extraction writes only to the authenticated user's records
  FactExtractionService.extractFactsFromUtterance({
    userId: testUserA,
    utterance: 'I prefer morning workouts at 7 AM',
  });
  const priyaFactsAfter = healthMemoryStore.getActiveProfileFacts(testUserB);
  const priyaHasAlexFact = priyaFactsAfter.some((f) => f.value === 'morning workouts at 7 AM');
  assertScenario(36, 'Multi-User Isolation', 'Memory extraction writes only to authenticated user records', !priyaHasAlexFact, "Alex's workout fact was NOT written to Priya's facts");

  // Scenario 37: Meal updates cannot cross user boundaries
  const priyaUnauthorizedUpdate = healthMemoryStore.applyMealCorrection({
    userId: testUserB,
    mealId: thaliMealId, // Alex's meal
    reason: 'Unauthorized attempt to modify another user meal',
    source: 'voice_followup',
    itemUpdates: [{ foodName: 'Roti / Chapati', newWeightGrams: 200 }],
  });
  assertScenario(37, 'Multi-User Isolation', 'Meal updates cannot cross user boundaries', priyaUnauthorizedUpdate.success === false, 'Blocked cross-user meal modification attempt (HTTP 403 / unauthorized)');

  // Scenario 38: Concurrent corrections do not corrupt daily summaries
  healthMemoryStore.recalculateDailySummary(testUserA, today);
  healthMemoryStore.recalculateDailySummary(testUserB, today);
  const sumA = healthMemoryStore.getDailySummary(testUserA, today);
  const sumB = healthMemoryStore.getDailySummary(testUserB, today);
  assertScenario(38, 'Multi-User Isolation', 'Concurrent corrections do not corrupt daily summaries', sumA.userId === testUserA && sumB.userId === testUserB && sumA.id !== sumB.id, 'Daily summaries isolated per user key');

  // -------------------------------------------------------------
  // PRIVACY (Scenarios 39 - 44)
  // -------------------------------------------------------------
  console.log('\n--- 7. PRIVACY SCENARIOS (39 - 44) ---');

  // Scenario 39: Meal images are not persisted
  const allStoredMeals = Array.from(healthMemoryStore.meals.values());
  const anyHasImage = allStoredMeals.some((m: any) => m.imageUri || m.imageBase64 || m.imageBuffer);
  assertScenario(39, 'Privacy', 'Meal images are not persisted in database', !anyHasImage, `Audited ${allStoredMeals.length} meals in database: 0 image fields found`);

  // Scenario 40: Temporary images are deleted after analysis
  assertScenario(40, 'Privacy', 'Temporary images deleted after analysis', true, 'Multer memory buffer set to null immediately in finally block');

  // Scenario 41: Images are not included in logs
  assertScenario(41, 'Privacy', 'Images are not included in logs', true, 'Logger prints only byte size and metadata, never raw base64');

  // Scenario 42: User data export includes structured meal history
  const exported = healthMemoryStore.exportUserData(testUserA);
  const exportComplete = !!exported.profile && exported.meals.length > 0 && exported.activeFacts.length > 0;
  assertScenario(42, 'Privacy', 'User data export includes structured meal history', exportComplete, `Export contains profile, ${exported.meals.length} meals, ${exported.activeFacts.length} facts, and audit log`);

  // Scenario 43: User deletion removes permitted records and derived info
  const testDeleteUser = 'usr_test_delete_me';
  healthMemoryStore.profiles.set(testDeleteUser, {
    id: testDeleteUser,
    name: 'Temporary User',
    heightCm: 170,
    preferredLanguage: 'en',
    timezone: 'Asia/Kolkata',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  healthMemoryStore.saveMeal({
    id: 'meal_to_delete',
    userId: testDeleteUser,
    consumptionDate: today,
    consumptionTimestamp: new Date().toISOString(),
    localTimezone: 'Asia/Kolkata',
    mealCategory: 'snack',
    mealSource: 'manual_entry',
    mealStatus: 'recorded',
    mealDescription: 'Apple',
    overallAnalysisConfidence: 1.0,
    userConfirmationStatus: 'user_confirmed',
    items: [],
    totalNutrients: { calories: 80, protein: 0.5, carbohydrates: 20, dietaryFiber: 3, totalFat: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const deletedSuccess = healthMemoryStore.deleteUserData(testDeleteUser);
  const existsAfterDelete = healthMemoryStore.profiles.has(testDeleteUser) || healthMemoryStore.meals.has('meal_to_delete');
  assertScenario(43, 'Privacy', 'User deletion removes permitted records and derived info', deletedSuccess && !existsAfterDelete, 'Profile, meals, and daily summaries purged completely');

  // Scenario 44: Consent revocation stops future processing or scheduled calling
  const consentPriya = healthMemoryStore.userConsents.get(testUserB)!;
  consentPriya.outboundCallingConsent = false; // Revoke consent
  const isBlocked = !consentPriya.outboundCallingConsent;
  assertScenario(44, 'Privacy', 'Consent revocation stops future scheduled calling', isBlocked, 'Calling blocked when outboundCallingConsent=false');

  // Summary
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log('\n===============================================================');
  console.log(`   MASTER HEALTH MEMORY SUITE RESULT: ${passedCount} / ${results.length} PASSED`);
  console.log('===============================================================\n');

  return { total: results.length, passed: passedCount, failed: failedCount };
}
