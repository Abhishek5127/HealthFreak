import { SipClient } from 'livekit-server-sdk';
import { config } from '../config/index.js';
import { db, CallSession } from '../db/index.js';
import { validateIndianPhoneNumber } from './phoneValidator.js';
import { MemoryService } from '../services/memoryService.js';

export interface OutboundCallRequest {
  userId: string;
  phone?: string;
  idempotencyKey?: string;
  attemptNumber?: number;
}

export interface OutboundCallResponse {
  success: boolean;
  callId?: string;
  roomName?: string;
  sipParticipantId?: string;
  status: CallSession['status'];
  error?: string;
}

export class ExotelSipService {
  private static sipClient: SipClient | null = null;

  private static getSipClient(): SipClient {
    if (!this.sipClient) {
      this.sipClient = new SipClient(config.livekit.url, config.livekit.apiKey, config.livekit.apiSecret);
    }
    return this.sipClient;
  }

  /**
   * Dispatches an outbound PSTN phone call to an Indian user via Exotel SIP trunk.
   */
  public static async initiateOutboundCall(req: OutboundCallRequest): Promise<OutboundCallResponse> {
    const user = db.getUser(req.userId);
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
    const phoneValidation = validateIndianPhoneNumber(targetPhone);
    if (!phoneValidation.isValid || !phoneValidation.formattedNumber) {
      return {
        success: false,
        status: 'failed',
        error: `Invalid Indian phone number: ${phoneValidation.reason}`,
      };
    }

    // 3. Admission & concurrency check
    const activeCalls = db.getActiveCallsCount();
    if (activeCalls >= config.callingLimits.maxConcurrentCalls) {
      return {
        success: false,
        status: 'failed',
        error: `System concurrency limit (${config.callingLimits.maxConcurrentCalls}) reached. Admission control delayed call.`,
      };
    }

    // 4. Duplicate call / Idempotency check
    if (req.idempotencyKey) {
      const existing = db.findCallByIdempotencyKey(req.idempotencyKey);
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

    const session: CallSession = {
      id: callId,
      roomName,
      userId: user.id,
      type: 'pstn_outbound',
      status: 'initiating',
      provider: config.voiceProvider,
      startedAt: new Date().toISOString(),
      transcript: [],
      idempotencyKey: req.idempotencyKey,
      attemptNumber: req.attemptNumber || 1,
    };
    db.createCallSession(session);

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
      db.updateCallSession(callId, {
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
    } catch (err: any) {
      db.updateCallSession(callId, {
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
  public static handleStatusWebhook(payload: {
    CallSid?: string;
    Status?: string;
    EventType?: string;
    callId?: string;
    Duration?: number;
  }): { acknowledged: boolean; session?: CallSession } {
    const callId = payload.callId;
    let session = callId ? db.getCallSession(callId) : undefined;

    if (!session && payload.CallSid) {
      // Search by sipCallSid
      for (const s of (db as any).callSessions.values()) {
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
    let updatedStatus: CallSession['status'] = session.status;

    if (rawStatus.includes('ringing')) {
      updatedStatus = 'ringing';
    } else if (rawStatus.includes('in-progress') || rawStatus.includes('connected') || rawStatus.includes('answered')) {
      updatedStatus = 'connected';
    } else if (rawStatus.includes('busy')) {
      updatedStatus = 'busy';
    } else if (rawStatus.includes('no-answer') || rawStatus.includes('unanswered') || rawStatus.includes('timeout')) {
      updatedStatus = 'unanswered';
    } else if (rawStatus.includes('rejected') || rawStatus.includes('declined') || rawStatus.includes('canceled')) {
      updatedStatus = 'rejected';
    } else if (rawStatus.includes('completed') || rawStatus.includes('ended')) {
      updatedStatus = 'completed';
    } else if (rawStatus.includes('failed')) {
      updatedStatus = 'failed';
    }

    const duration = payload.Duration || (updatedStatus === 'completed' ? 180 : 0);

    const updated = db.updateCallSession(session.id, {
      status: updatedStatus,
      durationSeconds: duration,
      endedAt: ['completed', 'busy', 'rejected', 'failed', 'unanswered'].includes(updatedStatus)
        ? new Date().toISOString()
        : undefined,
    });

    // If call just ended, trigger post-call memory extraction
    if (['completed', 'busy', 'rejected', 'failed', 'unanswered'].includes(updatedStatus)) {
      MemoryService.processSessionTranscript(session.id);
    }

    return { acknowledged: true, session: updated };
  }
}

