"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveKitTokenService = void 0;
const livekit_server_sdk_1 = require("livekit-server-sdk");
const index_js_1 = require("../config/index.js");
const index_js_2 = require("../db/index.js");
class LiveKitTokenService {
    /**
     * Generates a short-lived LiveKit token with admission control and concurrency checks.
     */
    static async createCallSessionAndToken(params) {
        let user = index_js_2.db.getUser(params.userId);
        if (!user) {
            // Auto-provision user record so that all authenticated or dynamic users can make calls
            const newUser = {
                id: params.userId,
                name: 'HealthFreak Member',
                phone: '+919876543210',
                languagePreference: 'en',
                callingConsent: true,
                consentTimestamp: new Date().toISOString(),
                optedOut: false,
                preferredCallHourIST: 10,
                healthGoals: ['Daily wellness', 'Active lifestyle'],
                knownConditions: [],
                currentEnergyLevel: 'moderate',
            };
            index_js_2.db.saveUser(newUser);
            user = newUser;
        }
        // 1. Admission Control: Check Global Concurrency Limits
        const currentActiveCalls = index_js_2.db.getActiveCallsCount();
        if (currentActiveCalls >= index_js_1.config.callingLimits.maxConcurrentCalls) {
            return {
                success: false,
                errorCode: 'CONCURRENCY_LIMIT',
                errorMessage: `Max concurrent active calls (${index_js_1.config.callingLimits.maxConcurrentCalls}) reached. Free-tier admission control engaged.`,
            };
        }
        // 2. User Daily Quota Check
        const userTodayCalls = index_js_2.db.getUserCallsToday(params.userId);
        if (userTodayCalls >= index_js_1.config.callingLimits.dailyQuotaPerUser) {
            return {
                success: false,
                errorCode: 'DAILY_QUOTA_EXCEEDED',
                errorMessage: `Daily call quota of ${index_js_1.config.callingLimits.dailyQuotaPerUser} exceeded for user ${params.userId}.`,
            };
        }
        // 3. For PSTN calls, ensure explicit calling consent
        if (params.callType === 'pstn_outbound') {
            if (!user.callingConsent || user.optedOut) {
                return {
                    success: false,
                    errorCode: 'NO_CONSENT',
                    errorMessage: 'User has not given active consent or has opted out of outbound PSTN phone calls.',
                };
            }
        }
        // 4. Generate or use specified room name and call ID
        const callId = params.callIdOverride || `call_${params.userId}_${Date.now()}`;
        const roomName = params.roomNameOverride || `room_${params.userId}_${Date.now()}`;
        const participantIdentity = `user_${params.userId}`;
        const provider = params.providerOverride || index_js_1.config.voiceProvider;
        // 5. Generate LiveKit AccessToken
        const at = new livekit_server_sdk_1.AccessToken(index_js_1.config.livekit.apiKey, index_js_1.config.livekit.apiSecret, {
            identity: participantIdentity,
            name: user.name,
            ttl: `${index_js_1.config.callingLimits.maxDurationSeconds}s`,
            metadata: JSON.stringify({
                userId: user.id,
                callId,
                callType: params.callType,
                provider,
                syntheticMode: index_js_1.config.privacy.syntheticDataMode,
            }),
        });
        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });
        const jwtToken = await at.toJwt();
        // 6. Record or update session in DB
        const existing = index_js_2.db.getCallSession(callId);
        if (existing) {
            index_js_2.db.updateCallSession(callId, {
                roomName,
                status: 'initiating',
                startedAt: existing.startedAt || new Date().toISOString(),
            });
        }
        else {
            index_js_2.db.createCallSession({
                id: callId,
                roomName,
                userId: user.id,
                type: params.callType,
                status: 'initiating',
                provider: provider,
                startedAt: new Date().toISOString(),
                transcript: [],
                attemptNumber: 1,
            });
        }
        return {
            success: true,
            data: {
                token: jwtToken,
                roomName,
                serverUrl: index_js_1.config.livekit.url,
                participantIdentity,
                callId,
                provider,
                maxDurationSeconds: index_js_1.config.callingLimits.maxDurationSeconds,
                isSynthetic: index_js_1.config.privacy.syntheticDataMode,
            },
        };
    }
}
exports.LiveKitTokenService = LiveKitTokenService;
