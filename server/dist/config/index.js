"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.COACH_NAME = exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Robust .env resolution whether launched from root or server/
const possibleEnvPaths = [
    path_1.default.resolve(process.cwd(), 'server/.env'),
    path_1.default.resolve(process.cwd(), '.env'),
    path_1.default.resolve(__dirname, '../../.env'),
    path_1.default.resolve(__dirname, '../../../.env'),
];
for (const envPath of possibleEnvPaths) {
    if (fs_1.default.existsSync(envPath)) {
        dotenv_1.default.config({ path: envPath });
        break;
    }
}
exports.config = {
    port: parseInt(process.env.PORT || '3001', 10),
    livekit: {
        url: process.env.LIVEKIT_URL || 'wss://healthfreak-demo.livekit.cloud',
        apiKey: process.env.LIVEKIT_API_KEY || 'devkey_healthfreak',
        apiSecret: process.env.LIVEKIT_API_SECRET || 'secret_healthfreak_livekit_agent_2026',
        sipTrunkId: process.env.LIVEKIT_SIP_TRUNK_ID || 'ST_EXOTEL_INDIA_01',
    },
    voiceProvider: (process.env.VOICE_PROVIDER === 'openai'
        ? 'openai'
        : process.env.VOICE_PROVIDER === 'gemini'
            ? 'gemini'
            : 'sarvam'),
    sarvam: {
        apiKey: process.env.SARVAM_API_KEY || '',
        speaker: process.env.SARVAM_SPEAKER || 'shubh',
        chatModel: process.env.SARVAM_CHAT_MODEL || 'sarvam-105b-conversations',
        ttsModel: process.env.SARVAM_TTS_MODEL || 'bulbul:v3',
    },
    gemini: {
        apiKey: process.env.GEMINI_API_KEY || 'AIzaSyDemoKeyForGeminiLiveFreeTier2026',
        model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
        visionModel: process.env.GEMINI_VISION_MODEL || 'gemini-3.8-flash',
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4o-realtime-preview',
    },
    exotel: {
        accountSid: process.env.EXOTEL_SID || 'exotel_sid_healthfreak',
        apiKey: process.env.EXOTEL_API_KEY || 'exotel_api_key_mock',
        apiToken: process.env.EXOTEL_API_TOKEN || 'exotel_token_mock',
        callerId: process.env.EXOTEL_CALLER_ID || '+918047100000',
    },
    redis: {
        url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
        mockFallback: true, // Gracefully use in-memory queue if Redis is not running locally
    },
    callingLimits: {
        maxDurationSeconds: parseInt(process.env.MAX_CALL_DURATION_SECONDS || '600', 10),
        maxConcurrentCalls: parseInt(process.env.MAX_CONCURRENT_CALLS || '5', 10),
        dailyQuotaPerUser: parseInt(process.env.DAILY_CALL_QUOTA_PER_USER || '3', 10),
        quietHoursStartHourIST: 20, // 8 PM IST
        quietHoursEndHourIST: 9, // 9 AM IST
    },
    privacy: {
        syntheticDataMode: process.env.SYNTHETIC_DATA_MODE !== 'false', // default true
        transcriptRetentionDays: parseInt(process.env.TRANSCRIPT_RETENTION_DAYS || '90', 10),
    },
    coach: {
        memoryEnabled: process.env.COACH_MEMORY_ENABLED !== 'false',
        planEnabled: process.env.COACH_PLAN_ENABLED !== 'false',
        schedulingEnabled: process.env.COACH_SCHEDULING_ENABLED !== 'false',
        proactiveMessagesEnabled: process.env.COACH_PROACTIVE_MESSAGES_ENABLED === 'true',
        phoneCallsEnabled: process.env.COACH_PHONE_CALLS_ENABLED === 'true',
        agentName: process.env.LIVEKIT_AGENT_NAME || 'healthfreak-coach',
        explicitDispatchEnabled: process.env.COACH_EXPLICIT_DISPATCH_ENABLED !== 'false',
        hmacSecret: process.env.COACH_HMAC_SECRET || 'healthfreak_coach_hmac_secret_default',
    },
    supabase: {
        url: process.env.SUPABASE_URL || '',
        anonKey: process.env.SUPABASE_ANON_KEY || '',
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        databaseUrl: process.env.DATABASE_URL || '',
    },
};
var constants_js_1 = require("./constants.js");
Object.defineProperty(exports, "COACH_NAME", { enumerable: true, get: function () { return constants_js_1.COACH_NAME; } });
