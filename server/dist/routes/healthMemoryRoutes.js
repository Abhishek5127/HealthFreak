"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthMemoryRouter = void 0;
const express_1 = require("express");
const healthMemoryStore_js_1 = require("../db/healthMemoryStore.js");
const healthHistoryService_js_1 = require("../health-memory/healthHistoryService.js");
const memoryRetrievalService_js_1 = require("../health-memory/memoryRetrievalService.js");
exports.healthMemoryRouter = (0, express_1.Router)();
/**
 * GET /api/health/profile
 */
exports.healthMemoryRouter.get('/profile', (req, res) => {
    try {
        const userId = req.query.userId || req.headers['x-user-id'] || 'usr_synthetic_alex';
        const profile = healthMemoryStore_js_1.healthMemoryStore.profiles.get(userId);
        const preferences = healthMemoryStore_js_1.healthMemoryStore.userPreferences.get(userId);
        const goals = healthMemoryStore_js_1.healthMemoryStore.userGoals.get(userId) || [];
        const bmi = healthHistoryService_js_1.HealthHistoryService.calculateLatestBMI(userId);
        if (!profile) {
            res.status(404).json({ success: false, error: 'User profile not found' });
            return;
        }
        res.json({
            success: true,
            profile: {
                ...profile,
                preferences,
                goals,
                currentBMI: bmi,
            },
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
/**
 * GET /api/health/memory
 * Retrieves active profile facts and persistent memory
 */
exports.healthMemoryRouter.get('/memory', (req, res) => {
    try {
        const userId = req.query.userId || req.headers['x-user-id'] || 'usr_synthetic_alex';
        const activeFacts = healthMemoryStore_js_1.healthMemoryStore.getActiveProfileFacts(userId);
        const context = memoryRetrievalService_js_1.MemoryRetrievalService.getSessionContext(userId);
        res.json({
            success: true,
            activeFacts,
            context,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
/**
 * GET /api/health/history
 * Complete append-only fact events and measurement history
 */
exports.healthMemoryRouter.get('/history', (req, res) => {
    try {
        const userId = req.query.userId || req.headers['x-user-id'] || 'usr_synthetic_alex';
        const allFactsHistory = healthMemoryStore_js_1.healthMemoryStore.getAllProfileFactsHistory(userId);
        const factEvents = healthMemoryStore_js_1.healthMemoryStore.profileFactEvents.get(userId) || [];
        const measurements = healthMemoryStore_js_1.healthMemoryStore.healthMeasurements.get(userId) || [];
        const conditions = healthMemoryStore_js_1.healthMemoryStore.healthConditions.get(userId) || [];
        res.json({
            success: true,
            factsHistory: allFactsHistory,
            factEvents,
            measurements,
            conditions,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
/**
 * POST /api/health/memory/propose-update
 */
exports.healthMemoryRouter.post('/memory/propose-update', (req, res) => {
    try {
        const { userId = 'usr_synthetic_alex', category, key, value, verificationStatus } = req.body;
        const fact = healthMemoryStore_js_1.healthMemoryStore.setProfileFact({
            userId,
            category: category || 'routine',
            key,
            value,
            confidence: 0.95,
            verificationStatus: verificationStatus || 'user_reported',
        });
        res.json({ success: true, fact });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
/**
 * GET /api/health/export
 * Data export for privacy compliance (includes structured meal history)
 */
exports.healthMemoryRouter.get('/export', (req, res) => {
    try {
        const userId = req.query.userId || req.headers['x-user-id'] || 'usr_synthetic_alex';
        const exportData = healthMemoryStore_js_1.healthMemoryStore.exportUserData(userId);
        res.json({ success: true, exportData });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
/**
 * DELETE /api/health/delete
 * Data deletion right under data protection laws
 */
exports.healthMemoryRouter.delete('/delete', (req, res) => {
    try {
        const userId = req.body?.userId || req.headers['x-user-id'] || 'usr_synthetic_alex';
        const deleted = healthMemoryStore_js_1.healthMemoryStore.deleteUserData(userId);
        res.json({ success: deleted, message: 'User data completely purged from system' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
