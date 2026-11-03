import { Router, Request, Response } from 'express';
import { db, CallSession } from '../db/index.js';
import { LiveKitTokenService } from '../livekit/tokenService.js';
import { OpenAIRealtimeBridge } from '../agent/openaiRealtimeBridge.js';
import { AICallScheduler } from '../queue/aiCallScheduler.js';
import { config } from '../config/index.js';
import { buildCoachSystemPrompt } from '../agent/coachPrompt.js';

export const aiCallRouter = Router();

/**
 * 1. POST /api/ai-calls/schedule
 * Schedules an AI voice call for a specific future timestamp.
 */
aiCallRouter.post('/schedule', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      userId = 'usr_synthetic_alex',
      scheduledTime, // ISO string or unix ms
      topic = 'General Wellness & Nutrition Check-in',
      language = 'English',
    } = req.body;

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

    const session: CallSession = {
      id: callId,
      roomName,
      userId,
      type: 'in_app',
      status: 'scheduled',
      provider: config.voiceProvider as 'gemini' | 'openai',
      transcript: [],
      attemptNumber: 0,
      summary: `Scheduled call: ${topic} (${language})`,
    };

    // Attach scheduling metadata
    (session as any).scheduledTime = scheduledDate.toISOString();
    (session as any).topic = topic;
    (session as any).language = language;

    db.createCallSession(session);
    console.log(`[AICallRoutes] Scheduled call ${callId} for ${scheduledDate.toISOString()}`);

    res.json({
      success: true,
      message: 'AI call scheduled successfully',
      call: session,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to schedule call' });
  }
});

/**
 * 2. GET /api/ai-calls/upcoming
 * Fetches upcoming scheduled calls for the user.
 */
aiCallRouter.get('/upcoming', (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string) || 'usr_synthetic_alex';
    const list: any[] = [];

    for (const session of (db as any).callSessions.values()) {
      if (session.userId === userId && (session.status === 'scheduled' || session.status === 'ringing')) {
        list.push(session);
      }
    }

    // Sort by scheduledTime ascending
    list.sort((a, b) => new Date(a.scheduledTime || 0).getTime() - new Date(b.scheduledTime || 0).getTime());

    res.json({ success: true, upcoming: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3. GET /api/ai-calls/active-incoming
 * Checks if there is an active ringing incoming call for the user.
 */
aiCallRouter.get('/active-incoming', (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string) || 'usr_synthetic_alex';
    const ringingCall = AICallScheduler.getActiveRingingCall(userId);

    if (ringingCall) {
      res.json({ success: true, hasIncomingCall: true, call: ringingCall });
    } else {
      res.json({ success: true, hasIncomingCall: false });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 4. POST /api/ai-calls/token
 * Generates a secure LiveKit access token for joining the voice room.
 */
aiCallRouter.post('/token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId = 'usr_synthetic_alex', callId, roomName } = req.body;

    const result = await LiveKitTokenService.createCallSessionAndToken({
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
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Token generation failed' });
  }
});

/**
 * 5. POST /api/ai-calls/:id/accept
 * Accepts a call, marks it connected, and spins up the OpenAI Realtime AI session.
 */
aiCallRouter.post('/:id/accept', async (req: Request, res: Response): Promise<void> => {
  try {
    const callId = req.params.id;
    const session = db.getCallSession(callId);

    if (!session) {
      res.status(404).json({ error: 'Call session not found' });
      return;
    }

    AICallScheduler.clearRinging(callId);

    const startedAt = new Date().toISOString();
    db.updateCallSession(callId, {
      status: 'connected',
      startedAt,
    });

    // Start OpenAI Realtime session for this room
    if (config.voiceProvider === 'openai' && config.openai.apiKey) {
      await OpenAIRealtimeBridge.startSession({
        callId: session.id,
        userId: session.userId,
        roomName: session.roomName,
        onError: (err) => {
          console.warn(`[AICallRoutes] Realtime bridge error on ${callId}:`, err);
        },
      });
    }

    // Also get the LiveKit token for the accepting user
    const tokenResult = await LiveKitTokenService.createCallSessionAndToken({
      userId: session.userId,
      callType: 'in_app',
      providerOverride: 'gemini',
      callIdOverride: session.id,
      roomNameOverride: session.roomName,
    });

    const user = db.getUser(session.userId) || { name: 'there' };
    const firstName = user.name ? user.name.split(' ')[0] : 'there';
    const lang = (session as any).language || 'English';

    let greeting = `Hello ${firstName}! I'm Disha, your AI health coach from HealthFreak. How is your energy and body feeling today?`;
    if (lang === 'Hinglish') {
      greeting = `Namaste ${firstName}! Main Disha bol rahi hoon, aapki HealthFreak AI coach. Aaj aap kaisa feel kar rahe hain?`;
    } else if (lang === 'Hindi') {
      greeting = `नमस्ते ${firstName}! मैं दिशा बोल रही हूँ, आपकी HealthFreak AI कोच। आज आप कैसा महसूस कर रहे हैं?`;
    }

    db.appendTranscript(callId, 'coach', greeting);

    res.json({
      success: true,
      message: 'Call accepted',
      call: db.getCallSession(callId),
      livekit: tokenResult.data,
      greeting,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Generates an empathetic, concise AI coach response powered directly by Google Gemini 3.5 Flash-Lite:
 * 1. Google Gemini 3.5 Flash-Lite (High-speed real-time response)
 * 2. Smart Contextual Clinical Fallback (Dinner, hairfall, knee pain, sleep, recovery)
 */
async function generateCoachVoiceReply(params: {
  message: string;
  user: any;
  memoryFacts: any;
  transcript: { speaker: 'coach' | 'user'; text: string }[];
}): Promise<string> {
  const { message, user, memoryFacts, transcript } = params;
  const systemPrompt = buildCoachSystemPrompt(user, memoryFacts);

  // 1. Google Gemini (Primary Engine: gemini-3.5-flash-lite)
  if (config.gemini.apiKey) {
    const candidateModels = [
      'gemini-3.5-flash-lite',
      config.gemini.model,
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ].filter(Boolean);

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.gemini.apiKey}`;
        const prompt = `${systemPrompt}\n\nRecent context:\n${transcript
          .slice(-4)
          .map((t) => `${t.speaker}: ${t.text}`)
          .join('\n')}\nUser says: "${message}"\n\nCRITICAL: Respond directly as Disha, personal health coach. Keep response to 1-2 warm, spoken sentences (max 30 words). Directly answer the question in natural conversational tone matching the user's language (Hindi, Hinglish, or English). Never repeat or echo the user's question, provide only your direct answer.`;

        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: 120,
              temperature: 0.7,
            },
          }),
        });

        const data: any = await resp.json();
        let text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          text = text.replace(/^Disha:\s*/i, '').replace(/^AI:\s*/i, '').trim();
          console.log(`[AICallRoutes] Generated reply via Gemini (${model}): "${text.slice(0, 60)}..."`);
          return text;
        }
      } catch (err: any) {
        console.warn(`[AICallRoutes] Gemini model ${model} issue:`, err.message);
      }
    }
  }

  // 3. Clinical Contextual Heuristic Fallback
  const lower = message.toLowerCase();
  const firstName = user.name ? user.name.split(' ')[0] : 'friend';

  if (
    lower.includes('dinner') ||
    lower.includes('khana') ||
    lower.includes('eat') ||
    lower.includes('food') ||
    lower.includes('diet') ||
    lower.includes('bhookh')
  ) {
    return `For a nourishing dinner, try light dal or grilled paneer with sautéed veggies and one multigrain roti. It's gentle on digestion and keeps your energy steady!`;
  }
  if (
    lower.includes('hair') ||
    lower.includes('baal') ||
    lower.includes('fall') ||
    lower.includes('shedding')
  ) {
    return `Hair fall is super common and manageable! Prioritize protein like eggs or pulses, stay well-hydrated, and ensure your iron and vitamin D levels are balanced.`;
  }
  if (
    lower.includes('pain') ||
    lower.includes('dard') ||
    lower.includes('knee') ||
    lower.includes('back') ||
    lower.includes('joint')
  ) {
    return `Please don't force any painful movement. Take gentle rest, keep warm, and let's switch today's routine to mild joint mobility and deep breathing exercises.`;
  }
  if (
    lower.includes('sleep') ||
    lower.includes('tired') ||
    lower.includes('thak') ||
    lower.includes('neend') ||
    lower.includes('exhaust')
  ) {
    return `Rest is where the body heals, ${firstName}! Try putting your screen away 30 minutes before bed and sip some warm water to unwind deeply tonight.`;
  }
  if (
    lower.includes('workout') ||
    lower.includes('exercise') ||
    lower.includes('gym') ||
    lower.includes('kasrat')
  ) {
    return `For today's workout, aim for 20 minutes of steady bodyweight intervals or brisk walking, followed by gentle stretches for your legs and hips.`;
  }

  return `I hear you, ${firstName}! I'm tracking your wellness progress closely. Tell me more about what you need help with right now!`;
}

/**
 * 5b. POST /api/ai-calls/:id/user-message
 * User speaks or messages during the active voice call.
 */
aiCallRouter.post('/:id/user-message', async (req: Request, res: Response): Promise<void> => {
  try {
    const callId = req.params.id;
    const { message } = req.body;
    if (!message) {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const session = db.getCallSession(callId);
    if (!session) {
      res.status(404).json({ error: 'Call session not found' });
      return;
    }

    db.appendTranscript(callId, 'user', message);
    OpenAIRealtimeBridge.sendTextMessage(callId, message);

    const user = db.getUser(session.userId) || {
      id: session.userId,
      name: 'Alex',
      phone: '+919876543210',
      languagePreference: 'en' as const,
      callingConsent: true,
      consentTimestamp: new Date().toISOString(),
      optedOut: false,
      preferredCallHourIST: 10,
      healthGoals: ['Weight management'],
      knownConditions: [],
      currentEnergyLevel: 'moderate',
    };
    const memoryFacts = db.getUserMemory(session.userId);

    const coachReply = await generateCoachVoiceReply({
      message,
      user,
      memoryFacts,
      transcript: session.transcript,
    });

    db.appendTranscript(callId, 'coach', coachReply);

    res.json({
      success: true,
      coachReply,
      transcript: db.getCallSession(callId)?.transcript || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 6. POST /api/ai-calls/:id/decline
 * Declines an incoming call.
 */
aiCallRouter.post('/:id/decline', (req: Request, res: Response): void => {
  try {
    const callId = req.params.id;
    AICallScheduler.clearRinging(callId);
    OpenAIRealtimeBridge.closeSession(callId);

    const updated = db.updateCallSession(callId, {
      status: 'rejected',
      endedAt: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Call declined', call: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 7. POST /api/ai-calls/:id/end
 * Gracefully terminates an active call and records duration.
 */
aiCallRouter.post('/:id/end', (req: Request, res: Response): void => {
  try {
    const callId = req.params.id;
    AICallScheduler.clearRinging(callId);
    OpenAIRealtimeBridge.closeSession(callId);

    const session = db.getCallSession(callId);
    if (!session) {
      res.status(404).json({ error: 'Call session not found' });
      return;
    }

    const endedAt = new Date().toISOString();
    let durationSeconds = 0;
    if (session.startedAt) {
      durationSeconds = Math.max(1, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000));
    }

    const updated = db.updateCallSession(callId, {
      status: 'completed',
      endedAt,
      durationSeconds,
    });

    res.json({
      success: true,
      message: 'Call ended successfully',
      call: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 8. GET /api/ai-calls/history
 * Fetches call history for the user.
 */
aiCallRouter.get('/history', (req: Request, res: Response): void => {
  try {
    const userId = (req.query.userId as string) || 'usr_synthetic_alex';
    const list: any[] = [];

    for (const session of (db as any).callSessions.values()) {
      if (session.userId === userId && ['completed', 'rejected', 'unanswered', 'failed'].includes(session.status)) {
        list.push(session);
      }
    }

    list.sort((a, b) => new Date(b.startedAt || b.endedAt || 0).getTime() - new Date(a.startedAt || a.endedAt || 0).getTime());

    res.json({ success: true, history: list });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 9. POST /api/ai-calls/push-token
 * Registers an Expo push token for receiving incoming call notifications.
 */
aiCallRouter.post('/push-token', (req: Request, res: Response): void => {
  try {
    const { userId = 'usr_synthetic_alex', token, platform } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Push token is required' });
      return;
    }

    AICallScheduler.registerPushToken(userId, token, platform);
    res.json({ success: true, message: 'Push token registered successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 10. POST /api/ai-calls/trigger-test
 * Instantly triggers an incoming call simulation for the user (for quick testing).
 */
aiCallRouter.post('/trigger-test', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId = 'usr_synthetic_alex', delaySeconds = 0 } = req.body;
    const callId = `call_${userId}_${Date.now()}`;
    const roomName = `room_${userId}_${Date.now()}`;

    const session: CallSession = {
      id: callId,
      roomName,
      userId,
      type: 'in_app',
      status: 'scheduled',
      provider: config.voiceProvider as 'gemini' | 'openai',
      transcript: [],
      attemptNumber: 0,
      summary: 'Immediate Test Incoming Call',
    };
    (session as any).scheduledTime = new Date(Date.now() + delaySeconds * 1000).toISOString();

    db.createCallSession(session);

    if (delaySeconds <= 0) {
      await AICallScheduler.triggerIncomingCall(callId);
    }

    res.json({
      success: true,
      message: `Incoming call test triggered (delay: ${delaySeconds}s)`,
      callId,
      roomName,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

