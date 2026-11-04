"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServerSupabase = getServerSupabase;
const supabase_js_1 = require("@supabase/supabase-js");
const index_js_1 = require("../config/index.js");
let supabaseClient = null;
/**
 * Returns the Supabase client for server-side auth validation and operations.
 * Uses service role key when available for administrative verification, or anon key.
 */
function getServerSupabase() {
    if (!index_js_1.config.supabase.url) {
        return null;
    }
    if (!supabaseClient) {
        const key = index_js_1.config.supabase.serviceRoleKey || index_js_1.config.supabase.anonKey;
        supabaseClient = (0, supabase_js_1.createClient)(index_js_1.config.supabase.url, key, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    return supabaseClient;
}
