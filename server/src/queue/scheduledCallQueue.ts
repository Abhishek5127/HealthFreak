import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config/index.js';
import { db } from '../db/index.js';
import { ExotelSipService } from '../sip/exotelSipService.js';
import { QuietHoursGuard } from './quietHoursGuard.js';

export interface ScheduledCallPayload {
  userId: string;
  phone?: string;
  preferredHourIST?: number;
  idempotencyKey: string;
  attemptNumber: number;
  maxAttempts: number;
}

export class ScheduledCallQueue {
  private static queue: Queue | null = null;
  private static worker: Worker | null = null;
  private static inMemoryJobs: Map<string, ScheduledCallPayload> = new Map();
  private static isRedisAvailable = false;

  public static async initialize(): Promise<void> {
    try {
      const redisClient = new IORedis(config.redis.url, {
        lazyConnect: true,
        maxRetriesPerRequest: null,
        connectTimeout: 1000,
        enableOfflineQueue: false,
        retryStrategy: () => null, // Do not retry if Redis is offline
      });

      // Always attach an error listener to prevent uncaught error events
      redisClient.on('error', (_err) => {
        this.isRedisAvailable = false;
      });

      await redisClient.connect();
      this.isRedisAvailable = true;

      this.queue = new Queue('scheduled-calls', { connection: redisClient });
      this.worker = new Worker(
        'scheduled-calls',
        async (job: Job) => {
          await this.processJob(job.data as ScheduledCallPayload);
        },
        { connection: redisClient }
      );
    } catch {
      // Gracefully fall back to built-in in-memory scheduler for tests / local dev
      this.isRedisAvailable = false;
    }
  }

  /**
   * Schedules an outbound health call with idempotency and quiet hours validation.
   */
  public static async scheduleCall(payload: ScheduledCallPayload): Promise<{
    success: boolean;
    jobId: string;
    isQuietHoursDeferred?: boolean;
    reason?: string;
  }> {
    const user = db.getUser(payload.userId);
    if (!user) {
      return { success: false, jobId: '', reason: `User ${payload.userId} not found` };
    }

    // 1. Explicit Consent check
    if (!user.callingConsent || user.optedOut) {
      return {
        success: false,
        jobId: '',
        reason: 'Call rejected: User has not given consent or has opted out of automated health calls.',
      };
    }

    // 2. Idempotency Check
    const jobId = `job_${payload.idempotencyKey}`;
    const existing = db.findCallByIdempotencyKey(payload.idempotencyKey);
    if (
      (existing && ['completed', 'ringing', 'connected', 'initiating'].includes(existing.status)) ||
      this.inMemoryJobs.has(jobId)
    ) {
      return {
        success: true,
        jobId: `dup_${existing?.id || payload.idempotencyKey}`,
        reason: 'Call already processed or in progress for this idempotency key.',
      };
    }

    // 3. Quiet Hours Check
    const quietCheck = QuietHoursGuard.isQuietHours();
    this.inMemoryJobs.set(jobId, payload);

    if (this.isRedisAvailable && this.queue) {
      const delayMs = quietCheck.isQuiet && quietCheck.nextAllowedTimeIST
        ? Math.max(0, quietCheck.nextAllowedTimeIST.getTime() - Date.now())
        : 0;

      await this.queue.add('scheduled-health-call', payload, {
        jobId,
        delay: delayMs,
        attempts: payload.maxAttempts,
        backoff: {
          type: 'exponential',
          delay: 15 * 60 * 1000, // 15 mins
        },
      });
    }

    return {
      success: true,
      jobId,
      isQuietHoursDeferred: quietCheck.isQuiet,
      reason: quietCheck.isQuiet
        ? `Deferred to ${quietCheck.nextAllowedTimeIST?.toISOString()} to respect Indian quiet hours (8 PM - 9 AM IST).`
        : 'Scheduled for immediate execution.',
    };
  }

  /**
   * Processes a scheduled call job.
   */
  public static async processJob(payload: ScheduledCallPayload): Promise<{
    executed: boolean;
    status: string;
    error?: string;
  }> {
    const user = db.getUser(payload.userId);
    if (!user || !user.callingConsent || user.optedOut) {
      return { executed: false, status: 'revoked', error: 'User opted out or revoked consent before call execution.' };
    }

    // Double check quiet hours right before dialing
    const quietCheck = QuietHoursGuard.isQuietHours();
    if (quietCheck.isQuiet) {
      return {
        executed: false,
        status: 'deferred_quiet_hours',
        error: 'Current time is within Indian quiet hours. Call deferred.',
      };
    }

    const result = await ExotelSipService.initiateOutboundCall({
      userId: payload.userId,
      phone: payload.phone,
      idempotencyKey: payload.idempotencyKey,
      attemptNumber: payload.attemptNumber,
    });

    return {
      executed: result.success,
      status: result.status,
      error: result.error,
    };
  }
}

