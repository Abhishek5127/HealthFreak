"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceRouter = void 0;
exports.isSelfEcho = isSelfEcho;
const express_1 = require("express");
const tokenService_js_1 = require("../livekit/tokenService.js");
const exotelSipService_js_1 = require("../sip/exotelSipService.js");
const scheduledCallQueue_js_1 = require("../queue/scheduledCallQueue.js");
const index_js_1 = require("../db/index.js");
const planService_js_1 = require("../services/planService.js");
const costTracker_js_1 = require("../services/costTracker.js");
const voiceAgentProcess_js_1 = require("../services/voiceAgentProcess.js");
exports.voiceRouter = (0, express_1.Router)();
// 1. In-App Call Session Token
exports.voiceRouter.post('/session', async (req, res) => {
    try {
        const { userId, providerOverride, purpose, scheduledCallId } = req.body;
        if (!userId) {
            res.status(400).json({ error: 'userId is required' });
            return;
        }
        const result = await tokenService_js_1.LiveKitTokenService.createCallSessionAndToken({
            userId,
            callType: 'in_app',
            providerOverride,
            purpose,
            scheduledCallId,
        });
        if (!result.success) {
            const statusCode = result.errorCode === 'CONCURRENCY_LIMIT' || result.errorCode === 'DAILY_QUOTA_EXCEEDED' ? 429 : 400;
            res.status(statusCode).json({ error: result.errorMessage, code: result.errorCode });
            return;
        }
        // Auto-launch Standalone LiveKit + Sarvam AI Voice Agent in console mode
        if (req.body.startConsole !== false) {
            voiceAgentProcess_js_1.VoiceAgentProcess.startConsole();
        }
        res.json(result.data);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Server error creating session' });
    }
});
// 1b. Start Standalone LiveKit + Sarvam AI Voice Agent Console Mode
exports.voiceRouter.post('/console/start', (_req, res) => {
    const result = voiceAgentProcess_js_1.VoiceAgentProcess.startConsole();
    res.json(result);
});
// 1c. Stop Standalone LiveKit + Sarvam AI Voice Agent Console Mode
exports.voiceRouter.post('/console/stop', (_req, res) => {
    const result = voiceAgentProcess_js_1.VoiceAgentProcess.stopConsole();
    res.json(result);
});
// 1d. Live Transcripts & Events from Standalone Voice Agent
exports.voiceRouter.get('/console/events', (req, res) => {
    const since = parseFloat(req.query.since) || 0;
    const events = voiceAgentProcess_js_1.VoiceAgentProcess.getLatestTranscripts(since);
    const status = voiceAgentProcess_js_1.VoiceAgentProcess.getStatus();
    res.json({ success: true, events, status });
});
// 2. Outbound PSTN Call (Direct)
exports.voiceRouter.post('/call/outbound', async (req, res) => {
    try {
        const { userId, phone, idempotencyKey } = req.body;
        if (!userId) {
            res.status(400).json({ error: 'userId is required' });
            return;
        }
        const result = await exotelSipService_js_1.ExotelSipService.initiateOutboundCall({
            userId,
            phone,
            idempotencyKey,
        });
        if (!result.success) {
            res.status(400).json({ error: result.error, status: result.status });
            return;
        }
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 3. Schedule Outbound PSTN Call via BullMQ
exports.voiceRouter.post('/call/schedule', async (req, res) => {
    try {
        const { userId, phone, preferredHourIST, idempotencyKey } = req.body;
        if (!userId) {
            res.status(400).json({ error: 'userId is required' });
            return;
        }
        const key = idempotencyKey || `sched_${userId}_${new Date().toISOString().slice(0, 10)}`;
        const result = await scheduledCallQueue_js_1.ScheduledCallQueue.scheduleCall({
            userId,
            phone,
            preferredHourIST,
            idempotencyKey: key,
            attemptNumber: 1,
            maxAttempts: 3,
        });
        if (!result.success) {
            res.status(400).json({ error: result.reason });
            return;
        }
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 4. User Opt-Out / Consent Revocation
exports.voiceRouter.post('/opt-out', (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
    }
    const success = index_js_1.db.optOutUser(userId);
    if (!success) {
        res.status(404).json({ error: `User ${userId} not found` });
        return;
    }
    res.json({ success: true, message: `User ${userId} successfully opted out of all automated voice calls.` });
});
// 5. Update Calling Consent
exports.voiceRouter.post('/consent', (req, res) => {
    const { userId, consent } = req.body;
    if (!userId || typeof consent !== 'boolean') {
        res.status(400).json({ error: 'userId and boolean consent are required' });
        return;
    }
    const success = index_js_1.db.setUserConsent(userId, consent);
    if (!success) {
        res.status(404).json({ error: `User ${userId} not found` });
        return;
    }
    res.json({ success: true, consent, timestamp: new Date().toISOString() });
});
// 6. Exotel / LiveKit SIP Webhook Handler
exports.voiceRouter.post('/sip/webhook', (req, res) => {
    const result = exotelSipService_js_1.ExotelSipService.handleStatusWebhook(req.body);
    res.json(result);
});
// 7. Get Call Session Details & Transcript
exports.voiceRouter.get('/call/:callId', (req, res) => {
    const session = index_js_1.db.getCallSession(req.params.callId);
    if (!session) {
        res.status(404).json({ error: 'Call session not found' });
        return;
    }
    res.json(session);
});
// 8. Get User Memory & Active Plan
exports.voiceRouter.get('/user/:userId/memory', (req, res) => {
    const user = index_js_1.db.getUser(req.params.userId);
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    const memory = index_js_1.db.getUserMemory(user.id);
    const activePlan = index_js_1.db.getActivePlan(user.id);
    const draftPlan = index_js_1.db.getDraftPlan(user.id);
    res.json({
        user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            languagePreference: user.languagePreference,
            callingConsent: user.callingConsent,
            optedOut: user.optedOut,
            conditions: user.knownConditions,
            energy: user.currentEnergyLevel,
        },
        memory,
        activePlan,
        draftPlan,
    });
});
// 9. Generate Plan Draft (Backend Health-Safety Validation)
exports.voiceRouter.post('/plan/generate', async (req, res) => {
    try {
        const { userId, draft } = req.body;
        if (!userId || !draft) {
            res.status(400).json({ error: 'userId and draft are required' });
            return;
        }
        const result = await planService_js_1.PlanService.generatePlanDraft(userId, draft);
        if (!result.success) {
            res.status(400).json({ error: 'Validation failed', details: result.errors });
            return;
        }
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 10. Confirm Plan Draft
exports.voiceRouter.post('/plan/confirm', (req, res) => {
    const { userId, planId } = req.body;
    if (!userId || !planId) {
        res.status(400).json({ error: 'userId and planId are required' });
        return;
    }
    const confirmed = planService_js_1.PlanService.confirmDraftPlan(userId, planId);
    if (!confirmed) {
        res.status(404).json({ error: 'Draft plan not found or already archived' });
        return;
    }
    res.json({ success: true, activePlan: confirmed });
});
// 11. Cost & Privacy Metrics
exports.voiceRouter.get('/metrics', (_req, res) => {
    const metrics = costTracker_js_1.CostAndPrivacyTracker.getMetrics();
    res.json(metrics);
});
/**
 * Converts raw 16-bit linear PCM audio into standard RIFF WAVE (.wav) container.
 */
function pcmToWav(pcmBuffer, sampleRate = 24000, numChannels = 1, bitDepth = 16) {
    const header = Buffer.alloc(44);
    const dataLen = pcmBuffer.length;
    const byteRate = (sampleRate * numChannels * bitDepth) / 8;
    const blockAlign = (numChannels * bitDepth) / 8;
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataLen, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(numChannels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitDepth, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataLen, 40);
    return Buffer.concat([header, pcmBuffer]);
}
const audioCache = new Map();
// Periodically clean up clips older than 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of audioCache.entries()) {
        if (now - value.createdAt > 600000) {
            audioCache.delete(key);
        }
    }
}, 60000);
// Endpoint to stream generated neural speech directly to client AudioPlayer
exports.voiceRouter.get('/audio/:id.wav', (req, res) => {
    const id = req.params.id;
    const item = audioCache.get(id);
    if (!item) {
        res.status(404).send('Audio clip not found or expired');
        return;
    }
    res.set({
        'Content-Type': item.mime || 'audio/wav',
        'Content-Length': item.buffer.length.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
    });
    res.send(item.buffer);
});
// 12. Dynamic Health Coach Greeting (Sarvam AI Hinglish Voice Persona)
exports.voiceRouter.post('/greeting', async (req, res) => {
    try {
        const greeting = 'नमस्ते! मैं HealthFreak voice coach हूँ। आज आपकी fitness और diet में क्या help कर सकता हूँ?';
        res.json({
            greeting,
            provider: 'sarvam',
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 13. Health Coach Chat Turn (Sarvam AI & LiveKit Voice Agent)
exports.voiceRouter.post('/chat', async (req, res) => {
    try {
        const { message, userId = 'usr_synthetic_alex' } = req.body;
        if (!message || typeof message !== 'string') {
            res.status(400).json({ error: 'message is required' });
            return;
        }
        const user = index_js_1.db.getUser(userId) || index_js_1.db.getUser('usr_synthetic_alex');
        // Check recent events from active console agent
        const events = voiceAgentProcess_js_1.VoiceAgentProcess.getLatestTranscripts();
        const lastCoachEvent = [...events].reverse().find((e) => e.coach_reply);
        let replyText = lastCoachEvent?.coach_reply;
        if (!replyText) {
            replyText = 'नमस्ते! मैंने आपका message note कर लिया है। आज आपकी fitness और diet में क्या plan है?';
        }
        if (user) {
            const lower = message.toLowerCase();
            if (lower.includes('knee') || lower.includes('pain') || lower.includes('dard')) {
                index_js_1.db.updateMemoryFact(user.id, 'symptom_knee_discomfort', 'Reported discomfort during chat', 0.9);
            }
            if (lower.includes('tired') || lower.includes('fatigue')) {
                index_js_1.db.updateMemoryFact(user.id, 'energy_status', 'Low energy reported in chat', 0.9);
            }
        }
        res.json({
            text: replyText.trim(),
            provider: 'sarvam',
            suggestions: ['Check my active plan', 'How is my hydration today?', 'Adjust my workout intensity'],
        });
    }
    catch (err) {
        console.error('❌  [CHAT PROCESSING ERROR]:', err.message);
        res.status(500).json({ error: err.message || 'Error processing chat' });
    }
});
function isSelfEcho(userText, coachText) {
    if (!userText || !coachText)
        return false;
    const cleanUser = userText
        .toLowerCase()
        .replace(/[^\w\s\u0900-\u097F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const cleanCoach = coachText
        .toLowerCase()
        .replace(/[^\w\s\u0900-\u097F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!cleanUser || !cleanCoach)
        return false;
    if (cleanUser.includes('(speaker echo') || cleanUser.includes('speaker feedback')) {
        return true;
    }
    const coachIdentityPhrases = [
        'main alex bol raha hoon',
        'main alex bol raha',
        'main alex hoon',
        'alex bol raha hoon',
        'coach alex here',
        'aapki ai health coach',
        'aapki health coach',
        'healthfreak coach',
        'ai health coach from healthfreak',
        'taking a quick wellness check in',
        'time for a peaceful wind down',
    ];
    for (const phrase of coachIdentityPhrases) {
        if (cleanUser.includes(phrase)) {
            return true;
        }
    }
    if (cleanUser.length >= 10 && cleanCoach.includes(cleanUser)) {
        return true;
    }
    const userWords = cleanUser.split(' ').filter((w) => w.length > 2);
    if (userWords.length >= 3) {
        const matchingWords = userWords.filter((w) => cleanCoach.includes(w));
        const ratio = matchingWords.length / userWords.length;
        if (ratio >= 0.65) {
            return true;
        }
    }
    return false;
}
// 14. Audio Turn (Live Standalone Sarvam AI Voice Agent)
exports.voiceRouter.post('/audio-turn', async (req, res) => {
    try {
        const events = voiceAgentProcess_js_1.VoiceAgentProcess.getLatestTranscripts();
        const lastEvent = events[events.length - 1];
        res.json({
            userTranscript: lastEvent?.user_transcript || 'Voice note received',
            coachReply: lastEvent?.coach_reply || 'नमस्ते! मैं सुन रहा हूँ, आज आपकी fitness और diet में क्या help करूँ?',
            provider: 'sarvam',
            isEcho: false,
        });
    }
    catch (err) {
        res.status(500).json({
            userTranscript: 'Voice input received',
            coachReply: 'नमस्ते! मैं सुन रहा हूँ।',
            error: err.message,
        });
    }
});
