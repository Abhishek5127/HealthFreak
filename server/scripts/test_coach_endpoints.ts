import http from 'http';

function makeRequest(options: http.RequestOptions, postData?: string): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string; durationMs: number }> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          body: data,
          durationMs: Date.now() - start,
        });
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(15000, () => {
      req.destroy(new Error('Request timed out after 15000ms'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== COACH MACK ENDPOINT SELF-TESTS ===\n');

  // Test 1: Health
  try {
    const res = await makeRequest({
      hostname: '127.0.0.1',
      port: 3001,
      path: '/health',
      method: 'GET',
    });
    console.log(`[TEST 1] GET /health -> Status: ${res.statusCode} (${res.durationMs}ms)`);
    console.log(`Body: ${res.body}`);
  } catch (err: any) {
    console.error(`[TEST 1] GET /health FAILED:`, err.message);
  }

  // Test 2: Greeting
  try {
    const payload = JSON.stringify({
      userId: 'usr_synthetic_alex',
      userName: 'Alex',
    });
    const res = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: 3001,
        path: '/api/voice/greeting',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      payload
    );
    console.log(`\n[TEST 2] POST /api/voice/greeting -> Status: ${res.statusCode} (${res.durationMs}ms)`);
    try {
      const parsed = JSON.parse(res.body);
      console.log(`Greeting text: "${parsed.greeting}"`);
      console.log(`Has audioBase64: ${Boolean(parsed.audioBase64)} (length: ${parsed.audioBase64?.length || 0})`);
      console.log(`Provider: ${parsed.provider}`);
    } catch {
      console.log(`Body: ${res.body.slice(0, 300)}`);
    }
  } catch (err: any) {
    console.error(`[TEST 2] POST /api/voice/greeting FAILED:`, err.message);
  }

  // Test 3: Chat turn
  try {
    const payload = JSON.stringify({
      userId: 'usr_synthetic_alex',
      userName: 'Alex',
      message: 'Hello Coach, I have knee pain today while squatting.',
    });
    const res = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: 3001,
        path: '/api/voice/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      payload
    );
    console.log(`\n[TEST 3] POST /api/voice/chat -> Status: ${res.statusCode} (${res.durationMs}ms)`);
    try {
      const parsed = JSON.parse(res.body);
      console.log(`Coach text: "${parsed.text}"`);
      console.log(`Suggestions: ${JSON.stringify(parsed.suggestions)}`);
      console.log(`Has audioBase64: ${Boolean(parsed.audioBase64)}`);
      console.log(`Provider: ${parsed.provider}`);
    } catch {
      console.log(`Body: ${res.body.slice(0, 300)}`);
    }
  } catch (err: any) {
    console.error(`[TEST 3] POST /api/voice/chat FAILED:`, err.message);
  }

  // Test 4: Call Accept (In-app call initiation)
  try {
    const testCallId = `call_direct_${Date.now()}`;
    const payload = JSON.stringify({
      deviceInfo: { platform: 'android', appVersion: '1.0.0' },
    });
    const res = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: 3001,
        path: `/api/ai-calls/${testCallId}/accept`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'x-user-id': 'usr_synthetic_alex',
        },
      },
      payload
    );
    console.log(`\n[TEST 4] POST /api/ai-calls/:id/accept -> Status: ${res.statusCode} (${res.durationMs}ms)`);
    try {
      const parsed = JSON.parse(res.body);
      console.log(`Session ID: ${parsed.session?.id || parsed.id || 'N/A'}`);
      console.log(`LiveKit Token: ${parsed.livekitToken ? parsed.livekitToken.slice(0, 25) + '...' : 'none'}`);
      console.log(`LiveKit URL: ${parsed.livekitUrl || 'none'}`);
      console.log(`Room: ${parsed.session?.livekitRoomName || 'none'}`);
    } catch {
      console.log(`Body: ${res.body.slice(0, 300)}`);
    }
  } catch (err: any) {
    console.error(`[TEST 4] POST /api/ai-calls/:id/accept FAILED:`, err.message);
  }

  // Test 5: Chat Stream
  try {
    const payload = JSON.stringify({
      userId: 'usr_synthetic_alex',
      userName: 'Alex',
      message: 'Quick tip for hydration?',
    });
    const res = await makeRequest(
      {
        hostname: '127.0.0.1',
        port: 3001,
        path: '/api/voice/chat/stream',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      payload
    );
    console.log(`\n[TEST 5] POST /api/voice/chat/stream -> Status: ${res.statusCode} (${res.durationMs}ms)`);
    console.log(`Stream chunks received: ${res.body.split('\n\n').filter(Boolean).length}`);
    const sampleEvents = res.body.split('\n\n').filter(Boolean).slice(0, 3);
    console.log(`Sample events:\n${sampleEvents.join('\n')}`);
  } catch (err: any) {
    console.error(`[TEST 5] POST /api/voice/chat/stream FAILED:`, err.message);
  }

  console.log('\n=== SELF-TESTS FINISHED ===');
}

runTests();

