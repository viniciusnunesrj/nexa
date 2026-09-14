import type { Card, Rarity } from '../types';

const RARITY_POWER_BASE: Record<Rarity, number> = {
  Comum: 100, Incomum: 180, Raro: 280, Épico: 420, Lendário: 600, Mítico: 850,
};

/** Display-only derived power. Never writes stats or substitutes missing financial data. */
export function getCardPower(card: Pick<Card, 'rarity' | 'marketValue' | 'synthesisRate'>): number | null {
  const base = RARITY_POWER_BASE[card.rarity];
  if (!Number.isFinite(base) || !Number.isFinite(card.marketValue) ||
      !Number.isFinite(card.synthesisRate)) return null;
  const power = base + card.marketValue + card.synthesisRate * 10;
  return Number.isFinite(power) ? power : null;
}
