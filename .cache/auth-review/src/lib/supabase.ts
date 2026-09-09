import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve environment variables safely across environments
const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || '';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

/**
 * Checks if Supabase has been properly configured with valid credentials
 */
export function isSupabaseConfigured(): boolean {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.trim().length > 0 &&
    !supabaseUrl.includes('your-project.supabase.co') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.trim().length > 0 &&
    !supabaseAnonKey.includes('your-anon-key')
  );
}

// Fallback dummy client URL to prevent crash on module import if env vars are missing
const defaultUrl = isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co';
const defaultKey = isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(defaultUrl, defaultKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'nexa_supabase_auth_token_v1',
  },
});

export const SUPABASE_STATUS = {
  isConfigured: isSupabaseConfigured(),
  url: isSupabaseConfigured() ? supabaseUrl : null,
};
