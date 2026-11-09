"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceRouter = void 0;
exports.isSelfEcho = isSelfEcho;
const express_1 = require("express");
const genai_1 = require("@google/genai");
const tokenService_js_1 = require("../livekit/tokenService.js");
const exotelSipService_js_1 = require("../sip/exotelSipService.js");
const scheduledCallQueue_js_1 = require("../queue/scheduledCallQueue.js");
const index_js_1 = require("../db/index.js");
const healthMemoryStore_js_1 = require("../db/healthMemoryStore.js");
const planService_js_1 = require("../services/planService.js");
const costTracker_js_1 = require("../services/costTracker.js");
const index_js_2 = require("../config/index.js");
const voiceAgentProcess_js_1 = require("../services/voiceAgentProcess.js");
const sarvamService_js_1 = require("../services/sarvamService.js");
let geminiClient = null;
function getGeminiClient() {
    if (!geminiClient) {
        geminiClient = new genai_1.GoogleGenAI({ apiKey: index_js_2.config.gemini.apiKey });
    }
    return geminiClient;
}
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
        const { userId = 'usr_synthetic_alex' } = req.body;
        const user = index_js_1.db.getUser(userId) || index_js_1.db.getUser('usr_synthetic_alex');
        const firstName = user?.name ? user.name.split(' ')[0] : 'there';
        const hour = new Date().getHours();
        let timeGreeting = 'Namaste';
        if (hour >= 5 && hour < 12)
            timeGreeting = 'Suprabhat';
        else if (hour >= 18 && hour < 22)
            timeGreeting = 'Shubh Sandhya';
        const greeting = `${timeGreeting} ${firstName}! Main Coach Alex bol raha hoon, aapka HealthFreak AI coach. Aaj aapki fitness aur diet mein kya help karoon?`;
        let audioBase64;
        if (sarvamService_js_1.SarvamService.isConfigured()) {
            audioBase64 = await sarvamService_js_1.SarvamService.synthesizeSpeech(greeting);
        }
        res.json({
            greeting,
            audioBase64,
            audioMime: 'audio/wav',
            provider: sarvamService_js_1.SarvamService.isConfigured() ? 'sarvam' : 'gemini',
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 13. Health Coach Chat Turn (Sarvam AI 105B + Bulbul Neural Voice)
exports.voiceRouter.post('/chat', async (req, res) => {
    try {
        const { message, userId = 'usr_synthetic_alex', activityContext } = req.body;
        if (!message || typeof message !== 'string') {
            res.status(400).json({ error: 'message is required' });
            return;
        }
        const user = index_js_1.db.getUser(userId) || index_js_1.db.getUser('usr_synthetic_alex');
        const userName = user?.name ? user.name.split(' ')[0] : 'friend';
        // 1. Check if user mentioned pain, fatigue or dietary symptoms and update memory facts
        if (user) {
            const lower = message.toLowerCase();
            if (lower.includes('knee') || lower.includes('pain') || lower.includes('dard')) {
                index_js_1.db.updateMemoryFact(user.id, 'symptom_knee_discomfort', 'Reported discomfort: ' + message, 0.9);
            }
            if (lower.includes('tired') || lower.includes('fatigue') || lower.includes('thak')) {
                index_js_1.db.updateMemoryFact(user.id, 'energy_status', 'Low energy reported in chat', 0.9);
            }
            if (lower.includes('dinner') || lower.includes('lunch') || lower.includes('diet') || lower.includes('khana')) {
                index_js_1.db.updateMemoryFact(user.id, 'nutrition_query', 'Asked about meals in chat', 0.85);
            }
        }
        const activeFacts = user ? healthMemoryStore_js_1.healthMemoryStore.getActiveProfileFacts(user.id) : [];
        const memorySnippet = activeFacts.length > 0
            ? activeFacts.map((f) => `${f.key}: ${f.value}`).join('; ')
            : '';
        const activitySnippet = activityContext
            ? `Today steps: ${activityContext.todaySteps || 0} / ${activityContext.stepGoal || 10000}, active calories: ${activityContext.caloriesBurned || 0} kcal`
            : '';
        // 2. PRIMARY: Generate conversational reply and neural voice directly via Sarvam AI
        if (sarvamService_js_1.SarvamService.isConfigured()) {
            const sarvamResult = await sarvamService_js_1.SarvamService.generateChatReply({
                message,
                userName,
                conditions: user?.knownConditions || [],
                memorySnippet,
                activitySnippet,
                synthesizeVoice: true,
            });
            if (sarvamResult) {
                res.json({
                    text: sarvamResult.text,
                    suggestions: sarvamResult.suggestions,
                    audioBase64: sarvamResult.audioBase64,
                    audioMime: 'audio/wav',
                    provider: 'sarvam',
                });
                return;
            }
        }
        // 3. SECONDARY FALLBACK: Google Gemini
        let replyText = '';
        let suggestions = [];
        if (index_js_2.config.gemini.apiKey) {
            const systemPrompt = `You are Coach Alex, an elite AI Health and Wellness Coach at HealthFreak.
You are speaking directly with ${userName}.
User Profile:
- Known conditions/injuries: ${user?.knownConditions?.join(', ') || 'None'}
- Memory facts: ${memorySnippet || 'None'}
- Physical activity today: ${activitySnippet || 'None'}

Rules:
1. Respond in natural, warm, empathetic Hinglish using Latin alphabet (e.g. 'Arre ${userName}!').
2. Keep your answer concise: 2 to 3 short sentences maximum. Be clinically sound, motivating, and actionable.
3. Provide 3 short relevant follow-up suggestions (under 4 words each).
4. Return strict JSON: { "text": "...", "suggestions": ["...", "...", "..."] }`;
            const modelsToTry = [
                index_js_2.config.gemini.model || 'gemini-3.5-flash-lite',
                'gemini-3.8-flash',
                'gemini-3.1-flash-lite',
                'gemini-flash-latest',
            ];
            for (const m of modelsToTry) {
                try {
                    const ai = getGeminiClient();
                    const response = await ai.models.generateContent({
                        model: m,
                        contents: [
                            {
                                role: 'user',
                                parts: [{ text: `${systemPrompt}\n\nUser says: ${message}` }],
                            },
                        ],
                        config: {
                            responseMimeType: 'application/json',
                        },
                    });
                    const rawText = response.text?.trim();
                    if (rawText) {
                        const parsed = JSON.parse(rawText);
                        if (parsed.text) {
                            replyText = parsed.text;
                            suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
                            break;
                        }
                    }
                }
                catch (err) {
                    console.warn(`[VoiceRoutes] Gemini model ${m} notice:`, err?.message || err);
                }
            }
        }
        // 4. Clinical contextual fallback if all APIs are unavailable
        if (!replyText) {
            const lower = message.toLowerCase();
            if (lower.includes('knee') || lower.includes('pain') || lower.includes('dard')) {
                replyText = `Arre ${userName}, please stop heavy exercises right now! Rest your knee, apply a cold pack, and stick to gentle stretches today.`;
                suggestions = ['Gentle leg stretch', 'Rest day routine', 'Log pain severity'];
            }
            else if (lower.includes('dinner') || lower.includes('khana') || lower.includes('food') || lower.includes('eat')) {
                replyText = `For a healthy dinner ${userName}, go for light protein and veggies like grilled paneer, dal, and a small bowl of salad. Avoid heavy carbs late at night!`;
                suggestions = ['High protein dinner', 'Low carb recipes', 'Log my dinner'];
            }
            else if (lower.includes('workout') || lower.includes('exercise') || lower.includes('gym')) {
                replyText = `Great enthusiasm ${userName}! Let's focus on a 20-minute brisk walk followed by light mobility work to keep your joints healthy.`;
                suggestions = ['Start 20m walk', 'Mobility warmup', 'Log workout'];
            }
            else if (lower.includes('sleep') || lower.includes('tired') || lower.includes('thak')) {
                replyText = `Recovery is key, ${userName}! Make sure to drink a glass of water, keep screens away 30 minutes before bed, and get 7-8 hours of quality sleep tonight.`;
                suggestions = ['Sleep meditation', 'Log bedtime', 'Set wake-up goal'];
            }
            else {
                replyText = `Namaste ${userName}! Main Coach Alex bol raha hoon. Maine aapka message note kar liya hai—aaj diet ya workout mein kis cheez par focus karein?`;
                suggestions = ['Log my lunch', 'Check today workout', 'Suggest high protein snack'];
            }
        }
        if (suggestions.length === 0) {
            suggestions = ['Check my active plan', 'How is my hydration today?', 'Adjust my workout intensity'];
        }
        res.json({
            text: replyText.trim(),
            provider: 'gemini',
            suggestions,
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
