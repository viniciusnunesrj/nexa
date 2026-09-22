export type RiftBattleArchetype =
  | 'ASSAULT'
  | 'TANK'
  | 'SPEED'
  | 'SUPPORT'
  | 'BALANCED';

export type RiftBattleAbilityId =
  | 'INVESTIDA'
  | 'ESCUDO'
  | 'REPARO'
  | 'RUPTURA'
  | 'PROTECAO'
  | 'IMPULSO'
  | 'SOBRECARGA'
  | 'RECARGA'
  | 'MARCA'
  | 'BARREIRA';

export interface RiftBattleStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface RiftBattleAbility {
  id: RiftBattleAbilityId;
  name: string;
  description: string;
  energyCost?: number;
}

export interface RiftBattleCard {
  id: string;
  name: string;
  rarity: string;
  archetype: RiftBattleArchetype;
  stats: RiftBattleStats;
  deployCost: number;
  ability?: RiftBattleAbility;
}

export type RiftBattleCardState =
  | 'RESERVE'
  | 'ACTIVE'
  | 'DEFEATED';

export interface RiftBattleCardStateEntry {
  card: RiftBattleCard;
  state: RiftBattleCardState;
  currentHp: number;
  enteredThisTurn: boolean;
  hasActedThisTurn: boolean;
  shieldAvailable: boolean;
  barrierActive: boolean;
  repairUsed: boolean;
  rechargeUsed: boolean;
  marked: boolean;
}

export type RiftBattlePlayerId = 'PLAYER_ONE' | 'PLAYER_TWO';

export interface RiftBattlePlayerState {
  id: RiftBattlePlayerId;
  cards: RiftBattleCardStateEntry[];
  currentEnergy: number;
  maxEnergy: number;
}

export type RiftBattlePhase =
  | 'SETUP'
  | 'PLAYER_TURN'
  | 'RESOLVING'
  | 'FINISHED';

export type RiftBattleAction =
  | {
      type: 'DEPLOY_CARD';
      playerId: RiftBattlePlayerId;
      cardId: string;
    }
  | {
      type: 'ATTACK';
      playerId: RiftBattlePlayerId;
      attackerId: string;
      targetId: string;
    }
  | {
      type: 'USE_ABILITY';
      playerId: RiftBattlePlayerId;
      cardId: string;
      abilityId: RiftBattleAbilityId;
      targetCardId?: string;
    }
  | {
      type: 'END_TURN';
      playerId: RiftBattlePlayerId;
    };

export interface RiftBattleState {
  turn: number;
  phase: RiftBattlePhase;
  currentPlayerId: RiftBattlePlayerId;
  priorityPlayerId: RiftBattlePlayerId;
  priorityCardId?: string;
  players: Record<RiftBattlePlayerId, RiftBattlePlayerState>;
  result?: RiftBattleResult;
}

export interface RiftBattleResult {
  winnerId: RiftBattlePlayerId | null;
  loserId: RiftBattlePlayerId | null;
  turn: number;
}
