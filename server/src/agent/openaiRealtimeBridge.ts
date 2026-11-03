import WebSocket from 'ws';
import { config } from '../config/index.js';
import { db } from '../db/index.js';
import { buildCoachSystemPrompt } from './coachPrompt.js';
import { healthMemoryStore } from '../db/healthMemoryStore.js';

export interface RealtimeBridgeSession {
  callId: string;
  userId: string;
  roomName: string;
  ws: WebSocket | null;
  status: 'connecting' | 'connected' | 'speaking' | 'listening' | 'closed';
  coachTranscript: string;
  userTranscript: string;
  onAudioDelta?: (base64Audio: string) => void;
  onTranscriptDelta?: (speaker: 'coach' | 'user', text: string) => void;
  onError?: (err: string) => void;
}

export class OpenAIRealtimeBridge {
  private static activeSessions: Map<string, RealtimeBridgeSession> = new Map();

  /**
   * Initializes a real-time session with OpenAI Realtime API for a call.
   */
  public static async startSession(params: {
    callId: string;
    userId: string;
    roomName: string;
    onAudioDelta?: (base64Audio: string) => void;
    onTranscriptDelta?: (speaker: 'coach' | 'user', text: string) => void;
    onError?: (err: string) => void;
  }): Promise<{ success: boolean; error?: string }> {
    const { callId, userId, roomName } = params;

    if (!config.openai.apiKey) {
      return { success: false, error: 'OPENAI_API_KEY is not configured on the backend.' };
    }

    // Close any previous session for this callId
    this.closeSession(callId);

    const user = db.getUser(userId) || {
      id: userId,
      name: 'HealthFreak Member',
      phone: '+919876543210',
      languagePreference: 'en' as const,
      callingConsent: true,
      consentTimestamp: new Date().toISOString(),
      optedOut: false,
      preferredCallHourIST: 10,
      healthGoals: ['Weight management', 'Cardio fitness', 'Daily nutrition balance'],
      knownConditions: [],
      currentEnergyLevel: 'moderate',
    };

    const memoryFacts = db.getUserMemory(userId);
    const systemPrompt = buildCoachSystemPrompt(user, memoryFacts);

    const bridgeSession: RealtimeBridgeSession = {
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
      const url = `wss://api.openai.com/v1/realtime?model=${config.openai.model || 'gpt-4o-realtime-preview'}`;
      const ws = new WebSocket(url, {
        headers: {
          Authorization: `Bearer ${config.openai.apiKey}`,
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
          if (ws.readyState === WebSocket.OPEN) {
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

      ws.on('message', (data: WebSocket.RawData) => {
        try {
          const event = JSON.parse(data.toString());
          this.handleOpenAIEvent(callId, event);
        } catch (err: any) {
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
    } catch (err: any) {
      console.error('[OpenAI Realtime Bridge] Failed to connect:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Processes server events dispatched from OpenAI Realtime WebSocket.
   */
  private static handleOpenAIEvent(callId: string, event: any): void {
    const session = this.activeSessions.get(callId);
    if (!session) return;

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
          db.appendTranscript(callId, 'coach', event.transcript);
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) {
          db.appendTranscript(callId, 'user', event.transcript);
          session.onTranscriptDelta?.('user', event.transcript);
        }
        break;

      case 'input_audio_buffer.speech_started':
        session.status = 'listening';
        // User interrupted coach; we can cancel current response if speaking
        if (session.ws && session.ws.readyState === WebSocket.OPEN) {
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
  public static sendAudioChunk(callId: string, base64Chunk: string): void {
    const session = this.activeSessions.get(callId);
    if (!session || !session.ws || session.ws.readyState !== WebSocket.OPEN) return;

    session.ws.send(
      JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64Chunk,
      })
    );
  }

  /**
   * Sends a user text message or note into the active conversation.
   */
  public static sendTextMessage(callId: string, text: string): void {
    const session = this.activeSessions.get(callId);
    if (!session || !session.ws || session.ws.readyState !== WebSocket.OPEN) return;

    session.ws.send(
      JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text }],
        },
      })
    );
    session.ws.send(JSON.stringify({ type: 'response.create' }));
  }

  /**
   * Closes an active real-time session.
   */
  public static closeSession(callId: string): void {
    const session = this.activeSessions.get(callId);
    if (session) {
      if (session.ws && session.ws.readyState === WebSocket.OPEN) {
        try {
          session.ws.close(1000, 'Call Ended');
        } catch {}
      }
      this.activeSessions.delete(callId);
    }
  }

  public static getSession(callId: string): RealtimeBridgeSession | undefined {
    return this.activeSessions.get(callId);
  }
}

