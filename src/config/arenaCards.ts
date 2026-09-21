export interface ArenaCard {
  id: string;
  name: string;
  element: string;
  rarity: string;
  attack: number;
  health: number;
  energyCost: number;
  power: number;
  damage: number;
  description: string;
  starter?: boolean;
  ability?: string;
  abilityKind?: 'IMPULSO' | 'DRENO' | 'BLINDAGEM' | 'ECO';
}

export const ARENA_CARDS: ArenaCard[] = [
  { id: 'card-knight-blade', name: 'Cavaleiro da Lâmina', element: 'Luz', rarity: 'Comum', attack: 6, health: 4, energyCost: 2, power: 6, damage: 3, description: 'Cavaleiro da Lâmina.', ability: 'IMPULSO', abilityKind: 'IMPULSO', starter: true },
  { id: 'card-mage-ice', name: 'Mago do Gelo', element: 'Gelo', rarity: 'Comum', attack: 5, health: 8, energyCost: 3, power: 5, damage: 3, description: 'Mago do Gelo.', ability: 'BLINDAGEM', abilityKind: 'BLINDAGEM', starter: true },
  { id: 'card-hunter-novice', name: 'Caçador Novato', element: 'Natureza', rarity: 'Comum', attack: 6, health: 4, energyCost: 3, power: 6, damage: 3, description: 'Caçador Novato.', ability: 'DRENO', abilityKind: 'DRENO', starter: true },
  { id: 'card-abyss-devourer', name: 'Devorador', element: 'Abismo', rarity: 'Comum', attack: 5, health: 9, energyCost: 4, power: 5, damage: 4, description: 'Devorador.', ability: 'ECO', abilityKind: 'ECO', starter: true },
  { id: 'card-flame-guardian', name: 'Guardião da Chama', element: 'Fogo', rarity: 'Incomum', attack: 7, health: 5, energyCost: 4, power: 7, damage: 3, description: 'Guardião da Chama.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
  { id: 'card-dragon-emerald', name: 'Dragão Esmeralda', element: 'Natureza', rarity: 'Incomum', attack: 6, health: 6, energyCost: 3, power: 6, damage: 4, description: 'Dragão Esmeralda.', ability: 'ECO', abilityKind: 'ECO' },
  { id: 'card-abyss-colossus', name: 'Colosso Abissal', element: 'Abismo', rarity: 'Incomum', attack: 5, health: 12, energyCost: 5, power: 5, damage: 4, description: 'Colosso Abissal.', ability: 'BLINDAGEM', abilityKind: 'BLINDAGEM' },
  { id: 'card-mage-light', name: 'Mago da Luz', element: 'Luz', rarity: 'Raro', attack: 8, health: 7, energyCost: 5, power: 8, damage: 4, description: 'Mago da Luz.', ability: 'DRENO', abilityKind: 'DRENO' },
  { id: 'card-dragon-shadow', name: 'Dragão Sombrio', element: 'Sombra', rarity: 'Raro', attack: 9, health: 7, energyCost: 3, power: 9, damage: 3, description: 'Dragão Sombrio.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
  { id: 'card-ice-guardian', name: 'Guardião do Gelo', element: 'Gelo', rarity: 'Raro', attack: 7, health: 8, energyCost: 6, power: 7, damage: 5, description: 'Guardião do Gelo.', ability: 'BLINDAGEM', abilityKind: 'BLINDAGEM' },
  { id: 'card-mage-arcane', name: 'Mago Arcano', element: 'Arcano', rarity: 'Épico', attack: 9, health: 4, energyCost: 4, power: 9, damage: 5, description: 'Mago Arcano.', ability: 'ECO', abilityKind: 'ECO' },
  { id: 'card-storm-guardian', name: 'Guardião da Tempestade', element: 'Raio', rarity: 'Épico', attack: 8, health: 13, energyCost: 6, power: 8, damage: 6, description: 'Guardião da Tempestade.', ability: 'DRENO', abilityKind: 'DRENO' },
];
