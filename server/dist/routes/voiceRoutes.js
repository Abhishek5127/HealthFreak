"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceRouter = void 0;
exports.synthesizeSpeechWithGemini = synthesizeSpeechWithGemini;
exports.isSelfEcho = isSelfEcho;
const express_1 = require("express");
const tokenService_js_1 = require("../livekit/tokenService.js");
const exotelSipService_js_1 = require("../sip/exotelSipService.js");
const scheduledCallQueue_js_1 = require("../queue/scheduledCallQueue.js");
const index_js_1 = require("../db/index.js");
const planService_js_1 = require("../services/planService.js");
const costTracker_js_1 = require("../services/costTracker.js");
const index_js_2 = require("../config/index.js");
const coachPrompt_js_1 = require("../agent/coachPrompt.js");
const voiceTextNormalizer_js_1 = require("../utils/voiceTextNormalizer.js");
exports.voiceRouter = (0, express_1.Router)();
// 1. In-App Call Session Token
exports.voiceRouter.post('/session', async (req, res) => {
    try {
        const { userId, providerOverride } = req.body;
        if (!userId) {
            res.status(400).json({ error: 'userId is required' });
            return;
        }
        const result = await tokenService_js_1.LiveKitTokenService.createCallSessionAndToken({
            userId,
            callType: 'in_app',
            providerOverride,
        });
        if (!result.success) {
            const statusCode = result.errorCode === 'CONCURRENCY_LIMIT' || result.errorCode === 'DAILY_QUOTA_EXCEEDED' ? 429 : 400;
            res.status(statusCode).json({ error: result.errorMessage, code: result.errorCode });
            return;
        }
        res.json(result.data);
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Server error creating session' });
    }
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
const ttsModelBackoff = new Map();
/**
 * Synthesizes natural human speech using Gemini neural TTS.
 *
 * Voice is ALWAYS locked to COACH_VOICE ('Kore') — the single consistent
 * female voice for Coach Alex across every turn, retry, and fallback.
 * We iterate over TTS models but NEVER over voices.
 * If a model fails, we try the next model with the SAME voice.
 */
async function synthesizeSpeechWithGemini(text) {
    if (!index_js_2.config.gemini.apiKey || !text || !text.trim())
        return null;
    // Final pronunciation gate: normalize before ANY speech synthesis
    const spokenText = (0, voiceTextNormalizer_js_1.normalizeForSpeech)(text);
    if (!spokenText.trim())
        return null;
    // Single locked voice — never changed between turns or retries
    const COACH_VOICE = 'Kore';
    // Priority order: gemini-3.1-flash-tts-preview first (active quota), then 3.8 variants
    const ttsModels = [
        'gemini-3.1-flash-tts-preview',
        'gemini-3.8-flash-lite-tts',
        'gemini-3.8-flash-tts',
    ];
    let lastTtsError = '';
    // Flat loop over models only — voice is constant
    for (const model of ttsModels) {
        // Circuit breaker: skip models with active 429 quota backoff
        const backoffUntil = ttsModelBackoff.get(model);
        if (backoffUntil && Date.now() < backoffUntil) {
            lastTtsError = `TTS Model ${model} is backed off for ${Math.round((backoffUntil - Date.now()) / 1000)}s due to 429 quota limit.`;
            continue;
        }
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 6500);
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${index_js_2.config.gemini.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: spokenText }],
                        },
                    ],
                    generationConfig: {
                        responseModalities: ['AUDIO'],
                        speechConfig: {
                            voiceConfig: {
                                prebuiltVoiceConfig: {
                                    voiceName: COACH_VOICE,
                                },
                            },
                        },
                    },
                }),
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (res.status === 429) {
                const errJson = await res.json().catch(() => ({}));
                lastTtsError = `Google Gemini TTS Quota Exceeded (429): ${errJson.error?.message || 'Daily free-tier limit reached (10 requests/day). Enable billing to unlock unlimited turns.'}`;
                console.warn(`⚠️  [TTS 429 QUOTA EXHAUSTED on ${model}]. Backing off for 60s.`);
                ttsModelBackoff.set(model, Date.now() + 60000);
                continue;
            }
            if (res.ok) {
                const data = await res.json();
                const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
                if (inlineData?.data) {
                    let audioBuffer = Buffer.from(inlineData.data, 'base64');
                    const mime = inlineData.mimeType || '';
                    // If raw PCM (L16), convert to standard playable WAV with RIFF header
                    if (mime.includes('l16') || mime.includes('pcm') || !mime.includes('wav')) {
                        audioBuffer = pcmToWav(audioBuffer, 24000, 1, 16);
                    }
                    const clipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
                    audioCache.set(clipId, {
                        buffer: audioBuffer,
                        mime: 'audio/wav',
                        createdAt: Date.now(),
                    });
                    console.log(`🎤  [TTS] Voice: ${COACH_VOICE} | Model: ${model} | Text: "${spokenText.slice(0, 40)}..."`);
                    return {
                        audioBase64: audioBuffer.toString('base64'),
                        audioMime: 'audio/wav',
                        audioUrl: `/api/voice/audio/${clipId}.wav`,
                    };
                }
            }
            else {
                const errJson = await res.json().catch(() => ({}));
                lastTtsError = `TTS Model ${model} returned HTTP ${res.status}: ${errJson.error?.message || res.statusText}`;
            }
        }
        catch (err) {
            lastTtsError = `TTS Model ${model} network error: ${err?.message || err}`;
            console.warn(`⚠️  [TTS MODEL ${model} | VOICE ${COACH_VOICE}]:`, err?.message || err);
            // Try next model with the same voice — never fall back to a different voice
        }
    }
    return { audioBase64: '', audioMime: '', audioUrl: '', ttsError: lastTtsError };
}
// 12. Dynamic Neural Greeting Audio
exports.voiceRouter.post('/greeting', async (req, res) => {
    try {
        const { userId = 'usr_synthetic_alex' } = req.body;
        const user = index_js_1.db.getUser(userId) || index_js_1.db.getUser('usr_synthetic_alex');
        const name = user ? user.name.split(' ')[0] : 'Alex';
        const hour = new Date().getHours();
        let greeting = '';
        if (hour >= 5 && hour < 12) {
            greeting = `Good morning ${name}! Coach Alex here, your HealthFreak AI coach. How did you sleep, and how is your morning energy today?`;
        }
        else if (hour >= 12 && hour < 17) {
            greeting = `Hello ${name}! Coach Alex here. Taking a quick wellness check-in—how was your lunch and routine so far?`;
        }
        else if (hour >= 17 && hour < 22) {
            greeting = `Good evening ${name}! Coach Alex here. How are you feeling after today's activities? Any discomfort or meal questions tonight?`;
        }
        else {
            greeting = `Hello ${name}! Coach Alex here. Time for a peaceful wind-down. How did your day go overall?`;
        }
        const speech = await synthesizeSpeechWithGemini(greeting);
        res.json({
            greeting,
            audioBase64: speech?.audioBase64,
            audioMime: speech?.audioMime || 'audio/wav',
            audioUrl: speech?.audioUrl,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 12. Real-time Gemini AI Coach Chat
exports.voiceRouter.post('/chat', async (req, res) => {
    const start = Date.now();
    try {
        const { message, userId = 'usr_synthetic_alex' } = req.body;
        if (!message || typeof message !== 'string') {
            res.status(400).json({ error: 'message is required' });
            return;
        }
        const user = index_js_1.db.getUser(userId) || index_js_1.db.getUser('usr_synthetic_alex');
        const memory = user ? index_js_1.db.getUserMemory(user.id) : {};
        const systemPrompt = user ? (0, coachPrompt_js_1.buildCoachSystemPrompt)(user, memory) : 'You are Coach Alex, an AI health coach.';
        console.log('\n============================================================');
        console.log('🎙️  [LIVE INPUT RECEIVED - CHAT/VOICE TURN]');
        console.log(`👤  User: ${user?.name || 'Alex'} (${userId})`);
        console.log(`📝  TRANSCRIPTION / MESSAGE: "${message}"`);
        console.log(`⏳  Querying Gemini AI Coach (${index_js_2.config.gemini.model} with auto-failover)...`);
        const promptText = `${systemPrompt}\n\nUser says: "${message}"\nRespond directly as Coach Alex in 1 concise, warm, actionable coaching sentence (max 25 words).`;
        const candidateModels = Array.from(new Set([
            index_js_2.config.gemini.model,
            'gemini-3.8-flash',
            'gemini-3.5-flash',
            'gemini-3.1-flash-lite',
        ])).filter(Boolean);
        let data = null;
        let selectedModel = index_js_2.config.gemini.model;
        for (const modelCandidate of candidateModels) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelCandidate}:generateContent?key=${index_js_2.config.gemini.apiKey}`;
                const geminiRes = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            {
                                role: 'user',
                                parts: [{ text: promptText }],
                            },
                        ],
                        generationConfig: {
                            maxOutputTokens: 90,
                            temperature: 0.6,
                        },
                    }),
                });
                const resJson = await geminiRes.json();
                if (resJson.error) {
                    console.warn(`⚠️  [GEMINI ${modelCandidate} BUSY/SPIKE]: ${resJson.error.message}. Switching to next model...`);
                    continue;
                }
                if (resJson.candidates?.[0]?.content?.parts?.[0]?.text) {
                    data = resJson;
                    selectedModel = modelCandidate;
                    break;
                }
            }
            catch (err) {
                console.warn(`⚠️  [GEMINI ${modelCandidate} FETCH ERROR]:`, err?.message || err);
            }
        }
        const elapsed = Date.now() - start;
        if (!data) {
            console.warn('⚠️  All Gemini models experiencing high demand. Returning graceful coaching fallback.');
            res.json({
                text: 'Namaste Alex! Main sun rahi hoon. Cloud network par brief traffic spike hai—aaj aap kaisa feel kar rahe hain?',
                suggestions: ['Check my active plan', 'How is my hydration today?', 'Adjust my workout intensity'],
            });
            return;
        }
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I am here with you. How can I support your routine today?';
        console.log(`🤖  HEALTHFREAK AI RESPONSE (${selectedModel}): "${replyText.trim()}"`);
        console.log(`⚡  Latency: ${elapsed}ms`);
        console.log('============================================================\n');
        // Progressive memory extraction for symptoms or energy
        if (user) {
            const lower = message.toLowerCase();
            if (lower.includes('knee') || lower.includes('pain') || lower.includes('dard')) {
                index_js_1.db.updateMemoryFact(user.id, 'symptom_knee_discomfort', 'Reported discomfort during chat', 0.9);
            }
            if (lower.includes('tired') || lower.includes('fatigue')) {
                index_js_1.db.updateMemoryFact(user.id, 'energy_status', 'Low energy reported in chat', 0.9);
            }
        }
        let audioBase64Out = undefined;
        let audioMimeOut = undefined;
        let audioUrlOut = undefined;
        const shouldSynthesizeVoice = req.body.generateCloudAudio !== false;
        if (shouldSynthesizeVoice && replyText.trim()) {
            const speechResult = await synthesizeSpeechWithGemini(replyText.trim());
            if (speechResult) {
                audioBase64Out = speechResult.audioBase64;
                audioMimeOut = speechResult.audioMime;
                audioUrlOut = speechResult.audioUrl;
                console.log(`🔊  [CHAT NEURAL AUDIO READY]: ${audioMimeOut} (${audioUrlOut})`);
            }
        }
        res.json({
            text: replyText.trim(),
            audioBase64: audioBase64Out,
            audioMime: audioMimeOut,
            audioUrl: audioUrlOut,
            suggestions: ['Check my active plan', 'How is my hydration today?', 'Adjust my workout intensity'],
        });
    }
    catch (err) {
        console.error('❌  [CHAT PROCESSING ERROR]:', err.message);
        res.status(500).json({ error: err.message || 'Error processing AI chat' });
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
// 12. Audio Stream Multimodal Transcription & Response
exports.voiceRouter.post('/audio-turn', async (req, res) => {
    const start = Date.now();
    try {
        const { audioBase64, mimeType = 'audio/webm', userId = 'usr_synthetic_alex', lastCoachReply = '', } = req.body;
        if (!audioBase64) {
            res.status(400).json({ error: 'audioBase64 is required' });
            return;
        }
        const user = index_js_1.db.getUser(userId) || index_js_1.db.getUser('usr_synthetic_alex');
        const memory = user ? index_js_1.db.getUserMemory(user.id) : {};
        const sizeKb = ((audioBase64.length * 0.75) / 1024).toFixed(1);
        console.log('\n============================================================');
        console.log('🎙️  [LIVE AUDIO STREAM RECEIVED FOR TRANSCRIPTION]');
        console.log(`👤  User: ${user?.name || 'Alex'} (${userId})`);
        console.log(`📦  Audio Size: ${sizeKb} KB | MIME Type: ${mimeType}`);
        if (lastCoachReply) {
            console.log(`🛡️  Last Coach Reply Tracked: "${lastCoachReply.slice(0, 45)}..."`);
        }
        console.log('⏳  Transcribing & analyzing with Gemini Multimodal Audio...');
        const systemPrompt = user ? (0, coachPrompt_js_1.buildCoachSystemPrompt)(user, memory) : 'You are Coach Alex, an AI health coach.';
        // Cap lastCoachReply to 60 chars before injecting into the prompt.
        // Longer injections cause Gemini to treat Hindi/Hinglish Romanized words
        // as abbreviations after several turns, producing letter-by-letter spelling.
        const safeLastReply = lastCoachReply
            ? (0, voiceTextNormalizer_js_1.normalizeForSpeech)(lastCoachReply).slice(0, 60).trimEnd()
            : '';
        const antiEchoPrompt = safeLastReply
            ? `CRITICAL ANTI-ECHO GUARD:
The AI coach (Coach Alex) just spoke this phrase through the loudspeaker:
"${safeLastReply}"
If the attached audio is just the microphone picking up the coach's own echo:
- Set userTranscript: "(Speaker echo)"
- Set coachReply: ""
Never reply to your own voice or create a self-conversation echo loop!

Otherwise, if a real human user is speaking:`
            : '';
        const instruction = `${systemPrompt}
Listen carefully to the attached user voice recording.
${antiEchoPrompt}
1. Transcribe what the user said verbatim in English, Hindi, or conversational Hinglish.
2. If user spoke, respond warmly, directly, and concisely in 1 coaching sentence (under 15 words) as Coach Alex.
   - If user spoke in Hindi or Hinglish, reply in friendly natural Hinglish without acronym letters (e.g. use 'aap', 'aapka').
   - If user spoke in English, reply in friendly, natural Indian English.
   - Give direct guidance first. Never repeat the user's question or offer long preamble.
3. If pure silence:
   - userTranscript: "(Silence or brief pause)"
   - coachReply: "Main sun rahi hoon Alex, please go ahead!"

CRITICAL REQUIREMENT:
'coachReply' must strictly contain ONLY Coach Alex's spoken answer to the user.
Return strictly a valid JSON object in this format:
{
  "userTranscript": "<exact words user spoke or (Speaker echo)>",
  "coachReply": "<Coach Alex's answer only, max 15 words>"
}`;
        let cleanMime = (mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
        if (cleanMime === 'audio/m4a' || cleanMime === 'audio/x-m4a' || cleanMime.endsWith('m4a')) {
            cleanMime = 'audio/mp4';
        }
        const candidateModels = Array.from(new Set([
            'gemini-3.5-flash-lite',
            'gemini-flash-lite-latest',
            'gemini-3.8-flash',
            index_js_2.config.gemini.model,
        ])).filter(Boolean);
        let data = null;
        let selectedModel = 'gemini-3.5-flash-lite';
        for (const modelCandidate of candidateModels) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelCandidate}:generateContent?key=${index_js_2.config.gemini.apiKey}`;
                const geminiRes = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            {
                                role: 'user',
                                parts: [
                                    { text: instruction },
                                    {
                                        inlineData: {
                                            mimeType: cleanMime,
                                            data: audioBase64,
                                        },
                                    },
                                ],
                            },
                        ],
                        generationConfig: {
                            maxOutputTokens: 65,
                            temperature: 0.35,
                            responseMimeType: 'application/json',
                        },
                    }),
                });
                const resJson = await geminiRes.json();
                if (resJson.error) {
                    console.warn(`⚠️  [GEMINI AUDIO ${modelCandidate} HIGH DEMAND / BUSY]: ${resJson.error.message}. Trying next fallback model...`);
                    continue;
                }
                if (resJson.candidates?.[0]?.content?.parts?.[0]?.text) {
                    data = resJson;
                    selectedModel = modelCandidate;
                    break;
                }
            }
            catch (err) {
                console.warn(`⚠️  [GEMINI AUDIO ${modelCandidate} FETCH ERROR]:`, err?.message || err);
            }
        }
        const tTextReady = Date.now();
        const textLatencyMs = tTextReady - start;
        if (!data) {
            console.warn('⚠️  All Gemini models experiencing high demand spikes. Returning friendly coaching fallback.');
            res.json({
                userTranscript: 'Voice query received',
                coachReply: 'Namaste Alex! Main sun rahi hoon. Cloud audio network par temporary demand spike hai—aap kaisa feel kar rahe hain?',
                latencyMs: textLatencyMs,
            });
            return;
        }
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        let userTranscript = 'Voice message';
        let coachReply = 'Namaste Alex! Main sun rahi hoon. Aaj aap kaisa feel kar rahe hain?';
        const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        try {
            const parsed = JSON.parse(cleaned);
            if (parsed.userTranscript)
                userTranscript = parsed.userTranscript.trim();
            if (parsed.coachReply)
                coachReply = parsed.coachReply.trim();
        }
        catch {
            // Resilient Regex extraction for malformed JSON or trailing syntax
            const userMatch = cleaned.match(/"userTranscript"\s*:\s*"([\s\S]*?)(?:",|"\s*\n|"\s*})/i) ||
                cleaned.match(/"userTranscript"\s*:\s*"([\s\S]*?)"/i);
            if (userMatch && userMatch[1]) {
                userTranscript = userMatch[1].trim();
            }
            const coachMatch = cleaned.match(/"coachReply"\s*:\s*"([\s\S]*?)(?:""|",|"\s*}|"\s*$|$)/i);
            if (coachMatch && coachMatch[1]) {
                coachReply = coachMatch[1].trim();
            }
            else {
                const idx = cleaned.indexOf('"coachReply"');
                if (idx !== -1) {
                    const sub = cleaned.slice(idx);
                    const m = sub.match(/:\s*"*([\s\S]*?)(?:""|"|}|\n|$)/);
                    if (m && m[1])
                        coachReply = m[1].trim();
                }
            }
        }
        // CRITICAL SAFETY FILTER: Ensure coachReply NEVER contains userTranscript or JSON keys
        if (coachReply.includes('"userTranscript"') || coachReply.includes('userTranscript:')) {
            const idx = coachReply.indexOf('"coachReply"');
            if (idx !== -1) {
                coachReply = coachReply.slice(idx).replace(/^"coachReply"\s*:\s*"/i, '');
            }
        }
        coachReply = coachReply
            .replace(/^\{[\s\S]*?"coachReply"\s*:\s*"/i, '')
            .replace(/^[{\[\s"]+|["}\]\s]+$/g, '')
            .replace(/"userTranscript"[\s\S]*$/gi, '')
            .replace(/userTranscript\s*:[\s\S]*?coachReply\s*:/gi, '')
            .trim();
        if (!coachReply || coachReply.includes('{') || coachReply.includes('}')) {
            coachReply = 'Main sun rahi hoon Alex! Aap bilkul theek routine follow kar rahe hain, bas hydrate aur active rahein.';
        }
        // PRONUNCIATION GUARD: Detect letter-by-letter spelling (e.g. "A-A-P", "M-A-I-N")
        // which indicates Gemini returned an acronym-spaced word. Reset to safe fallback.
        if (/\b[A-Z]-[A-Z]\b/.test(coachReply) || /\b([A-Z]\s){2,}/.test(coachReply)) {
            console.warn(`⚠️  [PRONUNCIATION GUARD]: Detected letter-spaced output: "${coachReply.slice(0, 60)}". Replacing with safe fallback.`);
            coachReply = 'Bilkul sahi, aap achi progress kar rahe hain! Hydration aur activity goal par focus karein aaj.';
        }
        // Anti-Echo Check: Suppress if user audio is just loudspeaker feedback of previous coach response
        if (userTranscript === '(Speaker echo)' ||
            !coachReply.trim() ||
            (lastCoachReply && isSelfEcho(userTranscript, lastCoachReply))) {
            console.log(`🔇  [ANTI-ECHO FILTER ACTIVATED]: Detected speaker feedback of "${safeLastReply.slice(0, 45)}...". Suppressing echo loop.`);
            res.json({
                userTranscript: '(Speaker feedback suppressed)',
                coachReply: '',
                isEcho: true,
                latencyMs: textLatencyMs,
            });
            return;
        }
        console.log(`📝  TRANSCRIPTION: "${userTranscript}"`);
        console.log(`🤖  HEALTHFREAK AI RESPONSE (${selectedModel}): "${coachReply}"`);
        console.log(`⚡  Live Text Turn Latency: ${textLatencyMs}ms`);
        console.log('============================================================\n');
        // Progressive memory extraction for symptoms or energy
        if (user && userTranscript) {
            const lower = userTranscript.toLowerCase();
            if (lower.includes('knee') || lower.includes('pain') || lower.includes('dard')) {
                index_js_1.db.updateMemoryFact(user.id, 'symptom_knee_discomfort', 'Reported knee discomfort in voice call', 0.9);
            }
            if (lower.includes('tired') || lower.includes('fatigue')) {
                index_js_1.db.updateMemoryFact(user.id, 'energy_status', 'Reported fatigue in voice call', 0.9);
            }
        }
        // Synthesize neural cloud audio by default for immediate loud voice reply
        const shouldSynthesizeAudio = req.body.generateCloudAudio !== false;
        let audioBase64Out = undefined;
        let audioMimeOut = undefined;
        let audioUrlOut = undefined;
        let ttsLatencyMs = 0;
        let ttsErrorOut = undefined;
        if (shouldSynthesizeAudio && coachReply.trim()) {
            const tTtsStart = Date.now();
            // Final normalization gate: coachReply is normalized again inside synthesizeSpeechWithGemini,
            // but we also pass the already-clean text to avoid double-processing.
            const speechResult = await synthesizeSpeechWithGemini(coachReply);
            ttsLatencyMs = Date.now() - tTtsStart;
            if (speechResult?.audioBase64) {
                audioBase64Out = speechResult.audioBase64;
                audioMimeOut = speechResult.audioMime;
                audioUrlOut = speechResult.audioUrl;
                console.log(`🔊  [GEMINI NEURAL AUDIO READY in ${ttsLatencyMs}ms]: ${audioMimeOut} (${audioUrlOut})`);
            }
            else {
                ttsErrorOut = speechResult?.ttsError || 'Gemini Cloud TTS failed to produce audio.';
                console.warn(`❌  [TTS FAILURE]: ${ttsErrorOut}`);
            }
        }
        const totalServerLatencyMs = Date.now() - start;
        console.log(`⚡  [PERF: AUDIO TURN COMPLETE]: Text: ${textLatencyMs}ms | TTS: ${ttsLatencyMs}ms | Total: ${totalServerLatencyMs}ms\n`);
        res.json({
            userTranscript,
            coachReply,
            audioBase64: audioBase64Out,
            audioMime: audioMimeOut,
            audioUrl: audioUrlOut,
            ttsExhausted: !audioBase64Out && !audioUrlOut,
            ttsError: ttsErrorOut,
            latencyMs: totalServerLatencyMs,
            metrics: {
                textMs: textLatencyMs,
                ttsMs: ttsLatencyMs,
                totalMs: totalServerLatencyMs,
            },
        });
    }
    catch (err) {
        console.error('❌  [AUDIO TURN ERROR]:', err.message);
        res.status(500).json({
            userTranscript: 'Audio received',
            coachReply: 'Namaste Alex! Main sun rahi hoon. Aaj aap kaisa feel kar rahe hain? Any specific question?',
            error: err.message,
        });
    }
});
