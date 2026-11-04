"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AICallScheduler = void 0;
const index_js_1 = require("../db/index.js");
class AICallScheduler {
    static pushTokens = new Map();
    static intervalId = null;
    static ringingCalls = new Map();
    /**
     * Initializes background polling to trigger scheduled calls when due.
     */
    static init() {
        if (this.intervalId)
            return;
        this.intervalId = setInterval(() => {
            this.checkAndTriggerDueCalls();
        }, 5000); // Check every 5 seconds
        console.log('[AICallScheduler] Initialized background scheduled call runner');
    }
    /**
     * Registers or updates an Expo push token for a user.
     */
    static registerPushToken(userId, token, platform) {
        this.pushTokens.set(userId, {
            userId,
            token,
            platform,
            updatedAt: new Date().toISOString(),
        });
        console.log(`[AICallScheduler] Registered push token for ${userId}: ${token.slice(0, 16)}...`);
    }
    static getPushToken(userId) {
        return this.pushTokens.get(userId)?.token;
    }
    /**
     * Checks for scheduled calls whose scheduledTime <= Date.now() and status is 'scheduled'.
     */
    static async checkAndTriggerDueCalls() {
        const now = Date.now();
        // Scan all call sessions in DB
        for (const session of index_js_1.db.callSessions.values()) {
            if (session.status === 'scheduled' && session.scheduledTime) {
                const scheduledTime = new Date(session.scheduledTime).getTime();
                if (scheduledTime <= now) {
                    await this.triggerIncomingCall(session.id);
                }
            }
        }
        // Auto-timeout ringing calls after 60 seconds if not accepted
        for (const [callId, data] of this.ringingCalls.entries()) {
            if (now - data.ringStartedAt > 60000) {
                index_js_1.db.updateCallSession(callId, { status: 'unanswered', endedAt: new Date().toISOString() });
                this.ringingCalls.delete(callId);
                console.log(`[AICallScheduler] Call ${callId} timed out (unanswered).`);
            }
        }
    }
    /**
     * Triggers an incoming call immediately (for scheduled time or testing).
     */
    static async triggerIncomingCall(callId) {
        const session = index_js_1.db.getCallSession(callId);
        if (!session)
            return false;
        const updated = index_js_1.db.updateCallSession(callId, { status: 'ringing' });
        if (!updated)
            return false;
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
    static async sendExpoPushNotification(expoPushToken, message) {
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
        }
        catch (err) {
            console.warn('[AICallScheduler] Failed to send push notification:', err.message);
        }
    }
    /**
     * Checks if there is any active ringing call for this user.
     */
    static getActiveRingingCall(userId) {
        for (const [callId] of this.ringingCalls.entries()) {
            const live = index_js_1.db.getCallSession(callId);
            if (live && live.userId === userId && live.status === 'ringing') {
                return live;
            }
        }
        return undefined;
    }
    /**
     * Clears ringing status on accept or decline.
     */
    static clearRinging(callId) {
        this.ringingCalls.delete(callId);
    }
}
exports.AICallScheduler = AICallScheduler;
