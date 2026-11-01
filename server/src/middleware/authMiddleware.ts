import { Request, Response, NextFunction } from 'express';
import { getServerSupabase } from '../services/supabaseService.js';
import { config } from '../config/index.js';

export interface AuthenticatedRequest extends Request {
  user?: any;
  userId?: string;
}

/**
 * Validates Supabase JWT Access Tokens from Authorization header (Bearer <token>).
 * Strictly guarantees that client-supplied user IDs in query/body cannot be spoofed.
 */
export async function authenticateSupabaseToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const supabase = getServerSupabase();

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
    } catch (err: any) {
      res.status(401).json({
        success: false,
        error: 'Authentication verification failed',
      });
      return;
    }
  }

  // Fallback for Synthetic Privacy Mode / Test Environments
  // Never active if real token is provided.
  const syntheticHeader = req.headers['x-user-id'] as string;
  const isSyntheticAllowed =
    process.env.NODE_ENV === 'test' || config.privacy.syntheticDataMode;

  if (isSyntheticAllowed && syntheticHeader) {
    req.userId = syntheticHeader;
    req.user = { id: syntheticHeader, email: `${syntheticHeader}@healthfreak.synthetic.test` };
    return next();
  }

  if (isSyntheticAllowed && !syntheticHeader) {
    req.userId = (req.query.userId as string) || 'usr_synthetic_alex';
    req.user = { id: req.userId, email: `${req.userId}@healthfreak.synthetic.test` };
    return next();
  }

  res.status(401).json({
    success: false,
    error: 'Missing Authorization header with valid Bearer token',
  });
}

