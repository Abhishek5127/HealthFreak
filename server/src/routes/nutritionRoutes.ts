import { Router, Request, Response } from 'express';
import { healthMemoryStore } from '../db/healthMemoryStore.js';
import { ThirtyDayAnalysisService } from '../nutrition/thirtyDayAnalysisService.js';

export const nutritionRouter = Router();

/**
 * GET /api/nutrition/daily
 * Daily nutrition totals for a specific date (defaults to today)
 */
nutritionRouter.get('/daily', (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || 'usr_synthetic_alex';
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];

    const summary = healthMemoryStore.getDailySummary(userId, dateStr);
    res.json({ success: true, summary });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/nutrition/last-30-days
 * Rolling 30-day nutrition history, macro averages, food frequency, and data coverage indicators
 */
nutritionRouter.get('/last-30-days', (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || 'usr_synthetic_alex';
    const timezone = (req.query.timezone as string) || 'Asia/Kolkata';

    const report = ThirtyDayAnalysisService.getThirtyDayNutritionHistory(userId, timezone);
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/nutrition/trends
 * 7-day and 30-day trends with data coverage percentages
 */
nutritionRouter.get('/trends', (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || 'usr_synthetic_alex';
    const report = ThirtyDayAnalysisService.getThirtyDayNutritionHistory(userId);

    res.json({
      success: true,
      trends: {
        caloriesAverage: report.overallNutrition.averageDailyCalories,
        proteinAverage: report.overallNutrition.averageDailyProtein,
        fiberAverage: report.overallNutrition.averageDailyFiber,
        dataCoveragePct: report.dataReliability.coveragePercentage,
        frequentFoods: report.foodBehaviour.frequentlyConsumedFoods,
        skippedCount: report.planAdherence.explicitlySkippedMeals.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

