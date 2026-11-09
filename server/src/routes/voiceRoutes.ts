import { Router, Request, Response } from 'express';
import { LiveKitTokenService } from '../livekit/tokenService.js';
import { ExotelSipService } from '../sip/exotelSipService.js';
import { ScheduledCallQueue } from '../queue/scheduledCallQueue.js';
import { db } from '../db/index.js';
import { PlanService } from '../services/planService.js';
import { CostAndPrivacyTracker } from '../services/costTracker.js';
import { config } from '../config/index.js';
import { buildCoachSystemPrompt } from '../agent/coachPrompt.js';
import { VoiceAgentProcess } from '../services/voiceAgentProcess.js';

export const voiceRouter = Router();

// 1. In-App Call Session Token
voiceRouter.post('/session', async (req: Request, res: Response) => {
  try {
    const { userId, providerOverride } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const result = await LiveKitTokenService.createCallSessionAndToken({
      userId,
      callType: 'in_app',
      providerOverride,
    });

    if (!result.success) {
      const statusCode = result.errorCode === 'CONCURRENCY_LIMIT' || result.errorCode === 'DAILY_QUOTA_EXCEEDED' ? 429 : 400;
      res.status(statusCode).json({ error: result.errorMessage, code: result.errorCode });
      return;
    }

    // Auto-launch Standalone LiveKit + Sarvam AI Voice Agent in console mode
    if (req.body.startConsole !== false) {
      VoiceAgentProcess.startConsole();
    }

    res.json(result.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error creating session' });
  }
});

// 1b. Start Standalone LiveKit + Sarvam AI Voice Agent Console Mode
voiceRouter.post('/console/start', (_req: Request, res: Response) => {
  const result = VoiceAgentProcess.startConsole();
  res.json(result);
});

// 1c. Stop Standalone LiveKit + Sarvam AI Voice Agent Console Mode
voiceRouter.post('/console/stop', (_req: Request, res: Response) => {
  const result = VoiceAgentProcess.stopConsole();
  res.json(result);
});

// 1d. Live Transcripts & Events from Standalone Voice Agent
voiceRouter.get('/console/events', (req: Request, res: Response) => {
  const since = parseFloat(req.query.since as string) || 0;
  const events = VoiceAgentProcess.getLatestTranscripts(since);
  const status = VoiceAgentProcess.getStatus();
  res.json({ success: true, events, status });
});

// 2. Outbound PSTN Call (Direct)
voiceRouter.post('/call/outbound', async (req: Request, res: Response) => {
  try {
    const { userId, phone, idempotencyKey } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const result = await ExotelSipService.initiateOutboundCall({
      userId,
      phone,
      idempotencyKey,
    });

    if (!result.success) {
      res.status(400).json({ error: result.error, status: result.status });
      return;
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Schedule Outbound PSTN Call via BullMQ
voiceRouter.post('/call/schedule', async (req: Request, res: Response) => {
  try {
    const { userId, phone, preferredHourIST, idempotencyKey } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const key = idempotencyKey || `sched_${userId}_${new Date().toISOString().slice(0, 10)}`;

    const result = await ScheduledCallQueue.scheduleCall({
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. User Opt-Out / Consent Revocation
voiceRouter.post('/opt-out', (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  const success = db.optOutUser(userId);
  if (!success) {
    res.status(404).json({ error: `User ${userId} not found` });
    return;
  }

  res.json({ success: true, message: `User ${userId} successfully opted out of all automated voice calls.` });
});

// 5. Update Calling Consent
voiceRouter.post('/consent', (req: Request, res: Response) => {
  const { userId, consent } = req.body;
  if (!userId || typeof consent !== 'boolean') {
    res.status(400).json({ error: 'userId and boolean consent are required' });
    return;
  }

  const success = db.setUserConsent(userId, consent);
  if (!success) {
    res.status(404).json({ error: `User ${userId} not found` });
    return;
  }

  res.json({ success: true, consent, timestamp: new Date().toISOString() });
});

// 6. Exotel / LiveKit SIP Webhook Handler
voiceRouter.post('/sip/webhook', (req: Request, res: Response) => {
  const result = ExotelSipService.handleStatusWebhook(req.body);
  res.json(result);
});

// 7. Get Call Session Details & Transcript
voiceRouter.get('/call/:callId', (req: Request, res: Response) => {
  const session = db.getCallSession(req.params.callId);
  if (!session) {
    res.status(404).json({ error: 'Call session not found' });
    return;
  }
  res.json(session);
});

// 8. Get User Memory & Active Plan
voiceRouter.get('/user/:userId/memory', (req: Request, res: Response) => {
  const user = db.getUser(req.params.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const memory = db.getUserMemory(user.id);
  const activePlan = db.getActivePlan(user.id);
  const draftPlan = db.getDraftPlan(user.id);

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
voiceRouter.post('/plan/generate', async (req: Request, res: Response) => {
  try {
    const { userId, draft } = req.body;
    if (!userId || !draft) {
      res.status(400).json({ error: 'userId and draft are required' });
      return;
    }

    const result = await PlanService.generatePlanDraft(userId, draft);
    if (!result.success) {
      res.status(400).json({ error: 'Validation failed', details: result.errors });
      return;
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Confirm Plan Draft
voiceRouter.post('/plan/confirm', (req: Request, res: Response) => {
  const { userId, planId } = req.body;
  if (!userId || !planId) {
    res.status(400).json({ error: 'userId and planId are required' });
    return;
  }

  const confirmed = PlanService.confirmDraftPlan(userId, planId);
  if (!confirmed) {
    res.status(404).json({ error: 'Draft plan not found or already archived' });
    return;
  }

  res.json({ success: true, activePlan: confirmed });
});

// 11. Cost & Privacy Metrics
voiceRouter.get('/metrics', (_req: Request, res: Response) => {
  const metrics = CostAndPrivacyTracker.getMetrics();
  res.json(metrics);
});

/**
 * Converts raw 16-bit linear PCM audio into standard RIFF WAVE (.wav) container.
 */
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitDepth = 16): Buffer {
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

const audioCache = new Map<string, { buffer: Buffer; mime: string; createdAt: number }>();

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
voiceRouter.get('/audio/:id.wav', (req: Request, res: Response) => {
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
voiceRouter.post('/greeting', async (req: Request, res: Response) => {
  try {
    const greeting = 'नमस्ते! मैं HealthFreak voice coach हूँ। आज आपकी fitness और diet में क्या help कर सकता हूँ?';
    res.json({
      greeting,
      provider: 'sarvam',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Health Coach Chat Turn (Sarvam AI & LiveKit Voice Agent)
voiceRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, userId = 'usr_synthetic_alex' } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const user = db.getUser(userId) || db.getUser('usr_synthetic_alex');

    // Check recent events from active console agent
    const events = VoiceAgentProcess.getLatestTranscripts();
    const lastCoachEvent = [...events].reverse().find((e) => e.coach_reply);

    let replyText = lastCoachEvent?.coach_reply;
    if (!replyText) {
      replyText = 'नमस्ते! मैंने आपका message note कर लिया है। आज आपकी fitness और diet में क्या plan है?';
    }

    if (user) {
      const lower = message.toLowerCase();
      if (lower.includes('knee') || lower.includes('pain') || lower.includes('dard')) {
        db.updateMemoryFact(user.id, 'symptom_knee_discomfort', 'Reported discomfort during chat', 0.9);
      }
      if (lower.includes('tired') || lower.includes('fatigue')) {
        db.updateMemoryFact(user.id, 'energy_status', 'Low energy reported in chat', 0.9);
      }
    }

    res.json({
      text: replyText.trim(),
      provider: 'sarvam',
      suggestions: ['Check my active plan', 'How is my hydration today?', 'Adjust my workout intensity'],
    });
  } catch (err: any) {
    console.error('❌  [CHAT PROCESSING ERROR]:', err.message);
    res.status(500).json({ error: err.message || 'Error processing chat' });
  }
});

export function isSelfEcho(userText: string, coachText: string): boolean {
  if (!userText || !coachText) return false;

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

  if (!cleanUser || !cleanCoach) return false;

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
voiceRouter.post('/audio-turn', async (req: Request, res: Response) => {
  try {
    const events = VoiceAgentProcess.getLatestTranscripts();
    const lastEvent = events[events.length - 1];

    res.json({
      userTranscript: lastEvent?.user_transcript || 'Voice note received',
      coachReply: lastEvent?.coach_reply || 'नमस्ते! मैं सुन रहा हूँ, आज आपकी fitness और diet में क्या help करूँ?',
      provider: 'sarvam',
      isEcho: false,
    });
  } catch (err: any) {
    res.status(500).json({
      userTranscript: 'Voice input received',
      coachReply: 'नमस्ते! मैं सुन रहा हूँ।',
      error: err.message,
    });
  }
});








