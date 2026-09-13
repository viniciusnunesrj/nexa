// Local frontend contract tests + SQL static checks. Does not connect to a database.
// TYPESCRIPT_PATH may point to an already-installed TypeScript package.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require(process.env.TYPESCRIPT_PATH || 'typescript');
const sql = fs.readFileSync('supabase/migrations/20260914010000_authoritative_boxes_v1.sql', 'utf8');
assert.match(sql, /PRIMARY KEY\(owner_id,request_id\)/);
assert.match(sql, /UNIQUE\(operation,box_id\)/);
assert.match(sql, /SET search_path=pg_catalog,public/g);
assert.match(sql, /LOCK TABLE public.user_cards IN SHARE ROW EXCLUSIVE MODE/);
const phase2 = fs.readFileSync('supabase/migrations/20260914020000_disable_legacy_box_rpcs.sql', 'utf8');
assert(!/REVOKE[^;]*\b(?:purchase_box_atomic|open_box_atomic)\s*\(/i.test(sql));
assert.match(phase2, /REVOKE EXECUTE ON FUNCTION public.purchase_box_atomic[\s\S]*public.open_box_atomic[\s\S]*FROM PUBLIC,anon,authenticated;/);
assert(!/service_role/.test(phase2));
assert(!/REVOKE[^;]*service_role/i.test(sql));
assert.match(sql, /GRANT SELECT ON public.card_fragments TO authenticated/);
assert(!/GRANT\s+(?:ALL|INSERT|UPDATE|DELETE)[^;]*TO authenticated/i.test(sql));
assert.match(sql, /ORDER BY abs\(array_position\(tiers,t.rarity\)-array_position\(tiers,r\)\),min\(m.pool_order\)/);
assert.match(sql, /Reward pool empty/);
assert.match(sql, /CHECK\(box_type<>'RECRUIT' OR NOT purchasable\)/);
assert.match(sql, /0<=ALL\(weights\)/);
assert.match(sql, /array_position\(weights,NULL\) IS NULL/);
assert.match(phase2, /pg_catalog.row_security_active/);
assert(!/protect_box_card_identity_v1|box_rewards_no_client_mint|box_card_identity_v1/.test(sql));
const phase1Statements = sql.replace(/--[^\n]*/g, '').split(';');
assert(!phase1Statements.some(statement => /\b(?:CREATE|DROP)\s+(?:POLICY|TRIGGER)\b/i.test(statement) && /\buser_cards\b/i.test(statement)));
assert.match(phase2, /CREATE POLICY box_rewards_no_client_mint ON public.user_cards AS RESTRICTIVE\s+FOR INSERT TO authenticated,anon WITH CHECK\(false\)/);
assert.match(phase2, /CREATE TRIGGER box_card_identity_v1 BEFORE UPDATE ON public.user_cards/);
assert.match(phase2, /SECURITY INVOKER SET search_path=pg_catalog,public/);
for (const field of ['template_id', 'rarity', 'market_value']) {
 assert(phase2.includes('NEW.' + field + ' IS DISTINCT FROM OLD.' + field));
}
const purchase = sql.split('CREATE OR REPLACE FUNCTION public.purchase_box_v2')[1].split('CREATE OR REPLACE FUNCTION')[0];
assert(!purchase.includes('p_cost_nex'));
assert(purchase.indexOf('RETURN op.result') < purchase.indexOf('balance_nex-cfg.price_nex'));
assert.match(sql, /WHEN 'Comum' THEN 10 WHEN 'Incomum' THEN 15 WHEN 'Raro' THEN 25 WHEN 'Épico' THEN 35 WHEN 'Lendário' THEN 50 WHEN 'Mítico' THEN 75/);
assert.match(sql, /'RECRUIT','Caixa de Recruta',0,false/);
assert.match(sql, /'PREMIUM','Caixa Épica',750,true,NULL,ARRAY\[15,20,30,25,9,1\]/);
const open = sql.split('CREATE OR REPLACE FUNCTION public.open_box_v2')[1];
const advisoryLock = open.indexOf("PERFORM pg_advisory_xact_lock(hashtextextended('nexa:boxes:'||u,0))");
const profileLock = open.indexOf('SELECT * INTO profile FROM public.profiles WHERE id=u FOR UPDATE;');
const cardTableLock = open.indexOf('LOCK TABLE public.user_cards IN SHARE ROW EXCLUSIVE MODE;');
const duplicateCheck = open.indexOf('SELECT EXISTS(SELECT 1 FROM public.user_cards');
assert(advisoryLock >= 0 && advisoryLock < profileLock);
assert(profileLock >= 0 && profileLock < cardTableLock, 'profile must precede card-table lock');
assert(cardTableLock < duplicateCheck, 'legacy writers must be serialized before duplicate detection');
assert(!/LOCK TABLE\s+public\.user_cards/i.test(open.slice(0, profileLock)));
assert(purchase.includes("pg_advisory_xact_lock(hashtextextended('nexa:boxes:'||u,0))"));

assert(open.indexOf('INSERT INTO public.box_operations_v1') < open.indexOf('DELETE FROM public.user_boxes'));
assert(!open.includes('EXCEPTION WHEN')); // no catch that commits consumption without reward
assert(open.includes('ORDER BY random()'));
// Verify stored pool order and tie behavior against the real frontend implementation.
function loadConfig(file, dependencies = {}) {
 const mod = { exports: {} };
 const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
 }).outputText;
 vm.runInNewContext(compiled, { exports: mod.exports, require: id => {
  assert(id in dependencies, id); return dependencies[id];
 }, Math });
 return mod.exports;
}
const templates = loadConfig('src/config/collectionsData.ts');
const rates = loadConfig('src/config/boxRates.ts', { './collectionsData': templates });
const original = [...templates.ALL_CARD_TEMPLATES];
const seeded = [...sql.matchAll(/^\('([^']+)'.*,(\d+)\)[,;]$/gm)]
 .filter(match => match[1].startsWith('card-'));
assert.equal(seeded.length, 60);
assert.deepEqual(seeded.map(match => match[1]), original.map(t => t.templateId));
assert.deepEqual(seeded.map(match => Number(match[2])), original.map((_, i) => i + 1));
const tiers = ['Comum','Incomum','Raro','Épico','Lendário','Mítico'];
let fallbackCases = 0;
for (const [boxType, cfg] of Object.entries(rates.BOX_CONFIG)) {
 const ids = cfg.rewardPoolTemplateIds;
 const pool = original.filter(t => !ids || ids.includes(t.templateId));
 if (ids) assert.deepEqual([...ids], pool.map(t => t.templateId));
 const weights = cfg.rarityWeights;
 for (let mask = 1; mask < 64; mask++) {
  const available = pool.filter(t => mask & (1 << tiers.indexOf(t.rarity)));
  if (!available.length) continue;
  templates.ALL_CARD_TEMPLATES.splice(0, templates.ALL_CARD_TEMPLATES.length, ...available);
  for (const target of tiers) {
   cfg.rarityWeights = Object.fromEntries(tiers.map(r => [r, r === target ? 100 : 0]));
   // SQL ORDER BY distance, MIN(pool_order): stable first appearance in pool.
   const expected = [...available].sort((a,b) =>
    Math.abs(tiers.indexOf(a.rarity)-tiers.indexOf(target)) -
    Math.abs(tiers.indexOf(b.rarity)-tiers.indexOf(target)) ||
    original.indexOf(a)-original.indexOf(b))[0].rarity;
   assert.equal(rates.rollBoxReward(boxType).rarity, expected, boxType + ':' + target);
   fallbackCases++;
  }
 }
 cfg.rarityWeights = weights;
 templates.ALL_CARD_TEMPLATES.splice(0, templates.ALL_CARD_TEMPLATES.length, ...original);
}
console.log('PASS: 60 template positions and ' + fallbackCases + ' rarity fallback cases against rollBoxReward (SQL not executed).');
const storage = new Map();
let remote = [{ id: 'old-box', ownerId: 'u', boxType: 'BASIC', name: 'Básica' }];
let calls = [], failOpen = true, failPurchase = true;
const opening = { boxId: 'old-box', boxType: 'BASIC', cards: [], duplicateCardsConverted: [{ fragmentsAwarded: 25, totalFragmentsNow: 25 }] };
const api = {
  fetchUserBoxes: async () => [...remote],
  fetchRemoteProfile: async () => ({ balanceNEX: 900 }),
  purchaseBoxAtomic: async args => {
    calls.push(['purchase', args]);
    if (failPurchase) { failPurchase = false; throw Error('lost response'); }
    return { box: remote[0], newBalance: 900 };
  },
  openBoxAtomic: async args => {
    calls.push(['open', args]);
    if (failOpen) { failOpen = false; throw Error('network'); }
    remote = [];
    return opening;
  },
};
const source = fs.readFileSync('src/services/boxService.ts', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exportsObject = {};
let balanceUpdates = 0;
const forbidden = () => { throw Error('Local rewards must not execute online'); };
const mocks = {
  '../config/boxRates': { BOX_CONFIG: {}, BOX_DEFINITIONS: {}, rollBoxReward: forbidden, FRAGMENTS_CONFIG: {}, PITY_CONFIG: {} },
  './characterFragmentService': { CharacterFragmentService: { getUserFragments: forbidden } },
  './cardFragmentService': { CardFragmentService: { addDuplicateFragments: forbidden } },
  './economyService': { EconomyService: { getUser: forbidden, updateUserBalance: () => balanceUpdates++ } },
  './ledgerService': { LedgerService: { recordEntry: forbidden } },
  './authService': { ASSETS_STORAGE_KEY: 'assets' },
  './supabaseService': { SupabaseService: api },
  '../lib/supabase': { isSupabaseConfigured: () => true },
};
vm.runInNewContext(code, {
  exports: exportsObject, require: id => { assert(id in mocks, id); return mocks[id]; },
  crypto: require('node:crypto').webcrypto, console,
  window: { localStorage: { getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,v) } },
});
(async () => {
 const service = exportsObject.BoxService;
 await service.refreshOnlineBoxes('u');
 await assert.rejects(service.openBox('u','old-box'));
 assert.equal(service.getAvailableBoxes('u').length,1,'failed RPC must not remove box');
 const result = await service.openBox('u','old-box');
 assert.equal(result.duplicateCardsConverted[0].fragmentsAwarded,25);
 assert.equal(service.getAvailableBoxes('u').length,0);
 const opens = calls.filter(c=>c[0]==='open');
 assert.equal(opens[0][1].requestId,opens[1][1].requestId,'lost reply reuses request');
 assert.deepEqual(Object.keys(opens[0][1]).sort(),['boxId','requestId']);
 const failed = await service.purchaseBox('u','BASIC');
 assert.equal(failed.success,false);
 assert.equal(balanceUpdates,0);
 remote=[{id:'purchased',ownerId:'u',boxType:'BASIC'}];
 const ok = await service.purchaseBox('u','BASIC');
 assert.equal(ok.success,true);
 const buys = calls.filter(c=>c[0]==='purchase');
 assert.equal(buys[0][1].requestId,buys[1][1].requestId);
 assert.deepEqual(Object.keys(buys[0][1]).sort(),['boxType','requestId']);
 assert.equal(balanceUpdates,1);
 // An in-flight old list must not resurrect a box consumed by a confirmed RPC.
 let resolveList;
 api.fetchUserBoxes=()=>new Promise(resolve=>{resolveList=resolve;});
 const pending=service.refreshOnlineBoxes('u');
 await service.openBox('u','purchased');
 resolveList([{id:'purchased',ownerId:'u',boxType:'BASIC'}]);
 await pending;
 assert.equal(service.getAvailableBoxes('u').length,0);
 console.log('PASS: frontend request contracts, retry, no local mint, failed-open preservation, duplicate display, cache race; SQL static invariants.');
 console.log('Database idempotency/concurrency/rollback still require isolated PostgreSQL validation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
