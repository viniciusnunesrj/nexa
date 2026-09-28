import { supabase, isSupabaseConfigured } from './supabase';

export type FunnelEventName =
  | 'landing_view'
  | 'register_open'
  | 'register_submit'
  | 'register_success'
  | 'register_error';

const SESSION_KEY = 'nexa_funnel_session_v1';

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function getSource(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const explicit = params.get('utm_source') || params.get('source');
    if (explicit) return explicit.slice(0, 100);

    const referrer = document.referrer || '';
    if (/tiktok/i.test(referrer)) return 'tiktok';
    if (/instagram|facebook|fb\.com/i.test(referrer)) return 'meta';
    return referrer ? 'referral' : 'direct';
  } catch {
    return 'unknown';
  }
}

export async function trackFunnelEvent(
  eventName: FunnelEventName,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    await supabase.rpc('track_funnel_event', {
      p_event_name: eventName,
      p_session_id: getSessionId(),
      p_source: getSource(),
      p_path: window.location.pathname,
      p_metadata: metadata,
    });
  } catch {
    // Analytics must never interrupt registration or gameplay.
  }
}
