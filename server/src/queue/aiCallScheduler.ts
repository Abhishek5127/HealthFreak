import { db, CallSession } from '../db/index.js';

export interface PushTokenStore {
  userId: string;
  token: string;
  platform?: string;
  updatedAt: string;
}

export class AICallScheduler {
  private static pushTokens: Map<string, PushTokenStore> = new Map();
  private static intervalId: any = null;
  private static ringingCalls: Map<string, { call: CallSession; ringStartedAt: number }> = new Map();

  /**
   * Initializes background polling to trigger scheduled calls when due.
   */
  public static init(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.checkAndTriggerDueCalls();
    }, 5000); // Check every 5 seconds
    console.log('[AICallScheduler] Initialized background scheduled call runner');
  }

  /**
   * Registers or updates an Expo push token for a user.
   */
  public static registerPushToken(userId: string, token: string, platform?: string): void {
    this.pushTokens.set(userId, {
      userId,
      token,
      platform,
      updatedAt: new Date().toISOString(),
    });
    console.log(`[AICallScheduler] Registered push token for ${userId}: ${token.slice(0, 16)}...`);
  }

  public static getPushToken(userId: string): string | undefined {
    return this.pushTokens.get(userId)?.token;
  }

  /**
   * Checks for scheduled calls whose scheduledTime <= Date.now() and status is 'scheduled'.
   */
  public static async checkAndTriggerDueCalls(): Promise<void> {
    const now = Date.now();
    // Scan all call sessions in DB
    for (const session of (db as any).callSessions.values()) {
      if (session.status === 'scheduled' && (session as any).scheduledTime) {
        const scheduledTime = new Date((session as any).scheduledTime).getTime();
        if (scheduledTime <= now) {
          await this.triggerIncomingCall(session.id);
        }
      }
    }

    // Auto-timeout ringing calls after 60 seconds if not accepted
    for (const [callId, data] of this.ringingCalls.entries()) {
      if (now - data.ringStartedAt > 60000) {
        db.updateCallSession(callId, { status: 'unanswered', endedAt: new Date().toISOString() });
        this.ringingCalls.delete(callId);
        console.log(`[AICallScheduler] Call ${callId} timed out (unanswered).`);
      }
    }
  }

  /**
   * Triggers an incoming call immediately (for scheduled time or testing).
   */
  public static async triggerIncomingCall(callId: string): Promise<boolean> {
    const session = db.getCallSession(callId);
    if (!session) return false;

    const updated = db.updateCallSession(callId, { status: 'ringing' });
    if (!updated) return false;
    this.ringingCalls.set(callId, { call: updated, ringStartedAt: Date.now() });
    console.log(`[AICallScheduler] Incoming call triggered for user ${session.userId} (CallId: ${callId})`);

    // Send Expo Push Notification if token exists
    const pushToken = this.getPushToken(session.userId);
    if (pushToken && pushToken.startsWith('ExponentPushToken')) {
      await this.sendExpoPushNotification(pushToken, {
        title: 'HealthFreak AI',
        body: '📞 Incoming scheduled wellness call from your AI Health Coach...',
        data: {
          type: 'incoming_ai_call',
          callId: session.id,
          roomName: session.roomName,
        },
      });
    }

    return true;
  }

  /**
   * Dispatches push notification via Expo Push API.
   */
  private static async sendExpoPushNotification(
    expoPushToken: string,
    message: { title: string; body: string; data?: any }
  ): Promise<void> {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: expoPushToken,
          sound: 'default',
          title: message.title,
          body: message.body,
          data: message.data,
          priority: 'high',
          channelId: 'incoming-calls',
        }),
      });
      const result = await response.json();
      console.log('[AICallScheduler] Push notification sent:', result);
    } catch (err: any) {
      console.warn('[AICallScheduler] Failed to send push notification:', err.message);
    }
  }

  /**
   * Checks if there is any active ringing call for this user.
   */
  public static getActiveRingingCall(userId: string): CallSession | undefined {
    for (const [callId] of this.ringingCalls.entries()) {
      const live = db.getCallSession(callId);
      if (live && live.userId === userId && live.status === 'ringing') {
        return live;
      }
    }
    return undefined;
  }

  /**
   * Clears ringing status on accept or decline.
   */
  public static clearRinging(callId: string): void {
    this.ringingCalls.delete(callId);
  }
}
