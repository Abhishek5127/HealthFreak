import { Router, Request, Response } from 'express';
import multer from 'multer';
import { GeminiMealVisionProvider } from '../services/geminiVisionService.js';
import { MealStore } from '../db/mealStore.js';
import { MealNutritionService } from '../services/nutritionDatabase.js';
import { FoodItem } from '../types/meal.js';

export const mealRouter = Router();

// Multer in-memory storage config (max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed!'));
    }
  },
});

const mealStore = MealStore.getInstance();

/**
 * POST /api/meals/analyze
 * Accepts multipart/form-data with file field 'image' or 'file', or JSON body with 'imageBase64'
 */
mealRouter.post(
  '/analyze',
  upload.single('image'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      let imageBuffer: Buffer | null = null;
      let mimeType = 'image/jpeg';

      if (req.file) {
        imageBuffer = req.file.buffer;
        mimeType = req.file.mimetype;
      } else if (req.body?.imageBase64) {
        // Strip data:image/...;base64, prefix if present
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

      const userName = (req.body?.userName as string) || 'Alex';
      const healthGoals = req.body?.healthGoals
        ? Array.isArray(req.body.healthGoals)
          ? req.body.healthGoals
          : [req.body.healthGoals]
        : ['Weight management', 'Cardiovascular endurance'];

      console.log(`[Meal API] Starting meal analysis for ${userName} (${imageBuffer.length} bytes)...`);

      const mealResult = await GeminiMealVisionProvider.analyzeMealImage(imageBuffer, mimeType, {
        name: userName,
        healthGoals,
      });

      // Save draft for user verification
      mealStore.saveDraft(mealResult);

      res.json({
        success: true,
        meal: mealResult,
      });
    } catch (err: any) {
      console.error('[Meal API] Error analyzing meal:', err);
      res.status(500).json({
        success: false,
        error: err?.message || 'Failed to analyze meal image',
      });
    }
  }
);

/**
 * POST /api/meals
 * Save a confirmed meal to the diary and update user's daily totals
 */
mealRouter.post('/', (req: Request, res: Response): void => {
  try {
    const mealData = req.body;
    if (!mealData || !mealData.id || !mealData.foods) {
      res.status(400).json({
        success: false,
        error: 'Invalid meal data. ID and foods list are required.',
      });
      return;
    }

    const savedMeal = mealStore.saveMeal(mealData);
    const dailySummary = mealStore.getDailySummary(savedMeal.userId);

    console.log(`[Meal API] Meal "${savedMeal.mealName}" saved. Today total: ${dailySummary.caloriesTotal} kcal`);

    res.json({
      success: true,
      meal: savedMeal,
      dailySummary,
    });
  } catch (err: any) {
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
mealRouter.get('/', (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string) || 'usr_synthetic_alex';
    const date = req.query.date as string | undefined;

    const meals = mealStore.getMealsByUser(userId, date);
    res.json({
      success: true,
      meals,
    });
  } catch (err: any) {
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
mealRouter.get('/daily-summary', (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string) || 'usr_synthetic_alex';
    const date = req.query.date as string | undefined;

    const summary = mealStore.getDailySummary(userId, date);
    res.json({
      success: true,
      summary,
    });
  } catch (err: any) {
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
mealRouter.patch('/:mealId', (req: Request, res: Response): void => {
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
  } catch (err: any) {
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
mealRouter.delete('/:mealId', (req: Request, res: Response): void => {
  try {
    const { mealId } = req.params;
    const userId = (req.query.userId as string) || 'usr_synthetic_alex';

    const deleted = mealStore.deleteMeal(mealId);
    const dailySummary = mealStore.getDailySummary(userId);

    res.json({
      success: deleted,
      dailySummary,
    });
  } catch (err: any) {
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
mealRouter.post('/recalculate', (req: Request, res: Response): void => {
  try {
    const foods: FoodItem[] = req.body.foods || [];

    const updatedFoods: FoodItem[] = foods.map((f) => ({
      ...f,
      nutrition: MealNutritionService.calculateItemNutrition(f.name, f.estimatedWeightGrams),
    }));

    const totalNutrition = MealNutritionService.aggregateMacros(updatedFoods);
    const micronutrients = MealNutritionService.calculateMicronutrients(updatedFoods);
    const healthBenefits = MealNutritionService.deriveHealthBenefits(totalNutrition, updatedFoods);
    const considerations = MealNutritionService.deriveDietaryConsiderations(totalNutrition, updatedFoods);

    res.json({
      success: true,
      foods: updatedFoods,
      totalNutrition,
      micronutrients,
      healthBenefits,
      considerations,
    });
  } catch (err: any) {
    console.error('[Meal API] Error recalculating nutrition:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to recalculate nutrition',
    });
  }
});

