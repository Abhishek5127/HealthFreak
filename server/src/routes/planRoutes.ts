import { Router, Request, Response } from 'express';
import { healthMemoryStore } from '../db/healthMemoryStore.js';
import { PlanGenerationService } from '../plans/planGenerationService.js';

export const planRouter = Router();

/**
 * GET /api/plans/active
 */
planRouter.get('/active', (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || 'usr_synthetic_alex';
    const plans = healthMemoryStore.healthPlans.get(userId) || [];
    const active = plans.find((p) => p.status === 'active') || plans[0];

    res.json({ success: true, plan: active || null });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/plans/history
 * All versions with justifications and safety review status
 */
planRouter.get('/history', (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || 'usr_synthetic_alex';
    const plans = healthMemoryStore.healthPlans.get(userId) || [];
    const reasons = healthMemoryStore.planPersonalizationReasons.get(userId) || [];
    const safetyReviews = healthMemoryStore.planSafetyReviews.get(userId) || [];

    res.json({
      success: true,
      plans,
      reasons,
      safetyReviews,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/plans/generate-draft
 * Generates an adaptive draft plan referencing user 30-day food history
 */
planRouter.post('/generate-draft', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId = 'usr_synthetic_alex', requestedLevel = 2, reason = 'User requested routine update' } = req.body;
    const result = await PlanGenerationService.generatePersonalizedPlanDraft({
      userId,
      requestedLevel,
      triggerReason: reason,
    });

    res.json({ success: result.success, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/plans/:id/approve
 * Promotes draft plan to active status
 */
planRouter.post('/:id/approve', (req: Request, res: Response): void => {
  try {
    const planId = req.params.id;
    const userId = (req.body?.userId as string) || (req.headers['x-user-id'] as string) || 'usr_synthetic_alex';

    const activated = PlanGenerationService.approveAndActivatePlan(userId, planId);
    if (!activated) {
      res.status(404).json({ success: false, error: 'Plan not found or could not be activated.' });
      return;
    }

    res.json({ success: true, plan: activated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
