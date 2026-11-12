"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCoachSignature = verifyCoachSignature;
const crypto_1 = __importDefault(require("crypto"));
const index_js_1 = require("../config/index.js");
const supabaseClient_js_1 = require("../db/supabaseClient.js");
const index_js_2 = require("../db/index.js");
const INACTIVE_STATUSES = new Set([
    'completed',
    'failed',
    'dropped',
    'timeout',
    'ended',
    'cancelled',
    'user_declined',
]);
async function fetchCallRecord(callId) {
    // 1. Try PostgreSQL calls table
    const pool = supabaseClient_js_1.SupabaseDb.getPool();
    if (pool) {
        try {
            const res = await pool.query('SELECT user_id, status FROM calls WHERE id = $1 LIMIT 1', [callId]);
            if (res.rows[0]) {
                return { userId: res.rows[0].user_id, status: res.rows[0].status };
            }
        }
        catch { }
    }
    // 2. Try Supabase Client
    if (supabaseClient_js_1.SupabaseDb.isConfigured()) {
        try {
            const { data } = await supabaseClient_js_1.SupabaseDb.getClient()
                .from('calls')
                .select('user_id, status')
                .eq('id', callId)
                .maybeSingle();
            if (data) {
                return { userId: data.user_id, status: data.status };
            }
        }
        catch { }
    }
    // 3. Fallback to in-memory call sessions
    const memSession = index_js_2.db.getCallSession(callId);
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
async function verifyCoachSignature(req, res, next) {
    const callId = req.headers['x-coach-call-id']?.trim();
    const timestamp = req.headers['x-coach-timestamp']?.trim();
    const signature = req.headers['x-coach-signature']?.trim();
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
    const secret = process.env.COACH_HMAC_SECRET || index_js_1.config.coach?.hmacSecret || '';
    if (!secret) {
        res.status(401).json({ success: false, error: 'COACH_HMAC_SECRET not configured on server' });
        return;
    }
    // 4. Compute Canonical Signature:
    // timestamp + "\n" + METHOD + "\n" + path-with-query + "\n" + sha256(raw body) + "\n" + call_id
    const method = req.method.toUpperCase();
    const pathWithQuery = req.originalUrl || req.url;
    const rawBodyBuf = req.rawBody
        ? req.rawBody
        : (req.body && Object.keys(req.body).length > 0)
            ? Buffer.from(JSON.stringify(req.body), 'utf8')
            : Buffer.alloc(0);
    const bodySha256 = crypto_1.default.createHash('sha256').update(rawBodyBuf).digest('hex');
    const canonical = `${timestamp}\n${method}\n${pathWithQuery}\n${bodySha256}\n${callId}`;
    const expectedSigHex = crypto_1.default.createHmac('sha256', secret).update(canonical).digest('hex').toLowerCase();
    const receivedSigHex = signature.toLowerCase();
    if (receivedSigHex.length !== expectedSigHex.length) {
        res.status(401).json({ success: false, error: 'Invalid coach HMAC signature length' });
        return;
    }
    const expectedBuf = Buffer.from(expectedSigHex, 'utf8');
    const receivedBuf = Buffer.from(receivedSigHex, 'utf8');
    if (!crypto_1.default.timingSafeEqual(expectedBuf, receivedBuf)) {
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
