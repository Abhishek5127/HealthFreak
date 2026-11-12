import { Router, Request, Response } from 'express';
import { healthMemoryStore } from '../db/healthMemoryStore.js';
import { HealthHistoryService } from '../health-memory/healthHistoryService.js';
import { MemoryRetrievalService } from '../health-memory/memoryRetrievalService.js';
import { authenticateSupabaseToken, AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const healthMemoryRouter = Router();

healthMemoryRouter.use(authenticateSupabaseToken as any);

/**
 * GET /api/health/profile
 */
healthMemoryRouter.get('/profile', (req: Request, res: Response): void => {
  try {
    const userId = (req as AuthenticatedRequest).userId!;
    const profile = healthMemoryStore.profiles.get(userId);
    const preferences = healthMemoryStore.userPreferences.get(userId);
    const goals = healthMemoryStore.userGoals.get(userId) || [];
    const bmi = HealthHistoryService.calculateLatestBMI(userId);

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
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/health/memory
 * Retrieves active profile facts and persistent memory
 */
healthMemoryRouter.get('/memory', (req: Request, res: Response): void => {
  try {
    const userId = (req as AuthenticatedRequest).userId!;
    const activeFacts = healthMemoryStore.getActiveProfileFacts(userId);
    const context = MemoryRetrievalService.getSessionContext(userId);

    res.json({
      success: true,
      activeFacts,
      context,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/health/history
 * Complete append-only fact events and measurement history
 */
healthMemoryRouter.get('/history', (req: Request, res: Response): void => {
  try {
    const userId = (req as AuthenticatedRequest).userId!;
    const allFactsHistory = healthMemoryStore.getAllProfileFactsHistory(userId);
    const factEvents = healthMemoryStore.profileFactEvents.get(userId) || [];
    const measurements = healthMemoryStore.healthMeasurements.get(userId) || [];
    const conditions = healthMemoryStore.healthConditions.get(userId) || [];

    res.json({
      success: true,
      factsHistory: allFactsHistory,
      factEvents,
      measurements,
      conditions,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/health/memory/propose-update
 */
healthMemoryRouter.post('/memory/propose-update', (req: Request, res: Response): void => {
  try {
    const userId = (req as AuthenticatedRequest).userId!;
    const { category, key, value, verificationStatus } = req.body;
    const fact = healthMemoryStore.setProfileFact({
      userId,
      category: category || 'routine',
      key,
      value,
      confidence: 0.95,
      verificationStatus: verificationStatus || 'user_reported',
    });

    res.json({ success: true, fact });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/health/export
 * Data export for privacy compliance (includes structured meal history)
 */
healthMemoryRouter.get('/export', (req: Request, res: Response): void => {
  try {
    const userId = (req as AuthenticatedRequest).userId!;
    const exportData = healthMemoryStore.exportUserData(userId);
    res.json({ success: true, exportData });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/health/delete
 * Data deletion right under data protection laws
 */
healthMemoryRouter.delete('/delete', (req: Request, res: Response): void => {
  try {
    const userId = (req as AuthenticatedRequest).userId!;
    const deleted = healthMemoryStore.deleteUserData(userId);
    res.json({ success: deleted, message: 'User data completely purged from system' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

