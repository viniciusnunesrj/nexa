// Offline checks only. No Supabase client, credentials, network, or SQL execution.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText, filename);
const root = path.resolve(__dirname, '..');
const feature = path.join(root, 'src/features/riftbattle-v2');
const { RIFTBATTLE_ARENAS } = require(path.join(feature, 'arenaConfig.ts'));
const { RIFTBATTLE_V2_CARDS } = require(path.join(feature, 'cardCatalog.ts'));
const contract = require(path.join(feature, 'serverValidation.ts'));
const { initializeRiftBattle, applyRiftBattleAction } = require(path.join(feature, 'battleEngine.ts'));
const { chooseRiftBattleAiAction } = require(path.join(feature, 'ai.ts'));
const { createOwnedRiftBattleCards, isCardEligibleForRiftBattle } = require(path.join(feature, 'inventoryAdapter.ts'));
const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20260922215435_riftbattle_v2_validation.sql'), 'utf8');
const request = { requestId: 'retry-1', arenaId: 'rift-standard', instanceIds: ['copy-1', 'copy-2', 'copy-3', 'copy-4'] };
const receipt = () => ({
  success: true, validation_id: 'test-receipt', request_id: request.requestId,
  rules_version: contract.RIFTBATTLE_RULES_VERSION, arena: structuredClone(RIFTBATTLE_ARENAS[0]),
  cards: request.instanceIds.map((id) => ({ ...structuredClone(RIFTBATTLE_V2_CARDS[0]), id,
    sourceInstanceId: id, templateId: RIFTBATTLE_V2_CARDS[0].id })),
  mode: 'VALIDATION_ONLY', authoritative: false, reward_applied: false,
  idempotent: false, validated_at: '2026-09-22T00:00:00.000Z',
});

test('frozen SQL snapshot exactly matches all current arenas and V2 templates', () => {
  assert.deepEqual(JSON.parse(sql.match(/\$arenas\$([\s\S]*?)\$arenas\$/)[1]), RIFTBATTLE_ARENAS);
  assert.deepEqual(JSON.parse(sql.match(/\$cards\$([\s\S]*?)\$cards\$/)[1]), RIFTBATTLE_V2_CARDS);
  assert.ok(sql.includes(`'${contract.RIFTBATTLE_RULES_VERSION}'`));
  assert.equal(RIFTBATTLE_V2_CARDS.length, 60);
});

test('only identifiers/version are sent; exact cardinality for every arena', () => {
  for (const arena of RIFTBATTLE_ARENAS) {
    const valid = { ...request, arenaId: arena.id, instanceIds: Array.from({ length: arena.teamSize }, (_, i) => `owned-${i}`) };
    const params = contract.validationParams({ ...valid, stats: { hp: 999 }, rewards: 999, ownerId: 'victim' });
    assert.deepEqual(Object.keys(params).sort(), ['p_arena_id', 'p_instance_ids', 'p_request_id', 'p_rules_version']);
    assert.deepEqual(params.p_instance_ids, valid.instanceIds);
    assert.throws(() => contract.validationParams({ ...valid, instanceIds: valid.instanceIds.slice(1) }));
  }
  for (const change of [
    { arenaId: 'unknown' }, { requestId: '' }, { requestId: ' padded ' }, { requestId: 'x'.repeat(201) },
    { instanceIds: ['same', 'same', 'c', 'd'] }, { instanceIds: ['a', '', 'c', 'd'] },
  ]) assert.throws(() => contract.validationParams({ ...request, ...change }));
});

test('distinct owned copies of a template stay distinct end to end', () => {
  const cards = createOwnedRiftBattleCards(request.instanceIds.map((id) => ({
    id, templateId: RIFTBATTLE_V2_CARDS[0].id, state: 'FREE', cardStatus: 'FREE', status: 'IDLE',
  })));
  assert.deepEqual(cards.map((c) => c.id), request.instanceIds);
  assert.equal(new Set(cards.map((c) => c.templateId)).size, 1);
  assert.equal(contract.parseValidationReceipt(receipt(), request).cards.length, 4);
});

test('incompatible, reordered, economic and tampered responses are rejected', () => {
  for (const mutate of [
    (r) => { r.reward_applied = true; }, (r) => { r.authoritative = true; },
    (r) => { r.rules_version = 'old'; }, (r) => { r.request_id = 'another'; },
    (r) => { r.cards[0].stats.hp = 999; }, (r) => { r.cards[0].ability.id = 'MARCA'; },
    (r) => { r.cards[0].sourceInstanceId = 'foreign'; }, (r) => { r.cards.reverse(); },
    (r) => { r.arena.energyByTurn = [999]; }, (r) => { r.arena.abilitiesEnabled = false; },
    (r) => { r.cards[0].templateId = 'unregistered'; },
  ]) {
    const value = receipt(); mutate(value);
    assert.throws(() => contract.parseValidationReceipt(value, request));
  }
});

test('SQL isolation/permissions guardrails (static, not database integration)', () => {
  assert.doesNotMatch(sql, /(?:UPDATE|INSERT INTO|DELETE FROM)\s+public\./i);
  assert.doesNotMatch(sql, /start_battle_atomic|apply_battle_reward|balance_nex|balance_nxa/i);
  assert.doesNotMatch(sql, /FOR\s+(UPDATE|SHARE|NO KEY UPDATE|KEY SHARE)|LOCK TABLE/i);
  for (const required of ['auth.uid()', 'pg_try_advisory_xact_lock',
    'count(DISTINCT x)', 'c.owner_id = v_owner', "c.state = 'FREE'", "c.card_status = 'FREE'",
    "c.status = 'IDLE'", 'marketplace_reservations_v2', 'UNIQUE (owner_id, request_id)',
    'v_existing.instance_ids <> p_instance_ids', 'CHECK (reward_applied = false)',
    'SECURITY INVOKER', "SET search_path = ''", 'ENABLE ROW LEVEL SECURITY',
  ]) assert.ok(sql.includes(required), required);
});

test('request ID grammar rejects every ASCII separator/control and Unicode whitespace', () => {
  const allowed = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._:-';
  for (let code = 0; code < 128; code++) {
    const char = String.fromCharCode(code);
    assert.equal(contract.isValidRiftBattleRequestId(`a${char}`), allowed.includes(char));
  }
  for (const invalid of ['\n', 'a\n', 'a\r\n', '\ta', 'a\t', ' a', 'a ', 'a\u00a0', 'a\u200b', 'a\ufeff', 'ação', '.a', '-a', ':a', '_a']) {
    assert.equal(contract.isValidRiftBattleRequestId(invalid), false, JSON.stringify(invalid));
  }
  assert.equal(contract.isValidRiftBattleRequestId('A'.repeat(200)), true);
  assert.equal(contract.isValidRiftBattleRequestId('A'.repeat(201)), false);
  assert.equal(contract.isValidRiftBattleRequestId('550e8400-e29b-41d4-a716-446655440000'), true);
  assert.ok(sql.includes("COLLATE \"C\" ~ '^[A-Za-z0-9]'"));
  assert.ok(sql.includes("COLLATE \"C\" !~ '[^A-Za-z0-9._:-]'"));
});

test('known conflicting states/timestamps are never offered; distinct copies stay eligible', () => {
  const card = { id: 'owned', templateId: RIFTBATTLE_V2_CARDS[0].id, state: 'FREE', cardStatus: 'FREE', status: 'IDLE' };
  assert.equal(isCardEligibleForRiftBattle(card), true);
  for (const change of [{ state: 'ACTIVE' }, { state: 'EXHAUSTED' }, { state: undefined },
    { cardStatus: 'ACTIVE' }, { cardStatus: 'SYNTHESIZING' }, { cardStatus: undefined },
    ...['LISTED', 'FROZEN', 'EQUIPPED', 'ACTIVE', 'EXHAUSTED'].map((status) => ({ status })),
    ...['synthesizedAt', 'lastAccrualAt', 'exhaustedAt'].flatMap((key) => [0, 123, '2026-09-22', ''].map((value) => ({ [key]: value }))),
  ]) assert.equal(isCardEligibleForRiftBattle({ ...card, ...change }), false, JSON.stringify(change));
  assert.equal(isCardEligibleForRiftBattle({ ...card, tradeable: false, synthesizedAt: null }), true);
});

test('quota applies after replay, is serialized and never discards idempotency keys (static SQL)', () => {
  const body = sql.slice(sql.indexOf('CREATE FUNCTION riftbattle_v2_private.validate_squad'));
  const replay = body.indexOf('RETURN v_existing.response');
  const quota = body.indexOf('IF v_total >= 10000 OR v_minute >= 30 OR v_day >= 500');
  const inventoryRead = body.indexOf('FROM unnest(p_instance_ids) WITH ORDINALITY');
  assert.ok(replay > body.indexOf('pg_try_advisory_xact_lock'));
  assert.ok(quota > replay && inventoryRead > quota);
  assert.ok(body.includes("created_at >= v_created - interval '1 minute'"));
  assert.ok(body.includes("created_at >= v_created - interval '24 hours'"));
  assert.doesNotMatch(sql, /\bDELETE\b|\bTRUNCATE\b|\bCASCADE\b/i);
  assert.ok(sql.includes('ON riftbattle_v2_private.validations(owner_id, created_at DESC)'));
});

test('manual preflight contains only SELECT statements and never calls battle RPCs', () => {
  const preflight = fs.readFileSync(path.join(root, 'docs/riftbattle-v2-preflight.sql'), 'utf8')
    .replace(/--[^\n]*/g, '');
  const statements = preflight.split(';').map((s) => s.trim()).filter(Boolean);
  assert.ok(statements.length >= 10);
  statements.forEach((s) => assert.match(s, /^SELECT\b/i));
  assert.doesNotMatch(preflight, /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|GRANT|REVOKE|DO|SET|EXECUTE)\s/i);
  assert.doesNotMatch(preflight.replace(/'(?:''|[^'])*'/g, "''"),
    /(?:public\.)?(?:start_battle_atomic|validate_riftbattle_v2_squad)\s*\(/i);
});

test('service retries same identifiers and propagates errors without legacy/local fallback', async () => {
  const calls = [];
  let failure = null;
  const mock = {
    getSupabaseConfigurationError: () => null,
    supabase: { rpc: async (name, params) => {
      calls.push({ name, params });
      return { data: receipt(), error: failure };
    } },
  };
  const source = ts.transpileModule(fs.readFileSync(path.join(root, 'src/services/riftBattleV2Service.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`)(
    (name) => name === '../lib/supabase' ? mock : contract, module, module.exports,
  );
  failure = { message: 'network uncertain' };
  await assert.rejects(module.exports.validateRiftBattleV2Squad(request), /network uncertain/);
  failure = null;
  await module.exports.validateRiftBattleV2Squad(request);
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(calls[0].name, 'validate_riftbattle_v2_squad');
});

for (const arena of RIFTBATTLE_ARENAS) {
  test(`local engine smoke: ${arena.id}, deploy/energy/turns/AI/result`, () => {
    const cards = RIFTBATTLE_V2_CARDS.filter((c) => c.deployCost <= arena.energyByTurn[0]).slice(0, arena.teamSize);
    let state = initializeRiftBattle(cards.map((c, i) => ({ ...c, id: `player-${i}` })),
      cards.map((c, i) => ({ ...c, id: `npc-${i}` })), arena);
    let actions = 0;
    while (!state.result && actions++ < 1500) {
      const action = chooseRiftBattleAiAction(state, state.currentPlayerId, 'OPERADOR');
      assert.ok(action);
      state = applyRiftBattleAction(state, action);
      for (const player of Object.values(state.players)) {
        assert.ok(player.currentEnergy >= 0 && player.currentEnergy <= player.maxEnergy);
        assert.ok(player.cards.filter((c) => c.state === 'ACTIVE').length <= arena.activeSlots);
      }
    }
    assert.equal(state.phase, 'FINISHED');
    assert.ok(state.players[state.result.loserId].cards.every((c) => c.state === 'DEFEATED'));
  });
}
