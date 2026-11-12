"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.followupRouter = void 0;
const express_1 = require("express");
const healthMemoryStore_js_1 = require("../db/healthMemoryStore.js");
const quietHoursGuard_js_1 = require("../queue/quietHoursGuard.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
exports.followupRouter = (0, express_1.Router)();
exports.followupRouter.use(authMiddleware_js_1.authenticateSupabaseToken);
/**
 * POST /api/followups/schedule
 * Schedules an AI coach follow-up call with quiet hours and consent verification
 */
exports.followupRouter.post('/schedule', (req, res) => {
    try {
        const userId = req.userId;
        const { scheduledTimeIST, type = 'daily_meal_checkin', targetDateToReview, targetQuestions = [], } = req.body;
        const consents = healthMemoryStore_js_1.healthMemoryStore.userConsents.get(userId);
        if (consents && !consents.outboundCallingConsent) {
            res.status(403).json({
                success: false,
                error: 'User has revoked outbound calling consent.',
            });
            return;
        }
        const scheduledDate = scheduledTimeIST ? new Date(scheduledTimeIST) : new Date();
        if (quietHoursGuard_js_1.QuietHoursGuard.isQuietHours(scheduledDate).isQuiet) {
            res.status(400).json({
                success: false,
                error: 'Cannot schedule call during quiet hours (9:00 PM to 9:00 AM IST).',
            });
            return;
        }
        const followup = {
            id: `flw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            userId,
            scheduledTimeIST: scheduledDate.toISOString(),
            type,
            targetDateToReview,
            status: 'scheduled',
            targetQuestions,
            idempotencyKey: `idemp_${userId}_${scheduledDate.toISOString().split('T')[0]}_${type}`,
            attemptCount: 0,
        };
        const list = healthMemoryStore_js_1.healthMemoryStore.scheduledFollowups.get(userId) || [];
        healthMemoryStore_js_1.healthMemoryStore.scheduledFollowups.set(userId, [...list, followup]);
        res.json({ success: true, followup });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
/**
 * GET /api/followups
 */
exports.followupRouter.get('/', (req, res) => {
    try {
        const userId = req.userId;
        const list = healthMemoryStore_js_1.healthMemoryStore.scheduledFollowups.get(userId) || [];
        res.json({ success: true, followups: list });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
