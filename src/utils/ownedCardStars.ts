import type { Card } from '../types/collections';

// Rift identifies an instance; Duel decks identify templates only.
// Legacy duplicates use the highest owned ascension for template-only presentation.
export function ownedCardStarLevel(cards: readonly Pick<Card, 'id' | 'templateId' | 'starLevel'>[], instanceId?: string, templateId?: string): number {
  if (instanceId) return cards.find(card => card.id === instanceId)?.starLevel ?? 1;
  return cards.reduce((level, card) => card.templateId === templateId ? Math.max(level, card.starLevel ?? 1) : level, 1);
}
