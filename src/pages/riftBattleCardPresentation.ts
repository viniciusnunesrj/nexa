import type { RiftBattleCardStateEntry } from '../features/riftbattle-v2/types';

// Presentation only: mirror the preparation restriction in validateAttacker.
// enteredThisTurn records entry even when INVESTIDA permits immediate action.
export function isCardPreparing(entry: RiftBattleCardStateEntry, abilitiesEnabled: boolean): boolean {
  return entry.state === 'ACTIVE' && entry.enteredThisTurn
    && !(abilitiesEnabled && entry.card.ability?.id === 'INVESTIDA');
}
