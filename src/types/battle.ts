export interface BattleRunResult {
  success: boolean;
  idempotent: boolean;
  run_id: string;
  formula_version: string;
  rng_seed: string | number;
  outcome: 'VICTORY' | 'DEFEAT' | 'DRAW';
  rounds: number;
  events: Array<{
    round: number;
    attacker_side: 'PLAYER' | 'NPC';
    attacker_id: string;
    defender_id: string;
    damage: number;
    defender_hp_after: number;
  }>;
  player_snapshot: unknown[];
  npc_snapshot: unknown[];
  rewards: {
    success: boolean;
    outcome: 'VICTORY' | 'DEFEAT' | 'DRAW';
    xp_gained: number;
    nex_gained: number;
    nxa_gained: number;
    level_ups: number;
    balance_nex?: number;
    balance_nxa?: number;
    experience?: number;
    level?: number;
  };
  drops: unknown[];
}
