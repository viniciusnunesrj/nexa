import type { Card, NexaAsset } from '../../types';

export const STAR_REQUIREMENTS = {
  1: { fragments: 25, nex: 100 },
  2: { fragments: 50, nex: 250 },
  3: { fragments: 75, nex: 500 },
  4: { fragments: 100, nex: 1000 },
} as const;

export function starRequirement(stars: number) {
  return STAR_REQUIREMENTS[stars as keyof typeof STAR_REQUIREMENTS] ?? null;
}

// Only known client fields. Hidden reservations are always rechecked by the RPC.
export function isStarEligible(asset: NexaAsset, ownerId: string): asset is Card {
  return asset.type === 'Card' && asset.ownerId === ownerId && asset.state === 'FREE'
    && asset.cardStatus === 'FREE' && asset.status === 'IDLE' && !asset.isEquipped
    && asset.tradeable === true && asset.synthesizable === true
    && asset.synthesizedAt == null && asset.synthesisStartedAt == null
    && asset.lastAccrualAt == null && asset.exhaustedAt == null;
}

export function starUpgradeParams(mainId: string, requestId: string) {
  if (typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(requestId)) throw new Error('Identificador da Ascensão inválido.');
  const validId = (id: unknown): id is string => typeof id === 'string' && id.length > 0 && id.length <= 200;
  if (!validId(mainId)) {
    throw new Error('Selecione uma carta principal válida.');
  }
  return { p_request_id: requestId, p_main_card_id: mainId, p_material_ids: [] as string[] };
}
