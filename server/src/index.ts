import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { voiceRouter } from './routes/voiceRoutes.js';
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

