import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../supabaseClient';
import { User, Session } from '@supabase/supabase-js';
import { parseOAuthUrlParams } from './oauthUrlUtils';

export { parseOAuthUrlParams };

// Required for web browser redirect completion (no-op on native)
WebBrowser.maybeCompleteAuthSession();

export interface GoogleAuthResult {
  success: boolean;
  cancelled?: boolean;
  user?: User | null;
  session?: Session | null;
  error?: string;
}

/**
 * Initiates the native Google OAuth flow using Supabase Auth and Expo WebBrowser.
 * Uses PKCE authorization code exchange with fallback to implicit tokens.
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  try {
    // 1. Generate deep link redirect URI matching scheme in app.json ('healthfreak://auth/callback')
    const redirectTo = AuthSession.makeRedirectUri({
      scheme: 'healthfreak',
      path: 'auth/callback',
    });

    // 2. Request OAuth authorization URL from Supabase
    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true, // Native flow: return the URL to open in WebBrowser
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
        },
      },
    });

    if (oauthError) {
      return {
        success: false,
        error: oauthError.message || 'Failed to initialize Google Sign-In with Supabase.',
      };
    }

    if (!data?.url) {
      return {
        success: false,
        error: 'No authorization URL returned by Supabase Auth.',
      };
    }

    // 3. Open the secure in-app system browser
    const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    // 4. Handle cancellation or dismissal
    if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
      return {
        success: false,
        cancelled: true,
        error: 'Google Sign-In was cancelled.',
      };
    }

    if (authResult.type !== 'success' || !authResult.url) {
      return {
        success: false,
        error: 'Authentication did not complete successfully.',
      };
    }

    // 5. Process the callback URL
    return await processOAuthCallbackUrl(authResult.url);
  } catch (err: any) {
    const message = err?.message || 'An unexpected error occurred during Google Sign-In.';
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Processes an OAuth callback URL (either from WebBrowser or global deep link)
 */
export async function processOAuthCallbackUrl(url: string): Promise<GoogleAuthResult> {
  try {
    const params = parseOAuthUrlParams(url);

    // Check for provider errors
    if (params.error) {
      const description = params.error_description || params.error;
      return {
        success: false,
        error: `Google authorization failed: ${description}`,
      };
    }

    // PKCE Flow: Authorization code returned
    if (params.code) {
      const { data: sessionData, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(params.code);

      if (exchangeError) {
        return {
          success: false,
          error: exchangeError.message || 'Failed to exchange authorization code for session.',
        };
      }

      return {
        success: true,
        user: sessionData.user,
        session: sessionData.session,
      };
    }

    // Implicit Grant Flow: Access and Refresh tokens in URL fragment
    if (params.access_token && params.refresh_token) {
      const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });

      if (setSessionError) {
        return {
          success: false,
          error: setSessionError.message || 'Failed to establish Supabase session from tokens.',
        };
      }

      return {
        success: true,
        user: sessionData.user,
        session: sessionData.session,
      };
    }

    // If already authenticated in Supabase client
    const { data: currentSession } = await supabase.auth.getSession();
    if (currentSession?.session?.user) {
      return {
        success: true,
        user: currentSession.session.user,
        session: currentSession.session,
      };
    }

    return {
      success: false,
      error: 'Callback URL did not contain expected authorization code or tokens.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Error processing authentication callback.',
    };
  }
}

/**
 * Signs the user out from Supabase and purges secure session storage.
 */
export async function signOutFromSupabase(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to sign out.' };
  }
}
