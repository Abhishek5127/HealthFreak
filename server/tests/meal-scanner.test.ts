import { MealNutritionService, VERIFIED_FOOD_DATABASE } from '../src/services/nutritionDatabase.js';
import { MealStore } from '../src/db/mealStore.js';
import { FoodItem } from '../src/types/meal.js';

export async function runMealScannerTests() {
  console.log('\n--- TEST 9: AI Meal Scanner & Nutrition Intelligence ---');
  let passCount = 0;

  // 1. Food Matching & Localized Aliases
  const rotiMatch = MealNutritionService.matchFoodItem('phulka');
  const dalMatch = MealNutritionService.matchFoodItem('yellow toor daal');
  const paneerMatch = MealNutritionService.matchFoodItem('shahi paneer curry');

  if (
    rotiMatch.canonicalName.includes('Roti') &&
    dalMatch.canonicalName.includes('Dal Tadka') &&
    paneerMatch.canonicalName.includes('Paneer')
  ) {
    console.log('✅ PASS: Localized Indian dishes correctly resolved to IFCT canonical records');
    passCount++;
  } else {
    throw new Error('Food matching failed to resolve canonical items');
  }

  // 2. Exact Portion & Macro Calculations
  // 2 medium rotis (~80g): 80 * 297 / 100 = ~238 kcal
  const rotiNutrition = MealNutritionService.calculateItemNutrition('Roti / Chapati', 80);
  if (rotiNutrition.calories >= 235 && rotiNutrition.calories <= 245 && rotiNutrition.protein > 8) {
    console.log(`✅ PASS: Accurate nutrition calculation (80g Roti = ${rotiNutrition.calories} kcal, ${rotiNutrition.protein}g protein)`);
    passCount++;
  } else {
    throw new Error(`Nutrition calculation error: expected ~238 kcal, got ${rotiNutrition.calories}`);
  }

  // 3. Multi-item Meal Aggregation
  const samplePlate: FoodItem[] = [
    {
      id: 'f1',
      name: 'Roti / Chapati',
      estimatedWeightGrams: 80,
      servingDescription: '2 rotis',
      confidence: 0.95,
      visibleIngredients: ['Whole wheat'],
      inferredIngredients: [],
      nutrition: rotiNutrition,
    },
    {
      id: 'f2',
      name: 'Dal Tadka',
      estimatedWeightGrams: 150,
      servingDescription: '1 bowl',
      confidence: 0.92,
      visibleIngredients: ['Yellow dal', 'Cumin'],
      inferredIngredients: [],
      nutrition: MealNutritionService.calculateItemNutrition('Dal Tadka', 150),
    },
  ];

  const macros = MealNutritionService.aggregateMacros(samplePlate);
  const micros = MealNutritionService.calculateMicronutrients(samplePlate);
  const benefits = MealNutritionService.deriveHealthBenefits(macros, samplePlate);
  const considerations = MealNutritionService.deriveDietaryConsiderations(macros, samplePlate);

  if (macros.calories > 350 && macros.proteinGrams > 15 && micros.length === 8 && benefits.length > 0) {
    console.log(`✅ PASS: Meal aggregation verified: ${macros.calories} kcal, ${macros.proteinGrams}g protein, ${micros.length} micronutrients tracked`);
    passCount++;
  } else {
    throw new Error('Meal aggregation failed');
  }

  // 4. MealStore CRUD and Daily Diary Summary
  const store = MealStore.getInstance();
  const summaryBefore = store.getDailySummary('usr_synthetic_alex');
  const initialCal = summaryBefore.caloriesTotal;

  const newMeal = store.saveMeal({
    id: `test_meal_${Date.now()}`,
    userId: 'usr_synthetic_alex',
    mealName: 'Test Thali',
    mealType: 'lunch',
    timestamp: new Date().toISOString(),
    recognitionConfidence: 0.95,
    foods: samplePlate,
    totalNutrition: macros,
    micronutrients: micros,
    healthBenefits: benefits,
    considerations,
    coachInsight: 'Great test meal!',
    status: 'saved',
  });

  const summaryAfter = store.getDailySummary('usr_synthetic_alex');
  if (summaryAfter.caloriesTotal === initialCal + macros.calories) {
    console.log(`✅ PASS: Daily summary dynamically reflects logged meal (+${macros.calories} kcal)`);
    passCount++;
  } else {
    throw new Error(`Daily summary mismatch: ${summaryAfter.caloriesTotal} vs ${initialCal + macros.calories}`);
  }

  // 5. Cleanup test meal
  store.deleteMeal(newMeal.id);
  const summaryCleaned = store.getDailySummary('usr_synthetic_alex');
  if (summaryCleaned.caloriesTotal === initialCal) {
    console.log('✅ PASS: Meal deletion and diary rollback verified');
    passCount++;
  } else {
    throw new Error('Meal deletion failed to restore balance');
  }

  console.log(`   📊 Meal Scanner Unit Tests: ${passCount}/5 PASSED`);
  return true;
}

