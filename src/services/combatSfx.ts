import type { SfxName } from './sfxPalette';

// Presentation phases only; these helpers never calculate combat outcomes.
export function riftCombatCue(phase?: string, defeated = false, damaged = true): SfxName | undefined {
  if (phase === 'PREPARE') return 'confirm';
  if (phase === 'ATTACK') return 'attack';
  if (phase === 'IMPACT') return damaged ? 'impact' : 'resolve';
  if (phase === 'RECOVER' && defeated) return 'destroy';
}

export function duelCombatCue(phase: string, damage: number): SfxName | undefined {
  if (phase === 'LOCK') return 'confirm';
  if (phase === 'REVEAL') return 'reveal';
  if (phase === 'IMPACT') return damage > 0 ? 'attack' : undefined;
  if (phase === 'DAMAGE') return damage > 0 ? 'impact' : 'resolve';
}

export function pvpCombatCue(step: number, damage: number): SfxName | undefined {
  if (step === 3) return 'reveal';
  if (step === 5) return damage > 0 ? 'attack' : undefined;
  if (step === 6) return damage > 0 ? 'impact' : 'resolve';
}
