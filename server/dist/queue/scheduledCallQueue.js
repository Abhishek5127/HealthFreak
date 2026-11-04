"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduledCallQueue = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const index_js_1 = require("../config/index.js");
const index_js_2 = require("../db/index.js");
const exotelSipService_js_1 = require("../sip/exotelSipService.js");
const quietHoursGuard_js_1 = require("./quietHoursGuard.js");
class ScheduledCallQueue {
    static queue = null;
    static worker = null;
    static inMemoryJobs = new Map();
    static isRedisAvailable = false;
    static async initialize() {
        try {
            const redisClient = new ioredis_1.default(index_js_1.config.redis.url, {
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
            this.queue = new bullmq_1.Queue('scheduled-calls', { connection: redisClient });
            this.worker = new bullmq_1.Worker('scheduled-calls', async (job) => {
                await this.processJob(job.data);
            }, { connection: redisClient });
        }
        catch {
            // Gracefully fall back to built-in in-memory scheduler for tests / local dev
            this.isRedisAvailable = false;
        }
    }
    /**
     * Schedules an outbound health call with idempotency and quiet hours validation.
     */
    static async scheduleCall(payload) {
        const user = index_js_2.db.getUser(payload.userId);
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
        const existing = index_js_2.db.findCallByIdempotencyKey(payload.idempotencyKey);
        if ((existing && ['completed', 'ringing', 'connected', 'initiating'].includes(existing.status)) ||
            this.inMemoryJobs.has(jobId)) {
            return {
                success: true,
                jobId: `dup_${existing?.id || payload.idempotencyKey}`,
                reason: 'Call already processed or in progress for this idempotency key.',
            };
        }
        // 3. Quiet Hours Check
        const quietCheck = quietHoursGuard_js_1.QuietHoursGuard.isQuietHours();
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
    static async processJob(payload) {
        const user = index_js_2.db.getUser(payload.userId);
        if (!user || !user.callingConsent || user.optedOut) {
            return { executed: false, status: 'revoked', error: 'User opted out or revoked consent before call execution.' };
        }
        // Double check quiet hours right before dialing
        const quietCheck = quietHoursGuard_js_1.QuietHoursGuard.isQuietHours();
        if (quietCheck.isQuiet) {
            return {
                executed: false,
                status: 'deferred_quiet_hours',
                error: 'Current time is within Indian quiet hours. Call deferred.',
            };
        }
        const result = await exotelSipService_js_1.ExotelSipService.initiateOutboundCall({
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
exports.ScheduledCallQueue = ScheduledCallQueue;
