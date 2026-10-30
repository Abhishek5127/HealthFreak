import { AccessToken } from 'livekit-server-sdk';
import { config } from '../config/index.js';
import { db } from '../db/index.js';

export interface TokenRequestParams {
  userId: string;
  callType: 'in_app' | 'pstn_outbound';
  providerOverride?: 'gemini' | 'openai';
}

export interface TokenResponse {
  token: string;
  roomName: string;
  serverUrl: string;
  participantIdentity: string;
  callId: string;
  provider: string;
  maxDurationSeconds: number;
  isSynthetic: boolean;
}

export class LiveKitTokenService {
  /**
   * Generates a short-lived LiveKit token with strict admission control and concurrency checks.
   */
  public static async createCallSessionAndToken(params: TokenRequestParams): Promise<{
    success: boolean;
    data?: TokenResponse;
    errorCode?: 'USER_NOT_FOUND' | 'CONCURRENCY_LIMIT' | 'DAILY_QUOTA_EXCEEDED' | 'NO_CONSENT';
    errorMessage?: string;
  }> {
    const user = db.getUser(params.userId);
    if (!user) {
      return {
        success: false,
        errorCode: 'USER_NOT_FOUND',
        errorMessage: `User ${params.userId} does not exist`,
      };
    }

    // 1. Admission Control: Check Global Concurrency Limits
    const currentActiveCalls = db.getActiveCallsCount();
    if (currentActiveCalls >= config.callingLimits.maxConcurrentCalls) {
      return {
        success: false,
        errorCode: 'CONCURRENCY_LIMIT',
        errorMessage: `Max concurrent active calls (${config.callingLimits.maxConcurrentCalls}) reached. Free-tier admission control engaged.`,
      };
    }

    // 2. User Daily Quota Check
    const userTodayCalls = db.getUserCallsToday(params.userId);
    if (userTodayCalls >= config.callingLimits.dailyQuotaPerUser) {
      return {
        success: false,
        errorCode: 'DAILY_QUOTA_EXCEEDED',
        errorMessage: `Daily call quota of ${config.callingLimits.dailyQuotaPerUser} exceeded for user ${params.userId}.`,
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

    // 4. Generate unique room name and call ID
    const callId = `call_${params.userId}_${Date.now()}`;
    const roomName = `room_${params.userId}_${Date.now()}`;
    const participantIdentity = `user_${params.userId}`;
    const provider = params.providerOverride || config.voiceProvider;

    // 5. Generate LiveKit AccessToken
    const at = new AccessToken(config.livekit.apiKey, config.livekit.apiSecret, {
      identity: participantIdentity,
      name: user.name,
      ttl: `${config.callingLimits.maxDurationSeconds}s`,
      metadata: JSON.stringify({
        userId: user.id,
        callId,
        callType: params.callType,
        provider,
        syntheticMode: config.privacy.syntheticDataMode,
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

    // 6. Record session in DB
    db.createCallSession({
      id: callId,
      roomName,
      userId: user.id,
      type: params.callType,
      status: 'initiating',
      provider: provider as 'gemini' | 'openai',
      startedAt: new Date().toISOString(),
      transcript: [],
      attemptNumber: 1,
    });

    return {
      success: true,
      data: {
        token: jwtToken,
        roomName,
        serverUrl: config.livekit.url,
        participantIdentity,
        callId,
        provider,
        maxDurationSeconds: config.callingLimits.maxDurationSeconds,
        isSynthetic: config.privacy.syntheticDataMode,
      },
    };
  }
}

