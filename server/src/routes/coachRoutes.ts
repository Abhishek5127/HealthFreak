import { Router, Request, Response } from 'express';
import { verifyCoachSignature, AuthenticatedCoachRequest } from '../middleware/coachAuthMiddleware.js';
import { MealStore } from '../db/mealStore.js';
import { healthMemoryStore, HealthMemoryStore } from '../db/healthMemoryStore.js';
import { MealNutritionService } from '../services/nutritionDatabase.js';
import { MealFollowupService } from '../nutrition/mealFollowupService.js';
import { SupabaseDb } from '../db/supabaseClient.js';
import { HealthSnapshotService } from '../services/healthSnapshotService.js';
import { DailyActivityEntity } from '../types/healthMemory.js';

export const coachRouter = Router();

coachRouter.use(verifyCoachSignature as any);

/**
 * POST /api/coach/log-meal
 * Real DB write for coach agent function tool
 */
coachRouter.post('/log-meal', async (req: Request, res: Response): Promise<void> => {
  try {
    const coachReq = req as AuthenticatedCoachRequest;
    const userId = coachReq.coachUserId!;
    const { food_name, quantity, meal_type = 'snack' } = req.body;

    if (!food_name) {
      res.status(400).json({ success: false, error: 'food_name is required' });
      return;
    }

    // Estimate portion in grams
    let estimatedGrams = 100;
    const qtyLower = (quantity || '').toLowerCase();
    const numMatch = qtyLower.match(/(\d+(\.\d+)?)/);
    const count = numMatch ? parseFloat(numMatch[1]) : 1;

    if (qtyLower.includes('roti') || qtyLower.includes('chapati')) {
      estimatedGrams = Math.round(count * 40);
    } else if (qtyLower.includes('katori') || qtyLower.includes('bowl')) {
      estimatedGrams = Math.round(count * 150);
    } else if (qtyLower.includes('glass') || qtyLower.includes('cup')) {
      estimatedGrams = Math.round(count * 200);
    } else if (qtyLower.includes('gram') || qtyLower.includes('g')) {
      estimatedGrams = Math.round(count);
    } else if (count > 1) {
      estimatedGrams = Math.round(count * 80);
    }

    const nutrition = MealNutritionService.calculateItemNutrition(food_name, estimatedGrams);
    const mealId = `meal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const timestamp = new Date().toISOString();
    const localDate = timestamp.split('T')[0];

    // 1. Save to MealStore (for client /api/meals routes)
    const mealData: any = {
      id: mealId,
      userId,
      timestamp,
      mealName: food_name,
      mealType: meal_type,
      foods: [
        {
          id: `food_${Date.now()}`,
          name: food_name,
          localizedName: food_name,
          estimatedWeightGrams: estimatedGrams,
          servingDescription: quantity || `${estimatedGrams}g`,
          confidence: 0.95,
          nutrition,
        },
      ],
      totalNutrition: {
        calories: nutrition.calories,
        proteinGrams: nutrition.protein,
        carbsGrams: nutrition.carbs,
        fatGrams: nutrition.fat,
        fiberGrams: nutrition.fiber,
        sodiumMg: nutrition.sodium,
        potassiumMg: nutrition.potassium,
      },
      coachInsight: 'Logged via voice coach call.',
      status: 'saved',
    };
    const savedMeal = MealStore.getInstance().saveMeal(mealData);

    // 2. Save into HealthMemoryStore 50-entity model
    MealFollowupService.addMealFromVoice({
      userId,
      mealCategory: (meal_type === 'breakfast' || meal_type === 'lunch' || meal_type === 'dinner') ? meal_type : 'snack',
      dateStr: localDate,
      foodItems: [{ name: food_name, estimatedWeightGrams: estimatedGrams }],
      notes: `Logged by Coach during call ${coachReq.coachCallId}`,
      sessionId: coachReq.coachCallId,
    });

    res.json({
      success: true,
      message: `Saved ${quantity || ''} ${food_name} to ${meal_type}`,
      meal: savedMeal,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to log meal' });
  }
});

/**
 * POST /api/coach/log-workout
 * Real DB write for coach agent function tool
 */
coachRouter.post('/log-workout', async (req: Request, res: Response): Promise<void> => {
  try {
    const coachReq = req as AuthenticatedCoachRequest;
    const userId = coachReq.coachUserId!;
    const { exercise_name, duration_minutes } = req.body;

    const duration = parseInt(duration_minutes, 10);
    if (!exercise_name || isNaN(duration) || duration <= 0) {
      res.status(400).json({ success: false, error: 'exercise_name and positive duration_minutes are required' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const key = `${userId}_${today}`;
    const memoryStore = HealthMemoryStore.getInstance();
    const existing = memoryStore.dailyActivities.get(key);

    const safeSteps = existing?.steps || 0;
    const stepGoal = existing?.stepGoal || 10000;
    const addedMinutes = duration;
    const activeMinutes = (existing?.activeMinutes || 0) + addedMinutes;
    const addedCalories = Math.round(duration * 7);
    const caloriesBurned = (existing?.caloriesBurned || 0) + addedCalories;

    const activityEntity: DailyActivityEntity = {
      id: existing?.id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      activityDate: today,
      steps: safeSteps,
      stepGoal,
      distanceMeters: existing?.distanceMeters || Math.round(safeSteps * 0.74),
      activeMinutes,
      caloriesBurned,
      waterIntakeMl: existing?.waterIntakeMl || 0,
      waterTargetMl: existing?.waterTargetMl || 3000,
      source: 'coach_call',
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryStore.dailyActivities.set(key, activityEntity);

    // Sync to PostgreSQL / Supabase
    if (SupabaseDb.isConfigured()) {
      try {
        const client = SupabaseDb.getClient();
        await client.from('daily_activity').upsert(
          {
            user_id: userId,
            activity_date: today,
            steps: safeSteps,
            step_goal: stepGoal,
            distance_meters: activityEntity.distanceMeters,
            active_minutes: activeMinutes,
            calories_burned: caloriesBurned,
            water_intake_ml: activityEntity.waterIntakeMl,
            water_target_ml: activityEntity.waterTargetMl,
            source: 'coach_call',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,activity_date' }
        );
      } catch {}
    }

    // Sync snapshot
    await HealthSnapshotService.syncDailySnapshot(userId, {
      local_date: today,
      steps: safeSteps,
      step_goal: stepGoal,
      calories_in: 0,
      calorie_target: 2000,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      water_ml: activityEntity.waterIntakeMl ?? 0,
      workouts_done: 1,
      plan_day_completed: true,
      source: 'coach_call',
    });

    res.json({
      success: true,
      message: `Logged ${duration} mins of ${exercise_name}`,
      workout: {
        exerciseName: exercise_name,
        durationMinutes: duration,
        caloriesBurned: addedCalories,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to log workout' });
  }
});
