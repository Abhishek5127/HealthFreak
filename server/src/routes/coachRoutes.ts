import { Router, Request, Response } from 'express';
import { verifyCoachSignature, AuthenticatedCoachRequest } from '../middleware/coachAuthMiddleware.js';
import { MealStore } from '../db/mealStore.js';
import { healthMemoryStore, HealthMemoryStore } from '../db/healthMemoryStore.js';
import { MealNutritionService } from '../services/nutritionDatabase.js';
import { MealFollowupService } from '../nutrition/mealFollowupService.js';
import { SupabaseDb } from '../db/supabaseClient.js';
import { HealthSnapshotService } from '../services/healthSnapshotService.js';
import { DailyActivityEntity } from '../types/healthMemory.js';
import { db } from '../db/index.js';
import { HealthMemoryEngine } from '../services/healthMemoryEngine.js';
import {
  saveTranscriptTurn,
  getCallTranscriptTurns,
  processCallExtraction,
  getCallExtractionJob,
} from '../coach/postCallExtraction.js';
import { getSuggestedExercises } from '../coach/exerciseCatalog.js';
import { PlanGenerationService } from '../plans/planGenerationService.js';

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

/**
 * POST /api/coach/update-issue
 * Updates issue status (open, improving, resolved)
 */
coachRouter.post('/update-issue', async (req: Request, res: Response): Promise<void> => {
  try {
    const coachReq = req as AuthenticatedCoachRequest;
    const userId = coachReq.coachUserId!;
    const { issue_ref, status, note } = req.body;

    if (!issue_ref || !status) {
      res.status(400).json({ success: false, error: 'issue_ref and status are required' });
      return;
    }

    if (!['open', 'improving', 'resolved'].includes(status)) {
      res.status(400).json({ success: false, error: 'status must be open, improving, or resolved' });
      return;
    }

    const updated = await HealthMemoryEngine.updateIssueStatus(userId, issue_ref, status, note);
    if (!updated) {
      res.status(404).json({ success: false, error: `Issue "${issue_ref}" not found for user` });
      return;
    }

    res.json({ success: true, issue: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to update issue' });
  }
});

/**
 * POST /api/coach/suggest-workout
 * Returns filtered exercises from the catalog safe for user's open issues & conditions
 */
coachRouter.post('/suggest-workout', async (req: Request, res: Response): Promise<void> => {
  try {
    const coachReq = req as AuthenticatedCoachRequest;
    const userId = coachReq.coachUserId!;
    const { body_part = 'full_body', duration_minutes = 20, level = 'beginner' } = req.body;

    const pool = SupabaseDb.getPool();
    let openIssues: Array<{ title: string; category?: string }> = [];
    let conditions: string[] = [];

    if (pool) {
      try {
        const issuesRes = await pool.query(
          `SELECT title, category FROM user_issues WHERE user_id = $1 AND status IN ('open', 'improving');`,
          [userId]
        );
        openIssues = issuesRes.rows;

        const profRes = await pool.query(
          `SELECT known_conditions FROM profiles WHERE id = $1 LIMIT 1;`,
          [userId]
        );
        if (profRes.rows[0]?.known_conditions && Array.isArray(profRes.rows[0].known_conditions)) {
          conditions = profRes.rows[0].known_conditions;
        }
      } catch (err: any) {
        console.warn('[CoachRoutes/suggest-workout] DB query warning:', err.message);
      }
    }

    const exercises = getSuggestedExercises({
      body_part: String(body_part),
      userIssues: openIssues,
      conditions,
      limit: 4,
    });

    res.json({
      success: true,
      body_part,
      duration_minutes,
      level,
      exercises,
      filtered_against_issues: openIssues.map(i => i.title),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to suggest workout' });
  }
});

/**
 * POST /api/coach/create-plan-draft
 * Calls existing plan draft service behind /api/plans/generate-draft
 */
coachRouter.post('/create-plan-draft', async (req: Request, res: Response): Promise<void> => {
  try {
    const coachReq = req as AuthenticatedCoachRequest;
    const userId = coachReq.coachUserId!;
    const { requestedLevel = 2, reason = 'Voice coach generated draft routine' } = req.body;

    const result = await PlanGenerationService.generatePersonalizedPlanDraft({
      userId,
      requestedLevel,
      triggerReason: reason,
    });

    res.json({
      success: true,
      message: 'draft saved, approve it in the app',
      draft: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to generate plan draft' });
  }
});

/**
 * POST /api/coach/transcript-turn
 * Persist an individual dialogue turn idempotently
 */
coachRouter.post('/transcript-turn', async (req: Request, res: Response): Promise<void> => {
  try {
    const coachReq = req as AuthenticatedCoachRequest;
    const callId = coachReq.coachCallId!;
    const userId = coachReq.coachUserId!;
    const { turn_index, role, text } = req.body;

    if (typeof turn_index !== 'number' || !role || !text) {
      res.status(400).json({
        success: false,
        error: 'turn_index (number), role (user|agent), and text (string) are required',
      });
      return;
    }

    if (role !== 'user' && role !== 'agent') {
      res.status(400).json({
        success: false,
        error: "role must be 'user' or 'agent'",
      });
      return;
    }

    const turn = await saveTranscriptTurn(callId, userId, turn_index, role, String(text));
    res.json({
      success: true,
      call_id: callId,
      turn_index: turn.turnIndex,
      turn,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to save transcript turn' });
  }
});

/**
 * POST /api/coach/call-ended
 * Finalize call and trigger post-call extraction pipeline
 */
coachRouter.post('/call-ended', async (req: Request, res: Response): Promise<void> => {
  try {
    const coachReq = req as AuthenticatedCoachRequest;
    const callId = coachReq.coachCallId!;
    const userId = coachReq.coachUserId!;
    const { duration_s, reason } = req.body;

    // Update in-memory call status
    db.updateCallSession(callId, {
      status: 'completed',
      endedAt: new Date().toISOString(),
    });

    try {
      const pool = SupabaseDb.getPool();
      if (pool) {
        await pool.query(
          `UPDATE calls
           SET status = 'completed', ended_at = NOW()
           WHERE id = $1`,
          [callId]
        );
      }
    } catch {}

    // Run post-call extraction
    const { job, result } = await processCallExtraction(callId, userId);

    res.json({
      success: true,
      call_id: callId,
      status: job.status,
      job,
      extracted: result,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to process post-call extraction' });
  }
});

/**
 * GET /api/coach/transcript-turns
 * Read all dialogue turns for a call in order
 */
coachRouter.get('/transcript-turns', async (req: Request, res: Response): Promise<void> => {
  try {
    const coachReq = req as AuthenticatedCoachRequest;
    const callId = coachReq.coachCallId!;
    const turns = await getCallTranscriptTurns(callId);
    res.json({ success: true, call_id: callId, turns });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get turns' });
  }
});

/**
 * GET /api/coach/extraction-job
 * Read extraction job state for a call
 */
coachRouter.get('/extraction-job', async (req: Request, res: Response): Promise<void> => {
  try {
    const coachReq = req as AuthenticatedCoachRequest;
    const callId = coachReq.coachCallId!;
    const job = await getCallExtractionJob(callId);
    res.json({ success: true, call_id: callId, job });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to get extraction job' });
  }
});

