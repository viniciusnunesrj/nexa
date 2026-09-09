import { createClient, SupabaseClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
const supabaseUrl = (metaEnv.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();

// Validate without logging credentials or accepting privileged server keys.
export function getSupabaseConfigurationError(): string | null {
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project') || supabaseAnonKey.includes('your-anon-key')) {
    return 'Autenticação online indisponível: configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente da aplicação e publique novamente.';
  }
  try {
    const url = new URL(supabaseUrl);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      return 'VITE_SUPABASE_URL inválida. Informe a URL base do projeto Supabase.';
    }
  } catch {
    return 'VITE_SUPABASE_URL inválida. Informe a URL base do projeto Supabase.';
  }
  if (supabaseAnonKey.startsWith('sb_publishable_')) return null;
  try {
    const parts = supabaseAnonKey.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role === 'anon') return null;
    }
  } catch {
    // Malformed keys must not silently enable local authentication.
  }
  return 'VITE_SUPABASE_ANON_KEY inválida. Use apenas a chave pública anon ou publishable; chaves secret e service_role não são permitidas no frontend.';
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfigurationError() === null;
}

// Keep imports safe without configuration. Auth operations reject this inert
// client before making requests; it is never an offline authentication provider.
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: isSupabaseConfigured(),
      autoRefreshToken: isSupabaseConfigured(),
      detectSessionInUrl: isSupabaseConfigured(),
      storageKey: 'nexa_supabase_auth_token_v1',
    },
  }
);

export const SUPABASE_STATUS = {
  isConfigured: isSupabaseConfigured(),
  url: isSupabaseConfigured() ? supabaseUrl : null,
};
