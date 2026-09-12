// Isolated regression checks: real services, fake Supabase, in-memory storage.
// No network, account creation, or browser storage access.
import { build } from 'esbuild';

const source = `
import assert from 'node:assert/strict';
import { EconomyService } from './src/services/economyService';
import { ProgressionService } from './src/services/progressionService';
import { SupabaseService } from './src/services/supabaseService';
import { mapProfileToNexaUser } from './src/lib/supabaseMappers';
import { AUTH_USERS_KEY } from './src/services/authService';

const store = new Map();
globalThis.window = { localStorage: {
  getItem: key => store.get(key) ?? null,
  setItem: (key, value) => store.set(key, value),
}};
const oldRow = { id: 'battle-test', username: 'Test', level: 10, experience: 3400,
  max_experience: 3500, balance_nex: 100, balance_nxa: 20, unlocked_slots: 4,
  level_rewards_claimed: [1] };
let row = { ...oldRow };
const initial = mapProfileToNexaUser(row);
store.set(AUTH_USERS_KEY, JSON.stringify([{ ...initial, passwordHash: '', salt: '' }]));
SupabaseService.acceptConfirmedProfile(initial);
let completeRpc;
let completeOldRead;
let calls = 0;
globalThis.fakeSupabase = {
  rpc: async () => { calls++; return await new Promise(resolve => { completeRpc = resolve; }); },
  from: () => ({ select() { return this; }, eq() { return this; },
    single: async () => ({ data: row, error: null }),
    order: () => new Promise(resolve => { completeOldRead = resolve; }),
  }),
};
const grant = ProgressionService.addExperience;
assert.throws(() => grant.call(ProgressionService, initial.id, 150), /Progressão local bloqueada/);
assert.equal(ProgressionService.claimLevelReward(initial.id, 6).success, false);
assert.throws(() => ProgressionService.grantLevelReward(initial, { type: 'BOX', boxType: 'BASIC' }), /bloqueada/);
ProgressionService.addExperience = () => { throw new Error('Online progression must not grant locally'); };
const reward = { victory: true, xpGained: 150, nexGained: 10, nxaGained: 0 };
const staleRead = SupabaseService.fetchAllProfiles();
const battle = EconomyService.applyBattleReward(initial.id, reward);
assert.equal(EconomyService.getUser(initial.id).level, 10);
await assert.rejects(EconomyService.applyBattleReward(initial.id, reward), /andamento/);
assert.equal(calls, 1);
row = { ...row, level: 11, experience: 50, max_experience: 4725, balance_nex: 110 };
completeRpc({ data: { success: true, level: 11, experience: 50, balance_nex: 110,
  balance_nxa: 20, leveled_up: true }, error: null });
const confirmed = await battle;
assert.equal(confirmed.level, 11);
assert.equal(confirmed.experience, 50);
assert.equal(confirmed.maxExperience, 4725);
assert.equal(confirmed.balanceNEX, 110); // no extra 150 NEX level reward
assert.deepEqual(confirmed.levelUpResult.rewardsGranted, []);
assert.equal(confirmed.levelUpResult.previousLevel, 10);
assert.equal(confirmed.levelUpResult.leveledUp, true);
assert.equal(confirmed.levelUpResult.confirmedOnline, true);
completeOldRead({ data: [oldRow], error: null });
await staleRead;
assert.equal(EconomyService.getUser(initial.id).level, 11);
assert.equal(SupabaseService.getProfileSync(initial.id).maxExperience, 4725);
assert.equal(JSON.parse(store.get(AUTH_USERS_KEY))[0].level, 11);

const next = EconomyService.applyBattleReward(initial.id, reward);
row = { ...row, experience: 200, balance_nex: 120 };
completeRpc({ data: { success: true, level: 11, experience: 200, balance_nex: 120,
  balance_nxa: 20, leveled_up: false }, error: null });
assert.equal((await next).levelUpResult, undefined);

// A false RPC celebration must not survive when the confirmed level stays put.
const warnings = [];
const originalWarn = console.warn;
console.warn = (...args) => warnings.push(args);
const inconsistent = EconomyService.applyBattleReward(initial.id, reward);
completeRpc({ data: { success: true, level: 12, experience: 0, balance_nex: 120,
  balance_nxa: 20, leveled_up: true }, error: null });
const rejectedCelebration = await inconsistent;
assert.equal(rejectedCelebration.level, 11);
assert.equal(rejectedCelebration.experience, 200);
assert.equal(rejectedCelebration.levelUpResult, undefined);
assert.deepEqual(warnings[0][1], { previousLevel: 11, rpcLevel: 12,
  confirmedLevel: 11, experience: 200, maxExperience: 4725 });
assert.equal(warnings.length, 1);
console.warn = originalWarn;

const failed = EconomyService.applyBattleReward(initial.id, reward);
completeRpc({ data: null, error: { message: 'RPC rejected' } });
await assert.rejects(failed, /RPC rejected/);
assert.equal(EconomyService.getUser(initial.id).experience, 200);

// The lock must also clear after an RPC error; exercise the observed production profile.
row = { ...oldRow, experience: 4895, max_experience: 14897 };
SupabaseService.acceptConfirmedProfile(mapProfileToNexaUser(row));
for (const xpGained of [150, 50]) {
  const retried = EconomyService.applyBattleReward(initial.id, { ...reward, xpGained });
  row = { ...row, experience: row.experience + xpGained };
  completeRpc({ data: { success: true, level: 10, experience: row.experience,
    balance_nex: 100, balance_nxa: 20, leveled_up: false }, error: null });
  assert.equal((await retried).levelUpResult, undefined);
}
assert.equal(calls, 6);

// Offline fallback remains available only without a Supabase configuration.
ProgressionService.addExperience = grant;
globalThis.offlineTest = true;
const offlineUser = { ...initial, level: 5, experience: 1050, maxExperience: 1200,
  levelRewardsClaimed: [1, 2, 3, 4, 5] };
store.set(AUTH_USERS_KEY, JSON.stringify([{ ...offlineUser, passwordHash: '', salt: '' }]));
const local = await EconomyService.applyBattleReward(initial.id, reward);
assert.equal(local.experience, 0);
assert.equal(local.levelUpResult.previousLevel, 5);
assert.equal(local.levelUpResult.newLevel, 6);
assert.equal(local.levelUpResult.rewardsGranted[0].name, 'Caixa Básica');
assert.equal(ProgressionService.claimLevelReward(initial.id, 6).success, false);
assert.equal(calls, 6);
console.log('PASS: online guards, confirmation, inconsistent RPC, stale cache, lock cleanup, 150/50 XP, offline 5->6 reward');
`;

const result = await build({
  stdin: { contents: source, resolveDir: process.cwd(), sourcefile: 'battle-regression.ts', loader: 'ts' },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'isolated-supabase', setup(builder) {
    builder.onLoad({ filter: /[\\/]lib[\\/]supabase\.ts$/ }, () => ({
      contents: `export const supabase = new Proxy({}, { get: (_, key) => globalThis.fakeSupabase[key] });
        export const isSupabaseConfigured = () => !globalThis.offlineTest;
        export const getSupabaseConfigurationError = () => null;
        export const SUPABASE_STATUS = { isConfigured: true };`,
      loader: 'ts',
    }));
  }}],
});
await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
