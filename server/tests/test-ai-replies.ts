import express from 'express';
import { aiCallRouter } from '../src/routes/aiCallRoutes.js';
import { db } from '../src/db/index.js';

async function run() {
  const session = {
    id: 'test_call_reply_live',
    roomName: 'test_room_live',
    userId: 'usr_synthetic_alex',
    type: 'in_app' as const,
    status: 'connected' as const,
    provider: 'gemini' as const,
    transcript: [],
    attemptNumber: 0,
  };
  db.createCallSession(session);

  const app = express();
  app.use(express.json());
  app.use('/api/ai-calls', aiCallRouter);

  const server = app.listen(3099);

  try {
    console.log('--- 1. Testing user message: "dinner m ky khau" ---');
    const res1 = await fetch('http://localhost:3099/api/ai-calls/test_call_reply_live/user-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'dinner m ky khau' }),
    });
    const d1: any = await res1.json();
    console.log('STATUS:', res1.status);
    console.log('COACH REPLY:', d1.coachReply);

    console.log('\n--- 2. Testing user message: "mujhe hairfall ho rha hai kya karu?" ---');
    const res2 = await fetch('http://localhost:3099/api/ai-calls/test_call_reply_live/user-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'mujhe hairfall ho rha hai kya karu?' }),
    });
    const d2: any = await res2.json();
    console.log('STATUS:', res2.status);
    console.log('COACH REPLY:', d2.coachReply);

    console.log('\n--- 3. Testing exact user drink query ---');
    const res3 = await fetch('http://localhost:3099/api/ai-calls/test_call_reply_live/user-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Like meri body and energy kafi achi hai, toh mujhe bas itna batao raat ko main khana khane ke baad drink kya piun, matlab milk chalega ya fir kuch aur acha sa bana ke piun main.' }),
    });
    const d3: any = await res3.json();
    console.log('STATUS:', res3.status);
    console.log('COACH REPLY:', d3.coachReply);
  } catch (err: any) {
    console.error('Test error:', err.message);
  } finally {
    server.close();
    process.exit(0);
  }
}

run();

