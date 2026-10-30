import dotenv from 'dotenv';
dotenv.config();

export interface ServerConfig {
  port: number;
  livekit: {
    url: string;
    apiKey: string;
    apiSecret: string;
    sipTrunkId: string;
  };
  voiceProvider: 'gemini' | 'openai';
  gemini: {
    apiKey: string;
    model: string;
  };
  openai: {
    apiKey: string;
    model: string;
  };
  exotel: {
    accountSid: string;
    apiKey: string;
    apiToken: string;
    callerId: string;
  };
  redis: {
    url: string;
    mockFallback: boolean;
  };
  callingLimits: {
    maxDurationSeconds: number; // 600s = 10 mins
    maxConcurrentCalls: number; // 5 for free tier, scalable up to 50
    dailyQuotaPerUser: number;   // 3 calls per day
    quietHoursStartHourIST: number; // 20 (8 PM IST)
    quietHoursEndHourIST: number;   // 9 (9 AM IST)
  };
  privacy: {
    syntheticDataMode: boolean;
    transcriptRetentionDays: number;
  };
}

export const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3001', 10),
  livekit: {
    url: process.env.LIVEKIT_URL || 'wss://healthfreak-demo.livekit.cloud',
    apiKey: process.env.LIVEKIT_API_KEY || 'devkey_healthfreak',
    apiSecret: process.env.LIVEKIT_API_SECRET || 'secret_healthfreak_livekit_agent_2026',
    sipTrunkId: process.env.LIVEKIT_SIP_TRUNK_ID || 'ST_EXOTEL_INDIA_01',
  },
  voiceProvider: (process.env.VOICE_PROVIDER === 'openai' ? 'openai' : 'gemini'),
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || 'AIzaSyDemoKeyForGeminiLiveFreeTier2026',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
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
    quietHoursEndHourIST: 9,    // 9 AM IST
  },
  privacy: {
    syntheticDataMode: process.env.SYNTHETIC_DATA_MODE !== 'false', // default true
    transcriptRetentionDays: 30,
  },
};

