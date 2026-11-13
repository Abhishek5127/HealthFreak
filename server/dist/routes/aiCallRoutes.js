"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiCallRouter = void 0;
const express_1 = require("express");
const index_js_1 = require("../db/index.js");
const tokenService_js_1 = require("../livekit/tokenService.js");
const openaiRealtimeBridge_js_1 = require("../agent/openaiRealtimeBridge.js");
const aiCallScheduler_js_1 = require("../queue/aiCallScheduler.js");
const index_js_2 = require("../config/index.js");
const sarvamService_js_1 = require("../services/sarvamService.js");
exports.aiCallRouter = (0, express_1.Router)();
/**
 * 1. POST /api/ai-calls/schedule
 * Schedules an AI voice call for a specific future timestamp.
 */
exports.aiCallRouter.post('/schedule', async (req, res) => {
    try {
        const { userId = 'usr_synthetic_alex', scheduledTime, // ISO string or unix ms
        topic = 'General Wellness & Nutrition Check-in', language = 'English', } = req.body;
        if (!scheduledTime) {
            res.status(400).json({ error: 'scheduledTime is required' });
            return;
        }
        const scheduledDate = new Date(scheduledTime);
        if (isNaN(scheduledDate.getTime())) {
            res.status(400).json({ error: 'Invalid scheduledTime format' });
            return;
        }
        const callId = `call_${userId}_${Date.now()}`;
        const roomName = `room_${userId}_${Date.now()}`;
        const session = {
            id: callId,
            roomName,
            userId,
            type: 'in_app',
            status: 'scheduled',
            provider: index_js_2.config.voiceProvider,
            transcript: [],
            attemptNumber: 0,
            summary: `Scheduled call: ${topic} (${language})`,
        };
        // Attach scheduling metadata
        session.scheduledTime = scheduledDate.toISOString();
        session.topic = topic;
        session.language = language;
        index_js_1.db.createCallSession(session);
        console.log(`[AICallRoutes] Scheduled call ${callId} for ${scheduledDate.toISOString()}`);
        res.json({
            success: true,
            message: 'AI call scheduled successfully',
            call: session,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to schedule call' });
    }
});
/**
 * 2. GET /api/ai-calls/upcoming
 * Fetches upcoming scheduled calls for the user.
 */
exports.aiCallRouter.get('/upcoming', (req, res) => {
    try {
        const userId = req.query.userId || 'usr_synthetic_alex';
        const list = [];
        for (const session of index_js_1.db.callSessions.values()) {
            if (session.userId === userId && (session.status === 'scheduled' || session.status === 'ringing')) {
                list.push(session);
            }
        }
        // Sort by scheduledTime ascending
        list.sort((a, b) => new Date(a.scheduledTime || 0).getTime() - new Date(b.scheduledTime || 0).getTime());
        res.json({ success: true, upcoming: list });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * 3. GET /api/ai-calls/active-incoming
 * Checks if there is an active ringing incoming call for the user.
 */
exports.aiCallRouter.get('/active-incoming', (req, res) => {
    try {
        const userId = req.query.userId || 'usr_synthetic_alex';
        const ringingCall = aiCallScheduler_js_1.AICallScheduler.getActiveRingingCall(userId);
        if (ringingCall) {
            res.json({ success: true, hasIncomingCall: true, call: ringingCall });
        }
        else {
            res.json({ success: true, hasIncomingCall: false });
        }
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * 4. POST /api/ai-calls/token
 * Generates a secure LiveKit access token for joining the voice room.
 */
exports.aiCallRouter.post('/token', async (req, res) => {
    try {
        const { userId = 'usr_synthetic_alex', callId, roomName } = req.body;
        const result = await tokenService_js_1.LiveKitTokenService.createCallSessionAndToken({
            userId,
            callType: 'in_app',
            providerOverride: 'gemini',
            callIdOverride: callId,
            roomNameOverride: roomName,
        });
        if (!result.success) {
            res.status(400).json({ error: result.errorMessage, code: result.errorCode });
            return;
        }
        res.json(result.data);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Token generation failed' });
    }
});
/**
 * 5. POST /api/ai-calls/:id/accept
 * Accepts a call, marks it connected, and spins up the OpenAI Realtime AI session.
 */
exports.aiCallRouter.post('/:id/accept', async (req, res) => {
    try {
        const callId = req.params.id;
        let session = index_js_1.db.getCallSession(callId);
        if (!session) {
            // Auto-create in-app direct call session for immediate connection
            const userId = req.body?.userId || req.query?.userId || 'usr_synthetic_alex';
            const roomName = `room_${userId}_${Date.now()}`;
            session = {
                id: callId,
                roomName,
                userId,
                type: 'in_app',
                status: 'connected',
                provider: index_js_2.config.voiceProvider,
                transcript: [],
                attemptNumber: 0,
                summary: 'Direct Coaching Call',
            };
            index_js_1.db.createCallSession(session);
        }
        aiCallScheduler_js_1.AICallScheduler.clearRinging(callId);
        const startedAt = new Date().toISOString();
        index_js_1.db.updateCallSession(callId, {
            status: 'connected',
            startedAt,
        });
        // Start OpenAI Realtime session for this room
        if (index_js_2.config.voiceProvider === 'openai' && index_js_2.config.openai.apiKey) {
            await openaiRealtimeBridge_js_1.OpenAIRealtimeBridge.startSession({
                callId: session.id,
                userId: session.userId,
                roomName: session.roomName,
                onError: (err) => {
                    console.warn(`[AICallRoutes] Realtime bridge error on ${callId}:`, err);
                },
            });
        }
        // Also get the LiveKit token for the accepting user
        const tokenResult = await tokenService_js_1.LiveKitTokenService.createCallSessionAndToken({
            userId: session.userId,
            callType: 'in_app',
            providerOverride: 'gemini',
            callIdOverride: session.id,
            roomNameOverride: session.roomName,
        });
        const user = index_js_1.db.getUser(session.userId) || { name: 'there' };
        const firstName = user.name ? user.name.split(' ')[0] : 'there';
        const lang = session.language || 'English';
        let greeting = `Hello ${firstName}! Coach Mack here. How is your energy and body feeling today?`;
        if (lang === 'Hinglish') {
            greeting = `Namaste ${firstName}! Coach Mack here. Aaj aap kaisa feel kar rahe hain?`;
        }
        else if (lang === 'Hindi') {
            greeting = `नमस्ते ${firstName}! मैं Coach Mack हूँ। आज आप कैसा महसूस कर रहे हैं?`;
        }
        index_js_1.db.appendTranscript(callId, 'coach', greeting);
        res.json({
            success: true,
            message: 'Call accepted',
            call: index_js_1.db.getCallSession(callId),
            livekit: tokenResult.data,
            greeting,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * Generates an empathetic, concise AI coach response powered directly by Sarvam AI:
 * 1. Sarvam AI Chat / LiveKit Voice Coach
 * 2. Smart Contextual Clinical Fallback (Dinner, hairfall, knee pain, sleep, recovery)
 */
async function generateCoachVoiceReply(params) {
    const { message, user, memoryFacts } = params;
    const firstName = user?.name ? user.name.split(' ')[0] : 'friend';
    if (sarvamService_js_1.SarvamService.isConfigured()) {
        try {
            const result = await sarvamService_js_1.SarvamService.generateChatReply({
                message,
                userName: firstName,
                conditions: user?.knownConditions || [],
                memorySnippet: Array.isArray(memoryFacts) ? memoryFacts.map((f) => f.fact || f).join('; ') : '',
                synthesizeVoice: false,
            });
            if (result?.text) {
                return result.text;
            }
        }
        catch (err) {
            console.warn('[AICallRoutes] Sarvam generation notice:', err?.message || err);
        }
    }
    // Return explicit error text if AI model is unreachable — no canned fallback strings
    return 'Error: Coach Mack could not generate a response. Please check your network and try again.';
}
/**
 * 5b. POST /api/ai-calls/:id/user-message
 * User speaks or messages during the active voice call.
 */
exports.aiCallRouter.post('/:id/user-message', async (req, res) => {
    try {
        const callId = req.params.id;
        const { message } = req.body;
        if (!message) {
            res.status(400).json({ error: 'message is required' });
            return;
        }
        const session = index_js_1.db.getCallSession(callId);
        if (!session) {
            res.status(404).json({ error: 'Call session not found' });
            return;
        }
        index_js_1.db.appendTranscript(callId, 'user', message);
        openaiRealtimeBridge_js_1.OpenAIRealtimeBridge.sendTextMessage(callId, message);
        const user = index_js_1.db.getUser(session.userId) || {
            id: session.userId,
            name: 'Alex',
            phone: '+919876543210',
            languagePreference: 'en',
            callingConsent: true,
            consentTimestamp: new Date().toISOString(),
            optedOut: false,
            preferredCallHourIST: 10,
            healthGoals: ['Weight management'],
            knownConditions: [],
            currentEnergyLevel: 'moderate',
        };
        const memoryFacts = index_js_1.db.getUserMemory(session.userId);
        const coachReply = await generateCoachVoiceReply({
            message,
            user,
            memoryFacts,
            transcript: session.transcript,
        });
        index_js_1.db.appendTranscript(callId, 'coach', coachReply);
        res.json({
            success: true,
            coachReply,
            transcript: index_js_1.db.getCallSession(callId)?.transcript || [],
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * 6. POST /api/ai-calls/:id/decline
 * Declines an incoming call.
 */
exports.aiCallRouter.post('/:id/decline', (req, res) => {
    try {
        const callId = req.params.id;
        aiCallScheduler_js_1.AICallScheduler.clearRinging(callId);
        openaiRealtimeBridge_js_1.OpenAIRealtimeBridge.closeSession(callId);
        const updated = index_js_1.db.updateCallSession(callId, {
            status: 'rejected',
            endedAt: new Date().toISOString(),
        });
        res.json({ success: true, message: 'Call declined', call: updated });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * 7. POST /api/ai-calls/:id/end
 * Gracefully terminates an active call and records duration.
 */
exports.aiCallRouter.post('/:id/end', (req, res) => {
    try {
        const callId = req.params.id;
        aiCallScheduler_js_1.AICallScheduler.clearRinging(callId);
        openaiRealtimeBridge_js_1.OpenAIRealtimeBridge.closeSession(callId);
        const session = index_js_1.db.getCallSession(callId);
        if (!session) {
            res.status(404).json({ error: 'Call session not found' });
            return;
        }
        const endedAt = new Date().toISOString();
        let durationSeconds = 0;
        if (session.startedAt) {
            durationSeconds = Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000));
        }
        const updated = index_js_1.db.updateCallSession(callId, {
            status: 'completed',
            endedAt,
            durationSeconds,
        });
        res.json({
            success: true,
            message: 'Call ended successfully',
            call: updated,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * 8. GET /api/ai-calls/history
 * Fetches call history for the user.
 */
exports.aiCallRouter.get('/history', (req, res) => {
    try {
        const userId = req.query.userId || 'usr_synthetic_alex';
        const list = [];
        for (const session of index_js_1.db.callSessions.values()) {
            if (session.userId === userId && ['completed', 'rejected', 'unanswered', 'failed'].includes(session.status)) {
                list.push(session);
            }
        }
        list.sort((a, b) => new Date(b.startedAt || b.endedAt || 0).getTime() - new Date(a.startedAt || a.endedAt || 0).getTime());
        res.json({ success: true, history: list });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * 9. POST /api/ai-calls/push-token
 * Registers an Expo push token for receiving incoming call notifications.
 */
exports.aiCallRouter.post('/push-token', (req, res) => {
    try {
        const { userId = 'usr_synthetic_alex', token, platform } = req.body;
        if (!token) {
            res.status(400).json({ error: 'Push token is required' });
            return;
        }
        aiCallScheduler_js_1.AICallScheduler.registerPushToken(userId, token, platform);
        res.json({ success: true, message: 'Push token registered successfully' });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * 10. POST /api/ai-calls/trigger-test
 * Instantly triggers an incoming call simulation for the user (for quick testing).
 */
exports.aiCallRouter.post('/trigger-test', async (req, res) => {
    try {
        const { userId = 'usr_synthetic_alex', delaySeconds = 0 } = req.body;
        const callId = `call_${userId}_${Date.now()}`;
        const roomName = `room_${userId}_${Date.now()}`;
        const session = {
            id: callId,
            roomName,
            userId,
            type: 'in_app',
            status: 'scheduled',
            provider: index_js_2.config.voiceProvider,
            transcript: [],
            attemptNumber: 0,
            summary: 'Immediate Test Incoming Call',
        };
        session.scheduledTime = new Date(Date.now() + delaySeconds * 1000).toISOString();
        index_js_1.db.createCallSession(session);
        if (delaySeconds <= 0) {
            await aiCallScheduler_js_1.AICallScheduler.triggerIncomingCall(callId);
        }
        res.json({
            success: true,
            message: `Incoming call test triggered (delay: ${delaySeconds}s)`,
            callId,
            roomName,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
