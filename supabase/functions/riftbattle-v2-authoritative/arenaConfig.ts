import type { RiftBattleArenaConfig } from './types.ts';

export const RIFTBATTLE_STANDARD_ARENA: RiftBattleArenaConfig = {
  id: 'rift-standard',
  name: 'Rift Padrão',
  teamSize: 4,
  activeSlots: 2,
  abilitiesEnabled: true,
  energyByTurn: [3, 4, 5, 6],
  ruleset: 'STANDARD',
};

export const RIFTBATTLE_PURE_ARENA: RiftBattleArenaConfig = {
  id: 'rift-pure',
  name: 'Rift Puro',
  teamSize: 4,
  activeSlots: 2,
  abilitiesEnabled: false,
  energyByTurn: [3, 4, 5, 6],
  ruleset: 'PURE',
};


export const RIFTBATTLE_EXPANSION_ARENA: RiftBattleArenaConfig = {
  id: 'rift-expansion',
  name: 'Rift Expansão',
  teamSize: 6,
  activeSlots: 3,
  abilitiesEnabled: true,
  energyByTurn: [4, 5, 6, 7],
  ruleset: 'STANDARD',
};


export const RIFTBATTLE_WAR_ARENA: RiftBattleArenaConfig = {
  id: 'rift-war',
  name: 'Rift Guerra',
  teamSize: 8,
  activeSlots: 4,
  abilitiesEnabled: true,
  energyByTurn: [5, 6, 7, 8],
  ruleset: 'STANDARD',
};

export const RIFTBATTLE_ARENAS: readonly RiftBattleArenaConfig[] = [
  RIFTBATTLE_STANDARD_ARENA,
  RIFTBATTLE_PURE_ARENA,
  RIFTBATTLE_EXPANSION_ARENA,
  RIFTBATTLE_WAR_ARENA,
];

export function getRiftBattleArena(id: string): RiftBattleArenaConfig {
  return RIFTBATTLE_ARENAS.find((arena) => arena.id === id) ?? RIFTBATTLE_STANDARD_ARENA;
}
