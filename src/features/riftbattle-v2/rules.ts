import type { RiftBattlePlayerId } from './types';

export const RIFTBATTLE_TEAM_SIZE = 4;
export const RIFTBATTLE_ACTIVE_SLOTS = 2;

export const RIFTBATTLE_MIN_HP = 8;
export const RIFTBATTLE_MAX_HP = 17;
export const RIFTBATTLE_MIN_ATTACK = 2;
export const RIFTBATTLE_MAX_ATTACK = 8;
export const RIFTBATTLE_MIN_DEFENSE = 0;
export const RIFTBATTLE_MAX_DEFENSE = 5;
export const RIFTBATTLE_MIN_SPEED = 1;
export const RIFTBATTLE_MAX_SPEED = 5;
export const RIFTBATTLE_MIN_DEPLOY_COST = 1;
export const RIFTBATTLE_MAX_DEPLOY_COST = 5;

export function getMaxEnergyForTurn(turn: number): number {
  if (turn <= 1) return 3;
  if (turn === 2) return 4;
  if (turn === 3) return 5;
  return 6;
}

export function calculateDamage(attack: number, defense: number): number {
  return Math.max(1, attack - Math.floor(defense / 2));
}

export function isValidHp(value: number): boolean {
  return value >= RIFTBATTLE_MIN_HP && value <= RIFTBATTLE_MAX_HP;
}

export function isValidAttack(value: number): boolean {
  return value >= RIFTBATTLE_MIN_ATTACK && value <= RIFTBATTLE_MAX_ATTACK;
}

export function isValidDefense(value: number): boolean {
  return value >= RIFTBATTLE_MIN_DEFENSE && value <= RIFTBATTLE_MAX_DEFENSE;
}

export function isValidSpeed(value: number): boolean {
  return value >= RIFTBATTLE_MIN_SPEED && value <= RIFTBATTLE_MAX_SPEED;
}

export function isValidDeployCost(value: number): boolean {
  return (
    value >= RIFTBATTLE_MIN_DEPLOY_COST &&
    value <= RIFTBATTLE_MAX_DEPLOY_COST
  );
}

export function getPriorityPlayerForTurn(
  turn: number,
  startingPlayer: RiftBattlePlayerId = 'PLAYER_ONE',
): RiftBattlePlayerId {
  if (turn % 2 === 1) return startingPlayer;
  return startingPlayer === 'PLAYER_ONE' ? 'PLAYER_TWO' : 'PLAYER_ONE';
}
