"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiveKitTokenService = void 0;
const livekit_server_sdk_1 = require("livekit-server-sdk");
const index_js_1 = require("../config/index.js");
const index_js_2 = require("../db/index.js");
const supabaseClient_js_1 = require("../db/supabaseClient.js");
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
        const dispatchMetadata = JSON.stringify({
            user_id: user.id,
            call_id: callId,
            purpose: params.purpose || 'checkin',
            scheduled_call_id: params.scheduledCallId || null,
        });
        // 5. Generate LiveKit AccessToken
        const at = new livekit_server_sdk_1.AccessToken(index_js_1.config.livekit.apiKey, index_js_1.config.livekit.apiSecret, {
            identity: participantIdentity,
            name: user.name,
            ttl: `${index_js_1.config.callingLimits.maxDurationSeconds}s`,
            metadata: JSON.stringify({
                userId: user.id,
                callId,
                callType: params.callType,
                purpose: params.purpose || 'checkin',
                scheduledCallId: params.scheduledCallId || null,
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
        // 5b. Explicit Agent Dispatch with server-minted metadata
        // Only dispatch if explicitly requested (e.g. for scheduled LiveKit calls) to avoid clogging worker daemon
        const shouldDispatch = params.dispatchAgent === true;
        if (shouldDispatch && index_js_1.config.coach.explicitDispatchEnabled && index_js_1.config.livekit.apiKey && index_js_1.config.livekit.apiSecret) {
            try {
                const hostUrl = index_js_1.config.livekit.url.replace(/^ws/, 'http');
                const dispatchClient = new livekit_server_sdk_1.AgentDispatchClient(hostUrl, index_js_1.config.livekit.apiKey, index_js_1.config.livekit.apiSecret);
                await dispatchClient.createDispatch(roomName, index_js_1.config.coach.agentName, {
                    metadata: dispatchMetadata,
                });
                console.log(`[LiveKitTokenService] Explicit agent dispatch created for '${index_js_1.config.coach.agentName}' in room '${roomName}'`);
            }
            catch (err) {
                console.warn(`[LiveKitTokenService] Explicit agent dispatch notice (dev/fallback active):`, err.message);
            }
        }
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
        // Sync to PostgreSQL calls table
        const pool = supabaseClient_js_1.SupabaseDb.getPool();
        if (pool) {
            try {
                await pool.query(`INSERT INTO calls (id, user_id, channel, purpose, scheduled_call_id, status, started_at)
           VALUES ($1, $2, $3, $4, $5, 'initiating', NOW())
           ON CONFLICT (id) DO UPDATE SET status = 'initiating', updated_at = NOW();`, [
                    callId,
                    user.id,
                    params.callType === 'pstn_outbound' ? 'phone' : 'app',
                    params.purpose || 'checkin',
                    params.scheduledCallId || null,
                ]);
            }
            catch (err) {
                console.warn('[LiveKitTokenService] Notice writing call row to Postgres:', err.message);
            }
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
