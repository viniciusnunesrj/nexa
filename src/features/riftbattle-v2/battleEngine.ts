import {
  calculateDamage,
  getMaxEnergyForTurn,
  getPriorityPlayerForTurn,
  } from './rules';
import type {
  RiftBattleAction,
  RiftBattleArenaConfig,
  RiftBattleCard,
  RiftBattleCardStateEntry,
  RiftBattleAbilityId,
  RiftBattlePlayerId,
  RiftBattlePlayerState,
  RiftBattleResult,
  RiftBattleState,
} from './types';
import { RIFTBATTLE_STANDARD_ARENA } from './arenaConfig';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function copyEntry(entry: RiftBattleCardStateEntry): RiftBattleCardStateEntry {
  return {
    ...entry,
    card: {
      ...entry.card,
      stats: { ...entry.card.stats },
      ability: entry.card.ability ? { ...entry.card.ability } : undefined,
    },
  };
}

function copyPlayer(player: RiftBattlePlayerState): RiftBattlePlayerState {
  return {
    ...player,
    cards: player.cards.map(copyEntry),
  };
}

function copyState(state: RiftBattleState): RiftBattleState {
  return {
    ...state,
    players: {
      PLAYER_ONE: copyPlayer(state.players.PLAYER_ONE),
      PLAYER_TWO: copyPlayer(state.players.PLAYER_TWO),
    },
    result: state.result ? { ...state.result } : undefined,
  };
}

function getPlayer(state: RiftBattleState, playerId: RiftBattlePlayerId): RiftBattlePlayerState {
  return state.players[playerId];
}

function getOpponentId(playerId: RiftBattlePlayerId): RiftBattlePlayerId {
  return playerId === 'PLAYER_ONE' ? 'PLAYER_TWO' : 'PLAYER_ONE';
}

function getEntry(player: RiftBattlePlayerState, cardId: string): RiftBattleCardStateEntry {
  const entry = player.cards.find((cardState) => cardState.card.id === cardId);
  assert(entry !== undefined, 'Carta não pertence a este jogador.');
  return entry;
}

function createCardState(card: RiftBattleCard): RiftBattleCardStateEntry {
  return {
    card,
    state: 'RESERVE',
    currentHp: card.stats.hp,
    enteredThisTurn: false,
    hasActedThisTurn: false,
    shieldAvailable: card.ability?.id === 'ESCUDO',
    barrierActive: false,
    repairUsed: false,
    rechargeUsed: false,
    marked: false,
  };
}

export function initializeRiftBattle(
  playerOneCards: readonly RiftBattleCard[],
  playerTwoCards: readonly RiftBattleCard[],
  arena: RiftBattleArenaConfig = RIFTBATTLE_STANDARD_ARENA,
): RiftBattleState {
  assert(playerOneCards.length === arena.teamSize, `Player One deve possuir exatamente ${arena.teamSize} cartas.`);
  assert(playerTwoCards.length === arena.teamSize, `Player Two deve possuir exatamente ${arena.teamSize} cartas.`);
  assert(arena.activeSlots > 0 && arena.activeSlots <= arena.teamSize, 'Configuração de slots ativos inválida.');
  assert(arena.energyByTurn.length > 0, 'A arena precisa definir uma curva de energia.');

  return {
    arena: { ...arena, energyByTurn: [...arena.energyByTurn] },
    turn: 1,
    phase: 'PLAYER_TURN',
    currentPlayerId: 'PLAYER_ONE',
    priorityPlayerId: getPriorityPlayerForTurn(1),
    players: {
      PLAYER_ONE: {
        id: 'PLAYER_ONE',
        cards: playerOneCards.map(createCardState),
        currentEnergy: getMaxEnergyForTurn(1, arena),
        maxEnergy: getMaxEnergyForTurn(1, arena),
      },
      PLAYER_TWO: {
        id: 'PLAYER_TWO',
        cards: playerTwoCards.map(createCardState),
        currentEnergy: getMaxEnergyForTurn(1, arena),
        maxEnergy: getMaxEnergyForTurn(1, arena),
      },
    },
  };
}

function checkWinner(state: RiftBattleState, defeatedPlayerId: RiftBattlePlayerId): void {
  const defeatedPlayer = getPlayer(state, defeatedPlayerId);
  if (!defeatedPlayer.cards.every((entry) => entry.state === 'DEFEATED')) return;

  const winnerId = getOpponentId(defeatedPlayerId);
  const result: RiftBattleResult = {
    winnerId,
    loserId: defeatedPlayerId,
    turn: state.turn,
  };
  state.phase = 'FINISHED';
  state.result = result;
}

function deployCard(state: RiftBattleState, action: Extract<RiftBattleAction, { type: 'DEPLOY_CARD' }>): RiftBattleState {
  assert(state.phase !== 'FINISHED', 'A partida já terminou.');
  assert(action.playerId === state.currentPlayerId, 'Ação do jogador errado.');

  const player = getPlayer(state, action.playerId);
  const entry = getEntry(player, action.cardId);
  assert(entry.state === 'RESERVE', 'A carta não está disponível na reserva.');
  assert(
    player.cards.filter((cardState) => cardState.state === 'ACTIVE').length < state.arena.activeSlots,
    'O jogador já possui o máximo de cartas ativas.',
  );
  assert(player.currentEnergy >= entry.card.deployCost, 'Energia insuficiente para colocar a carta.');

  entry.state = 'ACTIVE';
  entry.enteredThisTurn = true;
  entry.hasActedThisTurn = false;
  entry.shieldAvailable = state.arena.abilitiesEnabled && entry.card.ability?.id === 'ESCUDO';
  // Cartas de custo alto chegam tarde à partida e precisam sobreviver à janela
  // de preparação. Custo 4–5 recebe estabilização de entrada: -2 no primeiro
  // dano sofrido antes do próximo turno do dono, reutilizando BARREIRA.
  entry.barrierActive = entry.card.deployCost >= 4;
  player.currentEnergy -= entry.card.deployCost;
  if (state.arena.abilitiesEnabled && entry.card.ability?.id === 'RECARGA' && !entry.rechargeUsed) {
    entry.rechargeUsed = true;
    player.currentEnergy = Math.min(player.maxEnergy, player.currentEnergy + 1);
  }
  return state;
}

function applyDamage(
  state: RiftBattleState,
  targetOwner: RiftBattlePlayerState,
  target: RiftBattleCardStateEntry,
  baseDamage: number,
): void {
  let damage = baseDamage;
  if (state.arena.abilitiesEnabled && target.shieldAvailable) {
    damage -= 1;
    target.shieldAvailable = false;
  }
  if (target.barrierActive) {
    damage -= 2;
    target.barrierActive = false;
  }
  const hasProtection = state.arena.abilitiesEnabled && targetOwner.cards.some(
    (entry) =>
      entry.card.id !== target.card.id &&
      entry.state === 'ACTIVE' &&
      entry.currentHp > 0 &&
      entry.card.ability?.id === 'PROTECAO',
  );
  if (hasProtection) damage -= 1;
  damage = Math.max(1, damage);
  if (state.arena.abilitiesEnabled && target.marked) {
    damage += 1;
    target.marked = false;
  }
  target.currentHp = Math.max(0, target.currentHp - damage);
}

function validateAttacker(
  state: RiftBattleState,
  playerId: RiftBattlePlayerId,
  cardId: string,
): { player: RiftBattlePlayerState; opponent: RiftBattlePlayerState; attacker: RiftBattleCardStateEntry } {
  const player = getPlayer(state, playerId);
  const opponent = getPlayer(state, getOpponentId(playerId));
  const attacker = getEntry(player, cardId);
  assert(attacker.state === 'ACTIVE' && attacker.currentHp > 0, 'O atacante não está ativo e vivo.');
  assert(!attacker.hasActedThisTurn, 'A carta já agiu neste turno.');
  assert(
    !attacker.enteredThisTurn || (state.arena.abilitiesEnabled && attacker.card.ability?.id === 'INVESTIDA'),
    'A carta recém-colocada não pode agir sem INVESTIDA.',
  );
  if (state.priorityCardId === attacker.card.id) state.priorityCardId = undefined;
  return { player, opponent, attacker };
}

function getTarget(opponent: RiftBattlePlayerState, targetCardId: string): RiftBattleCardStateEntry {
  const target = getEntry(opponent, targetCardId);
  assert(target.state === 'ACTIVE' && target.currentHp > 0, 'O alvo não está ativo e vivo.');
  return target;
}

function finishAttack(
  state: RiftBattleState,
  opponent: RiftBattlePlayerState,
  attacker: RiftBattleCardStateEntry,
  target: RiftBattleCardStateEntry,
  baseDamage: number,
): RiftBattleState {
  applyDamage(state, opponent, target, baseDamage);
  attacker.hasActedThisTurn = true;
  if (target.currentHp === 0) {
    target.state = 'DEFEATED';
    target.enteredThisTurn = false;
    target.hasActedThisTurn = true;
    target.barrierActive = false;
    target.marked = false;
  }
  checkWinner(state, opponent.id);
  return state;
}

function attack(state: RiftBattleState, action: Extract<RiftBattleAction, { type: 'ATTACK' }>): RiftBattleState {
  assert(state.phase !== 'FINISHED', 'A partida já terminou.');
  assert(action.playerId === state.currentPlayerId, 'Ação do jogador errado.');

  const { opponent, attacker } = validateAttacker(state, action.playerId, action.attackerId);
  const target = getTarget(opponent, action.targetId);
  return finishAttack(
    state,
    opponent,
    attacker,
    target,
    calculateDamage(attacker.card.stats.attack, target.card.stats.defense),
  );
}

function useAbility(
  state: RiftBattleState,
  action: Extract<RiftBattleAction, { type: 'USE_ABILITY' }>,
): RiftBattleState {
  assert(state.phase !== 'FINISHED', 'A partida já terminou.');
  assert(action.playerId === state.currentPlayerId, 'Ação do jogador errado.');
  const { player, opponent, attacker } = validateAttacker(state, action.playerId, action.cardId);
  assert(state.arena.abilitiesEnabled, 'Habilidades estão desativadas nesta arena.');
  assert(attacker.card.ability?.id === action.abilityId, 'A carta não possui essa habilidade.');

  if (action.abilityId === 'BARREIRA') {
    assert(action.targetCardId === undefined, 'BARREIRA não aceita alvo.');
    assert(player.currentEnergy >= 1, 'Energia insuficiente para usar BARREIRA.');
    player.currentEnergy -= 1;
    attacker.barrierActive = true;
    attacker.hasActedThisTurn = true;
    return state;
  }

  if (action.abilityId === 'REPARO') {
    assert(action.targetCardId === undefined, 'REPARO não aceita alvo.');
    assert(attacker.currentHp < attacker.card.stats.hp, 'A carta já está com HP máximo.');
    assert(!attacker.repairUsed, 'REPARO já foi usado por esta carta.');
    assert(player.currentEnergy >= 1, 'Energia insuficiente para usar REPARO.');
    player.currentEnergy -= 1;
    attacker.currentHp = Math.min(attacker.card.stats.hp, attacker.currentHp + 2);
    attacker.repairUsed = true;
    attacker.hasActedThisTurn = true;
    return state;
  }

  if (action.abilityId === 'IMPULSO') {
    assert(action.targetCardId !== undefined, 'IMPULSO exige uma carta aliada como alvo.');
    assert(player.currentEnergy >= 1, 'Energia insuficiente para usar IMPULSO.');
    const target = getEntry(player, action.targetCardId);
    assert(target.state === 'ACTIVE' && target.currentHp > 0, 'O alvo de IMPULSO não está ativo e vivo.');
    player.currentEnergy -= 1;
    state.priorityCardId = target.card.id;
    attacker.hasActedThisTurn = true;
    return state;
  }

  if (action.abilityId === 'MARCA') {
    assert(action.targetCardId !== undefined, 'MARCA exige um alvo.');
    assert(player.currentEnergy >= 1, 'Energia insuficiente para usar MARCA.');
    const target = getTarget(opponent, action.targetCardId);
    player.currentEnergy -= 1;
    target.marked = true;
    attacker.hasActedThisTurn = true;
    return state;
  }

  assert(
    action.abilityId === 'RUPTURA' || action.abilityId === 'SOBRECARGA',
    'Essa habilidade ainda não possui comportamento implementado.',
  );
  assert(action.targetCardId !== undefined, 'A habilidade exige um alvo.');
  assert(player.currentEnergy >= 1, 'Energia insuficiente para usar a habilidade.');
  player.currentEnergy -= 1;
  const target = getTarget(opponent, action.targetCardId);
  const attackValue =
    action.abilityId === 'RUPTURA' ? attacker.card.stats.attack : attacker.card.stats.attack + 2;
  const baseDamage =
    action.abilityId === 'RUPTURA'
      ? Math.max(1, attackValue)
      : calculateDamage(attackValue, target.card.stats.defense);
  return finishAttack(state, opponent, attacker, target, baseDamage);
}

function endTurn(state: RiftBattleState, action: Extract<RiftBattleAction, { type: 'END_TURN' }>): RiftBattleState {
  assert(state.phase !== 'FINISHED', 'A partida já terminou.');
  assert(action.playerId === state.currentPlayerId, 'Ação do jogador errado.');

  const nextPlayerId = getOpponentId(state.currentPlayerId);
  const nextPlayer = getPlayer(state, nextPlayerId);
  const nextTurn = nextPlayerId === 'PLAYER_ONE' ? state.turn + 1 : state.turn;
  const maxEnergy = getMaxEnergyForTurn(nextTurn, state.arena);

  nextPlayer.currentEnergy = maxEnergy;
  nextPlayer.maxEnergy = maxEnergy;
  nextPlayer.cards.forEach((entry) => {
    if (entry.state === 'ACTIVE') {
      entry.enteredThisTurn = false;
      entry.hasActedThisTurn = false;
      entry.barrierActive = false;
    }
  });

  state.priorityCardId = undefined;
  state.turn = nextTurn;
  state.currentPlayerId = nextPlayerId;
  state.priorityPlayerId = getPriorityPlayerForTurn(nextTurn);
  return state;
}

export function applyRiftBattleAction(
  state: RiftBattleState,
  action: RiftBattleAction,
): RiftBattleState {
  const nextState = copyState(state);

  switch (action.type) {
    case 'DEPLOY_CARD':
      return deployCard(nextState, action);
    case 'ATTACK':
      return attack(nextState, action);
    case 'USE_ABILITY':
      return useAbility(nextState, action);
    case 'END_TURN':
      return endTurn(nextState, action);
    default:
      return nextState;
  }
}
