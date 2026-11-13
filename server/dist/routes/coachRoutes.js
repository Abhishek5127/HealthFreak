"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.coachRouter = void 0;
const express_1 = require("express");
const coachAuthMiddleware_js_1 = require("../middleware/coachAuthMiddleware.js");
const mealStore_js_1 = require("../db/mealStore.js");
const healthMemoryStore_js_1 = require("../db/healthMemoryStore.js");
const nutritionDatabase_js_1 = require("../services/nutritionDatabase.js");
const mealFollowupService_js_1 = require("../nutrition/mealFollowupService.js");
const supabaseClient_js_1 = require("../db/supabaseClient.js");
const healthSnapshotService_js_1 = require("../services/healthSnapshotService.js");
const index_js_1 = require("../db/index.js");
const healthMemoryEngine_js_1 = require("../services/healthMemoryEngine.js");
const postCallExtraction_js_1 = require("../coach/postCallExtraction.js");
const exerciseCatalog_js_1 = require("../coach/exerciseCatalog.js");
const planGenerationService_js_1 = require("../plans/planGenerationService.js");
const purgeService_js_1 = require("../coach/memory/purgeService.js");
const pendingOpsManager_js_1 = require("../coach/memory/pendingOpsManager.js");
exports.coachRouter = (0, express_1.Router)();
exports.coachRouter.use(coachAuthMiddleware_js_1.verifyCoachSignature);
/**
 * POST /api/coach/log-meal
 * Real DB write for coach agent function tool
 */
exports.coachRouter.post('/log-meal', async (req, res) => {
    try {
        const coachReq = req;
        const userId = coachReq.coachUserId;
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
        }
        else if (qtyLower.includes('katori') || qtyLower.includes('bowl')) {
            estimatedGrams = Math.round(count * 150);
        }
        else if (qtyLower.includes('glass') || qtyLower.includes('cup')) {
            estimatedGrams = Math.round(count * 200);
        }
        else if (qtyLower.includes('gram') || qtyLower.includes('g')) {
            estimatedGrams = Math.round(count);
        }
        else if (count > 1) {
            estimatedGrams = Math.round(count * 80);
        }
        const nutrition = nutritionDatabase_js_1.MealNutritionService.calculateItemNutrition(food_name, estimatedGrams);
        const mealId = `meal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const timestamp = new Date().toISOString();
        const localDate = timestamp.split('T')[0];
        // 1. Save to MealStore (for client /api/meals routes)
        const mealData = {
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
        const savedMeal = mealStore_js_1.MealStore.getInstance().saveMeal(mealData);
        // 2. Save into HealthMemoryStore 50-entity model
        mealFollowupService_js_1.MealFollowupService.addMealFromVoice({
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
    }
    catch (err) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to log meal' });
    }
});
/**
 * POST /api/coach/log-workout
 * Real DB write for coach agent function tool
 */
exports.coachRouter.post('/log-workout', async (req, res) => {
    try {
        const coachReq = req;
        const userId = coachReq.coachUserId;
        const { exercise_name, duration_minutes } = req.body;
        const duration = parseInt(duration_minutes, 10);
        if (!exercise_name || isNaN(duration) || duration <= 0) {
            res.status(400).json({ success: false, error: 'exercise_name and positive duration_minutes are required' });
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        const key = `${userId}_${today}`;
        const memoryStore = healthMemoryStore_js_1.HealthMemoryStore.getInstance();
        const existing = memoryStore.dailyActivities.get(key);
        const safeSteps = existing?.steps || 0;
        const stepGoal = existing?.stepGoal || 10000;
        const addedMinutes = duration;
        const activeMinutes = (existing?.activeMinutes || 0) + addedMinutes;
        const addedCalories = Math.round(duration * 7);
        const caloriesBurned = (existing?.caloriesBurned || 0) + addedCalories;
        const activityEntity = {
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
        if (supabaseClient_js_1.SupabaseDb.isConfigured()) {
            try {
                const client = supabaseClient_js_1.SupabaseDb.getClient();
                await client.from('daily_activity').upsert({
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
                }, { onConflict: 'user_id,activity_date' });
            }
            catch { }
        }
        // Sync snapshot
        await healthSnapshotService_js_1.HealthSnapshotService.syncDailySnapshot(userId, {
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
    }
    catch (err) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to log workout' });
    }
});
/**
 * POST /api/coach/resolve-issue
 * Permanently purges a resolved issue only after explicit user confirmation.
 */
exports.coachRouter.post('/resolve-issue', async (req, res) => {
    try {
        const coachReq = req;
        const userId = coachReq.coachUserId;
        const { issue_id, confirmed_by_user, user_response } = req.body;
        if (!issue_id) {
            res.status(400).json({ success: false, error: 'issue_id is required' });
            return;
        }
        if (confirmed_by_user !== true) {
            res.status(400).json({
                success: false,
                error: 'Explicit user confirmation required (confirmed_by_user must be true)',
            });
            return;
        }
        // Code verification (Rule E2): Check actual user response
        if (user_response) {
            const classification = pendingOpsManager_js_1.PendingOpsManager.classifyConfirmation(String(user_response), 'resolve_issue');
            if (classification !== 'yes') {
                res.status(400).json({
                    success: false,
                    error: `User confirmation verification failed: supplied user response classified as '${classification}'`,
                });
                return;
            }
        }
        else if (coachReq.coachCallId) {
            const pool = supabaseClient_js_1.SupabaseDb.getPool();
            if (pool) {
                try {
                    const turnsRes = await pool.query(`SELECT role, text FROM call_transcript_turns WHERE call_id = $1 ORDER BY turn_index DESC LIMIT 5`, [coachReq.coachCallId]);
                    const userTurn = turnsRes.rows.find((r) => r.role === 'user');
                    if (userTurn) {
                        const classification = pendingOpsManager_js_1.PendingOpsManager.classifyConfirmation(userTurn.text, 'resolve_issue');
                        if (classification !== 'yes') {
                            res.status(400).json({
                                success: false,
                                error: `User confirmation verification failed: session history user turn classified as '${classification}'`,
                            });
                            return;
                        }
                    }
                }
                catch { }
            }
        }
        const cleanId = String(issue_id).replace(/^\[id:/i, '').replace(/\]$/, '').trim();
        const purgeResult = await purgeService_js_1.MemoryPurgeService.purgeResolvedIssue(userId, cleanId);
        res.json({ success: true, purged: purgeResult });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to resolve issue' });
    }
});
/**
 * POST /api/coach/record-issue
 * Records a new temporary issue after explicit 1-sentence confirmation.
 */
exports.coachRouter.post('/record-issue', async (req, res) => {
    try {
        const coachReq = req;
        const userId = coachReq.coachUserId;
        const { title, category = 'pain', severity = 'mild', confirmed_by_user, user_response } = req.body;
        if (!title) {
            res.status(400).json({ success: false, error: 'title is required' });
            return;
        }
        if (confirmed_by_user !== true) {
            res.status(400).json({
                success: false,
                error: 'Explicit user confirmation required (confirmed_by_user must be true)',
            });
            return;
        }
        // Code verification (Rule E2): Check actual user response
        if (user_response) {
            const classification = pendingOpsManager_js_1.PendingOpsManager.classifyConfirmation(String(user_response), 'add_issue');
            if (classification !== 'yes') {
                res.status(400).json({
                    success: false,
                    error: `User confirmation verification failed: supplied user response classified as '${classification}'`,
                });
                return;
            }
        }
        else if (coachReq.coachCallId) {
            const pool = supabaseClient_js_1.SupabaseDb.getPool();
            if (pool) {
                try {
                    const turnsRes = await pool.query(`SELECT role, text FROM call_transcript_turns WHERE call_id = $1 ORDER BY turn_index DESC LIMIT 5`, [coachReq.coachCallId]);
                    const userTurn = turnsRes.rows.find((r) => r.role === 'user');
                    if (userTurn) {
                        const classification = pendingOpsManager_js_1.PendingOpsManager.classifyConfirmation(userTurn.text, 'add_issue');
                        if (classification !== 'yes') {
                            res.status(400).json({
                                success: false,
                                error: `User confirmation verification failed: session history user turn classified as '${classification}'`,
                            });
                            return;
                        }
                    }
                }
                catch { }
            }
        }
        const pool = supabaseClient_js_1.SupabaseDb.getPool();
        if (pool) {
            // Dedupe against open issues
            const existing = await pool.query(`SELECT id, mention_count FROM user_issues
         WHERE user_id = $1 AND title ILIKE $2 AND status IN ('open', 'improving')`, [userId, title]);
            if (existing.rows.length > 0) {
                await pool.query(`UPDATE user_issues
           SET mention_count = mention_count + 1, last_mentioned_at = NOW()
           WHERE id = $1`, [existing.rows[0].id]);
                res.json({ success: true, action: 'incremented_existing', issueId: existing.rows[0].id });
                return;
            }
            const insertRes = await pool.query(`INSERT INTO user_issues (user_id, title, category, severity, status, first_reported_at, last_mentioned_at, mention_count)
         VALUES ($1, $2, $3, $4, 'open', NOW(), NOW(), 1)
         RETURNING *;`, [userId, title, category, severity]);
            res.json({ success: true, action: 'inserted_new', issue: insertRes.rows[0] });
            return;
        }
        res.json({ success: true, action: 'mock_saved' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to record issue' });
    }
});
/**
 * POST /api/coach/update-issue
 * Updates issue status (open, improving, resolved)
 */
exports.coachRouter.post('/update-issue', async (req, res) => {
    try {
        const coachReq = req;
        const userId = coachReq.coachUserId;
        const { issue_ref, status, note } = req.body;
        if (!issue_ref || !status) {
            res.status(400).json({ success: false, error: 'issue_ref and status are required' });
            return;
        }
        if (!['open', 'improving', 'resolved'].includes(status)) {
            res.status(400).json({ success: false, error: 'status must be open, improving, or resolved' });
            return;
        }
        const updated = await healthMemoryEngine_js_1.HealthMemoryEngine.updateIssueStatus(userId, issue_ref, status, note);
        if (!updated) {
            res.status(404).json({ success: false, error: `Issue "${issue_ref}" not found for user` });
            return;
        }
        res.json({ success: true, issue: updated });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to update issue' });
    }
});
/**
 * POST /api/coach/suggest-workout
 * Returns filtered exercises from the catalog safe for user's open issues & conditions
 */
exports.coachRouter.post('/suggest-workout', async (req, res) => {
    try {
        const coachReq = req;
        const userId = coachReq.coachUserId;
        const { body_part = 'full_body', duration_minutes = 20, level = 'beginner' } = req.body;
        const pool = supabaseClient_js_1.SupabaseDb.getPool();
        let openIssues = [];
        let conditions = [];
        if (pool) {
            try {
                const issuesRes = await pool.query(`SELECT title, category FROM user_issues WHERE user_id = $1 AND status IN ('open', 'improving');`, [userId]);
                openIssues = issuesRes.rows;
                const profRes = await pool.query(`SELECT known_conditions FROM profiles WHERE id = $1 LIMIT 1;`, [userId]);
                if (profRes.rows[0]?.known_conditions && Array.isArray(profRes.rows[0].known_conditions)) {
                    conditions = profRes.rows[0].known_conditions;
                }
            }
            catch (err) {
                console.warn('[CoachRoutes/suggest-workout] DB query warning:', err.message);
            }
        }
        const exercises = (0, exerciseCatalog_js_1.getSuggestedExercises)({
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
    }
    catch (err) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to suggest workout' });
    }
});
/**
 * POST /api/coach/create-plan-draft
 * Calls existing plan draft service behind /api/plans/generate-draft
 */
exports.coachRouter.post('/create-plan-draft', async (req, res) => {
    try {
        const coachReq = req;
        const userId = coachReq.coachUserId;
        const { requestedLevel = 2, reason = 'Voice coach generated draft routine' } = req.body;
        const result = await planGenerationService_js_1.PlanGenerationService.generatePersonalizedPlanDraft({
            userId,
            requestedLevel,
            triggerReason: reason,
        });
        res.json({
            success: true,
            message: 'draft saved, approve it in the app',
            draft: result,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to generate plan draft' });
    }
});
/**
 * POST /api/coach/transcript-turn
 * Persist an individual dialogue turn idempotently
 */
exports.coachRouter.post('/transcript-turn', async (req, res) => {
    try {
        const coachReq = req;
        const callId = coachReq.coachCallId;
        const userId = coachReq.coachUserId;
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
        const turn = await (0, postCallExtraction_js_1.saveTranscriptTurn)(callId, userId, turn_index, role, String(text));
        res.json({
            success: true,
            call_id: callId,
            turn_index: turn.turnIndex,
            turn,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to save transcript turn' });
    }
});
/**
 * POST /api/coach/call-ended
 * Finalize call and trigger post-call extraction pipeline
 */
exports.coachRouter.post('/call-ended', async (req, res) => {
    try {
        const coachReq = req;
        const callId = coachReq.coachCallId;
        const userId = coachReq.coachUserId;
        const { duration_s, reason } = req.body;
        // Update in-memory call status
        index_js_1.db.updateCallSession(callId, {
            status: 'completed',
            endedAt: new Date().toISOString(),
        });
        try {
            const pool = supabaseClient_js_1.SupabaseDb.getPool();
            if (pool) {
                await pool.query(`UPDATE calls
           SET status = 'completed', ended_at = NOW()
           WHERE id = $1`, [callId]);
            }
        }
        catch { }
        // Run post-call extraction
        const { job, result } = await (0, postCallExtraction_js_1.processCallExtraction)(callId, userId);
        res.json({
            success: true,
            call_id: callId,
            status: job.status,
            job,
            extracted: result,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to process post-call extraction' });
    }
});
/**
 * GET /api/coach/transcript-turns
 * Read all dialogue turns for a call in order
 */
exports.coachRouter.get('/transcript-turns', async (req, res) => {
    try {
        const coachReq = req;
        const callId = coachReq.coachCallId;
        const turns = await (0, postCallExtraction_js_1.getCallTranscriptTurns)(callId);
        res.json({ success: true, call_id: callId, turns });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to get turns' });
    }
});
/**
 * GET /api/coach/extraction-job
 * Read extraction job state for a call
 */
exports.coachRouter.get('/extraction-job', async (req, res) => {
    try {
        const coachReq = req;
        const callId = coachReq.coachCallId;
        const job = await (0, postCallExtraction_js_1.getCallExtractionJob)(callId);
        res.json({ success: true, call_id: callId, job });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to get extraction job' });
    }
});
