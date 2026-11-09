import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { LiveKitTokenService } from '../livekit/tokenService.js';
import { ExotelSipService } from '../sip/exotelSipService.js';
import { ScheduledCallQueue } from '../queue/scheduledCallQueue.js';
import { db } from '../db/index.js';
import { healthMemoryStore } from '../db/healthMemoryStore.js';
import { PlanService } from '../services/planService.js';
import { CostAndPrivacyTracker } from '../services/costTracker.js';
import { config } from '../config/index.js';
import { buildCoachSystemPrompt } from '../agent/coachPrompt.js';
import { VoiceAgentProcess } from '../services/voiceAgentProcess.js';
import { SarvamService } from '../services/sarvamService.js';

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: config.gemini.apiKey });
  }
  return geminiClient;
}

export const voiceRouter = Router();

// 1. In-App Call Session Token
voiceRouter.post('/session', async (req: Request, res: Response) => {
  try {
    const { userId, providerOverride, purpose, scheduledCallId } = req.body;
    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const result = await LiveKitTokenService.createCallSessionAndToken({
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
    const { userId = 'usr_synthetic_alex' } = req.body;
    const user = db.getUser(userId) || db.getUser('usr_synthetic_alex');
    const firstName = user?.name ? user.name.split(' ')[0] : 'there';
    const hour = new Date().getHours();
    let timeGreeting = 'Namaste';
    if (hour >= 5 && hour < 12) timeGreeting = 'Suprabhat';
    else if (hour >= 18 && hour < 22) timeGreeting = 'Shubh Sandhya';

    const greeting = `${timeGreeting} ${firstName}! Main Coach Alex bol raha hoon, aapka HealthFreak AI coach. Aaj aapki fitness aur diet mein kya help karoon?`;

    let audioBase64: string | undefined;
    if (SarvamService.isConfigured()) {
      audioBase64 = await SarvamService.synthesizeSpeech(greeting);
    }

    res.json({
      greeting,
      audioBase64,
      audioMime: 'audio/wav',
      provider: SarvamService.isConfigured() ? 'sarvam' : 'gemini',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Health Coach Chat Turn (Sarvam AI 105B + Bulbul Neural Voice)
voiceRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, userId = 'usr_synthetic_alex', activityContext } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const user = db.getUser(userId) || db.getUser('usr_synthetic_alex');
    const userName = user?.name ? user.name.split(' ')[0] : 'friend';

    // 1. Check if user mentioned pain, fatigue or dietary symptoms and update memory facts
    if (user) {
      const lower = message.toLowerCase();
      if (lower.includes('knee') || lower.includes('pain') || lower.includes('dard')) {
        db.updateMemoryFact(user.id, 'symptom_knee_discomfort', 'Reported discomfort: ' + message, 0.9);
      }
      if (lower.includes('tired') || lower.includes('fatigue') || lower.includes('thak')) {
        db.updateMemoryFact(user.id, 'energy_status', 'Low energy reported in chat', 0.9);
      }
      if (lower.includes('dinner') || lower.includes('lunch') || lower.includes('diet') || lower.includes('khana')) {
        db.updateMemoryFact(user.id, 'nutrition_query', 'Asked about meals in chat', 0.85);
      }
    }

    const activeFacts = user ? healthMemoryStore.getActiveProfileFacts(user.id) : [];
    const memorySnippet = activeFacts.length > 0
      ? activeFacts.map((f) => `${f.key}: ${f.value}`).join('; ')
      : '';

    const activitySnippet = activityContext
      ? `Today steps: ${activityContext.todaySteps || 0} / ${activityContext.stepGoal || 10000}, active calories: ${activityContext.caloriesBurned || 0} kcal`
      : '';

    // 2. PRIMARY: Generate conversational reply and neural voice directly via Sarvam AI
    if (SarvamService.isConfigured()) {
      const sarvamResult = await SarvamService.generateChatReply({
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
    let suggestions: string[] = [];

    if (config.gemini.apiKey) {
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
        config.gemini.model || 'gemini-3.5-flash-lite',
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
        } catch (err: any) {
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
      } else if (lower.includes('dinner') || lower.includes('khana') || lower.includes('food') || lower.includes('eat')) {
        replyText = `For a healthy dinner ${userName}, go for light protein and veggies like grilled paneer, dal, and a small bowl of salad. Avoid heavy carbs late at night!`;
        suggestions = ['High protein dinner', 'Low carb recipes', 'Log my dinner'];
      } else if (lower.includes('workout') || lower.includes('exercise') || lower.includes('gym')) {
        replyText = `Great enthusiasm ${userName}! Let's focus on a 20-minute brisk walk followed by light mobility work to keep your joints healthy.`;
        suggestions = ['Start 20m walk', 'Mobility warmup', 'Log workout'];
      } else if (lower.includes('sleep') || lower.includes('tired') || lower.includes('thak')) {
        replyText = `Recovery is key, ${userName}! Make sure to drink a glass of water, keep screens away 30 minutes before bed, and get 7-8 hours of quality sleep tonight.`;
        suggestions = ['Sleep meditation', 'Log bedtime', 'Set wake-up goal'];
      } else {
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








