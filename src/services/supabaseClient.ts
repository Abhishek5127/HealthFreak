import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { expoSecureStoreAdapter } from './auth/secureStorageAdapter';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://tzeojqnsumumdazvwveo.supabase.co';
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_sUfcPE3FIRmCVx-lGgIMzw_z008WhKs';

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn('[SupabaseClient] Warning: Supabase URL or Publishable Key is missing from frontend environment.');
}

/**
 * Singleton Supabase Client configured for Expo React Native
 * with persistent encrypted session storage and automatic token refresh.
 */
export const supabase: SupabaseClient = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: expoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Critical for React Native to prevent false web redirects
  },
});

/**
 * Helper to get the current access token for authenticated backend API requests
 */
export async function getSupabaseAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch (err: any) {
    console.warn('[SupabaseClient] Error getting access token:', err?.message);
    return null;
  }
}

