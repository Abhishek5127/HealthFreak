"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mealRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const geminiVisionService_js_1 = require("../services/geminiVisionService.js");
const mealStore_js_1 = require("../db/mealStore.js");
const healthMemoryStore_js_1 = require("../db/healthMemoryStore.js");
const nutritionDatabase_js_1 = require("../services/nutritionDatabase.js");
const mealFollowupService_js_1 = require("../nutrition/mealFollowupService.js");
exports.mealRouter = (0, express_1.Router)();
// Multer in-memory storage config (max 10MB) - Transient memory only, NEVER stored to disk
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files (JPEG, PNG, WebP) are allowed!'));
        }
    },
});
const mealStore = mealStore_js_1.MealStore.getInstance();
/**
 * POST /api/meals/analyze
 * STRICT ZERO IMAGE RETENTION: Buffer is analyzed transiently and cleared immediately.
 */
exports.mealRouter.post('/analyze', upload.single('image'), async (req, res) => {
    let imageBuffer = null;
    let mimeType = 'image/jpeg';
    try {
        if (req.file) {
            imageBuffer = req.file.buffer;
            mimeType = req.file.mimetype;
        }
        else if (req.body?.imageBase64) {
            const cleanedBase64 = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
            imageBuffer = Buffer.from(cleanedBase64, 'base64');
            if (req.body.mimeType) {
                mimeType = req.body.mimeType;
            }
        }
        if (!imageBuffer) {
            res.status(400).json({
                success: false,
                error: 'No image provided. Please upload an image file or base64 data.',
            });
            return;
        }
        const userName = req.body?.userName || 'Alex';
        const userNote = req.body?.userNote || undefined;
        const healthGoals = req.body?.healthGoals
            ? Array.isArray(req.body.healthGoals)
                ? req.body.healthGoals
                : [req.body.healthGoals]
            : ['Weight management', 'Cardiovascular endurance'];
        console.log(`[Meal API] Starting meal analysis for ${userName} (${imageBuffer.length} bytes)${userNote ? ` with note: "${userNote}"` : ''}...`);
        const mealResult = await geminiVisionService_js_1.GeminiMealVisionProvider.analyzeMealImage(imageBuffer, mimeType, {
            name: userName,
            healthGoals,
            userNote,
        });
        // STRICT ZERO-IMAGE RETENTION: Purge ephemeral imageUri / base64
        delete mealResult.imageUri;
        delete mealResult.imageBase64;
        // Save draft for user verification
        mealStore.saveDraft(mealResult);
        res.json({
            success: true,
            meal: mealResult,
        });
    }
    catch (err) {
        console.error('[Meal API] Error analyzing meal:', err);
        res.status(500).json({
            success: false,
            error: err?.message || 'Failed to analyze meal image',
        });
    }
    finally {
        // Immediately garbage-collect temporary image buffer
        imageBuffer = null;
    }
});
/**
 * POST /api/meals
 * Save a confirmed meal to the 30-day diary and update user's daily totals
 * STRICT ZERO-IMAGE RETENTION: Strip any image parameters before persisting!
 */
exports.mealRouter.post('/', (req, res) => {
    try {
        const mealData = req.body;
        if (!mealData || !mealData.id || !mealData.foods) {
            res.status(400).json({
                success: false,
                error: 'Invalid meal data. ID and foods list are required.',
            });
            return;
        }
        // Strip any possible image properties
        delete mealData.imageUri;
        delete mealData.imageBase64;
        delete mealData.imageBuffer;
        const savedMeal = mealStore.saveMeal(mealData);
        // Sync into HealthMemoryStore 50-entity model
        const localDate = (savedMeal.timestamp || new Date().toISOString()).split('T')[0];
        const memoryMealItems = (savedMeal.foods || []).map((f, idx) => ({
            id: f.id || `item_${savedMeal.id}_${idx + 1}`,
            mealId: savedMeal.id,
            userId: savedMeal.userId,
            standardFoodName: f.name,
            localizedFoodName: f.localizedName,
            foodCategory: 'general',
            estimatedQuantity: 1,
            servingUnit: f.servingDescription || 'portion',
            servingCount: 1,
            estimatedWeightGrams: f.estimatedWeightGrams,
            minEstimatedWeightGrams: Math.round(f.estimatedWeightGrams * 0.8),
            mostLikelyEstimatedWeightGrams: f.estimatedWeightGrams,
            maxEstimatedWeightGrams: Math.round(f.estimatedWeightGrams * 1.2),
            portionSource: 'user_confirmed',
            portionConfidence: 0.95,
            recognitionConfidence: f.confidence || 0.95,
            ingredients: (f.visibleIngredients || []).map((vi) => ({ name: vi, isInferred: false })),
            cookingMethod: f.cookingMethod,
            nutrients: {
                calories: f.nutrition.calories,
                protein: f.nutrition.protein,
                carbohydrates: f.nutrition.carbs,
                dietaryFiber: f.nutrition.fiber,
                totalFat: f.nutrition.fat,
                sodiumMg: f.nutrition.sodium,
                potassiumMg: f.nutrition.potassium,
            },
            nutrientSource: 'IFCT_2017',
            nutrientReferenceVersion: '1.0',
            source: 'camera_scan',
            confirmationStatus: 'user_confirmed',
        }));
        const memoryMeal = {
            id: savedMeal.id,
            userId: savedMeal.userId,
            consumptionDate: localDate,
            consumptionTimestamp: savedMeal.timestamp || new Date().toISOString(),
            localTimezone: 'Asia/Kolkata',
            mealCategory: savedMeal.mealType,
            mealSource: 'camera_scan',
            mealStatus: 'confirmed',
            mealDescription: savedMeal.mealName,
            overallAnalysisConfidence: savedMeal.recognitionConfidence || 0.95,
            userConfirmationStatus: 'user_confirmed',
            items: memoryMealItems,
            totalNutrients: {
                calories: savedMeal.totalNutrition.calories,
                protein: savedMeal.totalNutrition.proteinGrams,
                carbohydrates: savedMeal.totalNutrition.carbsGrams,
                dietaryFiber: savedMeal.totalNutrition.fiberGrams,
                totalFat: savedMeal.totalNutrition.fatGrams,
                sodiumMg: savedMeal.totalNutrition.sodiumMg,
                potassiumMg: savedMeal.totalNutrition.potassiumMg,
            },
            coachInsight: savedMeal.coachInsight,
            createdAt: savedMeal.timestamp || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        healthMemoryStore_js_1.healthMemoryStore.saveMeal(memoryMeal);
        const dailySummary = mealStore.getDailySummary(savedMeal.userId);
        console.log(`[Meal API] Meal "${savedMeal.mealName}" saved. Today total: ${dailySummary.caloriesTotal} kcal`);
        res.json({
            success: true,
            meal: savedMeal,
            dailySummary,
        });
    }
    catch (err) {
        console.error('[Meal API] Error saving meal:', err);
        res.status(500).json({
            success: false,
            error: err?.message || 'Failed to save meal',
        });
    }
});
/**
 * GET /api/meals
 * List meals for user and optional date
 */
exports.mealRouter.get('/', (req, res) => {
    try {
        const userId = req.query.userId || req.headers['x-user-id'] || 'usr_synthetic_alex';
        const date = req.query.date;
        const meals = mealStore.getMealsByUser(userId, date);
        res.json({
            success: true,
            meals,
        });
    }
    catch (err) {
        console.error('[Meal API] Error fetching meals:', err);
        res.status(500).json({
            success: false,
            error: err?.message || 'Failed to fetch meals',
        });
    }
});
/**
 * GET /api/meals/daily-summary
 * Get today's nutritional summary vs target
 */
exports.mealRouter.get('/daily-summary', (req, res) => {
    try {
        const userId = req.query.userId || req.headers['x-user-id'] || 'usr_synthetic_alex';
        const date = req.query.date;
        const summary = mealStore.getDailySummary(userId, date);
        res.json({
            success: true,
            summary,
        });
    }
    catch (err) {
        console.error('[Meal API] Error fetching daily summary:', err);
        res.status(500).json({
            success: false,
            error: err?.message || 'Failed to fetch daily summary',
        });
    }
});
/**
 * PATCH /api/meals/:mealId
 * Update portion weights or food items in a meal
 */
exports.mealRouter.patch('/:mealId', (req, res) => {
    try {
        const { mealId } = req.params;
        const updates = req.body;
        const updated = mealStore.updateMeal(mealId, updates);
        if (!updated) {
            res.status(404).json({
                success: false,
                error: `Meal ${mealId} not found`,
            });
            return;
        }
        const dailySummary = mealStore.getDailySummary(updated.userId);
        res.json({
            success: true,
            meal: updated,
            dailySummary,
        });
    }
    catch (err) {
        console.error('[Meal API] Error updating meal:', err);
        res.status(500).json({
            success: false,
            error: err?.message || 'Failed to update meal',
        });
    }
});
/**
 * DELETE /api/meals/:mealId
 * Remove a meal and update daily summary
 */
exports.mealRouter.delete('/:mealId', (req, res) => {
    try {
        const { mealId } = req.params;
        const userId = req.query.userId || req.headers['x-user-id'] || 'usr_synthetic_alex';
        const deleted = mealStore.deleteMeal(mealId);
        healthMemoryStore_js_1.healthMemoryStore.deleteMeal(userId, mealId);
        const dailySummary = mealStore.getDailySummary(userId);
        res.json({
            success: deleted,
            dailySummary,
        });
    }
    catch (err) {
        console.error('[Meal API] Error deleting meal:', err);
        res.status(500).json({
            success: false,
            error: err?.message || 'Failed to delete meal',
        });
    }
});
/**
 * POST /api/meals/recalculate
 * Dynamically recalculate nutrition for food items in real-time when user edits portions
 */
exports.mealRouter.post('/recalculate', (req, res) => {
    try {
        const foods = req.body.foods || [];
        const updatedFoods = foods.map((f) => ({
            ...f,
            nutrition: nutritionDatabase_js_1.MealNutritionService.calculateItemNutrition(f.name, f.estimatedWeightGrams),
        }));
        const totalNutrition = nutritionDatabase_js_1.MealNutritionService.aggregateMacros(updatedFoods);
        const micronutrients = nutritionDatabase_js_1.MealNutritionService.calculateMicronutrients(updatedFoods);
        const healthBenefits = nutritionDatabase_js_1.MealNutritionService.deriveHealthBenefits(totalNutrition, updatedFoods);
        const considerations = nutritionDatabase_js_1.MealNutritionService.deriveDietaryConsiderations(totalNutrition, updatedFoods);
        res.json({
            success: true,
            foods: updatedFoods,
            totalNutrition,
            micronutrients,
            healthBenefits,
            considerations,
        });
    }
    catch (err) {
        console.error('[Meal API] Error recalculating nutrition:', err);
        res.status(500).json({
            success: false,
            error: err?.message || 'Failed to recalculate nutrition',
        });
    }
});
// ==========================================
// MEAL FOLLOW-UP & VOICE CORRECTION ENDPOINTS
// ==========================================
/**
 * POST /api/meals/followups
 * Resolves conversational utterance to a meal and updates it or logs voice meal
 */
exports.mealRouter.post('/followups', (req, res) => {
    try {
        const { userId = 'usr_synthetic_alex', utterance, sessionId } = req.body;
        if (!utterance) {
            res.status(400).json({ success: false, error: 'utterance is required' });
            return;
        }
        const parsed = mealFollowupService_js_1.MealFollowupService.parseFollowupCorrection(utterance);
        if (parsed.isSkipped) {
            const skippedMeal = mealFollowupService_js_1.MealFollowupService.markMealSkipped({
                userId,
                mealCategory: parsed.mealCategory || 'dinner',
                dateStr: parsed.targetDate === 'yesterday'
                    ? new Date(Date.now() - 86400000).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0],
                reason: parsed.skipReason,
                sessionId,
            });
            res.json({
                success: true,
                action: 'meal_marked_skipped',
                meal: skippedMeal,
            });
            return;
        }
        // Resolve existing meal for correction
        const targetMeal = mealFollowupService_js_1.MealFollowupService.findMealForFollowup(userId, parsed.targetDate, parsed.mealCategory || 'lunch');
        if (targetMeal) {
            const correctionResult = healthMemoryStore_js_1.healthMemoryStore.applyMealCorrection({
                userId,
                mealId: targetMeal.id,
                reason: `Follow-up correction: "${utterance}"`,
                source: 'voice_followup',
                sessionId,
                itemUpdates: parsed.quantityModifications.map((qm) => ({
                    foodName: qm.foodName,
                    newWeightGrams: qm.estimatedGrams,
                    newQuantity: qm.newQuantity,
                })),
                itemsToAdd: parsed.additions.map((a) => ({
                    foodName: a.foodName,
                    weightGrams: a.estimatedGrams,
                })),
                itemsToRemove: parsed.removals,
            });
            res.json({
                success: true,
                action: 'meal_corrected',
                meal: correctionResult.updatedMeal,
                correctionEvents: correctionResult.correctionEvents,
            });
            return;
        }
        // If no existing meal found and items were mentioned, add from voice
        const itemsToAdd = [
            ...parsed.quantityModifications.map((qm) => ({ name: qm.foodName, estimatedWeightGrams: qm.estimatedGrams })),
            ...parsed.additions.map((a) => ({ name: a.foodName, estimatedWeightGrams: a.estimatedGrams })),
        ];
        if (itemsToAdd.length > 0) {
            const addedMeal = mealFollowupService_js_1.MealFollowupService.addMealFromVoice({
                userId,
                mealCategory: parsed.mealCategory || 'lunch',
                dateStr: parsed.targetDate === 'yesterday'
                    ? new Date(Date.now() - 86400000).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0],
                foodItems: itemsToAdd,
                sessionId,
            });
            res.json({
                success: true,
                action: 'meal_added_from_voice',
                meal: addedMeal,
            });
            return;
        }
        res.json({
            success: true,
            action: 'clarification_needed',
            message: 'Could not resolve meal reference. Please specify meal name and date.',
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
/**
 * GET /api/meals/followups/history
 */
exports.mealRouter.get('/followups/history', (req, res) => {
    try {
        const userId = req.query.userId || req.headers['x-user-id'] || 'usr_synthetic_alex';
        const followups = healthMemoryStore_js_1.healthMemoryStore.mealFollowupEvents.get(userId) || [];
        const corrections = healthMemoryStore_js_1.healthMemoryStore.mealItemCorrectionEvents.get(userId) || [];
        res.json({
            success: true,
            followupEvents: followups,
            correctionEvents: corrections,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
