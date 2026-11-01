import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Returns the Supabase client for server-side auth validation and operations.
 * Uses service role key when available for administrative verification, or anon key.
 */
export function getServerSupabase(): SupabaseClient | null {
  if (!config.supabase.url) {
    return null;
  }

  if (!supabaseClient) {
    const key = config.supabase.serviceRoleKey || config.supabase.anonKey;
    supabaseClient = createClient(config.supabase.url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseClient;
}

