import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { voiceRouter } from './routes/voiceRoutes.js';
import { mealRouter } from './routes/mealRoutes.js';
import { nutritionRouter } from './routes/nutritionRoutes.js';
import { healthMemoryRouter } from './routes/healthMemoryRoutes.js';
import { planRouter } from './routes/planRoutes.js';
import { followupRouter } from './routes/followupRoutes.js';
import { ScheduledCallQueue } from './queue/scheduledCallQueue.js';

process.on('uncaughtException', (err) => {
  console.error('[Disha Server] Uncaught exception:', err.message);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('[Disha Server] Unhandled rejection:', reason?.message || reason);
});

const app = express();

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'disha-voice-ai-coach',
    version: '1.0.0',
    provider: config.voiceProvider,
    syntheticMode: config.privacy.syntheticDataMode,
    timestamp: new Date().toISOString(),
  });
});

// Voice AI Routes
app.use('/api/voice', voiceRouter);

// AI Meal Scanner & Food Diary Routes
app.use('/api/meals', mealRouter);

// 30-Day Nutrition Intelligence & Analytics Routes
app.use('/api/nutrition', nutritionRouter);

// Personal Health Memory & 50-Entity Profile Routes
app.use('/api/health', healthMemoryRouter);

// Adaptive Plan Engine Routes
app.use('/api/plans', planRouter);

// Follow-up Scheduling Routes
app.use('/api/followups', followupRouter);

async function startServer() {
  // Initialize BullMQ Queue / Redis
  await ScheduledCallQueue.initialize();

  const server = app.listen(config.port, () => {
    console.log(`[Disha Voice Server] Running on http://localhost:${config.port}`);
    console.log(`[Disha Voice Server] Selected Voice Provider: ${config.voiceProvider}`);
    console.log(`[Disha Voice Server] Concurrency limit: ${config.callingLimits.maxConcurrentCalls}`);
    console.log(`[Disha Voice Server] Synthetic Data Mode: ${config.privacy.syntheticDataMode}`);
  });

  return server;
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, startServer };
