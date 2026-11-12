import { Router, Request, Response } from 'express';
import { HealthSnapshotService, DailySyncPayloadSchema } from '../services/healthSnapshotService.js';
import { CoachContextService } from '../services/coachContextService.js';
import { authenticateSupabaseToken, AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const healthRouter = Router();

/**
 * POST /api/health/daily-sync
 * Authenticated & idempotent daily snapshot sync from mobile/web app.
 */
healthRouter.post('/daily-sync', authenticateSupabaseToken as any, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).userId!;
    const parsed = DailySyncPayloadSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid snapshot payload', details: parsed.error.issues });
      return;
    }

    const snapshot = await HealthSnapshotService.syncDailySnapshot(userId, parsed.data);
    res.json({ success: true, snapshot });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error syncing snapshot' });
  }
});

/**
 * GET /api/health/daily-snapshots
 * Fetch recent snapshots for a user.
 */
healthRouter.get('/daily-snapshots', authenticateSupabaseToken as any, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).userId!;
    const days = parseInt(req.query.days as string, 10) || 7;
    const snapshots = await HealthSnapshotService.getRecentSnapshots(userId, days);
    res.json({ success: true, snapshots });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error fetching snapshots' });
  }
});

/**
 * GET /api/health/context-pack
 * Generates the compact context pack for the voice coach (under ~1,000 tokens).
 */
healthRouter.get('/context-pack', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.query.userId as string) || 'usr_synthetic_alex';
    const now = req.query.now ? new Date(req.query.now as string) : new Date();
    const contextPack = await CoachContextService.buildContextPack(userId, now);
    res.json({ success: true, contextPack });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Error building context pack' });
  }
});

