"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planRouter = void 0;
const express_1 = require("express");
const healthMemoryStore_js_1 = require("../db/healthMemoryStore.js");
const planGenerationService_js_1 = require("../plans/planGenerationService.js");
exports.planRouter = (0, express_1.Router)();
/**
 * GET /api/plans/active
 */
exports.planRouter.get('/active', (req, res) => {
    try {
        const userId = req.query.userId || req.headers['x-user-id'] || 'usr_synthetic_alex';
        const plans = healthMemoryStore_js_1.healthMemoryStore.healthPlans.get(userId) || [];
        const active = plans.find((p) => p.status === 'active') || plans[0];
        res.json({ success: true, plan: active || null });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
/**
 * GET /api/plans/history
 * All versions with justifications and safety review status
 */
exports.planRouter.get('/history', (req, res) => {
    try {
        const userId = req.query.userId || req.headers['x-user-id'] || 'usr_synthetic_alex';
        const plans = healthMemoryStore_js_1.healthMemoryStore.healthPlans.get(userId) || [];
        const reasons = healthMemoryStore_js_1.healthMemoryStore.planPersonalizationReasons.get(userId) || [];
        const safetyReviews = healthMemoryStore_js_1.healthMemoryStore.planSafetyReviews.get(userId) || [];
        res.json({
            success: true,
            plans,
            reasons,
            safetyReviews,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
/**
 * POST /api/plans/generate-draft
 * Generates an adaptive draft plan referencing user 30-day food history
 */
exports.planRouter.post('/generate-draft', async (req, res) => {
    try {
        const { userId = 'usr_synthetic_alex', requestedLevel = 2, reason = 'User requested routine update' } = req.body;
        const result = await planGenerationService_js_1.PlanGenerationService.generatePersonalizedPlanDraft({
            userId,
            requestedLevel,
            triggerReason: reason,
        });
        res.json({ success: result.success, result });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
/**
 * POST /api/plans/:id/approve
 * Promotes draft plan to active status
 */
exports.planRouter.post('/:id/approve', (req, res) => {
    try {
        const planId = req.params.id;
        const userId = req.body?.userId || req.headers['x-user-id'] || 'usr_synthetic_alex';
        const activated = planGenerationService_js_1.PlanGenerationService.approveAndActivatePlan(userId, planId);
        if (!activated) {
            res.status(404).json({ success: false, error: 'Plan not found or could not be activated.' });
            return;
        }
        res.json({ success: true, plan: activated });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
