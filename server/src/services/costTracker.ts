import { config } from '../config/index.js';
import { db } from '../db/index.js';

export interface UsageMetrics {
  totalCalls: number;
  activeCalls: number;
  totalDurationSeconds: number;
  providers: {
    gemini: {
      callsCount: number;
      estimatedMinutes: number;
      freeTierAllocated: boolean;
      estimatedCostUSD: number; // $0.00 on free tier
    };
    openai: {
      callsCount: number;
      estimatedMinutes: number;
      estimatedCostUSD: number;
    };
  };
  telecom: {
    exotelPstnCalls: number;
    estimatedCostINR: number;
  };
  livekit: {
    cloudMinutes: number;
    buildTierLimits: {
      maxConcurrent: number;
    };
  };
  syntheticMode: boolean;
}

export class CostAndPrivacyTracker {
  private static geminiMinutes = 0;
  private static openaiMinutes = 0;
  private static exotelCalls = 0;

  public static recordCallCompleted(provider: 'gemini' | 'openai', durationSeconds: number, isPstn: boolean) {
    const mins = Math.ceil(durationSeconds / 60);
    if (provider === 'gemini') {
      this.geminiMinutes += mins;
    } else {
      this.openaiMinutes += mins;
    }
    if (isPstn) {
      this.exotelCalls++;
    }
  }

  public static getMetrics(): UsageMetrics {
    const active = db.getActiveCallsCount();

    return {
      totalCalls: this.geminiMinutes + this.openaiMinutes > 0 ? Math.ceil((this.geminiMinutes + this.openaiMinutes) / 3) : 0,
      activeCalls: active,
      totalDurationSeconds: (this.geminiMinutes + this.openaiMinutes) * 60,
      providers: {
        gemini: {
          callsCount: Math.ceil(this.geminiMinutes / 3),
          estimatedMinutes: this.geminiMinutes,
          freeTierAllocated: true,
          estimatedCostUSD: 0.00, // Consumed via Google's direct Gemini free-tier allocation
        },
        openai: {
          callsCount: Math.ceil(this.openaiMinutes / 3),
          estimatedMinutes: this.openaiMinutes,
          estimatedCostUSD: Number((this.openaiMinutes * 0.06).toFixed(2)),
        },
      },
      telecom: {
        exotelPstnCalls: this.exotelCalls,
        estimatedCostINR: Number((this.exotelCalls * 0.85).toFixed(2)), // Approx ₹0.85/min
      },
      livekit: {
        cloudMinutes: this.geminiMinutes + this.openaiMinutes,
        buildTierLimits: {
          maxConcurrent: config.callingLimits.maxConcurrentCalls,
        },
      },
      syntheticMode: config.privacy.syntheticDataMode,
    };
  }
}

