// Exercise the actual executeBattle handler with isolated UI/service dependencies.
// No network or persistent storage. Extract the handler instead of copying its logic.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = ts.createSourceFile('GameStateContext.tsx',
  readFileSync(new URL('../src/contexts/GameStateContext.tsx', import.meta.url), 'utf8'),
  ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'executeBattle') handler = node.initializer;
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(handler);
const compiled = ts.transpileModule(`const executeBattle = ${handler.getText(source)};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

const user = { id: 'isolated-test', username: 'Test', level: 5 };
const pendingBattles = { current: new Set() };
let online = true;
let outcome = { ...user };
let apply = async () => outcome;
const modal = [];
let ledgerCalls = 0;
let boxCalls = 0;
const dependencies = {
  user, pendingBattles, assets: [],
  setLevelUpData: value => modal.push(value),
  isSupabaseConfigured: () => online,
  RewardService: { calculateBattleRewards: () => ({ xpGained: 150, nexGained: 100,
    nxaGained: 10, droppedItem: null, droppedBoxType: 'BASIC' }) },
  EconomyService: { applyBattleReward: (...args) => apply(...args) },
  syncUser: profile => assert.equal('levelUpResult' in profile, false),
  BoxService: { getAvailableBoxes: () => [], getBoxCounts: () => ({}),
    grantBox: () => { boxCalls++; return { boxType: 'BASIC' }; } },
  LedgerService: { recordEntry: () => { ledgerCalls++; return {}; } },
  setBoxes: () => {}, setBoxCounts: () => {}, setAssets: () => {}, setLedger: () => {},
  localStorage: { getItem: () => null }, ASSETS_KEY: 'test-assets',
  soundService: { playMythicDrop: () => {} },
};
const executeBattle = new Function(...Object.keys(dependencies), compiled + '\nreturn executeBattle;')(
  ...Object.values(dependencies));
const levelUpResult = { leveledUp: true, previousLevel: 5, newLevel: 6, rewardsGranted: [] };
const warnings = [];
const originalWarn = console.warn;
console.warn = (...args) => warnings.push(args);
try {
  // A prior modal is cleared even when this battle does not level up.
  modal.push(levelUpResult);
  const noLevel = await executeBattle('character');
  assert.equal(modal.at(-1), null);
  assert.equal(noLevel.droppedBox, null);
  assert.equal(noLevel.droppedBoxType, null);

  // Old local results, mismatched profiles and non-empty rewards never open online.
  for (const result of [levelUpResult,
    { ...levelUpResult, confirmedOnline: true, newLevel: 7 },
    { ...levelUpResult, confirmedOnline: true, rewardsGranted: [{ name: 'Caixa Básica' }] }]) {
    outcome = { ...user, level: 6, levelUpResult: result };
    const count = modal.length;
    await executeBattle('character');
    assert.deepEqual(modal.slice(count), [null]);
  }
  outcome = { ...user, level: 6, levelUpResult: { ...levelUpResult, confirmedOnline: true } };
  await executeBattle('character');
  assert.equal(modal.at(-1), outcome.levelUpResult);
  assert.equal(ledgerCalls, 0);
  assert.equal(boxCalls, 0);
  assert.equal(warnings.length, 5);

  // Concurrent clicks are blocked; errors clear both the old modal and the lock.
  let rejectBattle;
  apply = () => new Promise((_, reject) => { rejectBattle = reject; });
  const failed = executeBattle('character');
  await assert.rejects(executeBattle('character'), /andamento/);
  rejectBattle(new Error('RPC rejected'));
  await assert.rejects(failed, /RPC rejected/);
  assert.equal(modal.at(-1), null);
  assert.equal(pendingBattles.current.size, 0);
  apply = async () => ({ ...user });
  await executeBattle('character');
  assert.equal(pendingBattles.current.size, 0);

  online = false;
  outcome = { ...user, level: 6, levelUpResult };
  apply = async () => outcome;
  const offline = await executeBattle('character');
  assert.equal(modal.at(-1), levelUpResult);
  assert.equal(ledgerCalls, 1);
  assert.equal(boxCalls, 1);
  assert.equal(offline.droppedBox.boxType, 'BASIC');
} finally {
  console.warn = originalWarn;
}
console.log('PASS: fresh confirmed modal only, no online ledger/box writes, lock cleanup, offline preserved');
