import { Platform } from 'react-native';
import { getBackendBaseUrl } from './aiChatService';

export interface ScheduledAICall {
  id: string;
  roomName: string;
  userId: string;
  type: 'in_app';
  status: 'scheduled' | 'ringing' | 'connected' | 'completed' | 'rejected' | 'unanswered';
  scheduledTime: string;
  topic?: string;
  language?: string;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  summary?: string;
}

export interface LiveKitTokenData {
  token: string;
  roomName: string;
  serverUrl: string;
  participantIdentity: string;
  callId: string;
  provider: string;
  maxDurationSeconds: number;
}

export class AICallService {
  /**
   * Schedules an upcoming AI voice call.
   */
  public static async scheduleCall(params: {
    userId?: string;
    scheduledTime: string;
    topic?: string;
    language?: string;
  }): Promise<{ success: boolean; call?: ScheduledAICall; error?: string }> {
    try {
      const baseUrl = getBackendBaseUrl();
      const res = await fetch(`${baseUrl}/api/ai-calls/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to schedule call' };
      }

      return { success: true, call: data.call };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error scheduling call' };
    }
  }

  /**
   * Fetches upcoming scheduled calls for the user.
   */
  public static async getUpcomingCalls(userId = 'usr_synthetic_alex'): Promise<ScheduledAICall[]> {
    try {
      const baseUrl = getBackendBaseUrl();
      const res = await fetch(`${baseUrl}/api/ai-calls/upcoming?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.upcoming || [];
    } catch {
      return [];
    }
  }

  /**
   * Checks if an incoming call is currently ringing for the user.
   */
  public static async checkActiveIncomingCall(
    userId = 'usr_synthetic_alex'
  ): Promise<{ hasIncomingCall: boolean; call?: ScheduledAICall }> {
    try {
      const baseUrl = getBackendBaseUrl();
      const res = await fetch(`${baseUrl}/api/ai-calls/active-incoming?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) return { hasIncomingCall: false };
      const data = await res.json();
      return {
        hasIncomingCall: !!data.hasIncomingCall,
        call: data.call,
      };
    } catch {
      return { hasIncomingCall: false };
    }
  }

  /**
   * Obtains a secure LiveKit token to connect to the audio room.
   */
  public static async getLiveKitToken(params: {
    userId?: string;
    callId?: string;
    roomName?: string;
  }): Promise<{ success: boolean; data?: LiveKitTokenData; error?: string }> {
    try {
      const baseUrl = getBackendBaseUrl();
      const res = await fetch(`${baseUrl}/api/ai-calls/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to generate token' };
      }

      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Accepts an incoming call.
   */
  public static async acceptCall(callId: string): Promise<{
    success: boolean;
    call?: ScheduledAICall;
    livekit?: LiveKitTokenData;
    greeting?: string;
    error?: string;
  }> {
    try {
      const baseUrl = getBackendBaseUrl();
      const res = await fetch(`${baseUrl}/api/ai-calls/${callId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to accept call' };
      }

      return {
        success: true,
        call: data.call,
        livekit: data.livekit,
        greeting: data.greeting,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Sends user speech / message to the active AI call.
   */
  public static async sendUserMessage(
    callId: string,
    message: string
  ): Promise<{ success: boolean; coachReply?: string; transcript?: any[]; error?: string }> {
    try {
      const baseUrl = getBackendBaseUrl();
      const res = await fetch(`${baseUrl}/api/ai-calls/${callId}/user-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      return {
        success: res.ok,
        coachReply: data.coachReply,
        transcript: data.transcript,
        error: data.error,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Declines an incoming call.
   */
  public static async declineCall(callId: string): Promise<boolean> {
    try {
      const baseUrl = getBackendBaseUrl();
      const res = await fetch(`${baseUrl}/api/ai-calls/${callId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Ends an active call.
   */
  public static async endCall(callId: string): Promise<boolean> {
    try {
      const baseUrl = getBackendBaseUrl();
      const res = await fetch(`${baseUrl}/api/ai-calls/${callId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetches past call history.
   */
  public static async getCallHistory(userId = 'usr_synthetic_alex'): Promise<ScheduledAICall[]> {
    try {
      const baseUrl = getBackendBaseUrl();
      const res = await fetch(`${baseUrl}/api/ai-calls/history?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.history || [];
    } catch {
      return [];
    }
  }

  /**
   * Registers Expo Push Token on the backend for background incoming call notification.
   */
  public static async registerPushToken(userId: string, token: string): Promise<boolean> {
    try {
      const baseUrl = getBackendBaseUrl();
      const res = await fetch(`${baseUrl}/api/ai-calls/push-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token, platform: Platform.OS }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Triggers an immediate or delayed test incoming call.
   */
  public static async triggerTestCall(
    userId = 'usr_synthetic_alex',
    delaySeconds = 0
  ): Promise<{ success: boolean; callId?: string; error?: string }> {
    try {
      const baseUrl = getBackendBaseUrl();
      const res = await fetch(`${baseUrl}/api/ai-calls/trigger-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, delaySeconds }),
      });
      const data = await res.json();
      return { success: res.ok, callId: data.callId, error: data.error };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

