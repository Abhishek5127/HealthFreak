"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const authMiddleware_js_1 = require("../middleware/authMiddleware.js");
const healthMemoryStore_js_1 = require("../db/healthMemoryStore.js");
const supabaseClient_js_1 = require("../db/supabaseClient.js");
exports.authRouter = (0, express_1.Router)();
/**
 * POST /api/auth/sync-profile
 * Idempotently provisions or retrieves the user's application profile
 * linked strictly to the canonical Supabase user UUID.
 */
exports.authRouter.post('/sync-profile', authMiddleware_js_1.authenticateSupabaseToken, async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized user' });
            return;
        }
        const user = req.user || {};
        const metadata = user.user_metadata || {};
        const googleName = metadata.full_name || metadata.name || req.body.name || 'Disha Member';
        const googleEmail = user.email || req.body.email || '';
        const googleAvatar = metadata.avatar_url || metadata.picture || req.body.avatarUrl || '';
        const pool = supabaseClient_js_1.SupabaseDb.getPool();
        let profile = healthMemoryStore_js_1.healthMemoryStore.profiles.get(userId);
        // Check PostgreSQL if pool is available
        if (pool) {
            try {
                const dbResult = await pool.query('SELECT * FROM profiles WHERE id = $1;', [userId]);
                if (dbResult.rows.length > 0) {
                    const row = dbResult.rows[0];
                    profile = {
                        id: row.id,
                        name: row.name,
                        email: row.email,
                        avatarUrl: row.avatar_url,
                        onboardingCompleted: Boolean(row.onboarding_completed),
                        authProvider: row.auth_provider || 'google',
                        dateOfBirth: row.date_of_birth,
                        age: row.age,
                        heightCm: parseFloat(row.height_cm || '170.0'),
                        biologicalSex: row.biological_sex,
                        preferredLanguage: row.preferred_language || 'hinglish',
                        timezone: row.timezone || 'Asia/Kolkata',
                        location: row.location,
                        occupation: row.occupation,
                        createdAt: row.created_at?.toISOString?.() || row.created_at,
                        updatedAt: row.updated_at?.toISOString?.() || row.updated_at,
                    };
                    healthMemoryStore_js_1.healthMemoryStore.profiles.set(userId, profile);
                }
                else {
                    // Idempotent insertion for first-time sign-in
                    const insertResult = await pool.query(`INSERT INTO profiles (
                id, name, email, avatar_url, onboarding_completed, auth_provider, height_cm, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, FALSE, 'google', 170.0, NOW(), NOW())
              ON CONFLICT (id) DO UPDATE SET
                email = COALESCE(profiles.email, EXCLUDED.email),
                avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
                updated_at = NOW()
              RETURNING *;`, [userId, googleName, googleEmail, googleAvatar]);
                    const newRow = insertResult.rows[0];
                    profile = {
                        id: newRow.id,
                        name: newRow.name,
                        email: newRow.email,
                        avatarUrl: newRow.avatar_url,
                        onboardingCompleted: Boolean(newRow.onboarding_completed),
                        authProvider: newRow.auth_provider || 'google',
                        heightCm: parseFloat(newRow.height_cm || '170.0'),
                        preferredLanguage: newRow.preferred_language || 'hinglish',
                        timezone: newRow.timezone || 'Asia/Kolkata',
                        createdAt: newRow.created_at?.toISOString?.() || new Date().toISOString(),
                        updatedAt: newRow.updated_at?.toISOString?.() || new Date().toISOString(),
                    };
                    healthMemoryStore_js_1.healthMemoryStore.profiles.set(userId, profile);
                }
            }
            catch (dbErr) {
                console.warn('[AuthRouter] Remote DB profile query warning:', dbErr.message);
            }
        }
        // In-memory fallback if profile still doesn't exist
        if (!profile) {
            profile = {
                id: userId,
                name: googleName,
                email: googleEmail,
                avatarUrl: googleAvatar,
                onboardingCompleted: false,
                authProvider: 'google',
                heightCm: 170.0,
                preferredLanguage: 'hinglish',
                timezone: 'Asia/Kolkata',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            healthMemoryStore_js_1.healthMemoryStore.profiles.set(userId, profile);
        }
        res.json({
            success: true,
            isNewUser: !profile.onboardingCompleted,
            profile,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile and session info
 */
exports.authRouter.get('/me', authMiddleware_js_1.authenticateSupabaseToken, async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }
        const profile = healthMemoryStore_js_1.healthMemoryStore.profiles.get(userId);
        res.json({
            success: true,
            user: {
                id: userId,
                email: req.user?.email,
                user_metadata: req.user?.user_metadata,
            },
            profile: profile || null,
        });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
/**
 * POST /api/auth/survey
 * Persists the user's completed survey and nutritional targets
 */
exports.authRouter.post('/survey', authMiddleware_js_1.authenticateSupabaseToken, async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }
        const { assessment } = req.body;
        const pool = supabaseClient_js_1.SupabaseDb.getPool();
        // Update in-memory profile
        let profile = healthMemoryStore_js_1.healthMemoryStore.profiles.get(userId);
        if (profile) {
            profile.onboardingCompleted = true;
            if (assessment?.heightCm)
                profile.heightCm = assessment.heightCm;
            if (assessment?.age)
                profile.age = assessment.age;
            if (assessment?.gender)
                profile.biologicalSex = assessment.gender;
            profile.updatedAt = new Date().toISOString();
            healthMemoryStore_js_1.healthMemoryStore.profiles.set(userId, profile);
        }
        // Store memory facts
        if (assessment) {
            healthMemoryStore_js_1.healthMemoryStore.setProfileFact({
                userId,
                category: 'goal',
                key: 'primary_wellness_focus',
                value: assessment.goal,
                confidence: 1.0,
                verificationStatus: 'user_reported',
            });
            if (assessment.currentWeightKg) {
                healthMemoryStore_js_1.healthMemoryStore.setProfileFact({
                    userId,
                    category: 'routine',
                    key: 'current_body_weight_kg',
                    value: assessment.currentWeightKg,
                    confidence: 1.0,
                    verificationStatus: 'user_reported',
                });
            }
            if (assessment.targetWeightKg) {
                healthMemoryStore_js_1.healthMemoryStore.setProfileFact({
                    userId,
                    category: 'goal',
                    key: 'target_body_weight_kg',
                    value: assessment.targetWeightKg,
                    confidence: 1.0,
                    verificationStatus: 'user_reported',
                });
            }
            if (assessment.calculatedPlan) {
                healthMemoryStore_js_1.healthMemoryStore.setProfileFact({
                    userId,
                    category: 'routine',
                    key: 'daily_nutrition_targets',
                    value: assessment.calculatedPlan,
                    confidence: 1.0,
                    verificationStatus: 'user_reported',
                });
            }
        }
        // Update in database if pool is connected
        if (pool) {
            try {
                await pool.query(`UPDATE profiles SET onboarding_completed = TRUE, updated_at = NOW() WHERE id = $1;`, [userId]);
            }
            catch (dbErr) {
                console.warn('[AuthRouter] DB survey update warning:', dbErr.message);
            }
        }
        res.json({ success: true, profile });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
