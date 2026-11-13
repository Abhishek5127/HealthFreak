"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PendingOpStore = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const index_js_1 = require("../../config/index.js");
class PendingOpStore {
    static redisClient = null;
    static isRedisConnected = false;
    static inMemoryStore = new Map();
    static async init() {
        if (this.redisClient)
            return;
        const redisUrl = process.env.REDIS_URL || index_js_1.config.redis?.url;
        if (redisUrl) {
            try {
                const client = new ioredis_1.default(redisUrl, {
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
            }
            catch {
                this.isRedisConnected = false;
            }
        }
    }
    static makeKey(userId, sessionId = 'default') {
        return `pending_op:${userId}:${sessionId}`;
    }
    static async save(op, sessionId = 'default', ttlSeconds = 600) {
        const key = this.makeKey(op.userId, sessionId);
        if (this.isRedisConnected && this.redisClient) {
            try {
                await this.redisClient.setex(key, ttlSeconds, JSON.stringify(op));
                return;
            }
            catch {
                this.isRedisConnected = false;
            }
        }
        // In-memory fallback with TTL (10 minutes)
        this.inMemoryStore.set(key, {
            op,
            expiresAt: Date.now() + ttlSeconds * 1000,
        });
    }
    static async get(userId, sessionId = 'default') {
        const key = this.makeKey(userId, sessionId);
        if (this.isRedisConnected && this.redisClient) {
            try {
                const data = await this.redisClient.get(key);
                if (data) {
                    return JSON.parse(data);
                }
                return null;
            }
            catch {
                this.isRedisConnected = false;
            }
        }
        // In-memory check
        const item = this.inMemoryStore.get(key);
        if (!item)
            return null;
        if (Date.now() > item.expiresAt) {
            this.inMemoryStore.delete(key);
            return null;
        }
        return item.op;
    }
    static async delete(userId, sessionId = 'default') {
        const key = this.makeKey(userId, sessionId);
        if (this.isRedisConnected && this.redisClient) {
            try {
                await this.redisClient.del(key);
            }
            catch {
                this.isRedisConnected = false;
            }
        }
        this.inMemoryStore.delete(key);
    }
}
exports.PendingOpStore = PendingOpStore;
