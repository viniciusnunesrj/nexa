import { calculateDamage } from './rules';
import type {
  RiftBattleAction,
  RiftBattleCardStateEntry,
  RiftBattleState,
} from './types';

const PASSIVE_ABILITIES = new Set(['INVESTIDA', 'ESCUDO', 'PROTECAO', 'RECARGA']);
const ACTIVE_ABILITIES = new Set(['BARREIRA', 'REPARO', 'RUPTURA', 'IMPULSO', 'SOBRECARGA', 'MARCA']);
export type RiftBattleDifficulty = 'RECRUTA' | 'OPERADOR' | 'NEXUS';

function getOpponentId(playerId: 'PLAYER_ONE' | 'PLAYER_TWO'): 'PLAYER_ONE' | 'PLAYER_TWO' {
  return playerId === 'PLAYER_ONE' ? 'PLAYER_TWO' : 'PLAYER_ONE';
}

function canAct(entry: RiftBattleCardStateEntry, abilitiesEnabled: boolean): boolean {
  return (
    entry.state === 'ACTIVE' &&
    entry.currentHp > 0 &&
    !entry.hasActedThisTurn &&
    (!entry.enteredThisTurn || (abilitiesEnabled && entry.card.ability?.id === 'INVESTIDA'))
  );
}

function activeCards(state: RiftBattleState, playerId: 'PLAYER_ONE' | 'PLAYER_TWO') {
  return state.players[playerId].cards.filter((entry) => entry.state === 'ACTIVE' && entry.currentHp > 0);
}

function chooseTarget(
  attacker: RiftBattleCardStateEntry,
  targets: RiftBattleCardStateEntry[],
): RiftBattleCardStateEntry | undefined {
  return [...targets].sort((left, right) => {
    const leftCanDefeat = calculateDamage(attacker.card.stats.attack, left.card.stats.defense) >= left.currentHp;
    const rightCanDefeat = calculateDamage(attacker.card.stats.attack, right.card.stats.defense) >= right.currentHp;
    if (leftCanDefeat !== rightCanDefeat) return leftCanDefeat ? -1 : 1;
    if (left.currentHp !== right.currentHp) return left.currentHp - right.currentHp;
    if (left.card.stats.defense !== right.card.stats.defense) return left.card.stats.defense - right.card.stats.defense;
    return left.card.id.localeCompare(right.card.id);
  })[0];
}

export function chooseRiftBattleAiAction(
  state: RiftBattleState,
  aiPlayerId: 'PLAYER_ONE' | 'PLAYER_TWO',
  difficulty: RiftBattleDifficulty = 'OPERADOR',
): RiftBattleAction | null {
  if (state.phase === 'FINISHED' || state.currentPlayerId !== aiPlayerId) return null;

  const player = state.players[aiPlayerId];
  const opponentId = getOpponentId(aiPlayerId);
  const enemies = activeCards(state, opponentId);
  const allies = activeCards(state, aiPlayerId);
  const available = player.cards.filter((entry) => canAct(entry, state.arena.abilitiesEnabled));

  if (difficulty === 'RECRUTA') {
    const deployable = player.cards.find((entry) => entry.state === 'RESERVE' && player.currentEnergy >= entry.card.deployCost);
    if (allies.length < state.arena.activeSlots && deployable) {
      return { type: 'DEPLOY_CARD', playerId: aiPlayerId, cardId: deployable.card.id };
    }
    const firstAttacker = available[0];
    const firstTarget = firstAttacker ? enemies[0] : undefined;
    if (firstAttacker && firstTarget) {
      return { type: 'ATTACK', playerId: aiPlayerId, attackerId: firstAttacker.card.id, targetId: firstTarget.card.id };
    }
    return { type: 'END_TURN', playerId: aiPlayerId };
  }

  if (state.arena.abilitiesEnabled) for (const entry of available) {
    const abilityId = entry.card.ability?.id;
    if (abilityId === 'REPARO' && entry.currentHp < entry.card.stats.hp && !entry.repairUsed && player.currentEnergy >= 1) {
      return { type: 'USE_ABILITY', playerId: aiPlayerId, cardId: entry.card.id, abilityId };
    }
  }

  if (state.arena.abilitiesEnabled)for (const entry of available) {
    const abilityId = entry.card.ability?.id;
    if (!abilityId || PASSIVE_ABILITIES.has(abilityId) || !ACTIVE_ABILITIES.has(abilityId)) continue;

    if (abilityId === 'RUPTURA' || abilityId === 'SOBRECARGA' || abilityId === 'MARCA') {
      const target = chooseTarget(entry, enemies);
      if (target && player.currentEnergy >= 1) {
        return { type: 'USE_ABILITY', playerId: aiPlayerId, cardId: entry.card.id, abilityId, targetCardId: target.card.id };
      }
    }

    if (abilityId === 'IMPULSO') {
      const target = allies.find((ally) => ally.card.id !== entry.card.id && !ally.hasActedThisTurn);
      if (target && player.currentEnergy >= 1) {
        return { type: 'USE_ABILITY', playerId: aiPlayerId, cardId: entry.card.id, abilityId, targetCardId: target.card.id };
      }
    }
  }

  for (const entry of available) {
    const target = chooseTarget(entry, enemies);
    if (target) {
      return { type: 'ATTACK', playerId: aiPlayerId, attackerId: entry.card.id, targetId: target.card.id };
    }
  }

  if (state.arena.abilitiesEnabled) for (const entry of available) {
    if (entry.card.ability?.id === 'BARREIRA' && player.currentEnergy >= 1 && !entry.barrierActive) {
      return { type: 'USE_ABILITY', playerId: aiPlayerId, cardId: entry.card.id, abilityId: 'BARREIRA' };
    }
  }

  if (allies.length < state.arena.activeSlots) {
    const deployable = player.cards
      .filter((entry) => entry.state === 'RESERVE' && player.currentEnergy >= entry.card.deployCost)
      .sort((left, right) => right.card.deployCost - left.card.deployCost || right.card.stats.hp - left.card.stats.hp || left.card.id.localeCompare(right.card.id));
    if (deployable[0]) {
      return { type: 'DEPLOY_CARD', playerId: aiPlayerId, cardId: deployable[0].card.id };
    }
  }

  return { type: 'END_TURN', playerId: aiPlayerId };
}
