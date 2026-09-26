import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeRiftBattle, applyRiftBattleAction } from '../src/features/riftbattle-v2/battleEngine';
import type { RiftBattleCard, RiftBattleState } from '../src/features/riftbattle-v2/types';
import { isCardPreparing } from '../src/pages/riftBattleCardPresentation';

const card = (id: string, rush = false): RiftBattleCard => ({
  id, name: id, rarity: 'Comum', archetype: 'BALANCED', deployCost: 1,
  stats: { hp: 100, attack: 2, defense: 0, speed: 1 },
  ...(rush ? { ability: { id: 'INVESTIDA' as const, name: 'INVESTIDA', description: '' } } : {}),
});
function setup(abilitiesEnabled = true) {
  let state = initializeRiftBattle(
    [card('rush', true), card('normal'), card('other'), card('reserve')],
    [card('target'), card('enemy2'), card('enemy3'), card('enemy4')],
    { id: 'synthetic', name: 'synthetic', teamSize: 4, activeSlots: 3, abilitiesEnabled, energyByTurn: [20], ruleset: abilitiesEnabled ? 'STANDARD' : 'PURE' },
  );
  state = endTurn(state);
  state = applyRiftBattleAction(state, { type: 'DEPLOY_CARD', playerId: 'PLAYER_TWO', cardId: 'target' });
  return endTurn(state);
}
const endTurn = (state: RiftBattleState) => applyRiftBattleAction(state, { type: 'END_TURN', playerId: state.currentPlayerId });
const deploy = (state: RiftBattleState, cardId: string) => applyRiftBattleAction(state, { type: 'DEPLOY_CARD', playerId: 'PLAYER_ONE', cardId });
const attack = (state: RiftBattleState, attackerId: string) => applyRiftBattleAction(state, { type: 'ATTACK', playerId: 'PLAYER_ONE', attackerId, targetId: 'target' });
const entry = (state: RiftBattleState, id: string) => state.players.PLAYER_ONE.cards.find(item => item.card.id === id)!;
const preparing = (state: RiftBattleState, id: string) => isCardPreparing(entry(state, id), state.arena.abilitiesEnabled);

test('badge follows actual attack eligibility, attack usage and owner-turn reset', () => {
  let state = deploy(deploy(setup(), 'rush'), 'normal');
  assert.equal(preparing(state, 'rush'), false);
  assert.equal(preparing(state, 'normal'), true);
  assert.throws(() => attack(state, 'normal'), /sem INVESTIDA/);
  state = attack(state, 'rush');
  assert.equal(entry(state, 'rush').enteredThisTurn, true, 'entry flag remains after attack');
  assert.equal(entry(state, 'rush').hasActedThisTurn, true);
  assert.equal(preparing(state, 'rush'), false, 'used action is not preparation');
  assert.equal(preparing(state, 'normal'), true, 'another card attacking cannot clear preparation');
  state = endTurn(state);
  assert.equal(preparing(state, 'normal'), true, 'waits until its owner turn');
  state = endTurn(state);
  assert.equal(preparing(state, 'normal'), false);
  state = attack(state, 'normal');
  assert.equal(preparing(state, 'normal'), false);
  state = deploy(state, 'other');
  assert.equal(preparing(state, 'other'), true);
  assert.equal(preparing(state, 'normal'), false, 'selecting another entry cannot retain stale preparation');
  assert.equal(preparing(state, 'reserve'), false);
  assert.throws(() => attack(state, 'other'), /sem INVESTIDA/);
  state = endTurn(endTurn(state));
  assert.equal(preparing(state, 'other'), false);
  state = attack(state, 'other');
  assert.equal(entry(state, 'other').hasActedThisTurn, true);
  assert.equal(preparing(state, 'other'), false);
});

test('INVESTIDA still prepares when abilities are disabled in the arena', () => {
  let state = deploy(setup(false), 'rush');
  assert.equal(preparing(state, 'rush'), true);
  assert.throws(() => attack(state, 'rush'), /sem INVESTIDA/);
  state = endTurn(endTurn(state));
  assert.equal(preparing(state, 'rush'), false);
  assert.doesNotThrow(() => attack(state, 'rush'));
});
