"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentWorker = exports.HealthFreakVoiceAgentWorker = void 0;
const index_js_1 = require("./config/index.js");
const index_js_2 = require("./db/index.js");
const VoiceProviderFactory_js_1 = require("./providers/VoiceProviderFactory.js");
const coachPrompt_js_1 = require("./agent/coachPrompt.js");
const memoryService_js_1 = require("./services/memoryService.js");
const costTracker_js_1 = require("./services/costTracker.js");
class HealthFreakVoiceAgentWorker {
    activeSessions = new Map();
    maxConcurrency;
    constructor(maxConcurrency = index_js_1.config.callingLimits.maxConcurrentCalls) {
        this.maxConcurrency = maxConcurrency;
    }
    getActiveSessionsCount() {
        return this.activeSessions.size;
    }
    setMaxConcurrency(limit) {
        this.maxConcurrency = limit;
    }
    /**
     * Dispatches and isolates an AI agent session for a connected participant in a room.
     */
    async handleParticipantJoin(params) {
        // Check concurrency capacity
        if (this.activeSessions.size >= this.maxConcurrency) {
            return {
                success: false,
                error: `Worker pool capacity (${this.maxConcurrency}) reached. Session rejected by admission control.`,
            };
        }
        const user = index_js_2.db.getUser(params.userId);
        if (!user) {
            return { success: false, error: `User ${params.userId} not found` };
        }
        const providerType = params.providerOverride || index_js_1.config.voiceProvider;
        const provider = VoiceProviderFactory_js_1.VoiceProviderFactory.getProvider(providerType);
        // Isolated memory & prompt retrieval
        const memoryFacts = index_js_2.db.getUserMemory(user.id);
        const systemPrompt = (0, coachPrompt_js_1.buildCoachSystemPrompt)(user, memoryFacts);
        const sessionId = `agent_${params.callId}_${Date.now()}`;
        const workerSession = {
            sessionId,
            roomName: params.roomName,
            userId: user.id,
            provider: providerType,
            status: 'active',
            startedAt: Date.now(),
        };
        this.activeSessions.set(sessionId, workerSession);
        // Initial greeting (Speaks first)
        let greeting = `Hello ${user.name.split(' ')[0]}, Coach Alex here. How is your energy and health today?`;
        if (user.languagePreference === 'hinglish') {
            greeting = `Namaste ${user.name.split(' ')[0]}! Coach Alex here. Aaj aap kaisa feel kar rahe hain?`;
        }
        else if (user.languagePreference === 'hi') {
            greeting = `नमस्ते ${user.name.split(' ')[0]}! कोच एलेक्स यहाँ है। आज आप कैसा महसूस कर रहे हैं?`;
        }
        // Record greeting in call session transcript
        index_js_2.db.appendTranscript(params.callId, 'coach', greeting);
        index_js_2.db.updateCallSession(params.callId, { status: 'connected' });
        return {
            success: true,
            greeting,
        };
    }
    /**
     * Processes incoming user speech transcript, triggers tools if necessary,
     * handles interruptions, and produces coach reply.
     */
    async handleUserSpeech(params) {
        const user = index_js_2.db.getUser(params.userId);
        if (!user)
            throw new Error('User not found');
        // 1. Record user utterance in transcript
        index_js_2.db.appendTranscript(params.callId, 'user', params.userText);
        const lower = params.userText.toLowerCase();
        const toolsCalled = [];
        let reply = '';
        const provider = VoiceProviderFactory_js_1.VoiceProviderFactory.getProvider();
        // Check for knee / joint pain disclosures
        if (lower.includes('knee') || lower.includes('joint') || lower.includes('dard')) {
            toolsCalled.push('update_user_memory');
            await provider.executeTool('update_user_memory', { key: 'joint_pain', value: 'Reported knee pain during movement' }, { userId: user.id, callId: params.callId, roomName: '' });
            toolsCalled.push('draft_plan_adjustment');
            await provider.executeTool('draft_plan_adjustment', { reason: 'knee joint pain', modificationType: 'substitute_movement' }, { userId: user.id, callId: params.callId, roomName: '' });
            if (user.languagePreference === 'hinglish') {
                reply = 'Knee pain ko avoid karne ke liye maine aapka workout safe isometric exercises me adjust kar diya hai. Kya aap confirm karna chahenge?';
            }
            else {
                reply = 'I noted your knee discomfort and drafted a low-impact isometric replacement to protect your joints. Would you like to confirm this plan?';
            }
        }
        else if (lower.includes('tired') || lower.includes('energy') || lower.includes('thak')) {
            toolsCalled.push('record_daily_checkin');
            await provider.executeTool('record_daily_checkin', { mood: 'lowEnergy', energyScore: 4, symptoms: 'Fatigue reported' }, { userId: user.id, callId: params.callId, roomName: '' });
            reply = user.languagePreference === 'hinglish'
                ? 'Maine aapka low energy log kar liya hai. Aaj hum restorative gentle breathing karenge. How does that sound?'
                : 'I have logged your lower energy level. Let us prioritize restorative recovery and hydration today. How does that sound?';
        }
        else {
            reply = user.languagePreference === 'hinglish'
                ? 'Samajh gayi! Aur batayein, aaj hydration aur meals schedule theek raha?'
                : 'Understood. Tell me, how was your hydration and meal schedule today?';
        }
        index_js_2.db.appendTranscript(params.callId, 'coach', reply);
        return { reply, toolsCalled };
    }
    /**
     * Finalizes the call session, performs post-call progressive memory synthesis,
     * updates duration and logs usage costs.
     */
    async handleCallEnd(callId, durationSeconds = 180) {
        const session = index_js_2.db.getCallSession(callId);
        if (!session)
            return;
        index_js_2.db.updateCallSession(callId, {
            status: 'completed',
            endedAt: new Date().toISOString(),
            durationSeconds,
        });
        // Run progressive memory synthesis
        memoryService_js_1.MemoryService.processSessionTranscript(callId);
        // Track usage
        costTracker_js_1.CostAndPrivacyTracker.recordCallCompleted(session.provider, durationSeconds, session.type === 'pstn_outbound');
        // Remove from active worker sessions
        for (const [key, ws] of this.activeSessions.entries()) {
            if (ws.sessionId.includes(callId)) {
                this.activeSessions.delete(key);
            }
        }
    }
}
exports.HealthFreakVoiceAgentWorker = HealthFreakVoiceAgentWorker;
exports.agentWorker = new HealthFreakVoiceAgentWorker();
