import { chooseRiftBattleAiAction, type RiftBattleDifficulty } from './ai';
import { applyRiftBattleAction, initializeRiftBattle } from './battleEngine';
import type { RiftBattleAction, RiftBattleArenaConfig, RiftBattleCard, RiftBattleState } from './types';

/**
 * Pure replay for a server that has obtained both teams and the arena from
 * trusted storage. Never construct these arguments from a client result.
 * The client supplies only its own actions; the server chooses every AI action.
 */
export function replayRiftBattleV2(
  playerCards: readonly RiftBattleCard[],
  opponentCards: readonly RiftBattleCard[],
  arena: RiftBattleArenaConfig,
  difficulty: RiftBattleDifficulty,
  playerActions: readonly RiftBattleAction[],
): RiftBattleState {
  if (!Array.isArray(playerActions) || playerActions.length > 400) {
    throw new Error('Histórico de ações inválido ou longo demais.');
  }
  let state = initializeRiftBattle(playerCards, opponentCards, arena);
  let aiActionsThisTurn = 0;
  let aiTurn = 0;

  const playAi = () => {
    while (state.phase !== 'FINISHED' && state.currentPlayerId === 'PLAYER_TWO') {
      if (state.turn !== aiTurn) {
        aiTurn = state.turn;
        aiActionsThisTurn = 0;
      }
      const action = aiActionsThisTurn >= 10
        ? { type: 'END_TURN' as const, playerId: 'PLAYER_TWO' as const }
        : chooseRiftBattleAiAction(state, 'PLAYER_TWO', difficulty);
      if (!action) throw new Error('IA sem ação em turno ativo.');
      state = applyRiftBattleAction(state, action);
      aiActionsThisTurn += 1;
    }
  };

  for (const action of playerActions) {
    if (state.phase === 'FINISHED' || state.currentPlayerId !== 'PLAYER_ONE'
      || !action || action.playerId !== 'PLAYER_ONE') {
      throw new Error('Ação fora do turno do jogador ou após o resultado.');
    }
    state = applyRiftBattleAction(state, action);
    playAi();
  }
  return state;
}
