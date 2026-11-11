"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MealStore = void 0;
const nutritionDatabase_js_1 = require("../services/nutritionDatabase.js");
class MealStore {
    static instance;
    meals = new Map();
    drafts = new Map();
    constructor() {
        // Starts clean - user meals only
    }
    static getInstance() {
        if (!MealStore.instance) {
            MealStore.instance = new MealStore();
        }
        return MealStore.instance;
    }
    seedInitialMeals() {
        const today = new Date().toISOString().split('T')[0];
        // Seed Breakfast for Alex
        const breakfastFoods = [
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
                nutrition: nutritionDatabase_js_1.MealNutritionService.calculateItemNutrition('Poha', 140),
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
                nutrition: nutritionDatabase_js_1.MealNutritionService.calculateItemNutrition('Boiled Egg / Egg Omelette', 100),
            },
        ];
        const bfMacros = nutritionDatabase_js_1.MealNutritionService.aggregateMacros(breakfastFoods);
        const bfMicros = nutritionDatabase_js_1.MealNutritionService.calculateMicronutrients(breakfastFoods);
        const breakfastMeal = {
            id: 'meal_seed_breakfast_today',
            userId: 'usr_synthetic_alex',
            mealName: 'Poha & Boiled Eggs Breakfast',
            mealType: 'breakfast',
            timestamp: `${today}T08:30:00.000Z`,
            recognitionConfidence: 0.96,
            foods: breakfastFoods,
            totalNutrition: bfMacros,
            micronutrients: bfMicros,
            healthBenefits: nutritionDatabase_js_1.MealNutritionService.deriveHealthBenefits(bfMacros, breakfastFoods),
            considerations: nutritionDatabase_js_1.MealNutritionService.deriveDietaryConsiderations(bfMacros, breakfastFoods),
            coachInsight: 'High protein breakfast to jumpstart morning muscle recovery and sustained focus.',
            status: 'saved',
        };
        this.meals.set(breakfastMeal.id, breakfastMeal);
    }
    saveDraft(draft) {
        this.drafts.set(draft.id, draft);
    }
    getDraft(id) {
        return this.drafts.get(id);
    }
    saveMeal(meal) {
        const savedRecord = {
            ...meal,
            status: 'saved',
            timestamp: meal.timestamp || new Date().toISOString(),
        };
        this.meals.set(savedRecord.id, savedRecord);
        this.drafts.delete(savedRecord.id);
        return savedRecord;
    }
    getMealById(mealId) {
        return this.meals.get(mealId);
    }
    getMealsByUser(userId, dateStr) {
        const targetDate = dateStr || new Date().toISOString().split('T')[0];
        const results = [];
        for (const meal of this.meals.values()) {
            if (meal.userId === userId && meal.timestamp.startsWith(targetDate)) {
                results.push(meal);
            }
        }
        return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    updateMeal(mealId, updates) {
        const existing = this.meals.get(mealId);
        if (!existing)
            return undefined;
        let updatedFoods = updates.foods || existing.foods;
        // If foods changed, recalculate nutrition automatically
        if (updates.foods) {
            updatedFoods = updates.foods.map((item) => ({
                ...item,
                nutrition: nutritionDatabase_js_1.MealNutritionService.calculateItemNutrition(item.name, item.estimatedWeightGrams),
            }));
        }
        const totalNutrition = nutritionDatabase_js_1.MealNutritionService.aggregateMacros(updatedFoods);
        const micronutrients = nutritionDatabase_js_1.MealNutritionService.calculateMicronutrients(updatedFoods);
        const healthBenefits = nutritionDatabase_js_1.MealNutritionService.deriveHealthBenefits(totalNutrition, updatedFoods);
        const considerations = nutritionDatabase_js_1.MealNutritionService.deriveDietaryConsiderations(totalNutrition, updatedFoods);
        const merged = {
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
    deleteMeal(mealId) {
        return this.meals.delete(mealId);
    }
    getDailySummary(userId, dateStr) {
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
exports.MealStore = MealStore;
