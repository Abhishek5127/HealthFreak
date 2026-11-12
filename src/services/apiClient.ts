import { supabase } from './supabaseClient';

/**
 * Shared helper to get the current Supabase session access token (JWT).
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch (err: any) {
    console.warn('[ApiClient] Failed to get Supabase session:', err?.message || err);
    return null;
  }
}

/**
 * Shared helper to build headers containing Authorization: Bearer <access_token>.
 */
export async function getAuthHeaders(
  customHeaders?: Record<string, string>
): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...customHeaders,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Shared authenticated fetch wrapper:
 * 1. Attaches Authorization: Bearer <session.access_token>.
 * 2. On 401, calls supabase.auth.refreshSession() and retries once.
 * 3. If the retry still returns 401 (or refresh fails), signs the user out.
 */
export async function fetchWithAuth(url: string, init: RequestInit = {}): Promise<Response> {
  let token = await getAccessToken();

  const applyHeaders = (authToken: string | null): Headers => {
    const headers = new Headers(init.headers || {});
    if (authToken) {
      headers.set('Authorization', `Bearer ${authToken}`);
    }
    return headers;
  };

  const initialInit: RequestInit = {
    ...init,
    headers: applyHeaders(token),
  };

  const response = await fetch(url, initialInit);

  if (response.status === 401) {
    console.warn(`[ApiClient] Received 401 from ${url}. Attempting session refresh...`);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      const refreshedToken = data.session?.access_token;

      if (!error && refreshedToken) {
        const retryInit: RequestInit = {
          ...init,
          headers: applyHeaders(refreshedToken),
        };
        const retryResponse = await fetch(url, retryInit);

        if (retryResponse.status === 401) {
          console.warn(`[ApiClient] Retry to ${url} still returned 401. Signing out user...`);
          await supabase.auth.signOut();
        }

        return retryResponse;
      } else {
        console.warn('[ApiClient] Session refresh failed. Signing out user...', error?.message);
        await supabase.auth.signOut();
      }
    } catch (refreshErr: any) {
      console.warn('[ApiClient] Error refreshing session. Signing out user...', refreshErr?.message || refreshErr);
      await supabase.auth.signOut();
    }
  }

  return response;
}
