const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText, filename);

const root = path.join(__dirname, '../src/features/riftbattle-v2');
const { RIFTBATTLE_V2_CARDS } = require(path.join(root, 'cardCatalog.ts'));
const { RIFTBATTLE_STANDARD_ARENA } = require(path.join(root, 'arenaConfig.ts'));
const { chooseRiftBattleAiAction } = require(path.join(root, 'ai.ts'));
const { replayRiftBattleV2 } = require(path.join(root, 'serverReplay.ts'));

const own = RIFTBATTLE_V2_CARDS.slice(0, 4);
const opponent = RIFTBATTLE_V2_CARDS.slice(4, 8);
const replay = (actions) => replayRiftBattleV2(own, opponent, RIFTBATTLE_STANDARD_ARENA, 'OPERADOR', actions);

test('server replay chooses AI moves deterministically and ignores any claimed result', () => {
  const actions = [];
  let state = replay(actions);
  for (let i = 0; i < 300 && state.phase !== 'FINISHED'; i++) {
    const action = chooseRiftBattleAiAction(state, 'PLAYER_ONE', 'OPERADOR');
    assert.ok(action, 'player must have a legal next action');
    actions.push(action);
    state = replay(actions);
  }
  assert.equal(state.phase, 'FINISHED');
  assert.ok(state.result);
  assert.deepEqual(replay(actions), state);
  assert.throws(() => replay([...actions, { type: 'END_TURN', playerId: 'PLAYER_ONE' }]), /após o resultado/);
});

test('server rejects AI actions, impossible cards and excessive action logs', () => {
  assert.throws(() => replay([{ type: 'END_TURN', playerId: 'PLAYER_TWO' }]), /fora do turno/);
  assert.throws(() => replay([{ type: 'DEPLOY_CARD', playerId: 'PLAYER_ONE', cardId: 'forged' }]), /não pertence/);
  assert.throws(() => replay(Array(401).fill({ type: 'END_TURN', playerId: 'PLAYER_ONE' })), /longo demais/);
});
