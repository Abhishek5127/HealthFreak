"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIRealtimeBridge = void 0;
const ws_1 = __importDefault(require("ws"));
const index_js_1 = require("../config/index.js");
const index_js_2 = require("../db/index.js");
const coachPrompt_js_1 = require("./coachPrompt.js");
class OpenAIRealtimeBridge {
    static activeSessions = new Map();
    /**
     * Initializes a real-time session with OpenAI Realtime API for a call.
     */
    static async startSession(params) {
        const { callId, userId, roomName } = params;
        if (!index_js_1.config.openai.apiKey) {
            return { success: false, error: 'OPENAI_API_KEY is not configured on the backend.' };
        }
        // Close any previous session for this callId
        this.closeSession(callId);
        const user = index_js_2.db.getUser(userId) || {
            id: userId,
            name: 'HealthFreak Member',
            phone: '+919876543210',
            languagePreference: 'en',
            callingConsent: true,
            consentTimestamp: new Date().toISOString(),
            optedOut: false,
            preferredCallHourIST: 10,
            healthGoals: ['Weight management', 'Cardio fitness', 'Daily nutrition balance'],
            knownConditions: [],
            currentEnergyLevel: 'moderate',
        };
        const memoryFacts = index_js_2.db.getUserMemory(userId);
        const systemPrompt = (0, coachPrompt_js_1.buildCoachSystemPrompt)(user, memoryFacts);
        const bridgeSession = {
            callId,
            userId,
            roomName,
            ws: null,
            status: 'connecting',
            coachTranscript: '',
            userTranscript: '',
            onAudioDelta: params.onAudioDelta,
            onTranscriptDelta: params.onTranscriptDelta,
            onError: params.onError,
        };
        this.activeSessions.set(callId, bridgeSession);
        try {
            const url = `wss://api.openai.com/v1/realtime?model=${index_js_1.config.openai.model || 'gpt-4o-realtime-preview'}`;
            const ws = new ws_1.default(url, {
                headers: {
                    Authorization: `Bearer ${index_js_1.config.openai.apiKey}`,
                    'OpenAI-Beta': 'realtime=v1',
                },
            });
            bridgeSession.ws = ws;
            ws.on('open', () => {
                bridgeSession.status = 'connected';
                console.log(`[OpenAI Realtime Bridge] Connected for call ${callId}`);
                // 1. Configure the session
                const sessionUpdate = {
                    type: 'session.update',
                    session: {
                        modalities: ['audio', 'text'],
                        instructions: systemPrompt,
                        voice: 'alloy',
                        input_audio_format: 'pcm16',
                        output_audio_format: 'pcm16',
                        input_audio_transcription: {
                            model: 'whisper-1',
                        },
                        turn_detection: {
                            type: 'server_vad',
                            threshold: 0.5,
                            prefix_padding_ms: 300,
                            silence_duration_ms: 600,
                        },
                    },
                };
                ws.send(JSON.stringify(sessionUpdate));
                // 2. Instruct the AI to greet the user first
                setTimeout(() => {
                    if (ws.readyState === ws_1.default.OPEN) {
                        const initialPrompt = {
                            type: 'conversation.item.create',
                            item: {
                                type: 'message',
                                role: 'user',
                                content: [
                                    {
                                        type: 'input_text',
                                        text: `The user ${user.name.split(' ')[0]} just answered your scheduled incoming health call. Please greet them warmly by name right now and ask how their wellness or energy is feeling today!`,
                                    },
                                ],
                            },
                        };
                        ws.send(JSON.stringify(initialPrompt));
                        ws.send(JSON.stringify({ type: 'response.create' }));
                    }
                }, 300);
            });
            ws.on('message', (data) => {
                try {
                    const event = JSON.parse(data.toString());
                    this.handleOpenAIEvent(callId, event);
                }
                catch (err) {
                    console.warn('[OpenAI Realtime Bridge] Parse error:', err.message);
                }
            });
            ws.on('error', (err) => {
                console.error(`[OpenAI Realtime Bridge] WebSocket error for call ${callId}:`, err.message);
                bridgeSession.status = 'closed';
                bridgeSession.onError?.(err.message);
            });
            ws.on('close', (code, reason) => {
                console.log(`[OpenAI Realtime Bridge] Session closed for call ${callId} (${code}): ${reason.toString()}`);
                bridgeSession.status = 'closed';
            });
            return { success: true };
        }
        catch (err) {
            console.error('[OpenAI Realtime Bridge] Failed to connect:', err.message);
            return { success: false, error: err.message };
        }
    }
    /**
     * Processes server events dispatched from OpenAI Realtime WebSocket.
     */
    static handleOpenAIEvent(callId, event) {
        const session = this.activeSessions.get(callId);
        if (!session)
            return;
        switch (event.type) {
            case 'response.audio.delta':
                if (event.delta) {
                    session.status = 'speaking';
                    session.onAudioDelta?.(event.delta);
                }
                break;
            case 'response.audio_transcript.delta':
                if (event.delta) {
                    session.coachTranscript += event.delta;
                    session.onTranscriptDelta?.('coach', event.delta);
                }
                break;
            case 'response.audio_transcript.done':
                if (event.transcript) {
                    index_js_2.db.appendTranscript(callId, 'coach', event.transcript);
                }
                break;
            case 'conversation.item.input_audio_transcription.completed':
                if (event.transcript) {
                    index_js_2.db.appendTranscript(callId, 'user', event.transcript);
                    session.onTranscriptDelta?.('user', event.transcript);
                }
                break;
            case 'input_audio_buffer.speech_started':
                session.status = 'listening';
                // User interrupted coach; we can cancel current response if speaking
                if (session.ws && session.ws.readyState === ws_1.default.OPEN) {
                    session.ws.send(JSON.stringify({ type: 'response.cancel' }));
                }
                break;
            case 'input_audio_buffer.speech_stopped':
                session.status = 'speaking';
                break;
            case 'response.done':
                session.status = 'listening';
                break;
            case 'error':
                console.warn(`[OpenAI Realtime Bridge] Error event for ${callId}:`, event.error);
                session.onError?.(event.error?.message || 'Realtime API error');
                break;
        }
    }
    /**
     * Sends user PCM16 audio base64 chunk to OpenAI Realtime.
     */
    static sendAudioChunk(callId, base64Chunk) {
        const session = this.activeSessions.get(callId);
        if (!session || !session.ws || session.ws.readyState !== ws_1.default.OPEN)
            return;
        session.ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64Chunk,
        }));
    }
    /**
     * Sends a user text message or note into the active conversation.
     */
    static sendTextMessage(callId, text) {
        const session = this.activeSessions.get(callId);
        if (!session || !session.ws || session.ws.readyState !== ws_1.default.OPEN)
            return;
        session.ws.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
                type: 'message',
                role: 'user',
                content: [{ type: 'input_text', text }],
            },
        }));
        session.ws.send(JSON.stringify({ type: 'response.create' }));
    }
    /**
     * Closes an active real-time session.
     */
    static closeSession(callId) {
        const session = this.activeSessions.get(callId);
        if (session) {
            if (session.ws && session.ws.readyState === ws_1.default.OPEN) {
                try {
                    session.ws.close(1000, 'Call Ended');
                }
                catch { }
            }
            this.activeSessions.delete(callId);
        }
    }
    static getSession(callId) {
        return this.activeSessions.get(callId);
    }
}
exports.OpenAIRealtimeBridge = OpenAIRealtimeBridge;
