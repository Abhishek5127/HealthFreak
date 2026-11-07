import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
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
  private static readonly STORAGE_KEY = '@healthfreak_scheduled_calls_v1';

  private static async getLocalCalls(): Promise<ScheduledAICall[]> {
    try {
      const raw = await AsyncStorage.getItem(AICallService.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private static async saveLocalCalls(calls: ScheduledAICall[]): Promise<void> {
    try {
      await AsyncStorage.setItem(AICallService.STORAGE_KEY, JSON.stringify(calls));
    } catch {}
  }

  private static async upsertLocalCall(call: ScheduledAICall): Promise<void> {
    const calls = await AICallService.getLocalCalls();
    const idx = calls.findIndex((c) => c.id === call.id);
    if (idx >= 0) {
      calls[idx] = { ...calls[idx], ...call };
    } else {
      calls.push(call);
    }
    await AICallService.saveLocalCalls(calls);
  }

  /**
   * Schedules an upcoming AI voice call. Works seamlessly in both online server & standalone APK.
   */
  public static async scheduleCall(params: {
    userId?: string;
    scheduledTime: string;
    topic?: string;
    language?: string;
  }): Promise<{ success: boolean; call?: ScheduledAICall; error?: string }> {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const localCall: ScheduledAICall = {
      id: callId,
      roomName: `healthfreak-room-${Date.now()}`,
      userId: params.userId || 'usr_synthetic_alex',
      type: 'in_app',
      status: 'scheduled',
      scheduledTime: params.scheduledTime,
      topic: params.topic || 'Daily Health & Wellness Check-in',
      language: params.language || 'English + Hinglish',
    };

    // 1. Try remote backend if running in web or remote LAN
    const baseUrl = getBackendBaseUrl();
    const isLocalhostOnNative =
      Platform.OS !== 'web' &&
      (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'));

    if (!isLocalhostOnNative) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`${baseUrl}/api/ai-calls/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          if (data.call) {
            await AICallService.upsertLocalCall(data.call);
            return { success: true, call: data.call };
          }
        }
      } catch {
        // Fall back to local scheduling
      }
    }

    // 2. Local standalone scheduling (guarantees call schedules immediately on APK)
    await AICallService.upsertLocalCall(localCall);

    // Schedule local system notification trigger if scheduled for future
    try {
      const triggerTime = new Date(params.scheduledTime).getTime();
      const diffMs = triggerTime - Date.now();
      if (diffMs > 1000) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📞 Incoming Call from Coach Alex',
            body: `HealthFreak AI Coach: ${localCall.topic}`,
            data: { callId: localCall.id, roomName: localCall.roomName, type: 'incoming_call' },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: Math.max(1, Math.round(diffMs / 1000)),
          },
        }).catch(() => {});
      }
    } catch {}

    return { success: true, call: localCall };
  }

  /**
   * Fetches upcoming scheduled calls for the user.
   */
  public static async getUpcomingCalls(userId = 'usr_synthetic_alex'): Promise<ScheduledAICall[]> {
    const localCalls = await AICallService.getLocalCalls();
    const now = Date.now();
    // Keep calls that are scheduled and not expired by more than 2 hours
    const activeLocal = localCalls.filter(
      (c) =>
        (!c.userId || c.userId === userId) &&
        c.status === 'scheduled' &&
        new Date(c.scheduledTime).getTime() >= now - 120000
    );

    const baseUrl = getBackendBaseUrl();
    const isLocalhostOnNative =
      Platform.OS !== 'web' &&
      (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'));

    if (!isLocalhostOnNative) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${baseUrl}/api/ai-calls/upcoming?userId=${encodeURIComponent(userId)}`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          const remoteUpcoming: ScheduledAICall[] = data.upcoming || [];
          const map = new Map<string, ScheduledAICall>();
          for (const c of activeLocal) map.set(c.id, c);
          for (const c of remoteUpcoming) map.set(c.id, c);
          return Array.from(map.values()).sort(
            (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
          );
        }
      } catch {}
    }

    return activeLocal.sort(
      (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );
  }

  /**
   * Checks if an incoming call is currently ringing for the user.
   */
  public static async checkActiveIncomingCall(
    userId = 'usr_synthetic_alex'
  ): Promise<{ hasIncomingCall: boolean; call?: ScheduledAICall }> {
    const localCalls = await AICallService.getLocalCalls();
    const now = Date.now();

    // Check if any call is currently ringing (within last 45s)
    const existingRinging = localCalls.find(
      (c) =>
        (!c.userId || c.userId === userId) &&
        c.status === 'ringing' &&
        now - new Date(c.scheduledTime).getTime() < 45000
    );
    if (existingRinging) {
      return { hasIncomingCall: true, call: existingRinging };
    }

    // Check if any scheduled call has hit its scheduled timestamp
    const dueCall = localCalls.find(
      (c) =>
        (!c.userId || c.userId === userId) &&
        c.status === 'scheduled' &&
        new Date(c.scheduledTime).getTime() <= now &&
        now - new Date(c.scheduledTime).getTime() < 90000 // Within 90-second arrival window
    );

    if (dueCall) {
      dueCall.status = 'ringing';
      await AICallService.upsertLocalCall(dueCall);
      return { hasIncomingCall: true, call: dueCall };
    }

    // Otherwise check backend if available
    const baseUrl = getBackendBaseUrl();
    const isLocalhostOnNative =
      Platform.OS !== 'web' &&
      (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'));

    if (!isLocalhostOnNative) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`${baseUrl}/api/ai-calls/active-incoming?userId=${encodeURIComponent(userId)}`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          return {
            hasIncomingCall: !!data.hasIncomingCall,
            call: data.call,
          };
        }
      } catch {}
    }

    return { hasIncomingCall: false };
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
    const localCalls = await AICallService.getLocalCalls();
    const call = localCalls.find((c) => c.id === callId);
    if (call) {
      call.status = 'connected';
      call.startedAt = new Date().toISOString();
      await AICallService.upsertLocalCall(call);
    }

    const baseUrl = getBackendBaseUrl();
    const isLocalhostOnNative =
      Platform.OS !== 'web' &&
      (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'));

    if (!isLocalhostOnNative) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`${baseUrl}/api/ai-calls/${callId}/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          return {
            success: true,
            call: data.call || call,
            livekit: data.livekit,
            greeting: data.greeting,
          };
        }
      } catch {}
    }

    return {
      success: true,
      call: call || {
        id: callId,
        roomName: `healthfreak-room-${Date.now()}`,
        userId: 'usr_synthetic_alex',
        type: 'in_app',
        status: 'connected',
        scheduledTime: new Date().toISOString(),
      },
      greeting: 'Hello! I am Coach Alex, your AI health coach from HealthFreak. How is your energy and body feeling today?',
    };
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
    const localCalls = await AICallService.getLocalCalls();
    const call = localCalls.find((c) => c.id === callId);
    if (call) {
      call.status = 'rejected';
      call.endedAt = new Date().toISOString();
      await AICallService.upsertLocalCall(call);
    }

    const baseUrl = getBackendBaseUrl();
    const isLocalhostOnNative =
      Platform.OS !== 'web' &&
      (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'));

    if (!isLocalhostOnNative) {
      try {
        await fetch(`${baseUrl}/api/ai-calls/${callId}/decline`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {}
    }
    return true;
  }

  /**
   * Ends an active call.
   */
  public static async endCall(callId: string): Promise<boolean> {
    const localCalls = await AICallService.getLocalCalls();
    const call = localCalls.find((c) => c.id === callId);
    if (call) {
      call.status = 'completed';
      call.endedAt = new Date().toISOString();
      await AICallService.upsertLocalCall(call);
    }

    const baseUrl = getBackendBaseUrl();
    const isLocalhostOnNative =
      Platform.OS !== 'web' &&
      (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'));

    if (!isLocalhostOnNative) {
      try {
        await fetch(`${baseUrl}/api/ai-calls/${callId}/end`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {}
    }
    return true;
  }

  /**
   * Fetches past call history.
   */
  public static async getCallHistory(userId = 'usr_synthetic_alex'): Promise<ScheduledAICall[]> {
    const localCalls = await AICallService.getLocalCalls();
    const pastLocal = localCalls.filter(
      (c) => (!c.userId || c.userId === userId) && c.status !== 'scheduled'
    );

    const baseUrl = getBackendBaseUrl();
    const isLocalhostOnNative =
      Platform.OS !== 'web' &&
      (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'));

    if (!isLocalhostOnNative) {
      try {
        const res = await fetch(`${baseUrl}/api/ai-calls/history?userId=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json();
          const remoteHistory = data.history || [];
          const map = new Map<string, ScheduledAICall>();
          for (const c of pastLocal) map.set(c.id, c);
          for (const c of remoteHistory) map.set(c.id, c);
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime()
          );
        }
      } catch {}
    }

    return pastLocal.sort(
      (a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime()
    );
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
    const callId = `call_test_${Date.now()}`;
    const scheduledTime = new Date(Date.now() + (delaySeconds || 0) * 1000).toISOString();
    const testCall: ScheduledAICall = {
      id: callId,
      roomName: `healthfreak-test-${Date.now()}`,
      userId,
      type: 'in_app',
      status: delaySeconds > 0 ? 'scheduled' : 'ringing',
      scheduledTime,
      topic: 'Quick Energy & Wellness Check-in',
      language: 'English + Hinglish',
    };

    await AICallService.upsertLocalCall(testCall);

    const baseUrl = getBackendBaseUrl();
    const isLocalhostOnNative =
      Platform.OS !== 'web' &&
      (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'));

    if (!isLocalhostOnNative) {
      try {
        await fetch(`${baseUrl}/api/ai-calls/trigger-test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, delaySeconds }),
        });
      } catch {}
    }

    return { success: true, callId };
  }
}
