import { config } from './config/index.js';
import { db } from './db/index.js';
import { VoiceProviderFactory } from './providers/VoiceProviderFactory.js';
import { buildCoachSystemPrompt } from './agent/coachPrompt.js';
import { COACH_TOOL_DEFINITIONS } from './agent/coachTools.js';
import { MemoryService } from './services/memoryService.js';
import { CostAndPrivacyTracker } from './services/costTracker.js';

export interface AgentWorkerSession {
  sessionId: string;
  roomName: string;
  userId: string;
  provider: 'gemini' | 'openai';
  status: 'active' | 'completed' | 'interrupted' | 'error';
  startedAt: number;
}

export class DishaVoiceAgentWorker {
  private activeSessions: Map<string, AgentWorkerSession> = new Map();
  private maxConcurrency: number;

  constructor(maxConcurrency = config.callingLimits.maxConcurrentCalls) {
    this.maxConcurrency = maxConcurrency;
  }

  public getActiveSessionsCount(): number {
    return this.activeSessions.size;
  }

  public setMaxConcurrency(limit: number): void {
    this.maxConcurrency = limit;
  }

  /**
   * Dispatches and isolates an AI agent session for a connected participant in a room.
   */
  public async handleParticipantJoin(params: {
    roomName: string;
    userId: string;
    callId: string;
    providerOverride?: 'gemini' | 'openai';
  }): Promise<{ success: boolean; greeting?: string; error?: string }> {
    // Check concurrency capacity
    if (this.activeSessions.size >= this.maxConcurrency) {
      return {
        success: false,
        error: `Worker pool capacity (${this.maxConcurrency}) reached. Session rejected by admission control.`,
      };
    }

    const user = db.getUser(params.userId);
    if (!user) {
      return { success: false, error: `User ${params.userId} not found` };
    }

    const providerType = params.providerOverride || config.voiceProvider;
    const provider = VoiceProviderFactory.getProvider(providerType);

    // Isolated memory & prompt retrieval
    const memoryFacts = db.getUserMemory(user.id);
    const systemPrompt = buildCoachSystemPrompt(user, memoryFacts);

    const sessionId = `agent_${params.callId}_${Date.now()}`;
    const workerSession: AgentWorkerSession = {
      sessionId,
      roomName: params.roomName,
      userId: user.id,
      provider: providerType,
      status: 'active',
      startedAt: Date.now(),
    };

    this.activeSessions.set(sessionId, workerSession);

    // Initial greeting (Speaks first)
    let greeting = `Hello ${user.name.split(' ')[0]}, I'm Disha, your AI health coach from Disha Health. How is your body feeling today?`;
    if (user.languagePreference === 'hinglish') {
      greeting = `Namaste ${user.name.split(' ')[0]}, main Disha bol rahi hoon, aapki AI health coach from Disha Health. Aaj aap kaisa feel kar rahe hain?`;
    } else if (user.languagePreference === 'hi') {
      greeting = `नमस्ते ${user.name.split(' ')[0]}, मैं दिशा बोल रही हूँ, आपकी AI हेल्थ कोच दिशा हेल्थ से। आज आप कैसा महसूस कर रहे हैं?`;
    }

    // Record greeting in call session transcript
    db.appendTranscript(params.callId, 'coach', greeting);
    db.updateCallSession(params.callId, { status: 'connected' });

    return {
      success: true,
      greeting,
    };
  }

  /**
   * Processes incoming user speech transcript, triggers tools if necessary,
   * handles interruptions, and produces coach reply.
   */
  public async handleUserSpeech(params: {
    callId: string;
    userId: string;
    userText: string;
  }): Promise<{ reply: string; toolsCalled: string[] }> {
    const user = db.getUser(params.userId);
    if (!user) throw new Error('User not found');

    // 1. Record user utterance in transcript
    db.appendTranscript(params.callId, 'user', params.userText);

    const lower = params.userText.toLowerCase();
    const toolsCalled: string[] = [];
    let reply = '';

    const provider = VoiceProviderFactory.getProvider();

    // Check for knee / joint pain disclosures
    if (lower.includes('knee') || lower.includes('joint') || lower.includes('dard')) {
      toolsCalled.push('update_user_memory');
      await provider.executeTool(
        'update_user_memory',
        { key: 'joint_pain', value: 'Reported knee pain during movement' },
        { userId: user.id, callId: params.callId, roomName: '' }
      );

      toolsCalled.push('draft_plan_adjustment');
      await provider.executeTool(
        'draft_plan_adjustment',
        { reason: 'knee joint pain', modificationType: 'substitute_movement' },
        { userId: user.id, callId: params.callId, roomName: '' }
      );

      if (user.languagePreference === 'hinglish') {
        reply = 'Knee pain ko avoid karne ke liye maine aapka workout safe isometric exercises me adjust kar diya hai. Kya aap confirm karna chahenge?';
      } else {
        reply = 'I noted your knee discomfort and drafted a low-impact isometric replacement to protect your joints. Would you like to confirm this plan?';
      }
    } else if (lower.includes('tired') || lower.includes('energy') || lower.includes('thak')) {
      toolsCalled.push('record_daily_checkin');
      await provider.executeTool(
        'record_daily_checkin',
        { mood: 'lowEnergy', energyScore: 4, symptoms: 'Fatigue reported' },
        { userId: user.id, callId: params.callId, roomName: '' }
      );

      reply = user.languagePreference === 'hinglish'
        ? 'Maine aapka low energy log kar liya hai. Aaj hum restorative gentle breathing karenge. How does that sound?'
        : 'I have logged your lower energy level. Let us prioritize restorative recovery and hydration today. How does that sound?';
    } else {
      reply = user.languagePreference === 'hinglish'
        ? 'Samajh gayi! Aur batayein, aaj hydration aur meals schedule theek raha?'
        : 'Understood. Tell me, how was your hydration and meal schedule today?';
    }

    db.appendTranscript(params.callId, 'coach', reply);
    return { reply, toolsCalled };
  }

  /**
   * Finalizes the call session, performs post-call progressive memory synthesis,
   * updates duration and logs usage costs.
   */
  public async handleCallEnd(callId: string, durationSeconds = 180): Promise<void> {
    const session = db.getCallSession(callId);
    if (!session) return;

    db.updateCallSession(callId, {
      status: 'completed',
      endedAt: new Date().toISOString(),
      durationSeconds,
    });

    // Run progressive memory synthesis
    MemoryService.processSessionTranscript(callId);

    // Track usage
    CostAndPrivacyTracker.recordCallCompleted(
      session.provider,
      durationSeconds,
      session.type === 'pstn_outbound'
    );

    // Remove from active worker sessions
    for (const [key, ws] of this.activeSessions.entries()) {
      if (ws.sessionId.includes(callId)) {
        this.activeSessions.delete(key);
      }
    }
  }
}

export const agentWorker = new DishaVoiceAgentWorker();

