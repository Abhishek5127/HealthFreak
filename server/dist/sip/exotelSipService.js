"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExotelSipService = void 0;
const livekit_server_sdk_1 = require("livekit-server-sdk");
const index_js_1 = require("../config/index.js");
const index_js_2 = require("../db/index.js");
const phoneValidator_js_1 = require("./phoneValidator.js");
const memoryService_js_1 = require("../services/memoryService.js");
class ExotelSipService {
    static sipClient = null;
    static getSipClient() {
        if (!this.sipClient) {
            this.sipClient = new livekit_server_sdk_1.SipClient(index_js_1.config.livekit.url, index_js_1.config.livekit.apiKey, index_js_1.config.livekit.apiSecret);
        }
        return this.sipClient;
    }
    /**
     * Dispatches an outbound PSTN phone call to an Indian user via Exotel SIP trunk.
     */
    static async initiateOutboundCall(req) {
        const user = index_js_2.db.getUser(req.userId);
        if (!user) {
            return { success: false, status: 'failed', error: `User ${req.userId} not found` };
        }
        // 1. Consent verification
        if (!user.callingConsent || user.optedOut) {
            return {
                success: false,
                status: 'rejected',
                error: `User has not consented to automated outbound health calls (optedOut=${user.optedOut})`,
            };
        }
        // 2. Validate Indian phone number
        const targetPhone = req.phone || user.phone;
        const phoneValidation = (0, phoneValidator_js_1.validateIndianPhoneNumber)(targetPhone);
        if (!phoneValidation.isValid || !phoneValidation.formattedNumber) {
            return {
                success: false,
                status: 'failed',
                error: `Invalid Indian phone number: ${phoneValidation.reason}`,
            };
        }
        // 3. Admission & concurrency check
        const activeCalls = index_js_2.db.getActiveCallsCount();
        if (activeCalls >= index_js_1.config.callingLimits.maxConcurrentCalls) {
            return {
                success: false,
                status: 'failed',
                error: `System concurrency limit (${index_js_1.config.callingLimits.maxConcurrentCalls}) reached. Admission control delayed call.`,
            };
        }
        // 4. Duplicate call / Idempotency check
        if (req.idempotencyKey) {
            const existing = index_js_2.db.findCallByIdempotencyKey(req.idempotencyKey);
            if (existing) {
                return {
                    success: true,
                    callId: existing.id,
                    roomName: existing.roomName,
                    status: existing.status,
                };
            }
        }
        // 5. Generate room and session
        const callId = `pstn_${user.id}_${Date.now()}`;
        const roomName = `room_pstn_${user.id}_${Date.now()}`;
        const participantIdentity = `pstn_${phoneValidation.formattedNumber}`;
        const session = {
            id: callId,
            roomName,
            userId: user.id,
            type: 'pstn_outbound',
            status: 'initiating',
            provider: index_js_1.config.voiceProvider,
            startedAt: new Date().toISOString(),
            transcript: [],
            idempotencyKey: req.idempotencyKey,
            attemptNumber: req.attemptNumber || 1,
        };
        index_js_2.db.createCallSession(session);
        // 6. Connect via LiveKit SIP Outbound Participant
        try {
            // In live environment with LiveKit SIP credentials:
            // const sip = this.getSipClient();
            // await sip.createSipParticipant({
            //   sipTrunkId: config.livekit.sipTrunkId,
            //   sipCallTo: phoneValidation.formattedNumber,
            //   roomName,
            //   participantIdentity,
            //   participantName: user.name,
            // });
            // For initial testing/free-tier or mock sandbox mode:
            index_js_2.db.updateCallSession(callId, {
                status: 'ringing',
                sipCallSid: `exotel_sid_${Date.now()}`,
            });
            return {
                success: true,
                callId,
                roomName,
                sipParticipantId: participantIdentity,
                status: 'ringing',
            };
        }
        catch (err) {
            index_js_2.db.updateCallSession(callId, {
                status: 'failed',
                failureReason: err.message,
            });
            return {
                success: false,
                status: 'failed',
                error: `SIP dispatch error: ${err.message}`,
            };
        }
    }
    /**
     * Handles Exotel / LiveKit SIP Webhook status callbacks.
     */
    static handleStatusWebhook(payload) {
        const callId = payload.callId;
        let session = callId ? index_js_2.db.getCallSession(callId) : undefined;
        if (!session && payload.CallSid) {
            // Search by sipCallSid
            for (const s of index_js_2.db.callSessions.values()) {
                if (s.sipCallSid === payload.CallSid) {
                    session = s;
                    break;
                }
            }
        }
        if (!session) {
            return { acknowledged: false };
        }
        const rawStatus = (payload.Status || payload.EventType || '').toLowerCase();
        let updatedStatus = session.status;
        if (rawStatus.includes('ringing')) {
            updatedStatus = 'ringing';
        }
        else if (rawStatus.includes('in-progress') || rawStatus.includes('connected') || rawStatus.includes('answered')) {
            updatedStatus = 'connected';
        }
        else if (rawStatus.includes('busy')) {
            updatedStatus = 'busy';
        }
        else if (rawStatus.includes('no-answer') || rawStatus.includes('unanswered') || rawStatus.includes('timeout')) {
            updatedStatus = 'unanswered';
        }
        else if (rawStatus.includes('rejected') || rawStatus.includes('declined') || rawStatus.includes('canceled')) {
            updatedStatus = 'rejected';
        }
        else if (rawStatus.includes('completed') || rawStatus.includes('ended')) {
            updatedStatus = 'completed';
        }
        else if (rawStatus.includes('failed')) {
            updatedStatus = 'failed';
        }
        const duration = payload.Duration || (updatedStatus === 'completed' ? 180 : 0);
        const updated = index_js_2.db.updateCallSession(session.id, {
            status: updatedStatus,
            durationSeconds: duration,
            endedAt: ['completed', 'busy', 'rejected', 'failed', 'unanswered'].includes(updatedStatus)
                ? new Date().toISOString()
                : undefined,
        });
        // If call just ended, trigger post-call memory extraction
        if (['completed', 'busy', 'rejected', 'failed', 'unanswered'].includes(updatedStatus)) {
            memoryService_js_1.MemoryService.processSessionTranscript(session.id);
        }
        return { acknowledged: true, session: updated };
    }
}
exports.ExotelSipService = ExotelSipService;
