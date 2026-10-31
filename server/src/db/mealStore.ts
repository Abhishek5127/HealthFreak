import { MealAnalysisResult, DailyNutritionSummary, FoodItem } from '../types/meal.js';
import { MealNutritionService } from '../services/nutritionDatabase.js';

export class MealStore {
  private static instance: MealStore;
  private meals: Map<string, MealAnalysisResult> = new Map();
  private drafts: Map<string, MealAnalysisResult> = new Map();

  private constructor() {
    this.seedInitialMeals();
  }

  public static getInstance(): MealStore {
    if (!MealStore.instance) {
      MealStore.instance = new MealStore();
    }
    return MealStore.instance;
  }

  private seedInitialMeals(): void {
    const today = new Date().toISOString().split('T')[0];

    // Seed Breakfast for Alex
    const breakfastFoods: FoodItem[] = [
      {
        id: 'seed_bf_1',
        name: 'Poha',
        localizedName: 'Kanda Poha',
        estimatedWeightGrams: 140,
        servingDescription: '1 medium bowl (~140g)',
        confidence: 0.95,
        visibleIngredients: ['Flattened rice', 'Mustard seeds', 'Peanuts', 'Curry leaves'],
        inferredIngredients: ['Turmeric', 'Green chillies', 'Lemon'],
        cookingMethod: 'Tempered and steamed',
        nutrition: MealNutritionService.calculateItemNutrition('Poha', 140),
      },
      {
        id: 'seed_bf_2',
        name: 'Boiled Egg / Egg Omelette',
        localizedName: 'Boiled Eggs',
        estimatedWeightGrams: 100,
        servingDescription: '2 boiled eggs (~100g)',
        confidence: 0.98,
        visibleIngredients: ['2 hard boiled eggs'],
        inferredIngredients: ['Pinch of black pepper'],
        cookingMethod: 'Hard boiled',
        nutrition: MealNutritionService.calculateItemNutrition('Boiled Egg / Egg Omelette', 100),
      },
    ];

    const bfMacros = MealNutritionService.aggregateMacros(breakfastFoods);
    const bfMicros = MealNutritionService.calculateMicronutrients(breakfastFoods);

    const breakfastMeal: MealAnalysisResult = {
      id: 'meal_seed_breakfast_today',
      userId: 'usr_synthetic_alex',
      mealName: 'Poha & Boiled Eggs Breakfast',
      mealType: 'breakfast',
      timestamp: `${today}T08:30:00.000Z`,
      recognitionConfidence: 0.96,
      foods: breakfastFoods,
      totalNutrition: bfMacros,
      micronutrients: bfMicros,
      healthBenefits: MealNutritionService.deriveHealthBenefits(bfMacros, breakfastFoods),
      considerations: MealNutritionService.deriveDietaryConsiderations(bfMacros, breakfastFoods),
      coachInsight: 'High protein breakfast to jumpstart morning muscle recovery and sustained focus.',
      status: 'saved',
    };

    this.meals.set(breakfastMeal.id, breakfastMeal);
  }

  public saveDraft(draft: MealAnalysisResult): void {
    this.drafts.set(draft.id, draft);
  }

  public getDraft(id: string): MealAnalysisResult | undefined {
    return this.drafts.get(id);
  }

  public saveMeal(meal: MealAnalysisResult): MealAnalysisResult {
    const savedRecord: MealAnalysisResult = {
      ...meal,
      status: 'saved',
      timestamp: meal.timestamp || new Date().toISOString(),
    };
    this.meals.set(savedRecord.id, savedRecord);
    this.drafts.delete(savedRecord.id);
    return savedRecord;
  }

  public getMealById(mealId: string): MealAnalysisResult | undefined {
    return this.meals.get(mealId);
  }

  public getMealsByUser(userId: string, dateStr?: string): MealAnalysisResult[] {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const results: MealAnalysisResult[] = [];

    for (const meal of this.meals.values()) {
      if (meal.userId === userId && meal.timestamp.startsWith(targetDate)) {
        results.push(meal);
      }
    }

    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public updateMeal(mealId: string, updates: Partial<MealAnalysisResult>): MealAnalysisResult | undefined {
    const existing = this.meals.get(mealId);
    if (!existing) return undefined;

    let updatedFoods = updates.foods || existing.foods;
    // If foods changed, recalculate nutrition automatically
    if (updates.foods) {
      updatedFoods = updates.foods.map((item) => ({
        ...item,
        nutrition: MealNutritionService.calculateItemNutrition(item.name, item.estimatedWeightGrams),
      }));
    }

    const totalNutrition = MealNutritionService.aggregateMacros(updatedFoods);
    const micronutrients = MealNutritionService.calculateMicronutrients(updatedFoods);
    const healthBenefits = MealNutritionService.deriveHealthBenefits(totalNutrition, updatedFoods);
    const considerations = MealNutritionService.deriveDietaryConsiderations(totalNutrition, updatedFoods);

    const merged: MealAnalysisResult = {
      ...existing,
      ...updates,
      foods: updatedFoods,
      totalNutrition,
      micronutrients,
      healthBenefits,
      considerations,
    };

    this.meals.set(mealId, merged);
    return merged;
  }

  public deleteMeal(mealId: string): boolean {
    return this.meals.delete(mealId);
  }

  public getDailySummary(userId: string, dateStr?: string): DailyNutritionSummary {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const userMeals = this.getMealsByUser(userId, targetDate);

    let caloriesTotal = 0;
    let proteinTotal = 0;
    let carbsTotal = 0;
    let fatTotal = 0;
    let fiberTotal = 0;

    for (const m of userMeals) {
      caloriesTotal += m.totalNutrition.calories;
      proteinTotal += m.totalNutrition.proteinGrams;
      carbsTotal += m.totalNutrition.carbsGrams;
      fatTotal += m.totalNutrition.fatGrams;
      fiberTotal += m.totalNutrition.fiberGrams;
    }

    return {
      date: targetDate,
      caloriesTotal: Math.round(caloriesTotal),
      caloriesTarget: 2100, // Alex's target
      proteinTotal: Math.round(proteinTotal),
      proteinTarget: 130, // 130g protein
      carbsTotal: Math.round(carbsTotal),
      carbsTarget: 220, // 220g carbs
      fatTotal: Math.round(fatTotal),
      fatTarget: 65, // 65g fat
      fiberTotal: Math.round(fiberTotal),
      fiberTarget: 35, // 35g fiber
      waterIntakeMl: 2200,
      waterTargetMl: 3000,
      meals: userMeals,
    };
  }
}

