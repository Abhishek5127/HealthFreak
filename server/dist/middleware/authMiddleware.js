"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateSupabaseToken = authenticateSupabaseToken;
const supabaseService_js_1 = require("../services/supabaseService.js");
const index_js_1 = require("../config/index.js");
/**
 * Validates Supabase JWT Access Tokens from Authorization header (Bearer <token>).
 * Strictly guarantees that client-supplied user IDs in query/body cannot be spoofed.
 */
async function authenticateSupabaseToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const supabase = (0, supabaseService_js_1.getServerSupabase)();
        if (!supabase) {
            res.status(500).json({ success: false, error: 'Supabase server client not configured' });
            return;
        }
        try {
            const { data, error } = await supabase.auth.getUser(token);
            if (error || !data.user) {
                res.status(401).json({
                    success: false,
                    error: error?.message || 'Invalid or expired Supabase access token',
                });
                return;
            }
            req.user = data.user;
            req.userId = data.user.id;
            return next();
        }
        catch (err) {
            res.status(401).json({
                success: false,
                error: 'Authentication verification failed',
            });
            return;
        }
    }
    // Fallback for Synthetic Privacy Mode / Test Environments
    // Never active if real token is provided.
    const syntheticHeader = req.headers['x-user-id'];
    const isSyntheticAllowed = process.env.NODE_ENV === 'test' || index_js_1.config.privacy.syntheticDataMode;
    if (isSyntheticAllowed && syntheticHeader) {
        req.userId = syntheticHeader;
        req.user = { id: syntheticHeader, email: `${syntheticHeader}@healthfreak.synthetic.test` };
        return next();
    }
    res.status(401).json({
        success: false,
        error: 'Missing Authorization header with valid Bearer token',
    });
}
