"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const healthSnapshotService_js_1 = require("../services/healthSnapshotService.js");
const coachContextService_js_1 = require("../services/coachContextService.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const coachAuthMiddleware_js_1 = require("../middleware/coachAuthMiddleware.js");
exports.healthRouter = (0, express_1.Router)();
/**
 * POST /api/health/daily-sync
 * Authenticated & idempotent daily snapshot sync from mobile/web app.
 */
exports.healthRouter.post('/daily-sync', authMiddleware_js_1.authenticateSupabaseToken, async (req, res) => {
    try {
        const userId = req.userId;
        const parsed = healthSnapshotService_js_1.DailySyncPayloadSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: 'Invalid snapshot payload', details: parsed.error.issues });
            return;
        }
        const snapshot = await healthSnapshotService_js_1.HealthSnapshotService.syncDailySnapshot(userId, parsed.data);
        res.json({ success: true, snapshot });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Error syncing snapshot' });
    }
});
/**
 * GET /api/health/daily-snapshots
 * Fetch recent snapshots for a user.
 */
exports.healthRouter.get('/daily-snapshots', authMiddleware_js_1.authenticateSupabaseToken, async (req, res) => {
    try {
        const userId = req.userId;
        const days = parseInt(req.query.days, 10) || 7;
        const snapshots = await healthSnapshotService_js_1.HealthSnapshotService.getRecentSnapshots(userId, days);
        res.json({ success: true, snapshots });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Error fetching snapshots' });
    }
});
/**
 * GET /api/health/context-pack
 * Generates the compact context pack for the voice coach (under ~1,000 tokens).
 * Strictly requires verified server-to-server coach HMAC signature.
 */
exports.healthRouter.get('/context-pack', coachAuthMiddleware_js_1.verifyCoachSignature, async (req, res) => {
    try {
        const userId = req.coachUserId;
        const now = req.query.now ? new Date(req.query.now) : new Date();
        const contextPack = await coachContextService_js_1.CoachContextService.buildContextPack(userId, now);
        res.json({ success: true, contextPack });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Error building context pack' });
    }
});
