// Pre-auth endpoint: all identity resolution stays on the server.
// Rate limits are shared across Edge isolates; failure is closed, never local-only.
type Dependencies = {
  env: (name: string) => string | undefined; fetch: typeof fetch; crypto: Crypto;
  now?: () => number; sleep?: (ms: number) => Promise<void>;
};
const genericError = 'Não foi possível entrar. Verifique suas credenciais ou tente novamente mais tarde.';

// The deadline includes stalled streams, not only the initial HTTP connection.
export async function boundedBody(request: Request, timeoutMs = 3000): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Body required');
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Body timeout')), timeoutMs);
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      size += value.length;
      if (size > 8192) throw new Error('Body too large');
      chunks.push(value);
    }
  } finally {
    clearTimeout(timer);
    void reader.cancel().catch(() => undefined);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function createUsernameLoginHandler(deps: Dependencies) {
  const now = deps.now || (() => performance.now());
  const sleep = deps.sleep || ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)));
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('origin');
    const allowedOrigins = (deps.env('USERNAME_LOGIN_ALLOWED_ORIGINS') || '').split(',').map(value => value.trim()).filter(Boolean);
    const validOrigins = allowedOrigins.length > 0 && allowedOrigins.every(value => {
      try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && url.origin === value; }
      catch { return false; }
    });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin',
      'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
    if (origin && allowedOrigins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
    const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
    // CORS is not authentication or rate limiting. Non-browser callers still pass the limiter.
    if (!validOrigins || (origin && !allowedOrigins.includes(origin))) return reply(403, { error: genericError });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply(405, { error: genericError });
    try {
      const required = (name: string): string => {
        const value = deps.env(name);
        if (!value) throw new Error('Server configuration missing');
        return value;
      };
      const base = new URL(required('SUPABASE_URL'));
      if (base.protocol !== 'https:' || base.username || base.password || base.search) throw new Error('Invalid server URL');
      const serviceKey = required('SUPABASE_SERVICE_ROLE_KEY');
      const anonKey = required('SUPABASE_ANON_KEY');
      const secret = required('USERNAME_LOGIN_RATE_SECRET');
      if (secret.length < 32) throw new Error('Rate secret too short');
      const body = await boundedBody(request) as Record<string, unknown> | null;
      if (!body || typeof body.username !== 'string' || typeof body.password !== 'string') return reply(400, { error: genericError });
      const username = body.username.trim().toLowerCase();
      if (!/^[a-z0-9_-]{3,128}$/.test(username) || !body.password || body.password.length > 1024) return reply(400, { error: genericError });
      const encoder = new TextEncoder();
      const key = await deps.crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const digest = await deps.crypto.subtle.sign('HMAC', key, encoder.encode(username));
      const identity = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      const call = async (url: string, options: RequestInit) => {
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        const deadline = new Promise<never>((_, reject) => {
          timer = setTimeout(() => { controller.abort(); reject(new Error('Network timeout')); }, 10000);
        });
        try {
          return await Promise.race([(async () => {
            const response = await deps.fetch(url, { ...options, signal: controller.signal });
            // Error bodies are neither forwarded nor required (upstream may return HTML).
            if (!response.ok) void response.body?.cancel().catch(() => undefined);
            const data = response.ok ? await response.json() : null;
            return { response, data };
          })(), deadline]);
        } finally { clearTimeout(timer); }
      };
      const { response: limit, data: limitResult } = await call(new URL('/rest/v1/rpc/consume_username_login_attempt_v1', base).href, {
        method: 'POST', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_username_key: identity }),
      });
      if (!limit.ok) throw new Error('Limiter unavailable');
      if (!limitResult || typeof limitResult.allowed !== 'boolean' || !Number.isInteger(limitResult.retry_after) ||
        limitResult.retry_after < 0 || limitResult.retry_after > 3600 ||
        (limitResult.allowed ? limitResult.retry_after !== 0 : limitResult.retry_after < 1)) throw new Error('Limiter unavailable');
      if (!limitResult.allowed) { headers['Retry-After'] = String(limitResult.retry_after); return reply(429, { error: genericError }); }

      const credentialStart = now();
      const invalidCredentials = async () => {
        // At most 500ms added; reduces timing signal, does NOT promise constant time.
        const jitter = deps.crypto.getRandomValues(new Uint32Array(1))[0] % 101;
        await sleep(Math.max(0, 400 + jitter - (now() - credentialStart)));
        return reply(401, { error: genericError });
      };

      const query = new URL('/rest/v1/profiles', base);
      query.searchParams.set('select', 'id,email');
      // Only '_' needs escaping after the strict username character allowlist.
      query.searchParams.set('username', `ilike.${username.replace(/_/g, '\\_')}`);
      query.searchParams.set('limit', '2');
      const { response: resolved, data: rows } = await call(query.href, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
      if (!resolved.ok) throw new Error('Identity lookup unavailable');
      if (!Array.isArray(rows)) throw new Error('Invalid identity response');
      const profile = rows.length === 1 && typeof rows[0]?.id === 'string' && typeof rows[0]?.email === 'string' ? rows[0] : null;
      // Missing/ambiguous usernames also go through Auth and receive the same error.
      const { response: authenticated, data: result } = await call(new URL('/auth/v1/token?grant_type=password', base).href, {
        method: 'POST', headers: { apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: profile?.email || 'unavailable@nexa-login.invalid', password: body.password }),
      });
      if (authenticated.status === 429) {
        const retry = Number(authenticated.headers.get('Retry-After'));
        headers['Retry-After'] = String(Number.isInteger(retry) && retry > 0 && retry <= 3600 ? retry : 60);
        return reply(429, { error: genericError });
      }
      if (!authenticated.ok) {
        if ([400, 401, 403, 422].includes(authenticated.status)) return await invalidCredentials();
        throw new Error('Auth unavailable');
      }
      if (!profile || result?.user?.id !== profile.id ||
        typeof result.access_token !== 'string' || !result.access_token || typeof result.refresh_token !== 'string' || !result.refresh_token) {
        return await invalidCredentials();
      }
      // Credentials verified. No profile/email in the envelope. SDK verifies the session next.
      return reply(200, { access_token: result.access_token, refresh_token: result.refresh_token });
    } catch {
      // Never log request bodies, Auth responses, passwords, emails or tokens.
      return reply(503, { error: genericError });
    }
  };
}
