// Run: node --test scripts/test-auth-online.cjs
// Tests execute the real TS services against controlled Auth/PostgREST doubles.
// No network, real credentials, user creation, or real browser storage is used.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports, globals = {}, env = {}) {
  const source = fs.readFileSync(file, 'utf8').replaceAll('import.meta', '__importMeta');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.React, esModuleInterop: true,
  }}).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, require: name => {
      if (!(name in imports)) throw new Error('Unexpected import: ' + name);
      return imports[name];
    }, console, URL, atob, setTimeout, clearTimeout, __importMeta: { env }, ...globals,
  }, { filename: file });
  return module.exports;
}

const AUTH_USERS = 'nexa_auth_users_db_v2';
const AUTH_SESSION = 'nexa_auth_current_session_v2';
const ASSETS = 'nexa_assets_v1';
const BACKUP = 'nexa_auth_before_online_v1';
const user = { id: 'remote-id', email: 'pilot@example.com', user_metadata: { username: 'Pilot_1' }, identities: [{ id: 'identity' }] };
const row = { id: user.id, email: user.email, username: 'Pilot_1', level: 7, experience: 123, victories: 12, balance_nex: 4321 };
const registration = { username: 'Pilot_1', email: 'pilot@example.com', password: 'correct-password', confirmPassword: 'correct-password' };
const clone = value => JSON.parse(JSON.stringify(value));

function setup(options = {}) {
  const storage = new Map([
    [AUTH_USERS, JSON.stringify([{ id: 'legacy-id', username: 'Pilot_1', email: user.email, level: 25, experience: 9000, passwordHash: 'legacy-hash', salt: 'old-salt' }])],
    [AUTH_SESSION, JSON.stringify({ id: 'legacy-id', level: 25 })],
    [ASSETS, JSON.stringify([{ id: 'precious-item', ownerId: 'legacy-id', level: 30 }])],
  ]);
  const before = new Map(storage);
  const calls = [];
  const state = { row: clone(row), ...options };
  const localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => { if (state.storageFull) throw new Error('Quota exceeded'); storage.set(key, value); },
    removeItem: () => { throw new Error('Local progress must never be deleted'); },
    clear: () => { throw new Error('Storage must never be cleared'); },
  };
  const session = { user };
  const auth = {
    async signUp(params) { calls.push(['signUp', params]); if (state.networkError) throw new Error('Network unavailable'); return { data: { user: state.noUser ? null : state.obfuscated ? { ...user, identities: [] } : user, session: state.pending ? null : session }, error: state.authError ? { message: state.authError } : null }; },
    async signInWithPassword(params) { calls.push(['signIn', params]); return { data: { user, session: state.noSession ? null : session }, error: state.authError ? { message: state.authError } : null }; },
    async getSession() { return { data: { session: state.noSession ? null : session }, error: null }; },
    async getUser() { calls.push(['getUser']); if (state.verifyPromise) return state.verifyPromise; return { data: { user: state.wrongIdentity ? { ...user, id: 'other-id' } : user }, error: state.verifyError ? { message: state.verifyError } : null }; },
    async signOut() { calls.push(['signOut']); return { error: null }; },
  };
  const supabase = {
    auth,
    from(table) {
      const query = { table, action: 'select' };
      const result = () => {
        calls.push(['query', clone(query)]);
        if (state.readError && query.action === 'select') return { data: null, error: { message: 'Read denied' } };
        if (query.action === 'insert') {
          if (state.insertError) return { data: null, error: { message: 'Insert denied', code: '42501' } };
          if (state.insertRace) { state.row = { ...row, ...query.payload }; return { data: null, error: { message: 'Duplicate', code: '23505' } }; }
          state.row = state.silentInsert ? null : { ...row, ...query.payload };
        }
        if (query.action === 'update') {
          if (state.updateError) return { data: null, error: { message: 'Update denied' } };
          if (state.zeroUpdated) return { data: null, error: null };
          state.row = { ...state.row, ...query.payload };
        }
        return { data: state.row, error: null };
      };
      const chain = {
        select(columns) { query.columns = columns; return chain; },
        eq(key, value) { query.filter = [key, value]; return chain; },
        ilike(key, value) { query.filter = [key, value]; return chain; },
        insert(payload) { query.action = 'insert'; query.payload = payload; return chain; },
        update(payload) { query.action = 'update'; query.payload = payload; return chain; },
        maybeSingle: async () => result(),
        then(resolve, reject) { return Promise.resolve().then(result).then(resolve, reject); },
      };
      return chain;
    },
  };
  const lib = { supabase, isSupabaseConfigured: () => !state.configError, getSupabaseConfigurationError: () => state.configError || null };
  const mappers = load('src/lib/supabaseMappers.ts', {});
  const profiles = load('src/services/supabaseService.ts', {
    '../lib/supabase': lib, '../lib/supabaseMappers': mappers,
    '../data/mockUsers': { MOCK_COMMUNITY_USERS: [{ ...row, id: user.id, level: 99 }], CURRENT_USER: { id: 'usr_demo' } },
  }).SupabaseService;
  const service = load('src/services/authService.ts', {
    '../lib/supabase': lib, './supabaseService': { SupabaseService: profiles },
  }, { localStorage }).authService;
  return { service, profiles, storage, before, state, calls, supabase, lib };
}

function unchanged(s) { assert.deepEqual([...s.storage], [...s.before]); assert.equal(s.service.isAuthenticated(), false); }

test('legacy local session cannot authenticate, even before initialization', async () => {
  const s = setup({ noSession: true });
  assert.equal(s.service.getCurrentUser(), null);
  await s.service.ensureInitialized();
  assert.equal(await s.service.restoreCurrentUser(), null);
  unchanged(s);
});

for (const options of [
  { configError: 'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY' },
  { authError: 'Invalid API key' }, { networkError: true }, { noUser: true }, { obfuscated: true },
  { readError: true }, { row: null, insertError: true }, { verifyError: 'Invalid JWT' }, { wrongIdentity: true },
]) test('registration fails closed: ' + JSON.stringify(options), async () => {
  const s = setup(options);
  const result = await s.service.register(registration);
  assert.equal(result.success, false);
  assert.ok(result.error);
  unchanged(s);
  if (options.configError) assert.equal(s.calls.length, 0);
});

test('successful online signup uses Auth, verifies identity/profile, preserves legacy accounts and raw backup', async () => {
  const s = setup();
  const result = await s.service.register(registration);
  assert.equal(result.success, true);
  assert.equal(result.user.id, user.id);
  assert.equal(result.user.level, 7);
  assert.equal(s.service.isAuthenticated(), true);
  assert.deepEqual(clone(s.calls.find(c => c[0] === 'signUp')[1]), { email: user.email, password: registration.password, options: { data: { username: registration.username } } });
  assert.ok(s.calls.some(c => c[0] === 'getUser'));
  const accounts = JSON.parse(s.storage.get(AUTH_USERS));
  assert.deepEqual(accounts[0], JSON.parse(s.before.get(AUTH_USERS))[0]);
  assert.equal(accounts.length, 2); // same username never merges different IDs
  assert.equal(s.storage.get(AUTH_SESSION), s.before.get(AUTH_SESSION));
  const backup = JSON.parse(s.storage.get(BACKUP));
  assert.equal(backup.accounts, s.before.get(AUTH_USERS));
  assert.equal(backup.assets, s.before.get(ASSETS));
  assert.equal(backup.session, s.before.get(AUTH_SESSION));
  assert.deepEqual(JSON.parse(s.storage.get(ASSETS))[0], JSON.parse(s.before.get(ASSETS))[0]);
});

test('email confirmation with confirmed profile succeeds without granting a session or changing local data', async () => {
  const s = setup({ pending: true });
  const result = await s.service.register(registration);
  assert.equal(result.success, true);
  assert.equal(result.requiresEmailConfirmation, true);
  assert.equal(result.user, undefined);
  unchanged(s);
});

test('pending email with missing profile does not report completion or insert anonymously', async () => {
  const s = setup({ pending: true, row: null });
  const result = await s.service.register(registration);
  assert.equal(result.success, false);
  assert.match(result.error, /Não é necessário criar outra conta/);
  assert.equal(s.calls.some(c => c[0] === 'query' && c[1].action === 'insert'), false);
  unchanged(s);
});

for (const options of [{ configError: 'Missing configuration' }, { authError: 'Invalid login credentials' }, { noSession: true }, { readError: true }, { row: null, insertError: true }, { verifyError: 'JWT expired' }, { wrongIdentity: true }]) {
  test('login never falls back to local accounts: ' + JSON.stringify(options), async () => {
    const s = setup(options);
    assert.equal((await s.service.login(user.email, 'anything')).success, false);
    unchanged(s);
  });
}

test('username login resolves only remote profile and escapes underscore wildcard', async () => {
  const s = setup();
  assert.equal((await s.service.login('Pilot_1', 'correct-password')).success, true);
  assert.equal(s.calls.find(c => c[0] === 'query')[1].filter[1], 'pilot\\_1');
  assert.equal(s.calls.find(c => c[0] === 'signIn')[1].email, user.email);
});

test('missing authenticated profile is inserted with identity only and reread', async () => {
  const s = setup({ row: null });
  assert.equal((await s.service.login(user.email, 'correct-password')).success, true);
  const payload = s.calls.find(c => c[0] === 'query' && c[1].action === 'insert')[1].payload;
  assert.deepEqual(payload, { id: user.id, email: user.email, username: 'Pilot_1' });
  assert.equal(s.state.row.balance_nex, 4321);
});

test('insert must be confirmed by a fresh remote read', async () => {
  const s = setup({ row: null, silentInsert: true });
  assert.equal((await s.service.login(user.email, 'correct-password')).success, false);
  unchanged(s);
});

test('concurrent insert succeeds only after finding the matching profile', async () => {
  const s = setup({ row: null, insertRace: true });
  assert.equal((await s.service.login(user.email, 'correct-password')).success, true);
});

test('strict profile query never returns seeded memory on empty/error response', async () => {
  const s = setup({ row: null });
  assert.equal(await s.profiles.fetchRemoteProfile(user.id), null);
  s.state.readError = true;
  await assert.rejects(s.profiles.fetchRemoteProfile(user.id), /Read denied/);
});

test('profile upsert rejects another identity and propagates write errors', async () => {
  const s = setup();
  await assert.rejects(s.profiles.upsertProfile({ id: 'legacy-id' }), /proprietário/);
  s.state.updateError = true;
  await assert.rejects(s.profiles.upsertProfile({ id: user.id, username: 'Pilot_1' }), /Update denied/);
  s.state.updateError = false;
  s.state.zeroUpdated = true;
  await assert.rejects(s.profiles.updateEditableProfile(user.id, { bio: 'changed' }), /não confirmou/);
});

test('logout preserves all progress and legacy session values', async () => {
  const s = setup();
  await s.service.login(user.email, 'correct-password');
  const snapshot = [...s.storage];
  await s.service.logout();
  assert.equal(s.service.getCurrentUser(), null);
  assert.deepEqual([...s.storage], snapshot);
});

test('demo and profile switching cannot create an authenticated user', async () => {
  const s = setup();
  assert.equal((await s.service.loginAsDemo()).success, false);
  s.service.updateUser({ id: 'legacy-id', level: 999 });
  unchanged(s);
});

test('late authentication response cannot undo logout', async () => {
  let resolve;
  const s = setup({ verifyPromise: new Promise(r => { resolve = r; }) });
  const login = s.service.login(user.email, 'correct-password');
  await new Promise(r => setTimeout(r, 0));
  await s.service.logout();
  resolve({ data: { user }, error: null });
  assert.equal((await login).success, false);
  unchanged(s);
});

test('unavailable browser storage does not turn a real login into a fake offline login or erase data', async () => {
  const s = setup({ storageFull: true });
  assert.equal((await s.service.login(user.email, 'correct-password')).success, true);
  assert.equal(s.service.getCurrentUser().id, user.id);
  assert.deepEqual([...s.storage], [...s.before]);
});

function client(env) {
  let args;
  const exports = load('src/lib/supabase.ts', { '@supabase/supabase-js': { createClient: (...values) => { args = values; return {}; } } }, {}, env);
  return { ...exports, args };
}
const jwt = role => ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ role })).toString('base64url'), 'signature'].join('.');
for (const key of ['sb_secret_private', jwt('service_role'), 'your-anon-key', 'broken-key']) {
  test('client refuses non-public key without passing it to createClient: ' + key.split('.')[0], () => {
    const c = client({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: key });
    assert.equal(c.isSupabaseConfigured(), false);
    assert.notEqual(c.args[1], key);
  });
}
test('client reads and trims both VITE variables, accepts anon/publishable, fails for missing/invalid URL', () => {
  for (const key of [jwt('anon'), 'sb_publishable_public']) {
    const c = client({ VITE_SUPABASE_URL: ' https://example.supabase.co ', VITE_SUPABASE_ANON_KEY: ' ' + key + ' ' });
    assert.equal(c.isSupabaseConfigured(), true);
    assert.equal(c.args[0], 'https://example.supabase.co');
    assert.equal(c.args[1], key);
    assert.equal(c.args[2].auth.storageKey, 'nexa_supabase_auth_token_v1');
  }
  assert.equal(client({}).isSupabaseConfigured(), false);
  assert.equal(client({ VITE_SUPABASE_URL: 'bad-url', VITE_SUPABASE_ANON_KEY: jwt('anon') }).isSupabaseConfigured(), false);
});

// A small hook harness exercises the real provider's transitions, async races,
// and listener cleanup without mounting unrelated game/ranking side effects.
function contextHarness(options = {}) {
  const values = [];
  const effects = [];
  let cursor = 0;
  let callback;
  let unsubscribed = false;
  let restoreCalls = 0;
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    createElement: (type, props) => ({ type, props }),
    useState(initial) {
      const i = cursor++;
      if (!(i in values)) values[i] = typeof initial === 'function' ? initial() : initial;
      return [values[i], next => { values[i] = typeof next === 'function' ? next(values[i]) : next; }];
    },
    useRef(initial) { const i = cursor++; return values[i] || (values[i] = { current: initial }); },
    useEffect(effect) { const i = cursor++; if (!(i in values)) { values[i] = true; effects.push(effect); } },
    useContext: () => null,
  };
  const service = {
    async restoreCurrentUser() { restoreCalls++; if (options.restoreError) throw new Error('Session rejected'); return options.restoreProfile || null; },
    async register() { return options.registrationResult || { success: true, requiresEmailConfirmation: true }; },
    async login() { return options.loginPromise || { success: false, error: 'Wrong password' }; },
    async loginAsDemo() { return { success: false }; },
    invalidateSession() {}, async logout() {},
  };
  const result = load('src/contexts/AuthContext.tsx', {
    react,
    '../services/authService': { authService: service },
    '../services/economyService': { EconomyService: {} },
    '../services/progressionService': { ProgressionService: {} },
    '../data/mockUsers': { CURRENT_USER: { id: 'usr_demo' } },
    '../lib/supabase': { isSupabaseConfigured: () => true, supabase: { auth: {
      onAuthStateChange(cb) { callback = cb; return { data: { subscription: { unsubscribe() { unsubscribed = true; } } } }; },
    } } },
    '../services/supabaseService': { SupabaseService: { async fetchAllProfiles() { return []; } } },
  }, { window: { dispatchEvent() {} }, Event: class {} });
  const render = () => { cursor = 0; return result.AuthProvider({ children: null }).props.value; };
  render();
  const cleanups = effects.map(effect => effect());
  return { render, emit: (...args) => callback(...args), cleanup: () => cleanups.forEach(fn => fn()), get restoreCalls() { return restoreCalls; }, get unsubscribed() { return unsubscribed; } };
}

test('provider rejects fake local session, demo switch and gameplay sync as authentication', async () => {
  const h = contextHarness();
  assert.equal(h.render().isAuthenticated, false);
  h.render().switchUser('usr_demo');
  h.render().syncUser({ id: 'usr_demo' });
  assert.equal(h.render().isAuthenticated, false);
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(h.render().isAuthenticated, false);
  h.cleanup();
});

test('provider exposes failed session verification and releases auth subscription', async () => {
  const h = contextHarness({ restoreError: true });
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(h.render().isAuthenticated, false);
  assert.equal(h.render().authError, 'Session rejected');
  h.cleanup();
  assert.equal(h.unsubscribed, true);
});

test('auth callback returns synchronously and defers SDK calls outside the callback', async () => {
  const h = contextHarness();
  const before = h.restoreCalls;
  assert.equal(h.emit('SIGNED_IN'), undefined);
  assert.equal(h.restoreCalls, before);
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.ok(h.restoreCalls > before);
  h.cleanup();
});

test('pending email confirmation never authenticates provider', async () => {
  const h = contextHarness();
  const result = await h.render().register(registration);
  assert.equal(result.requiresEmailConfirmation, true);
  assert.equal(h.render().isAuthenticated, false);
  h.cleanup();
});

test('SIGNED_OUT invalidates pending login so its late response cannot unlock UI', async () => {
  let resolve;
  const h = contextHarness({ loginPromise: new Promise(r => { resolve = r; }) });
  const login = h.render().login(user.email, 'password');
  h.emit('SIGNED_OUT');
  resolve({ success: true, user: { id: user.id } });
  assert.equal((await login).success, false);
  assert.equal(h.render().isAuthenticated, false);
  h.cleanup();
});
