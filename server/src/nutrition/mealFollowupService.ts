import { healthMemoryStore } from '../db/healthMemoryStore.js';
import { MealEntity, MealItemEntity, MealFollowupEvent, DataSource, VerificationStatus } from '../types/healthMemory.js';
import { MealNutritionService } from '../services/nutritionDatabase.js';

export class MealFollowupService {
  /**
   * Finds an existing meal to discuss in follow-up calls or chats.
   * Resolves relative date (e.g. 'yesterday' or YYYY-MM-DD) and meal category.
   */
  public static findMealForFollowup(
    userId: string,
    targetDate: string,
    mealCategory: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  ): MealEntity | undefined {
    let resolvedDate = targetDate;
    if (targetDate === 'yesterday') {
      const yesterday = new Date(Date.now() - 86400000);
      resolvedDate = yesterday.toISOString().split('T')[0];
    } else if (targetDate === 'today') {
      resolvedDate = new Date().toISOString().split('T')[0];
    }

    const meals = healthMemoryStore.getMealsByUser(userId, resolvedDate);
    return meals.find((m) => m.mealCategory === mealCategory);
  }

  /**
   * Adds a meal verbally reported by the user (e.g. "I had poha and a banana for breakfast").
   */
  public static addMealFromVoice(params: {
    userId: string;
    mealCategory: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    dateStr?: string;
    foodItems: Array<{
      name: string;
      estimatedWeightGrams?: number;
      servingDescription?: string;
    }>;
    notes?: string;
    sessionId?: string;
  }): MealEntity {
    const { userId, mealCategory, dateStr, foodItems, notes, sessionId } = params;
    const localDate = dateStr || new Date().toISOString().split('T')[0];
    const mealId = `meal_voice_${userId}_${Date.now()}`;

    const items: MealItemEntity[] = foodItems.map((fi, idx) => {
      const weight = fi.estimatedWeightGrams || 100;
      const nutrition = MealNutritionService.calculateItemNutrition(fi.name, weight);

      return {
        id: `item_${mealId}_${idx + 1}`,
        mealId,
        userId,
        standardFoodName: fi.name,
        foodCategory: 'general',
        estimatedQuantity: 1,
        servingUnit: fi.servingDescription || 'portion',
        servingCount: 1,
        estimatedWeightGrams: weight,
        minEstimatedWeightGrams: Math.round(weight * 0.8),
        mostLikelyEstimatedWeightGrams: weight,
        maxEstimatedWeightGrams: Math.round(weight * 1.2),
        portionSource: 'model_estimate',
        portionConfidence: 0.9,
        recognitionConfidence: 0.95,
        ingredients: [{ name: fi.name, estimatedGrams: weight, isInferred: false }],
        nutrients: {
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbohydrates: nutrition.carbs,
          dietaryFiber: nutrition.fiber,
          totalFat: nutrition.fat,
          sodiumMg: nutrition.sodium,
          potassiumMg: nutrition.potassium,
        },
        nutrientSource: 'IFCT_2017',
        nutrientReferenceVersion: '1.0',
        source: 'voice_report',
        confirmationStatus: 'user_reported',
      };
    });

    const totalNutrients = items.reduce(
      (acc, item) => ({
        calories: acc.calories + item.nutrients.calories,
        protein: Math.round((acc.protein + item.nutrients.protein) * 10) / 10,
        carbohydrates: Math.round((acc.carbohydrates + item.nutrients.carbohydrates) * 10) / 10,
        dietaryFiber: Math.round((acc.dietaryFiber + item.nutrients.dietaryFiber) * 10) / 10,
        totalFat: Math.round((acc.totalFat + item.nutrients.totalFat) * 10) / 10,
        sodiumMg: (acc.sodiumMg || 0) + (item.nutrients.sodiumMg || 0),
        potassiumMg: (acc.potassiumMg || 0) + (item.nutrients.potassiumMg || 0),
      }),
      { calories: 0, protein: 0, carbohydrates: 0, dietaryFiber: 0, totalFat: 0, sodiumMg: 0, potassiumMg: 0 }
    );

    const meal: MealEntity = {
      id: mealId,
      userId,
      consumptionDate: localDate,
      consumptionTimestamp: new Date().toISOString(),
      localTimezone: 'Asia/Kolkata',
      mealCategory,
      mealSource: 'voice_report',
      mealStatus: 'recorded',
      mealDescription: foodItems.map((f) => f.name).join(', '),
      overallAnalysisConfidence: 0.92,
      userConfirmationStatus: 'user_reported',
      notes,
      items,
      totalNutrients,
      coachInsight: 'Logged via voice check-in.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    healthMemoryStore.saveMeal(meal);

    // Record follow-up event
    const event: MealFollowupEvent = {
      id: `evt_vf_${Date.now()}`,
      userId,
      conversationSessionId: sessionId,
      relatedMealId: mealId,
      consumptionDateDiscussed: localDate,
      questionAsked: `What did you eat for ${mealCategory}?`,
      userResponse: foodItems.map((f) => f.name).join(', '),
      eventType: 'meal_added_from_voice',
      confirmationStatus: 'user_reported',
      timestamp: new Date().toISOString(),
    };
    const userEvents = healthMemoryStore.mealFollowupEvents.get(userId) || [];
    healthMemoryStore.mealFollowupEvents.set(userId, [...userEvents, event]);

    return meal;
  }

  /**
   * Records an explicit skipped meal event (e.g. user reports fasting or skipping dinner).
   * Does NOT insert fictitious calories.
   */
  public static markMealSkipped(params: {
    userId: string;
    mealCategory: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    dateStr?: string;
    reason?: string;
    sessionId?: string;
  }): MealEntity {
    const { userId, mealCategory, dateStr, reason, sessionId } = params;
    const localDate = dateStr || new Date().toISOString().split('T')[0];
    const mealId = `meal_skipped_${userId}_${mealCategory}_${localDate}`;

    const skippedMeal: MealEntity = {
      id: mealId,
      userId,
      consumptionDate: localDate,
      consumptionTimestamp: new Date().toISOString(),
      localTimezone: 'Asia/Kolkata',
      mealCategory,
      mealSource: 'voice_followup',
      mealStatus: 'explicitly_skipped',
      mealDescription: `User explicitly skipped ${mealCategory}${reason ? ` (${reason})` : ''}`,
      overallAnalysisConfidence: 1.0,
      userConfirmationStatus: 'user_confirmed',
      notes: reason,
      items: [],
      totalNutrients: {
        calories: 0,
        protein: 0,
        carbohydrates: 0,
        dietaryFiber: 0,
        totalFat: 0,
        sodiumMg: 0,
        potassiumMg: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    healthMemoryStore.saveMeal(skippedMeal);

    // Record follow-up event
    const event: MealFollowupEvent = {
      id: `evt_skip_${Date.now()}`,
      userId,
      conversationSessionId: sessionId,
      relatedMealId: mealId,
      consumptionDateDiscussed: localDate,
      questionAsked: `Did you have ${mealCategory}?`,
      userResponse: `Skipped ${mealCategory}. Reason: ${reason || 'Not specified'}`,
      eventType: 'meal_marked_skipped',
      confirmationStatus: 'user_confirmed',
      timestamp: new Date().toISOString(),
    };
    const userEvents = healthMemoryStore.mealFollowupEvents.get(userId) || [];
    healthMemoryStore.mealFollowupEvents.set(userId, [...userEvents, event]);

    return skippedMeal;
  }

  /**
   * Intelligently resolves an utterance to a specific meal and action.
   * Example: "Actually I had 3 rotis and some curd yesterday for lunch"
   */
  public static parseFollowupCorrection(utterance: string): {
    isCorrection: boolean;
    targetDate: 'today' | 'yesterday' | 'specific';
    mealCategory?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    quantityModifications: Array<{ foodName: string; newQuantity: number; estimatedGrams: number }>;
    additions: Array<{ foodName: string; estimatedGrams: number }>;
    removals: string[];
    isSkipped: boolean;
    skipReason?: string;
  } {
    const text = utterance.toLowerCase();

    // Check if skipped
    if (text.includes('skip') || text.includes('nahi khaya') || text.includes("didn't eat")) {
      let category: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'dinner';
      if (text.includes('breakfast') || text.includes('nashta')) category = 'breakfast';
      if (text.includes('lunch') || text.includes('dopahar')) category = 'lunch';
      if (text.includes('dinner') || text.includes('raat')) category = 'dinner';

      return {
        isCorrection: true,
        targetDate: text.includes('yesterday') || text.includes('kal') ? 'yesterday' : 'today',
        mealCategory: category,
        quantityModifications: [],
        additions: [],
        removals: [],
        isSkipped: true,
        skipReason: utterance,
      };
    }

    const modifications: Array<{ foodName: string; newQuantity: number; estimatedGrams: number }> = [];
    const additions: Array<{ foodName: string; estimatedGrams: number }> = [];
    const removals: string[] = [];

    // Chapati / Roti quantity check: e.g. "three chapatis", "3 rotis", "teen roti"
    const rotiMatch = text.match(/(\d+|two|three|four|do|teen|chaar)\s*(roti|chapatis?|rotis?)/i);
    if (rotiMatch) {
      let count = 2;
      const word = rotiMatch[1].toLowerCase();
      if (word === '3' || word === 'three' || word === 'teen') count = 3;
      if (word === '4' || word === 'four' || word === 'chaar') count = 4;
      if (word === '1' || word === 'one' || word === 'ek') count = 1;
      if (word === '2' || word === 'two' || word === 'do') count = 2;

      modifications.push({
        foodName: 'Roti / Chapati',
        newQuantity: count,
        estimatedGrams: count * 40,
      });
    }

    // Additions: e.g. "curd", "dahi", "apple", "banana"
    if (text.includes('curd') || text.includes('dahi')) {
      additions.push({ foodName: 'Curd / Dahi', estimatedGrams: 100 });
    }
    if (text.includes('apple') || text.includes('seb')) {
      additions.push({ foodName: 'Apple', estimatedGrams: 120 });
    }
    if (text.includes('banana') || text.includes('kela')) {
      additions.push({ foodName: 'Banana', estimatedGrams: 100 });
    }

    // Removals: e.g. "no curd", "didn't have sabzi"
    if (text.includes('no curd') || text.includes('without dahi') || text.includes('dahi nahi tha')) {
      removals.push('curd');
    }
    if (text.includes('no sabzi') || text.includes('without vegetable')) {
      removals.push('vegetable');
    }

    let mealCategory: 'breakfast' | 'lunch' | 'dinner' | 'snack' = 'lunch';
    if (text.includes('breakfast') || text.includes('nashta')) mealCategory = 'breakfast';
    if (text.includes('lunch') || text.includes('dopahar')) mealCategory = 'lunch';
    if (text.includes('dinner') || text.includes('raat')) mealCategory = 'dinner';

    const isCorrection = modifications.length > 0 || additions.length > 0 || removals.length > 0;

    return {
      isCorrection,
      targetDate: text.includes('yesterday') || text.includes('kal') ? 'yesterday' : 'today',
      mealCategory,
      quantityModifications: modifications,
      additions,
      removals,
      isSkipped: false,
    };
  }
}

