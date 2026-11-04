"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostAndPrivacyTracker = void 0;
const index_js_1 = require("../config/index.js");
const index_js_2 = require("../db/index.js");
class CostAndPrivacyTracker {
    static geminiMinutes = 0;
    static openaiMinutes = 0;
    static exotelCalls = 0;
    static recordCallCompleted(provider, durationSeconds, isPstn) {
        const mins = Math.ceil(durationSeconds / 60);
        if (provider === 'gemini') {
            this.geminiMinutes += mins;
        }
        else {
            this.openaiMinutes += mins;
        }
        if (isPstn) {
            this.exotelCalls++;
        }
    }
    static getMetrics() {
        const active = index_js_2.db.getActiveCallsCount();
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
                    maxConcurrent: index_js_1.config.callingLimits.maxConcurrentCalls,
                },
            },
            syntheticMode: index_js_1.config.privacy.syntheticDataMode,
        };
    }
}
exports.CostAndPrivacyTracker = CostAndPrivacyTracker;
