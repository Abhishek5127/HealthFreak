import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { SupabaseDb } from '../db/supabaseClient.js';
import { db } from '../db/index.js';

export interface AuthenticatedCoachRequest extends Request {
  coachUserId?: string;
  coachCallId?: string;
  rawBody?: Buffer;
}

const INACTIVE_STATUSES = new Set([
  'completed',
  'failed',
  'dropped',
  'timeout',
  'ended',
  'cancelled',
  'user_declined',
]);

async function fetchCallRecord(callId: string): Promise<{ userId: string; status: string } | null> {
  // 1. Try PostgreSQL calls table
  const pool = SupabaseDb.getPool();
  if (pool) {
    try {
      const res = await pool.query('SELECT user_id, status FROM calls WHERE id = $1 LIMIT 1', [callId]);
      if (res.rows[0]) {
        return { userId: res.rows[0].user_id, status: res.rows[0].status };
      }
    } catch {}
  }

  // 2. Try Supabase Client
  if (SupabaseDb.isConfigured()) {
    try {
      const { data } = await SupabaseDb.getClient()
        .from('calls')
        .select('user_id, status')
        .eq('id', callId)
        .maybeSingle();
      if (data) {
        return { userId: data.user_id, status: data.status };
      }
    } catch {}
  }

  // 3. Fallback to in-memory call sessions
  const memSession = db.getCallSession(callId);
  if (memSession) {
    return { userId: memSession.userId, status: memSession.status };
  }

  return null;
}

/**
 * Server-to-server coach HMAC authentication middleware.
 * Verifies X-Coach-Call-Id, X-Coach-Timestamp, and X-Coach-Signature.
 * Loads the call row, validates it is active, and binds req.coachUserId.
 */
export async function verifyCoachSignature(
  req: AuthenticatedCoachRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const callId = (req.headers['x-coach-call-id'] as string)?.trim();
  const timestamp = (req.headers['x-coach-timestamp'] as string)?.trim();
  const signature = (req.headers['x-coach-signature'] as string)?.trim();

  // 1. Required Headers Check
  if (!callId || !timestamp || !signature) {
    res.status(401).json({
      success: false,
      error: 'Missing required coach HMAC headers (X-Coach-Call-Id, X-Coach-Timestamp, X-Coach-Signature)',
    });
    return;
  }

  // 2. Timestamp Freshness Check (within 5 minutes)
  let tsNum = Number(timestamp);
  if (isNaN(tsNum)) {
    res.status(401).json({ success: false, error: 'Invalid X-Coach-Timestamp header' });
    return;
  }
  if (tsNum < 1e11) {
    tsNum *= 1000; // convert unix seconds to milliseconds
  }
  const now = Date.now();
  if (Math.abs(now - tsNum) > 5 * 60 * 1000) {
    res.status(401).json({ success: false, error: 'Timestamp expired or out of bounds (>5 minutes)' });
    return;
  }

  // 3. HMAC Secret Check
  const secret = process.env.COACH_HMAC_SECRET || config.coach?.hmacSecret || '';
  if (!secret) {
    res.status(401).json({ success: false, error: 'COACH_HMAC_SECRET not configured on server' });
    return;
  }

  // 4. Compute Canonical Signature:
  // timestamp + "\n" + METHOD + "\n" + path-with-query + "\n" + sha256(raw body) + "\n" + call_id
  const method = req.method.toUpperCase();
  const pathWithQuery = req.originalUrl || req.url;

  const rawBodyBuf: Buffer = req.rawBody
    ? req.rawBody
    : (req.body && Object.keys(req.body).length > 0)
    ? Buffer.from(JSON.stringify(req.body), 'utf8')
    : Buffer.alloc(0);

  const bodySha256 = crypto.createHash('sha256').update(rawBodyBuf).digest('hex');
  const canonical = `${timestamp}\n${method}\n${pathWithQuery}\n${bodySha256}\n${callId}`;

  const expectedSigHex = crypto.createHmac('sha256', secret).update(canonical).digest('hex').toLowerCase();
  const receivedSigHex = signature.toLowerCase();

  if (receivedSigHex.length !== expectedSigHex.length) {
    res.status(401).json({ success: false, error: 'Invalid coach HMAC signature length' });
    return;
  }

  const expectedBuf = Buffer.from(expectedSigHex, 'utf8');
  const receivedBuf = Buffer.from(receivedSigHex, 'utf8');

  if (!crypto.timingSafeEqual(expectedBuf, receivedBuf)) {
    res.status(401).json({ success: false, error: 'Invalid coach HMAC signature' });
    return;
  }

  // 5. Load call row for X-Coach-Call-Id and check active status
  const callRecord = await fetchCallRecord(callId);
  if (!callRecord) {
    res.status(403).json({ success: false, error: `Call session '${callId}' does not exist` });
    return;
  }

  if (INACTIVE_STATUSES.has((callRecord.status || '').toLowerCase())) {
    res.status(403).json({
      success: false,
      error: `Call session '${callId}' is not active (current status: ${callRecord.status})`,
    });
    return;
  }

  req.coachUserId = callRecord.userId;
  req.coachCallId = callId;
  return next();
}
