import { ToolDefinition, AgentContext, ToolCallResult } from '../providers/VoiceProviderInterface.js';
import { db } from '../db/index.js';
import { healthMemoryStore } from '../db/healthMemoryStore.js';
import { ThirtyDayAnalysisService } from '../nutrition/thirtyDayAnalysisService.js';
import { MealFollowupService } from '../nutrition/mealFollowupService.js';
import { PlanGenerationService } from '../plans/planGenerationService.js';
import { MealNutritionService } from '../services/nutritionDatabase.js';

export const COACH_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_user_profile',
    description: 'Retrieves user health goals, known conditions, preferences, and persistent memory facts.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'update_user_memory',
    description: 'Stores an important lifestyle fact, symptom, or user preference in persistent memory.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Name of the fact (e.g. knee_pain, preferred_workout_time)' },
        value: { type: 'string', description: 'The fact or observation details' },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'record_daily_checkin',
    description: 'Logs today check-in details such as mood, energy level, and reported physical symptoms.',
    parameters: {
      type: 'object',
      properties: {
        mood: { type: 'string', description: 'Mood (calm, energized, balanced, lowEnergy, tense)' },
        energyScore: { type: 'number', description: 'Energy from 1 to 10' },
        symptoms: { type: 'string', description: 'Any physical discomfort or notes' },
      },
      required: ['mood', 'energyScore'],
    },
  },
  {
    name: 'getThirtyDayMealHistory',
    description: 'Retrieves rolling 30-day nutrition history, average macros, food variety, and data completeness.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'getDailyMealHistory',
    description: 'Retrieves meals logged for a specific date (e.g. today or yesterday) with item breakdown.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format, or "today" / "yesterday"' },
      },
      required: ['date'],
    },
  },
  {
    name: 'findMealForFollowup',
    description: 'Finds an existing meal record (e.g. yesterday lunch) to discuss or verify portions with the user.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: '"yesterday", "today", or YYYY-MM-DD' },
        mealCategory: { type: 'string', description: 'breakfast, lunch, dinner, or snack' },
      },
      required: ['date', 'mealCategory'],
    },
  },
  {
    name: 'addMealFromVoice',
    description: 'Records a meal verbally described by the user (e.g. poha and banana for breakfast).',
    parameters: {
      type: 'object',
      properties: {
        mealCategory: { type: 'string', description: 'breakfast, lunch, dinner, or snack' },
        foodItems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              estimatedWeightGrams: { type: 'number' },
              servingDescription: { type: 'string' },
            },
            required: ['name'],
          },
        },
        date: { type: 'string', description: 'Date YYYY-MM-DD (defaults to today)' },
      },
      required: ['mealCategory', 'foodItems'],
    },
  },
  {
    name: 'correctMealFromFollowup',
    description: 'Updates an existing meal when the user clarifies portions (e.g. 3 rotis instead of 2, adding curd).',
    parameters: {
      type: 'object',
      properties: {
        mealId: { type: 'string', description: 'ID of the meal being corrected' },
        reason: { type: 'string', description: 'Reason for correction' },
        itemUpdates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              foodName: { type: 'string' },
              newWeightGrams: { type: 'number' },
              newQuantity: { type: 'number' },
            },
            required: ['foodName', 'newWeightGrams'],
          },
        },
        itemsToAdd: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              foodName: { type: 'string' },
              weightGrams: { type: 'number' },
            },
            required: ['foodName', 'weightGrams'],
          },
        },
        itemsToRemove: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['mealId', 'reason'],
    },
  },
  {
    name: 'markMealSkipped',
    description: 'Records an explicit skipped meal event (e.g. user reports fasting or skipping dinner).',
    parameters: {
      type: 'object',
      properties: {
        mealCategory: { type: 'string', description: 'breakfast, lunch, dinner, or snack' },
        date: { type: 'string', description: '"yesterday", "today", or YYYY-MM-DD' },
        reason: { type: 'string', description: 'Reason meal was skipped' },
      },
      required: ['mealCategory'],
    },
  },
  {
    name: 'get_active_plan',
    description: 'Gets current active nutritional guidance and movement plan for the user.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'requestPlanAdjustment',
    description: 'Requests a personalized adjustment to the health plan based on actual diary history and obstacles.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Clinical or lifestyle reason (e.g. knee discomfort or breakfast rush)' },
        adaptationLevel: { type: 'number', description: '1 (memory), 2 (small adjustment), or 3 (major review)' },
      },
      required: ['reason'],
    },
  },
  {
    name: 'draft_plan_adjustment',
    description: 'Legacy alias for requestPlanAdjustment.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string' },
        modificationType: { type: 'string' },
      },
      required: ['reason'],
    },
  },
];

export async function executeCoachTool(
  toolName: string,
  args: Record<string, any>,
  context: AgentContext
): Promise<ToolCallResult> {
  const { userId, callId } = context;
  const user = db.getUser(userId) || healthMemoryStore.profiles.get(userId);

  if (!user) {
    return {
      toolName,
      output: null,
      error: `User not found for ID ${userId}`,
    };
  }

  try {
    switch (toolName) {
      case 'get_user_profile': {
        const memory = db.getUserMemory(userId);
        const profile = healthMemoryStore.profiles.get(userId);
        const activeFacts = healthMemoryStore.getActiveProfileFacts(userId);
        const plan = db.getActivePlan(userId);
        return {
          toolName,
          output: {
            name: user.name,
            languagePreference: (user as any).preferredLanguage || (user as any).languagePreference,
            healthGoals: (user as any).healthGoals || [],
            knownConditions: (user as any).knownConditions || [],
            activeFacts: activeFacts.map((f) => ({ key: f.key, value: f.value })),
            memory,
            activePlanTitle: plan?.title || 'None',
          },
        };
      }

      case 'update_user_memory': {
        const { key, value } = args;
        db.updateMemoryFact(userId, key, value, 0.95, callId);
        healthMemoryStore.setProfileFact({
          userId,
          category: 'routine',
          key,
          value,
          confidence: 0.95,
          verificationStatus: 'user_reported',
          sessionId: callId,
        });
        return {
          toolName,
          output: { success: true, message: `Saved ${key} to user memory.` },
        };
      }

      case 'record_daily_checkin': {
        const { mood, energyScore, symptoms } = args;
        db.updateMemoryFact(userId, 'last_checkin_mood', mood, 0.9, callId);
        db.updateMemoryFact(userId, 'last_checkin_energy', energyScore, 0.9, callId);
        if (symptoms) {
          db.updateMemoryFact(userId, 'reported_symptoms', symptoms, 0.95, callId);
        }
        return {
          toolName,
          output: { success: true, message: 'Daily check-in recorded successfully.' },
        };
      }

      case 'getThirtyDayMealHistory': {
        const report = ThirtyDayAnalysisService.getThirtyDayNutritionHistory(userId);
        return {
          toolName,
          output: {
            averageDailyCalories: report.overallNutrition.averageDailyCalories,
            averageDailyProtein: report.overallNutrition.averageDailyProtein,
            coveragePercentage: report.dataReliability.coveragePercentage,
            daysLogged: report.dataReliability.daysWithRecords,
            frequentlyConsumedFoods: report.foodBehaviour.frequentlyConsumedFoods.map((f) => f.name),
            explicitlySkippedCount: report.planAdherence.explicitlySkippedMeals.length,
          },
        };
      }

      case 'getDailyMealHistory': {
        let dateStr = args.date;
        if (dateStr === 'yesterday') {
          dateStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        } else if (dateStr === 'today') {
          dateStr = new Date().toISOString().split('T')[0];
        }
        const meals = healthMemoryStore.getMealsByUser(userId, dateStr);
        return {
          toolName,
          output: {
            date: dateStr,
            mealsCount: meals.length,
            meals: meals.map((m) => ({
              id: m.id,
              category: m.mealCategory,
              description: m.mealDescription,
              calories: m.totalNutrients.calories,
              protein: m.totalNutrients.protein,
              status: m.mealStatus,
              items: m.items?.map((i) => ({ name: i.standardFoodName, grams: i.estimatedWeightGrams })),
            })),
          },
        };
      }

      case 'findMealForFollowup': {
        const { date, mealCategory } = args;
        const meal = MealFollowupService.findMealForFollowup(userId, date, mealCategory);
        if (!meal) {
          return {
            toolName,
            output: { found: false, message: `No recorded ${mealCategory} on ${date}.` },
          };
        }
        return {
          toolName,
          output: {
            found: true,
            mealId: meal.id,
            category: meal.mealCategory,
            description: meal.mealDescription,
            calories: meal.totalNutrients.calories,
            protein: meal.totalNutrients.protein,
            items: meal.items?.map((i) => ({ name: i.standardFoodName, grams: i.estimatedWeightGrams })),
            source: meal.mealSource,
          },
        };
      }

      case 'addMealFromVoice': {
        const { mealCategory, foodItems, date } = args;
        const meal = MealFollowupService.addMealFromVoice({
          userId,
          mealCategory,
          dateStr: date,
          foodItems,
          sessionId: callId,
        });
        return {
          toolName,
          output: {
            success: true,
            mealId: meal.id,
            description: meal.mealDescription,
            calories: meal.totalNutrients.calories,
            protein: meal.totalNutrients.protein,
          },
        };
      }

      case 'correctMealFromFollowup': {
        const { mealId, reason, itemUpdates, itemsToAdd, itemsToRemove } = args;
        const result = healthMemoryStore.applyMealCorrection({
          userId,
          mealId,
          reason,
          source: 'voice_followup',
          sessionId: callId,
          itemUpdates,
          itemsToAdd,
          itemsToRemove,
        });

        if (!result.success) {
          return { toolName, output: { success: false, error: 'Meal not found or unauthorized.' } };
        }

        return {
          toolName,
          output: {
            success: true,
            mealId,
            newCalories: result.updatedMeal?.totalNutrients.calories,
            newProtein: result.updatedMeal?.totalNutrients.protein,
            correctionsApplied: result.correctionEvents.length,
          },
        };
      }

      case 'markMealSkipped': {
        const { mealCategory, date, reason } = args;
        let dateStr = date;
        if (dateStr === 'yesterday') {
          dateStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        } else if (!dateStr || dateStr === 'today') {
          dateStr = new Date().toISOString().split('T')[0];
        }

        const meal = MealFollowupService.markMealSkipped({
          userId,
          mealCategory,
          dateStr,
          reason,
          sessionId: callId,
        });

        return {
          toolName,
          output: {
            success: true,
            message: `Marked ${mealCategory} on ${dateStr} as explicitly skipped.`,
          },
        };
      }

      case 'get_active_plan': {
        const plan = db.getActivePlan(userId);
        if (!plan) {
          return { toolName, output: { hasActivePlan: false, message: 'No active plan found.' } };
        }
        return {
          toolName,
          output: {
            hasActivePlan: true,
            title: plan.title,
            overview: plan.overview,
            dailyCalories: plan.dailyCalories,
            items: plan.items.map((i) => ({ name: i.name, timing: i.timing, category: i.category })),
            safetyConstraints: plan.safetyConstraints,
          },
        };
      }

      case 'requestPlanAdjustment':
      case 'draft_plan_adjustment': {
        const { reason, adaptationLevel } = args;
        const result = await PlanGenerationService.generatePersonalizedPlanDraft({
          userId,
          requestedLevel: (adaptationLevel as any) || 2,
          triggerReason: reason,
        });

        return {
          toolName,
          output: {
            success: result.success,
            draftPlanId: result.draftPlan?.id,
            title: result.draftPlan?.title,
            reasons: result.reasons.map((r) => r.justification),
            safetyConstraints: result.draftPlan?.safetyConstraints,
            requiresUserApproval: result.requiresUserApproval,
            message: 'Draft plan generated and grounded in user 30-day diary. Awaiting confirmation.',
          },
        };
      }

      default:
        return {
          toolName,
          output: null,
          error: `Unknown tool: ${toolName}`,
        };
    }
  } catch (err: any) {
    return {
      toolName,
      output: null,
      error: err.message || 'Error executing tool',
    };
  }
}
