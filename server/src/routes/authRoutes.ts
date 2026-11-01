import { Router, Response } from 'express';
import { authenticateSupabaseToken, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { healthMemoryStore } from '../db/healthMemoryStore.js';
import { SupabaseDb } from '../db/supabaseClient.js';
import { UserProfileEntity } from '../types/healthMemory.js';

export const authRouter = Router();

/**
 * POST /api/auth/sync-profile
 * Idempotently provisions or retrieves the user's application profile
 * linked strictly to the canonical Supabase user UUID.
 */
authRouter.post(
  '/sync-profile',
  authenticateSupabaseToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      const pool = SupabaseDb.getPool();
      let profile: UserProfileEntity | undefined = healthMemoryStore.profiles.get(userId);

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
            healthMemoryStore.profiles.set(userId, profile);
          } else {
            // Idempotent insertion for first-time sign-in
            const insertResult = await pool.query(
              `INSERT INTO profiles (
                id, name, email, avatar_url, onboarding_completed, auth_provider, height_cm, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, FALSE, 'google', 170.0, NOW(), NOW())
              ON CONFLICT (id) DO UPDATE SET
                email = COALESCE(profiles.email, EXCLUDED.email),
                avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
                updated_at = NOW()
              RETURNING *;`,
              [userId, googleName, googleEmail, googleAvatar]
            );

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
            healthMemoryStore.profiles.set(userId, profile);
          }
        } catch (dbErr: any) {
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
        healthMemoryStore.profiles.set(userId, profile);
      }

      res.json({
        success: true,
        isNewUser: !profile.onboardingCompleted,
        profile,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile and session info
 */
authRouter.get(
  '/me',
  authenticateSupabaseToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const profile = healthMemoryStore.profiles.get(userId);
      res.json({
        success: true,
        user: {
          id: userId,
          email: req.user?.email,
          user_metadata: req.user?.user_metadata,
        },
        profile: profile || null,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * POST /api/auth/survey
 * Persists the user's completed survey and nutritional targets
 */
authRouter.post(
  '/survey',
  authenticateSupabaseToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { assessment } = req.body;
      const pool = SupabaseDb.getPool();

      // Update in-memory profile
      let profile = healthMemoryStore.profiles.get(userId);
      if (profile) {
        profile.onboardingCompleted = true;
        if (assessment?.heightCm) profile.heightCm = assessment.heightCm;
        if (assessment?.age) profile.age = assessment.age;
        if (assessment?.gender) profile.biologicalSex = assessment.gender;
        profile.updatedAt = new Date().toISOString();
        healthMemoryStore.profiles.set(userId, profile);
      }

      // Store memory facts
      if (assessment) {
        healthMemoryStore.setProfileFact({
          userId,
          category: 'health_goal',
          key: 'primary_wellness_focus',
          value: assessment.goal,
          confidence: 1.0,
          verificationStatus: 'user_reported',
        });

        if (assessment.currentWeightKg) {
          healthMemoryStore.setProfileFact({
            userId,
            category: 'measurements',
            key: 'current_body_weight_kg',
            value: assessment.currentWeightKg,
            confidence: 1.0,
            verificationStatus: 'user_reported',
          });
        }

        if (assessment.targetWeightKg) {
          healthMemoryStore.setProfileFact({
            userId,
            category: 'health_goal',
            key: 'target_body_weight_kg',
            value: assessment.targetWeightKg,
            confidence: 1.0,
            verificationStatus: 'user_reported',
          });
        }

        if (assessment.calculatedPlan) {
          healthMemoryStore.setProfileFact({
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
          await pool.query(
            `UPDATE profiles SET onboarding_completed = TRUE, updated_at = NOW() WHERE id = $1;`,
            [userId]
          );
        } catch (dbErr: any) {
          console.warn('[AuthRouter] DB survey update warning:', dbErr.message);
        }
      }

      res.json({ success: true, profile });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);


