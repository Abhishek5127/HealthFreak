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
const version_js_1 = require("../config/version.js");
const openerBudget_js_1 = require("../coach/style/openerBudget.js");
const voiceAgentProcess_js_1 = require("../services/voiceAgentProcess.js");
const sarvamService_js_1 = require("../services/sarvamService.js");
const healthMemoryEngine_js_1 = require("../services/healthMemoryEngine.js");
const pendingOpsManager_js_1 = require("../coach/memory/pendingOpsManager.js");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const supabaseClient_js_1 = require("../db/supabaseClient.js");
let geminiClient = null;
function getGeminiClient() {
    if (!geminiClient) {
        geminiClient = new genai_1.GoogleGenAI({ apiKey: index_js_2.config.gemini.apiKey });
    }
    return geminiClient;
}
exports.voiceRouter = (0, express_1.Router)();
// Ephemeral in-memory cache for streamable synthesized neural audio files
const generatedAudioCache = new Map();
setInterval(() => {
    const now = Date.now();
    for (const [id, item] of generatedAudioCache.entries()) {
        if (now - item.createdAt > 15 * 60 * 1000) {
            generatedAudioCache.delete(id);
        }
    }
}, 5 * 60 * 1000);
// Endpoint to stream generated WAV audio files directly to mobile / web players
exports.voiceRouter.get('/audio/:id.wav', (req, res) => {
    const item = generatedAudioCache.get(req.params.id);
    if (!item) {
        res.status(404).send('Audio not found or expired');
        return;
    }
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', item.buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(item.buffer);
});
// 1. In-App Call Session Token
exports.voiceRouter.post('/session', authMiddleware_js_1.authenticateSupabaseToken, async (req, res) => {
    try {
        const userId = req.userId;
        const { providerOverride, purpose, scheduledCallId } = req.body;
        if (scheduledCallId) {
            let callUserId = null;
            const pool = supabaseClient_js_1.SupabaseDb.getPool();
            if (pool) {
                try {
                    const checkRes = await pool.query('SELECT user_id FROM scheduled_calls WHERE id = $1 LIMIT 1', [scheduledCallId]);
                    if (checkRes.rows[0]) {
                        callUserId = checkRes.rows[0].user_id;
                    }
                }
                catch { }
            }
            if (!callUserId && supabaseClient_js_1.SupabaseDb.isConfigured()) {
                try {
                    const { data } = await supabaseClient_js_1.SupabaseDb.getClient()
                        .from('scheduled_calls')
                        .select('user_id')
                        .eq('id', scheduledCallId)
                        .maybeSingle();
                    if (data?.user_id) {
                        callUserId = data.user_id;
                    }
                }
                catch { }
            }
            if (!callUserId) {
                const memSession = index_js_1.db.getCallSession(scheduledCallId);
                if (memSession) {
                    callUserId = memSession.userId;
                }
            }
            if (!callUserId || callUserId !== userId) {
                res.status(403).json({ error: 'Forbidden: scheduled call does not belong to user' });
                return;
            }
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
        // Standalone console mode only launched if explicitly requested by developer
        if (req.body.startConsole === true) {
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
// 12. Dynamic Health Coach Greeting (Sarvam AI Hinglish Voice Persona with In-Memory Audio Cache)
const greetingAudioCache = new Map();
exports.voiceRouter.post('/greeting', async (req, res) => {
    try {
        const { userId = 'usr_synthetic_alex', userName: incomingUserName } = req.body;
        let pool = supabaseClient_js_1.SupabaseDb.getPool();
        let userTz = 'Asia/Kolkata';
        let dbName = '';
        if (pool && userId && userId !== 'usr_synthetic_alex') {
            try {
                const pRes = await pool.query('SELECT name, timezone FROM profiles WHERE id = $1 LIMIT 1;', [userId]);
                if (pRes.rows[0]) {
                    if (pRes.rows[0].timezone)
                        userTz = pRes.rows[0].timezone;
                    if (pRes.rows[0].name)
                        dbName = pRes.rows[0].name.split(' ')[0];
                }
            }
            catch { }
        }
        const user = index_js_1.db.getUser(userId) || (userId === 'usr_synthetic_alex' ? index_js_1.db.getUser('usr_synthetic_alex') : null);
        const resolvedName = incomingUserName?.trim() || dbName || (user?.name ? user.name.split(' ')[0] : '');
        const firstName = resolvedName && resolvedName !== 'Friend' ? resolvedName : '';
        const hourStr = new Intl.DateTimeFormat('en-US', {
            timeZone: userTz,
            hour: 'numeric',
            hour12: false,
        }).format(new Date());
        const hour = parseInt(hourStr, 10);
        let timeGreeting = 'Namaste';
        if (hour >= 5 && hour < 12)
            timeGreeting = 'Suprabhat';
        else if (hour >= 18 && hour < 22)
            timeGreeting = 'Shubh Sandhya';
        const greeting = firstName
            ? `${timeGreeting} ${firstName}! Main Coach Mack hoon. Aaj aapki fitness aur diet mein kya help karoon?`
            : `${timeGreeting}! Main Coach Mack hoon. Aaj aapki fitness aur diet mein kya help karoon?`;
        const cacheKey = `${timeGreeting}_${firstName || 'noname'}`;
        let audioBase64 = greetingAudioCache.get(cacheKey);
        if (!audioBase64 && sarvamService_js_1.SarvamService.isConfigured()) {
            audioBase64 = await sarvamService_js_1.SarvamService.synthesizeSpeech(greeting);
            if (audioBase64) {
                greetingAudioCache.set(cacheKey, audioBase64);
            }
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
// 12b. Speech Synthesis Turn (Sarvam AI Bulbul Neural Voice)
exports.voiceRouter.post('/tts', async (req, res) => {
    try {
        const { text, speaker = 'shubh' } = req.body;
        if (!text || typeof text !== 'string') {
            res.status(400).json({ error: 'text is required' });
            return;
        }
        let audioBase64;
        if (sarvamService_js_1.SarvamService.isConfigured()) {
            audioBase64 = await sarvamService_js_1.SarvamService.synthesizeSpeech(text, speaker);
        }
        res.json({
            audioBase64,
            audioMime: 'audio/wav',
            provider: 'sarvam',
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 13. Health Coach Streaming Turn (SSE: Sarvam AI 105B + Bulbul Neural Voice)
exports.voiceRouter.post('/chat/stream', async (req, res) => {
    const startTime = Date.now();
    const { message, userId = 'usr_synthetic_alex', userName: incomingUserName, activityContext, lastCoachReply = '', sessionId, history } = req.body;
    if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'message is required' });
        return;
    }
    // Setup Server-Sent Events headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('X-Prompt-Version', version_js_1.PROMPT_VERSION);
    res.flushHeaders?.();
    const abortController = new AbortController();
    // CRITICAL FIX: In Node.js / Express, req emits 'close' as soon as the POST request body is read!
    // Listening to req.on('close') caused the abortController to abort immediately on every single request.
    // We MUST listen to res.on('close') and ONLY abort if the client dropped the connection prematurely before completion!
    res.on('close', () => {
        if (!res.writableEnded) {
            console.log('[VoiceRoutes/Stream] Client disconnected prematurely. Aborting upstream stream.');
            abortController.abort();
        }
    });
    const sendEvent = (event, data) => {
        if (res.writableEnded)
            return;
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };
    let dbName = '';
    const pool = supabaseClient_js_1.SupabaseDb.getPool();
    if (pool && userId && userId !== 'usr_synthetic_alex') {
        try {
            const pRes = await pool.query('SELECT name FROM profiles WHERE id = $1 LIMIT 1;', [userId]);
            if (pRes.rows[0]?.name)
                dbName = pRes.rows[0].name.split(' ')[0];
        }
        catch { }
    }
    const user = index_js_1.db.getUser(userId) || (userId === 'usr_synthetic_alex' ? index_js_1.db.getUser('usr_synthetic_alex') : null);
    const resolvedUserName = incomingUserName?.trim() || dbName || (user?.name ? user.name.split(' ')[0] : '');
    const userName = resolvedUserName && resolvedUserName !== 'Friend' ? resolvedUserName : '';
    const lowerMsg = message.toLowerCase();
    // 1. Critical Health Safety & Red Flag Escalation
    const isRedFlag = lowerMsg.includes('chest pain') ||
        lowerMsg.includes('chhati') ||
        lowerMsg.includes('chhaati') ||
        lowerMsg.includes('shortness of breath') ||
        lowerMsg.includes('saans nahi') ||
        lowerMsg.includes('faint') ||
        lowerMsg.includes('behoshi') ||
        lowerMsg.includes('palpitation');
    if (isRedFlag) {
        const safetyReply = userName
            ? `Dhyan se sunein ${userName}: Chest discomfort ya saans lene mein takleef serious medical condition ke lakshan ho sakte hain. Kripya turant kisi physician ya emergency room se consult karein aur saare workouts immediately rok dein.`
            : `Dhyan se sunein: Chest discomfort ya saans lene mein takleef serious medical condition ke lakshan ho sakte hain. Kripya turant kisi physician ya emergency room se consult karein aur saare workouts immediately rok dein.`;
        sendEvent('response_start', { timestamp: Date.now(), isSafetyAlert: true });
        sendEvent('text_delta', { delta: safetyReply });
        sendEvent('text_complete', {
            fullText: safetyReply,
            suggestions: ['Contact emergency care', 'Consult a doctor', 'Rest immediately'],
        });
        if (sarvamService_js_1.SarvamService.isConfigured()) {
            try {
                const audio = await sarvamService_js_1.SarvamService.synthesizeSpeech(safetyReply);
                if (audio) {
                    sendEvent('audio_chunk', { sequence: 0, text: safetyReply, audioBase64: audio, sampleRate: 22050, mimeType: 'audio/wav' });
                }
            }
            catch { }
        }
        sendEvent('audio_complete', { totalChunks: 1 });
        sendEvent('response_complete', { durationMs: Date.now() - startTime });
        res.end();
        return;
    }
    // 2. Long-term contextual memory retrieval (< 35 ms)
    const healthContext = await healthMemoryEngine_js_1.HealthMemoryEngine.getRelevantContext(userId, message, activityContext);
    // 3. Asynchronously ingest symptoms without blocking the response path
    healthMemoryEngine_js_1.HealthMemoryEngine.scheduleSymptomIngestion(userId, message);
    sendEvent('response_start', { timestamp: Date.now(), model: 'sarvam-105b-conversations' });
    const sessionKey = sessionId || userId || 'default';
    const state = openerBudget_js_1.OpenerBudget.getState(sessionKey);
    const openerAllowed = openerBudget_js_1.OpenerBudget.isOpenerAllowed(sessionKey);
    const recentOpeners = state.lastOpenerUsed ? `"${state.lastOpenerUsed}"` : 'none';
    const nameHint = openerAllowed && userName
        ? `\nThis turn you may open with the user's first name (${userName}) or a very short interjection if natural.`
        : '';
    // 4. Construct System Prompt with contextual memory snippet
    const systemPrompt = `You are Coach Mack, an elite AI Health and Wellness Coach at HealthFreak.
${healthContext.promptSnippet}

Core Coaching Instructions:
1. Start directly with the answer. A very short natural interjection or the user's first name may open a reply only rarely, and never in two replies in a row. Recently used openers (vary, reuse rarely): ${recentOpeners}.${nameHint}
2. Length & style: Keep ordinary conversation short (2 to 3 sentences). When user asks for an exercise, a routine, or what to do, give a concrete prescription immediately: 3 to 4 exercises with sets and reps or duration, plus rest, home-only (up to 5 short sentences allowed).
3. Safety: Urgent-care advice ONLY for red flags (chest pain, breathlessness, fainting, numbness or tingling spreading down an arm or leg, sudden severe pain, trauma). For mild muscle strain or soreness, give safe mobility and strengthening guidance.
4. Show continuity naturally: If user mentions pain, reference their earlier reports without reciting bullet lists.
5. Do NOT use emojis, asterisks, hashtags, or markdown. Output plain spoken conversational text only.`;
    const cleanHistory = history && Array.isArray(history) && history.length > 0
        ? openerBudget_js_1.OpenerBudget.sanitizeHistory(history.slice(-10), userName)
            .map((h) => ({
            role: h.role === 'coach' ? 'assistant' : h.role,
            content: (h.content || h.text || '').trim(),
        }))
            .filter((h) => h.content.length > 0)
        : [];
    let totalAudioChunks = 0;
    const ttsBuffer = new sarvamService_js_1.SentenceTTSBuffer((chunk) => {
        totalAudioChunks++;
        sendEvent('audio_chunk', chunk);
    }, 'shubh');
    let fullGeneratedText = '';
    const streamFilter = new openerBudget_js_1.StreamingOpenerFilter({
        sessionId: sessionKey,
        userName,
        path: '/chat/stream',
        lang: 'hi',
        onToken: (filteredToken) => {
            fullGeneratedText += filteredToken;
            sendEvent('text_delta', { delta: filteredToken });
            ttsBuffer.addToken(filteredToken);
        },
    });
    // 5. PRIMARY: Stream LLM via Sarvam 105B
    let sarvamSuccess = false;
    if (sarvamService_js_1.SarvamService.isConfigured()) {
        try {
            await sarvamService_js_1.SarvamService.streamChatCompletion({
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...cleanHistory,
                    { role: 'user', content: message },
                ],
                abortSignal: abortController.signal,
                onToken: (token) => {
                    streamFilter.push(token);
                },
            });
            await streamFilter.flush();
            sarvamSuccess = true;
        }
        catch (err) {
            console.warn('[VoiceRoutes/Stream] Sarvam streaming notice:', err?.message || err);
        }
    }
    // If request was aborted by client (e.g. user interrupted or new note arrived), STOP immediately!
    if (abortController.signal.aborted) {
        console.log('[VoiceRoutes/Stream] Stream aborted by client. Terminating cleanly.');
        res.end();
        return;
    }
    // 6. SECONDARY FALLBACK: Google Gemini 3.5 Flash-Lite (TTS still routes via Bulbul Shubh!)
    if (!sarvamSuccess && !abortController.signal.aborted) {
        if (index_js_2.config.gemini.apiKey) {
            try {
                const ai = getGeminiClient();
                const geminiStream = await ai.models.generateContentStream({
                    model: index_js_2.config.gemini.model || 'gemini-3.5-flash-lite',
                    contents: [
                        ...cleanHistory.map((h) => ({
                            role: h.role === 'assistant' ? 'model' : 'user',
                            parts: [{ text: h.content }],
                        })),
                        {
                            role: 'user',
                            parts: [{ text: `${systemPrompt}\n\nUser says: ${message}` }],
                        },
                    ],
                });
                for await (const chunk of geminiStream) {
                    if (abortController.signal.aborted)
                        break;
                    const textChunk = chunk.text || '';
                    if (textChunk) {
                        await streamFilter.push(textChunk);
                    }
                }
                await streamFilter.flush();
                sarvamSuccess = true;
            }
            catch (geminiErr) {
                console.warn('[VoiceRoutes/Stream] Gemini fallback notice:', geminiErr?.message || geminiErr);
            }
        }
    }
    if (abortController.signal.aborted) {
        console.log('[VoiceRoutes/Stream] Stream aborted before completion. Ending.');
        res.end();
        return;
    }
    // 7. If generation completely failed (both Sarvam and Gemini unavailable)
    // Per instruction: No default fallback messages. Report error clearly.
    if (!fullGeneratedText.trim()) {
        console.error('[VoiceRoutes/Stream] AI generation failed completely.');
        const errorMsg = 'Error: Coach Mack could not generate a response. Please try again.';
        sendEvent('text_delta', { delta: errorMsg });
        sendEvent('text_complete', {
            fullText: errorMsg,
            suggestions: ['Try asking again', 'Check connection'],
        });
        sendEvent('error', { error: 'AI generation failed' });
        sendEvent('response_complete', { durationMs: Date.now() - startTime });
        res.end();
        return;
    }
    // 8. Finalize text and flush sentence audio buffer
    const suggestions = sarvamService_js_1.SarvamService.generateSuggestions(message);
    sendEvent('text_complete', {
        fullText: fullGeneratedText.trim(),
        suggestions,
    });
    await ttsBuffer.flush();
    sendEvent('audio_complete', { totalChunks: totalAudioChunks });
    sendEvent('response_complete', { durationMs: Date.now() - startTime });
    res.end();
});
// 14. Health Coach Chat Turn (Synchronous JSON Fallback)
exports.voiceRouter.post('/chat', async (req, res) => {
    try {
        res.setHeader('X-Prompt-Version', version_js_1.PROMPT_VERSION);
        const { message, userId = 'usr_synthetic_alex', userName: incomingUserName, activityContext, lastCoachReply = '', sessionId, history } = req.body;
        if (!message || typeof message !== 'string') {
            res.status(400).json({ error: 'message is required' });
            return;
        }
        let dbName = '';
        const pool = supabaseClient_js_1.SupabaseDb.getPool();
        if (pool && userId && userId !== 'usr_synthetic_alex') {
            try {
                const pRes = await pool.query('SELECT name FROM profiles WHERE id = $1 LIMIT 1;', [userId]);
                if (pRes.rows[0]?.name)
                    dbName = pRes.rows[0].name.split(' ')[0];
            }
            catch { }
        }
        const user = index_js_1.db.getUser(userId) || (userId === 'usr_synthetic_alex' ? index_js_1.db.getUser('usr_synthetic_alex') : null);
        const resolvedUserName = incomingUserName?.trim() || dbName || (user?.name ? user.name.split(' ')[0] : '');
        const userName = resolvedUserName && resolvedUserName !== 'Friend' ? resolvedUserName : '';
        const lower = message.toLowerCase();
        // Critical Red Flag check
        if (lower.includes('chest pain') || lower.includes('chhati') || lower.includes('shortness of breath')) {
            const safetyReply = userName
                ? `Dhyan se sunein ${userName}: Chest discomfort ya saans lene mein takleef serious signs hain. Turant kisi emergency medical center se contact karein aur sabhi exercises band kar dein.`
                : `Dhyan se sunein: Chest discomfort ya saans lene mein takleef serious signs hain. Turant kisi emergency medical center se contact karein aur sabhi exercises band kar dein.`;
            res.json({
                text: safetyReply,
                suggestions: ['Contact emergency care', 'Consult a doctor', 'Rest immediately'],
                provider: 'safety_guard',
            });
            return;
        }
        // Context retrieval and confirmation-gated memory operations (Part 3)
        let activeUserId = req.userId || userId || sessionId || 'default';
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            if (supabaseClient_js_1.SupabaseDb.isConfigured()) {
                try {
                    const { data } = await supabaseClient_js_1.SupabaseDb.getClient().auth.getUser(token);
                    if (data?.user?.id) {
                        activeUserId = data.user.id;
                    }
                }
                catch { }
            }
        }
        const sessionKey = sessionId || activeUserId || 'default';
        const healthContext = await healthMemoryEngine_js_1.HealthMemoryEngine.getRelevantContext(activeUserId, message, activityContext);
        await pendingOpsManager_js_1.PendingOpsManager.incrementTurn(activeUserId, sessionKey);
        const existingOp = await pendingOpsManager_js_1.PendingOpsManager.getPendingOp(activeUserId, sessionKey);
        let memoryDirective = '';
        if (existingOp) {
            const conf = pendingOpsManager_js_1.PendingOpsManager.classifyConfirmation(message, existingOp.type);
            if (conf === 'yes') {
                await pendingOpsManager_js_1.PendingOpsManager.applyOp(existingOp);
                await pendingOpsManager_js_1.PendingOpsManager.discardPendingOp(activeUserId, sessionKey);
                if (existingOp.type === 'resolve_issue') {
                    memoryDirective = `\n[ACTION COMPLETED]: User confirmed ${existingOp.payload.title} is completely resolved. It has been permanently purged from records. Celebrate recovery warmly in 1 short sentence, and DO NOT mention this pain or issue ever again.`;
                }
                else if (existingOp.type === 'add_issue') {
                    memoryDirective = `\n[ACTION COMPLETED]: User confirmed tracking for ${existingOp.payload.title}. It has been saved. Acknowledge supportively.`;
                }
            }
            else if (conf === 'ambiguous') {
                const attempts = (existingOp.ambiguousAttempts || 0) + 1;
                if (attempts <= 1) {
                    existingOp.ambiguousAttempts = attempts;
                    await pendingOpsManager_js_1.PendingOpsManager.setPendingOp(existingOp, sessionKey);
                    memoryDirective = `\n[AMBIGUOUS CONFIRMATION]: User answer was ambiguous. Re-ask ONCE in plain words: "हटा दूँ? हाँ या ना" (or "Should I remove it? Yes or No"). Do not modify records yet.`;
                }
                else {
                    await pendingOpsManager_js_1.PendingOpsManager.discardPendingOp(activeUserId, sessionKey);
                    memoryDirective = `\n[CONFIRMATION EXPIRED]: Ambiguous limit reached. Do not modify records.`;
                }
            }
            else if (conf === 'no') {
                await pendingOpsManager_js_1.PendingOpsManager.discardPendingOp(activeUserId, sessionKey);
                memoryDirective = `\n[ACTION CANCELLED]: User stated the issue is not yet resolved. Continue caring for it gently without purging.`;
            }
        }
        else {
            const openIssuesList = healthContext.activeIssues.map((i) => ({ id: i.id, title: i.title, category: i.category }));
            const turnNum = pendingOpsManager_js_1.PendingOpsManager.getTurn(activeUserId);
            const candidateOp = pendingOpsManager_js_1.PendingOpsManager.detectCandidate(message, openIssuesList, turnNum, activeUserId, sessionKey);
            if (candidateOp) {
                await pendingOpsManager_js_1.PendingOpsManager.setPendingOp(candidateOp, sessionKey);
                memoryDirective = `\n[CONFIRMATION REQUIRED]: ${candidateOp.confirmationQuestion} Ask this exact confirmation in your reply in 1 short sentence before modifying any records.`;
            }
        }
        const activeFacts = user ? healthMemoryStore_js_1.healthMemoryStore.getActiveProfileFacts(user.id) : [];
        const memorySnippet = (healthContext.promptSnippet || activeFacts.map((f) => `${f.key}: ${f.value}`).join('; ')) + memoryDirective;
        const activitySnippet = activityContext
            ? `Today steps: ${activityContext.todaySteps || 0} / ${activityContext.stepGoal || 10000}, active calories: ${activityContext.caloriesBurned || 0} kcal`
            : '';
        const state = openerBudget_js_1.OpenerBudget.getState(sessionKey);
        const openerAllowed = openerBudget_js_1.OpenerBudget.isOpenerAllowed(sessionKey);
        const recentOpeners = state.lastOpenerUsed ? `"${state.lastOpenerUsed}"` : 'none';
        const nameHint = openerAllowed && userName
            ? `\nThis turn you may open with the user's first name (${userName}) or a very short interjection if natural.`
            : '';
        const cleanHistory = history && Array.isArray(history) && history.length > 0
            ? openerBudget_js_1.OpenerBudget.sanitizeHistory(history.slice(-10), userName)
                .map((h) => ({
                role: h.role === 'coach' ? 'assistant' : h.role,
                content: (h.content || h.text || '').trim(),
            }))
                .filter((h) => h.content.length > 0)
            : [];
        // PRIMARY: Generate conversational reply and neural voice directly via Sarvam AI
        if (sarvamService_js_1.SarvamService.isConfigured()) {
            const sarvamResult = await sarvamService_js_1.SarvamService.generateChatReply({
                message,
                userName,
                conditions: user?.knownConditions || [],
                memorySnippet,
                activitySnippet,
                synthesizeVoice: true,
                sessionId: sessionKey,
                history: cleanHistory,
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
        // SECONDARY FALLBACK: Google Gemini
        let replyText = '';
        let suggestions = [];
        if (index_js_2.config.gemini.apiKey) {
            const systemPrompt = `You are Coach Mack, an elite AI Health and Wellness Coach at HealthFreak.
${healthContext.promptSnippet}

Rules:
1. Start directly with the answer. A very short natural interjection or the user's first name may open a reply only rarely, and never in two replies in a row. Recently used openers (vary, reuse rarely): ${recentOpeners}.${nameHint}
2. Length & style: Keep ordinary conversation short (2 to 3 sentences). When user asks for an exercise, a routine, or what to do, give a concrete prescription immediately: 3 to 4 exercises with sets and reps or duration, plus rest, home-only (up to 5 short sentences allowed).
3. Safety: Urgent-care advice ONLY for red flags (chest pain, breathlessness, fainting, numbness or tingling spreading down an arm or leg, sudden severe pain, trauma). For mild muscle strain or soreness, give safe mobility and strengthening guidance.
4. Provide 3 short relevant follow-up suggestions (under 4 words each).
5. Return strict JSON: { "text": "...", "suggestions": ["...", "...", "..."] }`;
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
                            ...cleanHistory.map((h) => ({
                                role: h.role === 'assistant' ? 'model' : 'user',
                                parts: [{ text: h.content }],
                            })),
                            {
                                role: 'user',
                                parts: [{ text: `${systemPrompt}\n\nUser says: ${message}` }],
                            },
                        ],
                        config: {
                            responseMimeType: 'application/json',
                            maxOutputTokens: 400,
                        },
                    });
                    const rawText = response.text?.trim();
                    if (rawText) {
                        const parsed = JSON.parse(rawText);
                        if (parsed.text) {
                            const processed = openerBudget_js_1.OpenerBudget.processReply({
                                sessionId: sessionKey,
                                text: parsed.text,
                                userName,
                                path: '/chat',
                                lang: 'hi',
                            });
                            replyText = processed.cleanedText;
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
        // If all AI APIs failed, report error — no canned fallback strings
        if (!replyText) {
            res.status(500).json({
                error: 'AI generation failed. Please try again.',
                text: 'Error: Coach Mack could not generate a response. Please try again.',
                suggestions: ['Try asking again', 'Check connection'],
            });
            return;
        }
        if (suggestions.length === 0) {
            suggestions = ['Check my active plan', 'How is my hydration today?', 'Adjust my workout intensity'];
        }
        // Always attempt Bulbul TTS synthesis for single voice consistency
        let audioBase64;
        if (sarvamService_js_1.SarvamService.isConfigured()) {
            audioBase64 = await sarvamService_js_1.SarvamService.synthesizeSpeech(replyText);
        }
        res.json({
            text: replyText.trim(),
            provider: 'gemini',
            suggestions,
            audioBase64,
            audioMime: 'audio/wav',
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
        'main mack bol raha hoon',
        'main mack bol raha',
        'main mack hoon',
        'mack bol raha hoon',
        'coach mack here',
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
// 14. Audio Turn (Full Speech-to-Speech: Sarvam Saaras v3 STT -> Sarvam 105B LLM -> Bulbul v3 Shubh TTS)
exports.voiceRouter.post('/audio-turn', authMiddleware_js_1.authenticateSupabaseToken, async (req, res) => {
    const turnStart = Date.now();
    try {
        res.setHeader('X-Prompt-Version', version_js_1.PROMPT_VERSION);
        const userId = req.userId;
        const { audioBase64, mimeType = 'audio/m4a', lastCoachReply = '', userName: incomingUserName, callId, history, } = req.body;
        let dbName = '';
        const pool = supabaseClient_js_1.SupabaseDb.getPool();
        if (pool && userId && userId !== 'usr_synthetic_alex') {
            try {
                const pRes = await pool.query('SELECT name FROM profiles WHERE id = $1 LIMIT 1;', [userId]);
                if (pRes.rows[0]?.name)
                    dbName = pRes.rows[0].name.split(' ')[0];
            }
            catch { }
        }
        const user = index_js_1.db.getUser(userId) || (userId === 'usr_synthetic_alex' ? index_js_1.db.getUser('usr_synthetic_alex') : null);
        const resolvedUserName = incomingUserName?.trim() || dbName || (user?.name ? user.name.split(' ')[0] : '');
        const userName = resolvedUserName && resolvedUserName !== 'Friend' ? resolvedUserName : '';
        if (!audioBase64) {
            res.status(400).json({ error: 'audioBase64 is required' });
            return;
        }
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        console.log(`[VoiceRoutes/AudioTurn] Received audio chunk (${audioBuffer.length} bytes, ${mimeType})`);
        // 1. Indian Spoken Speech-to-Text via Sarvam Saaras v3
        let userTranscript = '';
        if (sarvamService_js_1.SarvamService.isConfigured()) {
            userTranscript = await sarvamService_js_1.SarvamService.transcribeAudio(audioBuffer, mimeType);
        }
        userTranscript = (userTranscript || '').trim();
        console.log(`[VoiceRoutes/AudioTurn] Transcribed text in ${Date.now() - turnStart}ms: "${userTranscript}"`);
        // 2. Silence or Empty Transcript Check
        if (!userTranscript) {
            res.json({
                userTranscript: '',
                coachReply: '',
                isEcho: false,
                provider: 'sarvam',
            });
            return;
        }
        // 3. Acoustic Speaker Echo Suppression
        if (isSelfEcho(userTranscript, lastCoachReply)) {
            console.log(`[VoiceRoutes/AudioTurn] Speaker echo detected and suppressed: "${userTranscript}"`);
            res.json({
                userTranscript,
                coachReply: '',
                isEcho: true,
                provider: 'sarvam',
            });
            return;
        }
        const lower = userTranscript.toLowerCase();
        // 4. Critical Health Safety & Red Flag Escalation
        const isRedFlag = lower.includes('chest pain') ||
            lower.includes('chhati') ||
            lower.includes('chhaati') ||
            lower.includes('shortness of breath') ||
            lower.includes('saans nahi') ||
            lower.includes('faint') ||
            lower.includes('behoshi') ||
            lower.includes('palpitation');
        if (isRedFlag) {
            const safetyReply = userName
                ? `Dhyan se sunein ${userName}: Chest discomfort ya saans lene mein takleef serious medical conditions ke lakshan ho sakte hain. Kripya turant kisi emergency room ya physician se consult karein aur sabhi exercises band kar dein.`
                : `Dhyan se sunein: Chest discomfort ya saans lene mein takleef serious medical conditions ke lakshan ho sakte hain. Kripya turant kisi emergency room ya physician se consult karein aur sabhi exercises band kar dein.`;
            let audioBase64Reply;
            if (sarvamService_js_1.SarvamService.isConfigured()) {
                audioBase64Reply = await sarvamService_js_1.SarvamService.synthesizeSpeech(safetyReply);
            }
            res.json({
                userTranscript,
                coachReply: safetyReply,
                audioBase64: audioBase64Reply,
                audioMime: 'audio/wav',
                provider: 'safety_guard',
                isEcho: false,
            });
            return;
        }
        // 5. Context Retrieval and Background Symptom Ingestion
        const healthContext = await healthMemoryEngine_js_1.HealthMemoryEngine.getRelevantContext(userId, userTranscript);
        healthMemoryEngine_js_1.HealthMemoryEngine.scheduleSymptomIngestion(userId, userTranscript);
        const sessionKey = callId || userId || 'default';
        const state = openerBudget_js_1.OpenerBudget.getState(sessionKey);
        const openerAllowed = openerBudget_js_1.OpenerBudget.isOpenerAllowed(sessionKey);
        const recentOpeners = state.lastOpenerUsed ? `"${state.lastOpenerUsed}"` : 'none';
        const nameHint = openerAllowed && userName
            ? `\nThis turn you may open with the user's first name (${userName}) or a very short interjection if natural.`
            : '';
        const cleanHistory = history && Array.isArray(history) && history.length > 0
            ? openerBudget_js_1.OpenerBudget.sanitizeHistory(history.slice(-10), userName)
                .map((h) => ({
                role: h.role === 'coach' ? 'assistant' : h.role,
                content: (h.content || h.text || '').trim(),
            }))
                .filter((h) => h.content.length > 0)
            : [];
        // 6. Primary LLM Generation: Sarvam 105B Conversations
        let coachReply = '';
        if (sarvamService_js_1.SarvamService.isConfigured()) {
            const sarvamResult = await sarvamService_js_1.SarvamService.generateChatReply({
                message: userTranscript,
                userName,
                conditions: user?.knownConditions || [],
                memorySnippet: healthContext.promptSnippet,
                synthesizeVoice: false,
                sessionId: sessionKey,
                history: cleanHistory,
            });
            if (sarvamResult?.text) {
                coachReply = sarvamResult.text;
            }
        }
        // 7. Secondary Fallback: Google Gemini
        if (!coachReply && index_js_2.config.gemini.apiKey) {
            try {
                const ai = getGeminiClient();
                const systemPrompt = `You are Coach Mack, an elite AI Health and Wellness Coach at HealthFreak.
${healthContext.promptSnippet}
Rules:
1. Start directly with the answer. A very short natural interjection or the user's first name may open a reply only rarely, and never in two replies in a row. Recently used openers (vary, reuse rarely): ${recentOpeners}.${nameHint}
2. Length & style: Keep ordinary conversation short (2 to 3 sentences). When user asks for an exercise, a routine, or what to do, give a concrete prescription immediately: 3 to 4 exercises with sets and reps or duration, plus rest, home-only (up to 5 short sentences allowed).
3. Safety: Urgent-care advice ONLY for red flags (chest pain, breathlessness, fainting, numbness or tingling spreading down an arm or leg, sudden severe pain, trauma). For mild muscle strain or soreness, give safe mobility and strengthening guidance.
4. Plain spoken conversational text only. No markdown, asterisks, or emoji.`;
                const resp = await ai.models.generateContent({
                    model: index_js_2.config.gemini.model || 'gemini-3.5-flash-lite',
                    contents: [
                        ...cleanHistory.map((h) => ({
                            role: h.role === 'assistant' ? 'model' : 'user',
                            parts: [{ text: h.content }],
                        })),
                        {
                            role: 'user',
                            parts: [{ text: `${systemPrompt}\n\nUser says: ${userTranscript}` }],
                        },
                    ],
                    config: {
                        maxOutputTokens: 400,
                    },
                });
                const geminiText = resp.text?.trim();
                if (geminiText) {
                    const processed = openerBudget_js_1.OpenerBudget.processReply({
                        sessionId: sessionKey,
                        text: sarvamService_js_1.SarvamService.normalizeForSpokenTTS(geminiText),
                        userName,
                        path: '/audio-turn',
                        lang: 'hi',
                    });
                    coachReply = processed.cleanedText;
                }
            }
            catch (geminiErr) {
                console.warn('[VoiceRoutes/AudioTurn] Gemini fallback notice:', geminiErr?.message || geminiErr);
            }
        }
        // If all AI models failed, report error — no canned fallback strings
        if (!coachReply) {
            res.status(500).json({
                error: 'AI generation failed',
                userTranscript,
                coachReply: '',
            });
            return;
        }
        // 9. Neural Speech Synthesis via Sarvam Bulbul (Shubh)
        let audioReplyBase64;
        let audioUrl;
        if (sarvamService_js_1.SarvamService.isConfigured()) {
            audioReplyBase64 = await sarvamService_js_1.SarvamService.synthesizeSpeech(coachReply, 'shubh');
            if (audioReplyBase64) {
                const audioId = `turn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                generatedAudioCache.set(audioId, {
                    buffer: Buffer.from(audioReplyBase64, 'base64'),
                    createdAt: Date.now(),
                });
                audioUrl = `/api/voice/audio/${audioId}.wav`;
            }
        }
        console.log(`[VoiceRoutes/AudioTurn] Completed full turn in ${Date.now() - turnStart}ms. Coach: "${coachReply}"`);
        res.json({
            userTranscript,
            coachReply,
            audioBase64: audioReplyBase64,
            audioUrl,
            audioMime: 'audio/wav',
            provider: 'sarvam',
            isEcho: false,
        });
    }
    catch (err) {
        console.error('[VoiceRoutes/AudioTurn Error]:', err?.message || err);
        res.status(500).json({
            userTranscript: 'Voice note received',
            coachReply: 'Error: Audio turn processing failed. ' + (err?.message || 'Please try again.'),
            error: err?.message || 'Audio turn processing failed',
        });
    }
});
