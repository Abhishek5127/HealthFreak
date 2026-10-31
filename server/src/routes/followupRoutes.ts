import { Router, Request, Response } from 'express';
import { healthMemoryStore } from '../db/healthMemoryStore.js';
import { ScheduledFollowupEntity } from '../types/healthMemory.js';
import { QuietHoursGuard } from '../queue/quietHoursGuard.js';

export const followupRouter = Router();

/**
 * POST /api/followups/schedule
 * Schedules an AI coach follow-up call with quiet hours and consent verification
 */
followupRouter.post('/schedule', (req: Request, res: Response): void => {
  try {
    const {
      userId = 'usr_synthetic_alex',
      scheduledTimeIST,
      type = 'daily_meal_checkin',
      targetDateToReview,
      targetQuestions = [],
    } = req.body;

    const consents = healthMemoryStore.userConsents.get(userId);
    if (consents && !consents.outboundCallingConsent) {
      res.status(403).json({
        success: false,
        error: 'User has revoked outbound calling consent.',
      });
      return;
    }

    const scheduledDate = scheduledTimeIST ? new Date(scheduledTimeIST) : new Date();
    if (QuietHoursGuard.isQuietHours(scheduledDate).isQuiet) {
      res.status(400).json({
        success: false,
        error: 'Cannot schedule call during quiet hours (9:00 PM to 9:00 AM IST).',
      });
      return;
    }

    const followup: ScheduledFollowupEntity = {
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

    const list = healthMemoryStore.scheduledFollowups.get(userId) || [];
    healthMemoryStore.scheduledFollowups.set(userId, [...list, followup]);

    res.json({ success: true, followup });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/followups
 */
followupRouter.get('/', (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string) || 'usr_synthetic_alex';
    const list = healthMemoryStore.scheduledFollowups.get(userId) || [];
    res.json({ success: true, followups: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
