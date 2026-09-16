import { GENERATED_CARD_ART } from './cardArt.generated';

type CardArtCollection =
  | 'guardians'
  | 'dragons'
  | 'knights'
  | 'abyss'
  | 'mages'
  | 'gods'
  | 'cosmic'
  | 'hunters';

const buildCollectionArt = (
  collection: CardArtCollection,
  templateIds: readonly string[],
): Record<string, string> =>
  Object.fromEntries(
    templateIds.map((templateId) => [
      templateId,
      `/assets/cards/${collection}/${templateId}-v1.webp`,
    ]),
  );

// Planned artwork. Useful as the canonical artwork manifest,
// but these paths are not activated until the files actually exist.
export const GUARDIANS_ART_PLANNED: Readonly<Record<string, string>> = Object.freeze(
  buildCollectionArt('guardians', [
    'card-flame-guardian',
    'card-ice-guardian',
    'card-storm-guardian',
    'card-abyss-guardian',
  ]),
);

// Generated automatically from the artwork physically present
// under /public/assets/cards.
export const CARD_ART: Readonly<Record<string, string>> = Object.freeze({
  ...GENERATED_CARD_ART,
});

export const CARD_PLACEHOLDER = '/assets/cards/placeholders/card-v1.svg';