import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase } from '../supabaseClient';
import { User, Session } from '@supabase/supabase-js';
import { parseOAuthUrlParams } from './oauthUrlUtils';
import { getBackendBaseUrl } from '../aiChatService';

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
    // 1. Determine the appropriate redirect URI
    const isExpoGo =
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
      (Constants as any).appOwnership === 'expo';

    const backendUrl = getBackendBaseUrl();
    const relayCallbackUrl = `${backendUrl}/auth/callback`;
    const nativeSchemeUrl = AuthSession.makeRedirectUri({
      scheme: 'healthfreak',
      path: 'auth/callback',
    });

    // In Expo Go, use backend relay callback (Supabase GoTrue rejects exp:// URLs)
    // In standalone / production build, use the registered app scheme
    const redirectTo = isExpoGo ? relayCallbackUrl : nativeSchemeUrl;

    console.log('[Disha Auth] OAuth redirectTo sent to Supabase:', redirectTo);

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

    // 3. Open the secure in-app system browser with concurrent real-time session polling
    let isFlowComplete = false;

    const pollForSession = async (): Promise<GoogleAuthResult | null> => {
      const startTime = Date.now();
      // Poll every 700ms for up to 45 seconds while the browser is open
      while (!isFlowComplete && Date.now() - startTime < 45000) {
        await new Promise((r) => setTimeout(r, 700));
        if (isFlowComplete) break;

        // A. Check if Supabase client already received session via listener
        const { data: currentSession } = await supabase.auth.getSession();
        if (currentSession?.session?.user) {
          isFlowComplete = true;
          try {
            WebBrowser.dismissBrowser();
          } catch {
            // No-op
          }
          return {
            success: true,
            user: currentSession.session.user,
            session: currentSession.session,
          };
        }

        // B. Check if server relay bridge received tokens from the callback page
        try {
          const relayRes = await fetch(`${backendUrl}/api/auth/latest-session`);
          if (relayRes.ok) {
            const relayData = await relayRes.json();
            if (relayData.success && (relayData.access_token || relayData.code)) {
              if (relayData.code) {
                const { data: sData, error: cErr } = await supabase.auth.exchangeCodeForSession(relayData.code);
                if (!cErr && sData?.session) {
                  isFlowComplete = true;
                  try {
                    WebBrowser.dismissBrowser();
                  } catch {
                    // No-op
                  }
                  return { success: true, user: sData.user, session: sData.session };
                }
              } else if (relayData.access_token && relayData.refresh_token) {
                const { data: sData, error: sErr } = await supabase.auth.setSession({
                  access_token: relayData.access_token,
                  refresh_token: relayData.refresh_token,
                });
                if (!sErr && sData?.session) {
                  isFlowComplete = true;
                  try {
                    WebBrowser.dismissBrowser();
                  } catch {
                    // No-op
                  }
                  return { success: true, user: sData.user, session: sData.session };
                }
              }
            }
          }
        } catch {
          // Ignore transient network errors during polling
        }
      }
      return null;
    };

    // Race browser result with the active session poller
    const browserPromise = WebBrowser.openAuthSessionAsync(data.url, nativeSchemeUrl).then(
      async (authResult) => {
        if (authResult.type === 'success' && authResult.url) {
          return await processOAuthCallbackUrl(authResult.url);
        }
        return null;
      }
    );

    const winningResult = await Promise.race([browserPromise, pollForSession()]);
    isFlowComplete = true;

    if (winningResult?.success) {
      return winningResult;
    }

    // Final Fallback: Check if session exists in Supabase
    const { data: finalSession } = await supabase.auth.getSession();
    if (finalSession?.session?.user) {
      return {
        success: true,
        user: finalSession.session.user,
        session: finalSession.session,
      };
    }

    return {
      success: false,
      cancelled: true,
      error: 'Google Sign-In was cancelled or incomplete.',
    };
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
