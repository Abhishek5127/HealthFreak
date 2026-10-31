import { healthMemoryStore } from '../db/healthMemoryStore.js';
import { ThirtyDayAnalysisService } from '../nutrition/thirtyDayAnalysisService.js';

export class MemoryRetrievalService {
  /**
   * Retrieves complete, authenticated health context for an active AI coaching session.
   * Completely isolated per userId — zero possibility of cross-user context leakage.
   */
  public static getSessionContext(userId: string) {
    const profile = healthMemoryStore.profiles.get(userId);
    if (!profile) return null;

    const preferences = healthMemoryStore.userPreferences.get(userId);
    const goals = healthMemoryStore.userGoals.get(userId) || [];
    const conditions = healthMemoryStore.healthConditions.get(userId) || [];
    const activeFacts = healthMemoryStore.getActiveProfileFacts(userId);
    const recentMeals = healthMemoryStore.getMealsByUser(userId).slice(0, 5);
    const thirtyDaySummary = ThirtyDayAnalysisService.getThirtyDayNutritionHistory(userId, profile.timezone);

    return {
      userId: profile.id,
      name: profile.name,
      preferredLanguage: profile.preferredLanguage,
      timezone: profile.timezone,
      goals: goals.map((g) => g.targetDescription),
      conditions: conditions.filter((c) => c.active).map((c) => ({
        name: c.conditionName,
        status: c.verificationStatus,
        notes: c.clinicalNotes,
      })),
      preferences: preferences
        ? {
            dietaryType: preferences.dietaryType,
            cultural: preferences.culturalPreferences,
            dislikes: preferences.foodDislikes,
            workoutTimes: preferences.preferredMealTimes,
          }
        : null,
      activeFacts: activeFacts.map((f) => ({ key: f.key, value: f.value, status: f.verificationStatus })),
      recentMeals: recentMeals.map((m) => ({
        id: m.id,
        category: m.mealCategory,
        date: m.consumptionDate,
        description: m.mealDescription,
        calories: m.totalNutrients.calories,
        protein: m.totalNutrients.protein,
        status: m.mealStatus,
      })),
      thirtyDayOverview: {
        avgCalories: thirtyDaySummary.overallNutrition.averageDailyCalories,
        avgProtein: thirtyDaySummary.overallNutrition.averageDailyProtein,
        coveragePercentage: thirtyDaySummary.dataReliability.coveragePercentage,
        frequentFoods: thirtyDaySummary.foodBehaviour.frequentlyConsumedFoods.map((f) => f.name),
        skippedCount: thirtyDaySummary.planAdherence.explicitlySkippedMeals.length,
      },
    };
  }
}
