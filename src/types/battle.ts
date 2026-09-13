import { NexaUser } from './user';

export interface BattleCombatantSnapshot {
  position: number;
  id: string;
  name: string;
  rarity: string;
  attack: number;
  defense: number;
  speed: number;
  maxHp: number;
  hp: number;
  leader?: boolean;
  templateId?: string;
}

export interface BattleEvent {
  round: number;
  attackerSide: 'PLAYER' | 'NPC';
  attackerId: string;
  defenderId: string;
  defenderHpBefore: number;
  defenderHpAfter: number;
  damage: number;
  defeated: boolean;
}

export interface BattleRewards {
  success: boolean;
  outcome: 'VICTORY' | 'DEFEAT' | 'DRAW';
  xpGained: number;
  nexGained: number;
  nxaGained: number;
  levelUps: number;
  balanceNex?: number;
  balanceNxa?: number;
  experience?: number;
  level?: number;
  resultingProfile?: NexaUser;
}

export interface BattleRunResult {
  success: boolean;
  idempotent: boolean;
  run_id: string;
  formula_version: string;
  rng_seed: string | number;
  outcome: 'VICTORY' | 'DEFEAT' | 'DRAW';
  rounds: number;
  events: BattleEvent[];
  playerTeam: BattleCombatantSnapshot[];
  enemyTeam: BattleCombatantSnapshot[];
  rewards: BattleRewards;
  drops: unknown[];
}
