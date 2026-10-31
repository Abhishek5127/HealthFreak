import { Router, Request, Response } from 'express';
import { LiveKitTokenService } from '../livekit/tokenService.js';
import { ExotelSipService } from '../sip/exotelSipService.js';
import { ScheduledCallQueue } from '../queue/scheduledCallQueue.js';
import { db } from '../db/index.js';
import { PlanService } from '../services/planService.js';
import { CostAndPrivacyTracker } from '../services/costTracker.js';
import { config } from '../config/index.js';
import { buildCoachSystemPrompt } from '../agent/coachPrompt.js';

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

    res.json(result.data);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error creating session' });
  }
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

/**
 * Synthesizes natural human speech with authentic Indian accent and cadence
 * using a high-quota multi-model TTS chain with Aoede voice.
 */
export async function synthesizeSpeechWithGemini(
  text: string
): Promise<{ audioBase64: string; audioMime: string } | null> {
  if (!config.gemini.apiKey) return null;

  const ttsModels = [
    'gemini-3.1-flash-tts-preview',
    'gemini-2.5-flash-preview-tts',
    'gemini-3.8-flash-lite-tts',
  ];

  for (const model of ttsModels) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8500);

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.gemini.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text }],
              },
            ],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Aoede',
                  },
                },
              },
            },
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeout);

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

          return {
            audioBase64: audioBuffer.toString('base64'),
            audioMime: 'audio/wav',
          };
        }
      }
    } catch (err: any) {
      console.warn(`⚠️  [TTS MODEL ${model}]:`, err?.message || err);
    }
  }
  return null;
}

// 12. Dynamic Neural Greeting Audio
voiceRouter.post('/greeting', async (req: Request, res: Response) => {
  try {
    const { userId = 'usr_synthetic_alex' } = req.body;
    const user = db.getUser(userId) || db.getUser('usr_synthetic_alex');
    const name = user ? user.name.split(' ')[0] : 'Alex';

    const hour = new Date().getHours();
    let greeting = '';
    if (hour >= 5 && hour < 12) {
      greeting = `Good morning ${name}! Main Disha bol rahi hoon, aapki AI health coach. How did you sleep, and how is your morning energy today?`;
    } else if (hour >= 12 && hour < 17) {
      greeting = `Namaste ${name}! Main Disha bol rahi hoon. Taking a quick wellness check-in—how was your lunch and routine so far?`;
    } else if (hour >= 17 && hour < 22) {
      greeting = `Good evening ${name}! Disha here. How are you feeling after today's activities? Any discomfort or meal questions tonight?`;
    } else {
      greeting = `Namaste ${name}! Main Disha bol rahi hoon. Time for a peaceful wind-down. How did your day go overall?`;
    }

    const speech = await synthesizeSpeechWithGemini(greeting);

    res.json({
      greeting,
      audioBase64: speech?.audioBase64,
      audioMime: speech?.audioMime || 'audio/wav',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Real-time Gemini AI Coach Chat
voiceRouter.post('/chat', async (req: Request, res: Response) => {
  const start = Date.now();
  try {
    const { message, userId = 'usr_synthetic_alex' } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'message is required' });
      return;
    }

    const user = db.getUser(userId) || db.getUser('usr_synthetic_alex');
    const memory = user ? db.getUserMemory(user.id) : {};
    const systemPrompt = user ? buildCoachSystemPrompt(user, memory) : 'You are Disha, an AI health coach.';

    console.log('\n============================================================');
    console.log('🎙️  [LIVE INPUT RECEIVED - CHAT/VOICE TURN]');
    console.log(`👤  User: ${user?.name || 'Alex'} (${userId})`);
    console.log(`📝  TRANSCRIPTION / MESSAGE: "${message}"`);
    console.log('⏳  Sending to Gemini 3.5 Flash Lite...');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;

    const promptText = `${systemPrompt}\n\nUser says: "${message}"\nRespond directly as Disha in 1 concise, warm, actionable coaching sentence (max 25 words).`;

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

    const data = await geminiRes.json();
    const elapsed = Date.now() - start;

    if (data.error) {
      console.error('❌  [GEMINI ERROR]:', data.error.message);
      throw new Error(data.error.message || 'Gemini error');
    }

    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I am here with you. How can I support your routine today?';

    console.log(`🤖  DISHA AI RESPONSE: "${replyText.trim()}"`);
    console.log(`⚡  Latency: ${elapsed}ms`);
    console.log('============================================================\n');

    // Progressive memory extraction for symptoms or energy
    if (user) {
      const lower = message.toLowerCase();
      if (lower.includes('knee') || lower.includes('pain') || lower.includes('dard')) {
        db.updateMemoryFact(user.id, 'symptom_knee_discomfort', 'Reported discomfort during chat', 0.9);
      }
      if (lower.includes('tired') || lower.includes('fatigue')) {
        db.updateMemoryFact(user.id, 'energy_status', 'Low energy reported in chat', 0.9);
      }
    }

    let audioBase64Out: string | undefined = undefined;
    let audioMimeOut: string | undefined = undefined;

    const { generateCloudAudio } = req.body;
    if (generateCloudAudio) {
      const speechResult = await synthesizeSpeechWithGemini(replyText.trim());
      if (speechResult) {
        audioBase64Out = speechResult.audioBase64;
        audioMimeOut = speechResult.audioMime;
        console.log(`🔊  [CHAT NEURAL AUDIO READY]: ${audioMimeOut}`);
      }
    }

    res.json({
      text: replyText.trim(),
      audioBase64: audioBase64Out,
      audioMime: audioMimeOut,
      suggestions: ['Check my active plan', 'How is my hydration today?', 'Adjust my workout intensity'],
    });
  } catch (err: any) {
    console.error('❌  [CHAT PROCESSING ERROR]:', err.message);
    res.status(500).json({ error: err.message || 'Error processing AI chat' });
  }
});

// 12. Audio Stream Multimodal Transcription & Response
voiceRouter.post('/audio-turn', async (req: Request, res: Response) => {
  const start = Date.now();
  try {
    const { audioBase64, mimeType = 'audio/webm', userId = 'usr_synthetic_alex' } = req.body;
    if (!audioBase64) {
      res.status(400).json({ error: 'audioBase64 is required' });
      return;
    }

    const user = db.getUser(userId) || db.getUser('usr_synthetic_alex');
    const memory = user ? db.getUserMemory(user.id) : {};
    const sizeKb = ((audioBase64.length * 0.75) / 1024).toFixed(1);

    console.log('\n============================================================');
    console.log('🎙️  [LIVE AUDIO STREAM RECEIVED FOR TRANSCRIPTION]');
    console.log(`👤  User: ${user?.name || 'Alex'} (${userId})`);
    console.log(`📦  Audio Size: ${sizeKb} KB | MIME Type: ${mimeType}`);
    console.log('⏳  Transcribing & analyzing with Gemini Multimodal Audio...');

    const systemPrompt = user ? buildCoachSystemPrompt(user, memory) : 'You are Disha, an AI health coach.';

    const instruction = `${systemPrompt}
Listen carefully to the attached user voice recording.
1. Transcribe what the user said verbatim in English, Hindi, or conversational Hinglish. Be sensitive to soft speech, quick words (e.g. "haan", "nahi", "theek hai", "yes", "hello", "knee pain"), and casual Indian phrasing.
2. If the user spoke, respond warmly, empathetically, and concisely in 1 coaching sentence (under 20 words) as Disha.
   - If user spoke in Hindi or Hinglish, reply in natural conversational Hinglish with warm Hindi expressions.
   - If user spoke in English, reply in friendly, natural Indian English.
3. If and only if there is absolutely no vocal sound at all (pure ambient silence):
   - userTranscript: "(Silence or brief pause)"
   - coachReply: "Main sun rahi hoon Alex, please go ahead!"
Return strictly a valid JSON object in this format:
{
  "userTranscript": "<exact words user spoke>",
  "coachReply": "<Disha's response>"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;

    let cleanMime = (mimeType || 'audio/webm').split(';')[0].trim().toLowerCase();
    if (cleanMime === 'audio/m4a' || cleanMime === 'audio/x-m4a' || cleanMime.endsWith('m4a')) {
      cleanMime = 'audio/mp4';
    }

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
          maxOutputTokens: 90,
          temperature: 0.6,
        },
      }),
    });

    const data = await geminiRes.json();
    const elapsed = Date.now() - start;

    if (data.error) {
      console.error('❌  [GEMINI AUDIO ERROR]:', data.error.message);
      throw new Error(data.error.message);
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let userTranscript = 'Voice message';
    let coachReply = 'Namaste Alex! Main sun rahi hoon. Aaj aap kaisa feel kar rahe hain?';

    try {
      const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.userTranscript) userTranscript = parsed.userTranscript;
      if (parsed.coachReply) coachReply = parsed.coachReply;
    } catch {
      if (rawText.trim()) coachReply = rawText.trim();
    }

    console.log(`📝  TRANSCRIPTION: "${userTranscript}"`);
    console.log(`🤖  DISHA AI RESPONSE: "${coachReply}"`);
    console.log(`⚡  Live Turn Latency: ${elapsed}ms`);
    console.log('============================================================\n');

    // Progressive memory extraction for symptoms or energy
    if (user && userTranscript) {
      const lower = userTranscript.toLowerCase();
      if (lower.includes('knee') || lower.includes('pain') || lower.includes('dard')) {
        db.updateMemoryFact(user.id, 'symptom_knee_discomfort', 'Reported knee discomfort in voice call', 0.9);
      }
      if (lower.includes('tired') || lower.includes('fatigue')) {
        db.updateMemoryFact(user.id, 'energy_status', 'Reported fatigue in voice call', 0.9);
      }
    }

    // Optional cloud audio if explicitly requested by client; default responds immediately for sub-second latency
    const { generateCloudAudio } = req.body;
    let audioBase64Out: string | undefined = undefined;
    let audioMimeOut: string | undefined = undefined;

    if (generateCloudAudio) {
      const speechResult = await synthesizeSpeechWithGemini(coachReply);
      if (speechResult) {
        audioBase64Out = speechResult.audioBase64;
        audioMimeOut = speechResult.audioMime;
        console.log(`🔊  [GEMINI NEURAL AUDIO READY]: ${audioMimeOut} (${((audioBase64Out.length * 0.75) / 1024).toFixed(1)} KB)`);
      }
    }

    res.json({
      userTranscript,
      coachReply,
      audioBase64: audioBase64Out,
      audioMime: audioMimeOut,
      latencyMs: elapsed,
    });
  } catch (err: any) {
    console.error('❌  [AUDIO TURN ERROR]:', err.message);
    res.status(500).json({
      userTranscript: 'Audio received',
      coachReply: 'Namaste Alex! Main sun rahi hoon. Aaj aap kaisa feel kar rahe hain? Any specific question?',
      error: err.message,
    });
  }
});



