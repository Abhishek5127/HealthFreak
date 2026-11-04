"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nutritionRouter = void 0;
const express_1 = require("express");
const healthMemoryStore_js_1 = require("../db/healthMemoryStore.js");
const thirtyDayAnalysisService_js_1 = require("../nutrition/thirtyDayAnalysisService.js");
exports.nutritionRouter = (0, express_1.Router)();
/**
 * GET /api/nutrition/daily
 * Daily nutrition totals for a specific date (defaults to today)
 */
exports.nutritionRouter.get('/daily', (req, res) => {
    try {
        const userId = req.query.userId || req.headers['x-user-id'] || 'usr_synthetic_alex';
        const dateStr = req.query.date || new Date().toISOString().split('T')[0];
        const summary = healthMemoryStore_js_1.healthMemoryStore.getDailySummary(userId, dateStr);
        res.json({ success: true, summary });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
/**
 * GET /api/nutrition/last-30-days
 * Rolling 30-day nutrition history, macro averages, food frequency, and data coverage indicators
 */
exports.nutritionRouter.get('/last-30-days', (req, res) => {
    try {
        const userId = req.query.userId || req.headers['x-user-id'] || 'usr_synthetic_alex';
        const timezone = req.query.timezone || 'Asia/Kolkata';
        const report = thirtyDayAnalysisService_js_1.ThirtyDayAnalysisService.getThirtyDayNutritionHistory(userId, timezone);
        res.json({ success: true, report });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
/**
 * GET /api/nutrition/trends
 * 7-day and 30-day trends with data coverage percentages
 */
exports.nutritionRouter.get('/trends', (req, res) => {
    try {
        const userId = req.query.userId || req.headers['x-user-id'] || 'usr_synthetic_alex';
        const report = thirtyDayAnalysisService_js_1.ThirtyDayAnalysisService.getThirtyDayNutritionHistory(userId);
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
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
