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
  ability?: string;
  abilityKind?: 'IMPULSO' | 'DRENO' | 'BLINDAGEM' | 'ECO';
}

export const ARENA_CARDS: ArenaCard[] = [
  { id: 'ember-scout', name: 'Batedor Ígneo', element: 'Fogo', rarity: 'Comum', attack: 5, health: 4, energyCost: 2, power: 5, damage: 3, description: 'Atacante veloz da linha de frente.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
  { id: 'tide-warden', name: 'Guardião da Maré', element: 'Água', rarity: 'Comum', attack: 3, health: 8, energyCost: 3, power: 3, damage: 2, description: 'Resiste aos primeiros impactos.', ability: 'BLINDAGEM', abilityKind: 'BLINDAGEM' },
  { id: 'storm-hawk', name: 'Falcão da Tempestade', element: 'Ar', rarity: 'Incomum', attack: 7, health: 4, energyCost: 3, power: 7, damage: 4, description: 'Golpeia antes que o inimigo reaja.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
  { id: 'root-keeper', name: 'Guardião das Raízes', element: 'Terra', rarity: 'Incomum', attack: 4, health: 9, energyCost: 4, power: 4, damage: 3, description: 'Uma muralha viva para o seu deck.', ability: 'BLINDAGEM', abilityKind: 'BLINDAGEM' },
  { id: 'void-mage', name: 'Mago do Vazio', element: 'Éter', rarity: 'Raro', attack: 8, health: 5, energyCost: 4, power: 8, damage: 5, description: 'Converte energia em dano.', ability: 'DRENO', abilityKind: 'DRENO' },
  { id: 'crystal-fox', name: 'Raposa Cristalina', element: 'Luz', rarity: 'Raro', attack: 6, health: 6, energyCost: 3, power: 6, damage: 4, description: 'Ágil e imprevisível em combate.', ability: 'ECO', abilityKind: 'ECO' },
  { id: 'iron-golem', name: 'Golem de Ferro', element: 'Metal', rarity: 'Épico', attack: 5, health: 12, energyCost: 5, power: 5, damage: 5, description: 'Defesa pesada e constante.', ability: 'BLINDAGEM', abilityKind: 'BLINDAGEM' },
  { id: 'moon-seer', name: 'Vidente Lunar', element: 'Luz', rarity: 'Épico', attack: 9, health: 7, energyCost: 5, power: 9, damage: 6, description: 'Lê os movimentos do adversário.', ability: 'DRENO', abilityKind: 'DRENO' },
  { id: 'frost-wolf', name: 'Lobo Glacial', element: 'Gelo', rarity: 'Incomum', attack: 6, health: 7, energyCost: 3, power: 6, damage: 4, description: 'Congela o ritmo da batalha.', ability: 'ECO', abilityKind: 'ECO' },
  { id: 'sun-forger', name: 'Forjador Solar', element: 'Fogo', rarity: 'Lendário', attack: 11, health: 8, energyCost: 6, power: 11, damage: 7, description: 'Uma força rara de pura energia.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
  { id: 'nightblade', name: 'Lâmina Noturna', element: 'Sombra', rarity: 'Raro', attack: 10, health: 4, energyCost: 4, power: 10, damage: 6, description: 'Especialista em ataques decisivos.', ability: 'DRENO', abilityKind: 'DRENO' },
  { id: 'nexa-guardian', name: 'Guardião NEXA', element: 'NEXA', rarity: 'Lendário', attack: 8, health: 13, energyCost: 6, power: 8, damage: 7, description: 'Equilíbrio entre força e proteção.', ability: 'ECO', abilityKind: 'ECO' },
];
