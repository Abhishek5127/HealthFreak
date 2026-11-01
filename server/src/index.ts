import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { voiceRouter } from './routes/voiceRoutes.js';
import { mealRouter } from './routes/mealRoutes.js';
import { nutritionRouter } from './routes/nutritionRoutes.js';
import { healthMemoryRouter } from './routes/healthMemoryRoutes.js';
import { planRouter } from './routes/planRoutes.js';
import { followupRouter } from './routes/followupRoutes.js';
import { authRouter } from './routes/authRoutes.js';
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

// Temporary in-memory cache for seamless OAuth session handoff between browser and mobile client
let latestOAuthPayload: { access_token?: string; refresh_token?: string; code?: string; timestamp: number } | null = null;

// OAuth Redirect Bridge for Mobile & Web Clients
const renderOAuthBridgeHtml = (req: express.Request, res: express.Response) => {
  const host = (req.headers.host || '192.168.43.249:3001').split(':')[0];
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HealthFreak Authentication</title>
  <style>
    body {
      background-color: #121613;
      color: #E8EFE9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      padding: 24px;
      text-align: center;
      box-sizing: border-box;
    }
    .card {
      background: #19201B;
      border: 1px solid #2B382D;
      border-radius: 24px;
      padding: 32px 24px;
      max-width: 420px;
      width: 100%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 3px solid #253327;
      border-top: 3px solid #4AB87A;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 20px auto;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    h2 { margin: 0 0 8px 0; font-size: 20px; color: #FFFFFF; font-weight: 700; }
    p { color: #9EAEA0; font-size: 14px; margin: 0 0 24px 0; line-height: 1.5; }
    .btn {
      display: block;
      background: #4AB87A;
      color: #0E1610;
      font-weight: 700;
      text-decoration: none;
      padding: 14px 20px;
      border-radius: 24px;
      font-size: 15px;
      margin-bottom: 12px;
    }
    .btn-secondary {
      background: #202C23;
      color: #C2D4C5;
      border: 1px solid #2F3E32;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>Google Sign-In Verified</h2>
    <p>Authentication complete! Tap the button below to return to HealthFreak.</p>
    <div id="actionArea">
      <a id="goBtn" class="btn" href="#">Continue to HealthFreak</a>
      <a id="appBtn" class="btn btn-secondary" href="#">Open Standalone App</a>
    </div>
  </div>
  <script>
    const searchStr = window.location.search || '';
    const hashStr = window.location.hash || '';
    const params = searchStr + hashStr;

    // 1. Parse tokens or authorization code from callback URL cleanly
    const s = searchStr.replace(/^\\?/, '');
    const h = hashStr.replace(/^#/, '');
    const all = [s, h].filter(Boolean).join('&');
    const parsed = {};
    all.split('&').forEach(function(pair) {
      const parts = pair.split('=');
      if (parts[0] && parts[1]) {
        parsed[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
      }
    });

    // 2. Post tokens to local relay store for instantaneous mobile synchronization
    if (parsed.access_token || parsed.code) {
      fetch('/api/auth/relay-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: parsed.access_token,
          refresh_token: parsed.refresh_token,
          code: parsed.code,
        }),
      }).catch(function() {});
    }

    const standaloneUri = "healthfreak://auth/callback" + params;
    const expoGoUri = "exp://${host}:8081/--/auth/callback" + params;

    const goBtn = document.getElementById('goBtn');
    const appBtn = document.getElementById('appBtn');
    if (goBtn) goBtn.href = expoGoUri;
    if (appBtn) appBtn.href = standaloneUri;

    // 3. Attempt automatic deep-link redirection
    try {
      window.location.href = expoGoUri;
    } catch(e) {}
  </script>
</body>
</html>`);
};

app.get('/', renderOAuthBridgeHtml);
app.get('/auth/callback', renderOAuthBridgeHtml);
app.get('/api/auth/callback', renderOAuthBridgeHtml);

// API endpoint for receiving relay tokens from browser
app.post('/api/auth/relay-session', (req, res) => {
  const { access_token, refresh_token, code } = req.body || {};
  if (access_token || refresh_token || code) {
    latestOAuthPayload = { access_token, refresh_token, code, timestamp: Date.now() };
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Missing tokens or code' });
  }
});

// API endpoint for mobile app to fetch latest active OAuth session
app.get('/api/auth/latest-session', (_req, res) => {
  if (latestOAuthPayload && Date.now() - latestOAuthPayload.timestamp < 120000) {
    res.json({ success: true, ...latestOAuthPayload });
  } else {
    res.json({ success: false });
  }
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

// Supabase Google OAuth & Authentication Routes
app.use('/api/auth', authRouter);

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
