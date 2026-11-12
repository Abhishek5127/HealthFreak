import { app } from '../src/index.js';
import { db } from '../src/db/index.js';
import { LiveKitTokenService } from '../src/livekit/tokenService.js';
import { AICallScheduler } from '../src/queue/aiCallScheduler.js';
import { config } from '../src/config/index.js';

export async function runAICallTests() {
  console.log('\n======================================================');
  console.log('🧪 TESTING AI SCHEDULED VOICE CALL SUITE (LiveKit + Gemini)');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      failed++;
    }
  }

  const userId = 'usr_synthetic_alex';

  // 1. LiveKit Token Generation
  console.log('--- Test 1: LiveKit Access Token Generation ---');
  const tokenRes = await LiveKitTokenService.createCallSessionAndToken({
    userId,
    callType: 'in_app',
    providerOverride: 'gemini',
  });

  assert(tokenRes.success, 'Token generated successfully');
  assert(!!tokenRes.data?.token, 'JWT token string exists');
  assert(tokenRes.data?.serverUrl === config.livekit.url, `Server URL matches: ${config.livekit.url}`);
  assert(tokenRes.data?.provider === 'gemini', 'Voice Provider set to gemini');

  // 2. Schedule Call
  console.log('\n--- Test 2: Schedule In-App Call ---');
  const futureTime = new Date(Date.now() + 10000).toISOString();
  const callId = `call_test_${Date.now()}`;
  const roomName = `room_test_${Date.now()}`;

  db.createCallSession({
    id: callId,
    roomName,
    userId,
    type: 'in_app',
    status: 'scheduled',
    provider: 'gemini',
    transcript: [],
    attemptNumber: 0,
    summary: 'Test scheduled nutrition call',
  });
  (db.getCallSession(callId) as any).scheduledTime = futureTime;

  const session = db.getCallSession(callId);
  assert(session?.status === 'scheduled', 'Call session created with status "scheduled"');
  assert(session?.userId === userId, 'Assigned to correct userId');

  // 3. Trigger Incoming Call
  console.log('\n--- Test 3: Trigger Incoming Call ---');
  const triggered = await AICallScheduler.triggerIncomingCall(callId);
  assert(triggered, 'Incoming call successfully triggered by scheduler');

  const ringingCall = AICallScheduler.getActiveRingingCall(userId);
  assert(ringingCall?.id === callId, 'Active ringing call detected for user');
  assert(ringingCall?.status === 'ringing', 'Status transitioned to "ringing"');

  // 4. Accept Call
  console.log('\n--- Test 4: Accept Call ---');
  AICallScheduler.clearRinging(callId);
  const updatedCall = db.updateCallSession(callId, {
    status: 'connected',
    startedAt: new Date().toISOString(),
  });

  assert(updatedCall?.status === 'connected', 'Status transitioned to "connected" on accept');
  assert(!!updatedCall?.startedAt, 'startedAt timestamp recorded');

  // 5. Append Conversation Transcript
  console.log('\n--- Test 5: Bi-directional Transcript ---');
  db.appendTranscript(callId, 'coach', 'Hello Alex, Coach Mack here! How is your knee feeling today?');
  db.appendTranscript(callId, 'user', 'Feeling much better, I did 20 minutes of walking.');

  const transcript = db.getCallSession(callId)?.transcript || [];
  assert(transcript.length === 2, 'Transcript entries stored');
  assert(transcript[0].speaker === 'coach', 'Coach utterance recorded');
  assert(transcript[1].speaker === 'user', 'User utterance recorded');

  // 6. End Call & Duration Calculation
  console.log('\n--- Test 6: End Call & Final Metrics ---');
  const endedCall = db.updateCallSession(callId, {
    status: 'completed',
    endedAt: new Date().toISOString(),
    durationSeconds: 42,
  });

  assert(endedCall?.status === 'completed', 'Call marked as completed');
  assert(endedCall?.durationSeconds === 42, 'Call duration accurately stored');

  console.log('\n======================================================');
  console.log(`🏁 Results: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAICallTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});

