// Local doubles only. No network, SQL, deployment or real credentials.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');
const read = file => fs.readFileSync(file, 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const tick = () => new Promise(resolve => setTimeout(resolve, 5));
function load(file, imports = {}, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(read(file), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require(name) {
    if (!(name in imports)) throw new Error('Unexpected import: ' + name);
    return imports[name];
  }, console, setTimeout, clearTimeout, URL, Request, Response, AbortSignal, AbortController, TextEncoder, TextDecoder, ...globals }, { filename: file });
  return module.exports;
}
const publicRow = id => ({ id, username: 'Pilot_' + id, avatar: null, bio: null, title: null, level: 7, victories: 4, defeats: 2,
  email: 'private@example.invalid', balance_nex: 900, balance_nxa: 80, level_rewards_claimed: [1], is_first_access: true });
const publicKeys = ['avatar', 'bio', 'defeats', 'id', 'level', 'title', 'username', 'victories'];

function directoryHarness(fetchPage) {
  const slots = [], cleanups = new Map();
  let cursor = 0, pending = [], authenticatedId = null;
  const calls = [];
  const react = {
    createContext: () => ({ Provider: 'provider' }), createElement: (type, props) => ({ type, props }),
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(initial) { const i = cursor++; return slots[i] || (slots[i] = { current: initial }); },
    useEffect(effect, deps) { const i = cursor++;
      if (!(i in slots) || deps.some((value, index) => value !== slots[i][index])) {
        slots[i] = deps; pending.push(() => { cleanups.get(i)?.(); cleanups.set(i, effect()); });
      }
    },
  };
  const lib = { isSupabaseConfigured: () => true, supabase: {
    auth: { getUser: async () => ({ data: { user: authenticatedId ? { id: authenticatedId } : null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) },
    rpc: async (name, args) => { calls.push({ name, args, id: authenticatedId }); return { data: await fetchPage(authenticatedId, args.p_offset), error: null }; },
    from() { throw new Error('Social directory must not query profiles'); },
  } };
  const publicService = load('src/services/publicProfileService.ts', { '../lib/supabase': lib });
  const provider = load('src/contexts/AuthContext.tsx', {
    react, '../lib/supabase': lib, '../services/publicProfileService': publicService,
    '../services/authService': { authService: {
      restoreCurrentUser: async () => null,
      login: async id => { authenticatedId = id; return { success: true, user: { id, balanceNEX: 4000, email: 'own@example.invalid' } }; },
      logout: async () => { authenticatedId = null; },
    } },
    '../services/economyService': { EconomyService: {} }, '../services/progressionService': { ProgressionService: {} },
    '../data/mockUsers': { CURRENT_USER: { id: 'demo', balanceNEX: 999 } },
  });
  const render = () => { cursor = 0; pending = []; const value = provider.AuthProvider({ children: null }).props.value;
    pending.forEach(effect => effect()); return value; };
  render();
  return { render, calls, cleanup: () => cleanups.forEach(fn => fn?.()) };
}

test('directory only loads after auth, strips private fields, pages and coalesces parallel loads', async () => {
  const h = directoryHarness(async (_id, offset) => offset === 0 ? Array.from({ length: 100 }, (_, i) => publicRow(String(i))) : [publicRow('100')]);
  try {
    await tick(); assert.equal(h.calls.length, 0);
    await h.render().login('real-user', 'password'); h.render(); await tick();
    let value = h.render();
    assert.equal(value.currentUser.balanceNEX, 4000); // own profile contract remains complete
    assert.equal(value.publicUsers.length, 100);
    assert.deepEqual(Object.keys(value.publicUsers[0]).sort(), publicKeys);
    assert.equal(value.allUsers, undefined);
    await Promise.all([value.loadMorePublicUsers(), value.loadMorePublicUsers()]);
    value = h.render();
    assert.equal(value.publicUsers.length, 101);
    assert.equal(value.publicUsersHasMore, false);
    assert.equal(h.calls.length, 2);
    assert.equal(h.calls[1].args.p_offset, 100);
    assert.ok(h.calls.every(call => call.name === 'list_public_profiles_v1'));
    value.logout(); assert.equal(h.render().publicUsers.length, 0);
  } finally { h.cleanup(); }
});

test('directory failure exposes error, never private fallback, retry retains offset', async () => {
  let failure = true;
  const h = directoryHarness(async () => { if (failure) throw new Error('RPC unavailable'); return [publicRow('real')]; });
  try {
    await tick(); await h.render().login('caller', 'password'); h.render(); await tick();
    let value = h.render();
    assert.ok(value.publicUsersError); assert.equal(value.publicUsers.length, 0);
    failure = false; await value.loadMorePublicUsers(); value = h.render();
    assert.equal(value.publicUsersError, null); assert.equal(value.publicUsers[0].id, 'real');
    assert.deepEqual(h.calls.map(call => call.args.p_offset), [0, 0]);
  } finally { h.cleanup(); }
});

test('late page from previous session never enters a new authenticated directory', async () => {
  let finish;
  const h = directoryHarness(async id => id === 'first' ? new Promise(resolve => { finish = resolve; }) : [publicRow('second-public')]);
  try {
    await tick(); await h.render().login('first', 'password'); h.render(); await tick();
    h.render().logout(); h.render();
    await h.render().login('second', 'password'); h.render(); await tick();
    finish([publicRow('first-public')]); await tick();
    assert.deepEqual(plain(h.render().publicUsers.map(profile => profile.id)), ['second-public']);
  } finally { h.cleanup(); }
});

test('social consumers use public contract, no third-party balance or full-profile directory', () => {
  const auth = read('src/contexts/AuthContext.tsx');
  assert.match(auth, /publicUsers: PublicProfile\[\]/);
  assert.doesNotMatch(auth, /fetchAllProfiles|NexaUser\[\]|setAllUsers/);
  const topbar = read('src/layouts/Topbar.tsx');
  assert.doesNotMatch(topbar, /allUsers|u\.balance|target\.balance/);
  assert.match(topbar, /user\.balanceNXA/); // own balance still displayed
  assert.doesNotMatch(read('src/components/modals/TradeProposalModal.tsx'), /NexaUser|allUsers|target\.balance/);
  assert.match(read('src/services/tradeService.ts'), /receiver: Pick<PublicProfile, 'id' \| 'username'>/);
  assert.match(read('src/contexts/GameStateContext.tsx'), /receiver = publicUsers\.find/);
  assert.doesNotMatch(read('src/services/authService.ts'), /\.from\(['"]profiles['"]\)/);
});

test('current server battle handler still refreshes own profile without the social directory', async () => {
  const source = ts.createSourceFile('GameStateContext.tsx', read('src/contexts/GameStateContext.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'executeBattle') handler = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source); assert.ok(handler);
  const compiled = ts.transpileModule(`const executeBattle = ${handler.getText(source)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const user = { id: 'owner', level: 5, balanceNEX: 100, experience: 900 };
  const pendingBattles = { current: new Set() }, modals = [], hydrated = [], synced = [], requests = [];
  let run = async () => ({ outcome: 'VICTORY', rewards: { resultingProfile: { ...user, level: 6, experience: 50, balanceNEX: 200 }, xpGained: 150, nexGained: 100, nxaGained: 10 } });
  const deps = {
    user, pendingBattles, isSupabaseConfigured: () => true,
    setLevelUpData: data => modals.push(data),
    SupabaseService: { startBattleAtomic: requestId => { requests.push(requestId); return run(); }, fetchProfile: async () => user },
    EconomyService: { hydrateProfileFromSupabase: profile => hydrated.push(profile), applyBattleReward: () => { throw new Error('Legacy reward path forbidden online'); } },
    syncUser: profile => synced.push(profile),
    BoxService: { grantBox: () => { throw new Error('Local box grant forbidden'); } },
    RewardService: { calculateBattleRewards: () => { throw new Error('Local rewards forbidden'); } },
  };
  const execute = new Function(...Object.keys(deps), compiled + '\nreturn executeBattle;')(...Object.values(deps));
  const result = await execute('request-one');
  assert.deepEqual(requests, ['request-one']);
  assert.equal(result.droppedItem, null); assert.equal(result.droppedBox, null);
  assert.equal(synced[0].id, user.id); assert.equal(synced[0].balanceNEX, 200);
  assert.equal(hydrated[0], synced[0]);
  assert.equal(modals[0], null); assert.equal(modals.at(-1).newLevel, 6);
  assert.deepEqual(modals.at(-1).rewardsGranted, []);
  let reject;
  run = () => new Promise((_, fail) => { reject = fail; });
  const failed = execute('request-two');
  await assert.rejects(execute('request-three'), /andamento/);
  reject(new Error('RPC unavailable')); await assert.rejects(failed, /RPC unavailable/);
  assert.equal(modals.at(-1), null); assert.equal(pendingBattles.current.size, 0);
  assert.equal(synced.length, 1); assert.equal(hydrated.length, 1);
});

const edgeModule = load('supabase/functions/username-login/handler.ts');
function edge(options = {}) {
  const calls = [], delays = [];
  const env = { SUPABASE_URL: 'https://project.example.invalid', SUPABASE_ANON_KEY: 'test-public-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-backend-key', USERNAME_LOGIN_RATE_SECRET: 'unit-test-only-secret-32-characters',
    USERNAME_LOGIN_ALLOWED_ORIGINS: 'https://game.example.invalid', ...options.env };
  const handler = edgeModule.createUsernameLoginHandler({ env: key => env[key], crypto: webcrypto,
    now: () => 0, sleep: async ms => { delays.push(ms); }, fetch: async (url, config) => {
    calls.push({ url, config });
    assert.ok(config.signal instanceof AbortSignal);
    if (options.networkError) throw new Error('Unavailable');
    if (url.includes('/rest/v1/rpc/consume_username_login_attempt_v1')) return Response.json(options.limit || { allowed: true, retry_after: 0 }, { status: options.limitStatus || 200 });
    if (url.includes('/rest/v1/profiles')) return Response.json(options.rows || [{ id: 'owner', email: 'private@example.invalid' }]);
    if (url.includes('/auth/v1/token')) return Response.json(options.auth || {
      user: { id: 'owner', email: 'private@example.invalid' }, access_token: 'verified-token', refresh_token: 'verified-refresh',
    }, { status: options.authStatus || 200, headers: { 'Retry-After': '35' } });
    throw new Error('Unexpected network target');
  } });
  const request = (body = { username: 'Pilot_1', password: 'password' }, origin = 'https://game.example.invalid') => handler(new Request('https://edge.example.invalid', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }));
  return { calls, request, handler, delays };
}

test('Edge resolves email privately only after distributed limit and validates with Auth', async () => {
  const e = edge(); const response = await e.request();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { access_token: 'verified-token', refresh_token: 'verified-refresh' });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(e.calls.length, 3);
  const command = JSON.parse(e.calls[0].config.body);
  assert.deepEqual(Object.keys(command), ['p_username_key']);
  assert.match(command.p_username_key, /^[a-f0-9]{64}$/);
  assert.equal(e.calls[0].config.headers.Authorization, 'Bearer test-backend-key');
  assert.doesNotMatch(e.calls[0].config.body, /pilot|password|private@example/);
  const query = new URL(e.calls[1].url);
  assert.equal(query.searchParams.get('select'), 'id,email');
  assert.equal(query.searchParams.get('username'), 'ilike.pilot\\_1');
  assert.equal(query.searchParams.get('limit'), '2');
  assert.equal(e.calls[1].config.headers.apikey, 'test-backend-key');
  assert.equal(e.calls[2].config.headers.apikey, 'test-public-key');
  assert.deepEqual(JSON.parse(e.calls[2].config.body), { email: 'private@example.invalid', password: 'password' });
});

test('unknown username and wrong password expose identical generic failure, never email', async () => {
  const missing = edge({ rows: [], authStatus: 400, auth: { error: 'Invalid login' } });
  const wrong = edge({ authStatus: 400, auth: { error: 'Wrong password', email: 'private@example.invalid' } });
  const a = await missing.request(); const b = await wrong.request();
  assert.equal(a.status, 401); assert.equal(b.status, 401);
  assert.deepEqual(await a.json(), await b.json());
  assert.equal(JSON.parse(missing.calls[2].config.body).email, 'unavailable@nexa-login.invalid');
});

test('ambiguous usernames and mismatched authenticated identity never return tokens', async () => {
  for (const options of [{ rows: [{ id: 'one', email: 'one' }, { id: 'two', email: 'two' }] },
    { auth: { user: { id: 'other' }, access_token: 'token', refresh_token: 'refresh' } }]) {
    const response = await edge(options).request(); assert.equal(response.status, 401);
    assert.doesNotMatch(await response.text(), /access_token|refresh_token/);
  }
});

test('limiter denial/unavailability/missing configuration fail closed before profile/Auth', async () => {
  for (const [options, status] of [[{ limit: { allowed: false, retry_after: 60 } }, 429], [{ limit: { error: 'fail' } }, 503],
    [{ limit: { allowed: true, retry_after: 50 } }, 503], [{ limit: { allowed: false, retry_after: 0 } }, 503],
    [{ limitStatus: 500 }, 503], [{ networkError: true }, 503], [{ env: { SUPABASE_SERVICE_ROLE_KEY: '' } }, 503]]) {
    const e = edge(options); const response = await e.request(); assert.equal(response.status, status);
    assert.ok(e.calls.length <= 1); assert.ok(e.calls.every(call => call.url.includes('/rpc/consume_username_login_attempt_v1')));
    assert.equal(e.delays.length, 0);
  }
});

test('Auth throttling and outages never become wrong credentials or leak upstream body', async () => {
  for (const [authStatus, expected] of [[429, 429], [500, 503], [503, 503], [404, 503]]) {
    for (const rows of [[], [{ id: 'owner', email: 'private@example.invalid' }]]) {
      const e = edge({ rows, authStatus, auth: { email: 'private@example.invalid', error: 'upstream detail' } });
      const response = await e.request(); assert.equal(response.status, expected);
      assert.doesNotMatch(await response.text(), /private@|upstream detail/);
      if (expected === 429) assert.equal(response.headers.get('Retry-After'), '35');
      assert.equal(e.delays.length, 0);
    }
  }
});

test('all credential failures use identical body/status and bounded timing floor after admission', async () => {
  const responses = [];
  for (const rows of [[], [{ id: 'owner', email: 'private@example.invalid' }], [{ id: 'a', email: 'a' }, { id: 'b', email: 'b' }]]) {
    const e = edge({ rows, authStatus: 400 }); const response = await e.request();
    responses.push([response.status, await response.text()]);
    assert.equal(e.calls.length, 3); assert.equal(e.delays.length, 1);
    assert.ok(e.delays[0] >= 400 && e.delays[0] <= 500);
  }
  assert.deepEqual(responses[0], responses[1]); assert.deepEqual(responses[1], responses[2]);
});

test('body read deadline cancels a stalled stream without waiting forever', async () => {
  let cancelled = false;
  const body = new ReadableStream({ cancel() { cancelled = true; } });
  await assert.rejects(edgeModule.boundedBody({ body }, 10), /Body timeout/);
  assert.equal(cancelled, true);
});

test('network deadline includes stalled response JSON and aborts before identity lookup', async () => {
  const timedModule = load('supabase/functions/username-login/handler.ts', {}, {
    setTimeout: (callback, ms) => setTimeout(callback, ms === 10000 ? 10 : ms),
  });
  const env = { SUPABASE_URL: 'https://project.example.invalid', SUPABASE_ANON_KEY: 'public-test',
    SUPABASE_SERVICE_ROLE_KEY: 'backend-test', USERNAME_LOGIN_RATE_SECRET: 'unit-test-only-secret-32-characters',
    USERNAME_LOGIN_ALLOWED_ORIGINS: 'https://game.example.invalid' };
  for (const stallBody of [false, true]) {
    let signal, calls = 0;
    const handler = timedModule.createUsernameLoginHandler({ env: key => env[key], crypto: webcrypto,
      fetch: async (_url, config) => {
        calls++; signal = config.signal;
        if (!stallBody) return new Promise(() => {});
        return { ok: true, json: () => new Promise(() => {}) };
      } });
    const response = await handler(new Request('https://edge.example.invalid', { method: 'POST',
      headers: { Origin: 'https://game.example.invalid' }, body: JSON.stringify({ username: 'pilot', password: 'secret' }) }));
    assert.equal(response.status, 503); assert.equal(calls, 1); assert.equal(signal.aborted, true);
  }
});

test('backend limiter migration serializes global admission before per-username allocation', () => {
  const sql = read('supabase/migrations/20260918000000_username_login_rate_limit.sql').replace(/--[^\n]*/g, '');
  assert.match(sql, /BEGIN;/); assert.match(sql, /COMMIT;\s*$/);
  assert.match(sql, /SECURITY DEFINER\s+SET search_path = pg_catalog/);
  assert.match(sql, /auth\.role\(\) IS DISTINCT FROM 'service_role'/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.consume_username_login_attempt_v1\(text\) FROM PUBLIC, anon, authenticated, service_role/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.consume_username_login_attempt_v1\(text\) TO service_role/);
  assert.doesNotMatch(sql, /GRANT .* TO (?:PUBLIC|anon|authenticated)/i);
  assert.doesNotMatch(sql, /\bEXECUTE\s+(?:pg_catalog|format|'|\$)/i);
  const lock = sql.indexOf('WHERE singleton FOR UPDATE');
  const deny = sql.indexOf('IF v_global.attempts >= 300');
  const increment = sql.indexOf('attempts = v_global.attempts + 1');
  const cleanup = sql.indexOf('DELETE FROM username_login_private.username_windows');
  const insert = sql.indexOf('INSERT INTO username_login_private.username_windows');
  assert.ok(lock > 0 && lock < sql.indexOf('v_now := pg_catalog.clock_timestamp()'));
  assert.ok(lock < deny && deny < increment && increment < cleanup && cleanup < insert);
  assert.match(sql.slice(deny, increment), /RETURN pg_catalog.jsonb_build_object\('allowed', false/);
  assert.match(sql, /hour_started_at <= v_now - interval '1 hour'/);
  assert.doesNotMatch(sql, /SET hour_started_at/); // No sliding TTL that retains invented names forever.
  assert.match(sql, /v_user.minute_attempts >= 10/); assert.match(sql, /v_user.hour_attempts >= 50/);
  assert.match(sql, /minute_attempts = v_user.minute_attempts \+ 1/);
  assert.match(sql, /hour_attempts = v_user.hour_attempts \+ 1/);
  assert.match(sql, /\^\[a-f0-9\]\{64\}\$/);
  assert.doesNotMatch(sql, /public\.(?:profiles|user_cards|transactions)/);
});

test('deployment config and secret isolation remain backend-only', () => {
  const source = read('supabase/functions/username-login/handler.ts');
  assert.doesNotMatch(source + read('docs/SETOR-11B2-rollout.md'), /upstash|redis/i);
  assert.doesNotMatch(source, /console\.|x-forwarded|x-real-ip/i);
  assert.match(source, /controller.abort\(\)/); assert.match(source, /10000/);
  assert.match(read('supabase/config.toml'), /\[functions.username-login\]\s+verify_jwt = false/);
  for (const path of fs.readdirSync('src', { recursive: true })) {
    if (/\.[tj]sx?$/.test(path)) assert.doesNotMatch(read('src/' + path), /SUPABASE_SERVICE_ROLE_KEY|USERNAME_LOGIN_RATE_SECRET/);
  }
});

test('invalid body, wildcard, size and origin cannot reach identity lookup', async () => {
  for (const body of [null, {}, { username: '%', password: 'x' }, { username: 'pilot', password: 3 }, { username: 'pilot', password: 'x'.repeat(9000) }]) {
    const e = edge(); assert.notEqual((await e.request(body)).status, 200); assert.equal(e.calls.length, 0);
  }
  const e = edge(); assert.equal((await e.request(undefined, 'https://untrusted.invalid')).status, 403); assert.equal(e.calls.length, 0);
  assert.equal((await edge({ env: { USERNAME_LOGIN_ALLOWED_ORIGINS: '*' } }).request()).status, 403);
});

test('future hardening stays outside automatic migrations; no economic DML/function rewrites', () => {
  const file = 'supabase/planned/20260918010000_profiles_privacy_hardening.sql';
  const sql = read(file).replace(/--[^\n]*/g, '');
  assert.equal(fs.existsSync(file.replace('/planned/', '/migrations/')), false);
  assert.match(sql, /BEGIN;/); assert.match(sql, /COMMIT;\s*$/);
  assert.match(sql, /REVOKE ALL PRIVILEGES ON TABLE public\.profiles FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /GRANT SELECT ON TABLE public\.profiles TO authenticated/);
  assert.match(sql, /id = auth\.uid\(\)::text/);
  assert.match(sql, /email = auth\.jwt\(\)->>'email'/);
  for (const column of ['id', 'email', 'username']) assert.ok(sql.includes(`has_column_privilege('service_role', 'public.profiles', '${column}', 'SELECT')`));
  assert.doesNotMatch(sql, /has_table_privilege\('service_role'/);
  assert.doesNotMatch(sql, /(?:INSERT INTO|UPDATE public\.|DELETE FROM|TRUNCATE TABLE|CREATE (?:OR REPLACE )?FUNCTION|ALTER FUNCTION)/i);
  assert.doesNotMatch(sql, /GRANT EXECUTE|FROM PUBLIC, anon, authenticated, service_role/);
});
