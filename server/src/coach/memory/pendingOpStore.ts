import IORedis from 'ioredis';
import { config } from '../../config/index.js';
import { PendingMemoryOp } from './pendingOpsManager.js';

export class PendingOpStore {
  private static redisClient: IORedis | null = null;
  private static isRedisConnected = false;
  private static inMemoryStore = new Map<string, { op: PendingMemoryOp; expiresAt: number }>();

  public static async init(): Promise<void> {
    if (this.redisClient) return;

    const redisUrl = process.env.REDIS_URL || config.redis?.url;
    if (redisUrl) {
      try {
        const client = new IORedis(redisUrl, {
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
          retryStrategy: () => null,
          lazyConnect: true,
        });

        client.on('error', () => {
          this.isRedisConnected = false;
        });

        client.on('connect', () => {
          this.isRedisConnected = true;
        });

        await client.connect();
        this.redisClient = client;
        this.isRedisConnected = true;
      } catch {
        this.isRedisConnected = false;
      }
    }
  }

  private static makeKey(userId: string, sessionId = 'default'): string {
    return `pending_op:${userId}:${sessionId}`;
  }

  public static async save(op: PendingMemoryOp, sessionId = 'default', ttlSeconds = 600): Promise<void> {
    const key = this.makeKey(op.userId, sessionId);

    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.setex(key, ttlSeconds, JSON.stringify(op));
        return;
      } catch {
        this.isRedisConnected = false;
      }
    }

    // In-memory fallback with TTL (10 minutes)
    this.inMemoryStore.set(key, {
      op,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  public static async get(userId: string, sessionId = 'default'): Promise<PendingMemoryOp | null> {
    const key = this.makeKey(userId, sessionId);

    if (this.isRedisConnected && this.redisClient) {
      try {
        const data = await this.redisClient.get(key);
        if (data) {
          return JSON.parse(data) as PendingMemoryOp;
        }
        return null;
      } catch {
        this.isRedisConnected = false;
      }
    }

    // In-memory check
    const item = this.inMemoryStore.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.inMemoryStore.delete(key);
      return null;
    }
    return item.op;
  }

  public static async delete(userId: string, sessionId = 'default'): Promise<void> {
    const key = this.makeKey(userId, sessionId);

    if (this.isRedisConnected && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch {
        this.isRedisConnected = false;
      }
    }

    this.inMemoryStore.delete(key);
  }
}
