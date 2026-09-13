// Planned SETOR 6B artwork. Activate in CARD_ART only after the real files exist.
export const GUARDIANS_ART_PLANNED: Readonly<Record<string, string>> = Object.freeze({
  'card-flame-guardian': '/assets/cards/guardians/card-flame-guardian-v1.webp',
  'card-ice-guardian': '/assets/cards/guardians/card-ice-guardian-v1.webp',
  'card-storm-guardian': '/assets/cards/guardians/card-storm-guardian-v1.webp',
  'card-abyss-guardian': '/assets/cards/guardians/card-abyss-guardian-v1.webp',
});

// Register only existing, versioned artwork here. Keys are stable templateIds.
export const CARD_ART: Readonly<Record<string, string>> = Object.freeze({});
export const CARD_PLACEHOLDER = '/assets/cards/placeholders/card-v1.svg';
