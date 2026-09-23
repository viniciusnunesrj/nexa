import type { Card } from '../../types/collections';
import { RIFTBATTLE_V2_CARDS } from './cardCatalog';
import type { RiftBattleCard } from './types';

const catalogByTemplateId = new Map(
  RIFTBATTLE_V2_CARDS.map((card) => [card.id, card] as const),
);

export function isCardEligibleForRiftBattle(card: Card): boolean {
  // Do not hide a known conflicting state behind cardStatus or mapper fallbacks.
  // Marketplace reservations and official template activity are server-only facts.
  return card.state === 'FREE' && card.cardStatus === 'FREE' && card.status === 'IDLE'
    && card.synthesizedAt == null && card.lastAccrualAt == null && card.exhaustedAt == null
    && catalogByTemplateId.has(card.templateId);
}

/**
 * Converte instâncias reais de user_cards para cartas de combate.
 * Os atributos do RiftBattle continuam vindo do catálogo V2; não alteramos
 * os atributos econômicos/originais da carta.
 *
 * Duplicatas são preservadas: cada cópia usa o id real da instância como id
 * de batalha, enquanto templateId mantém o vínculo com a carta oficial.
 */
export function createOwnedRiftBattleCards(cards: readonly Card[]): RiftBattleCard[] {
  return cards
    .filter(isCardEligibleForRiftBattle)
    .map((ownedCard) => {
      const definition = catalogByTemplateId.get(ownedCard.templateId)!;
      return {
        ...definition,
        id: ownedCard.id,
        templateId: ownedCard.templateId,
        sourceInstanceId: ownedCard.id,
        name: ownedCard.name || definition.name,
        rarity: ownedCard.rarity || definition.rarity,
        stats: { ...definition.stats },
        ability: definition.ability ? { ...definition.ability } : undefined,
      };
    });
}
