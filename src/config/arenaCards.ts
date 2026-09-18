export interface ArenaCard {
  id: string;
  name: string;
  element: string;
  rarity: string;
  attack: number;
  health: number;
  energyCost: number;
  description: string;
  ability?: string;
}

export const ARENA_CARDS: ArenaCard[] = [
  { id: 'ember-scout', name: 'Batedor Ígneo', element: 'Fogo', rarity: 'Comum', attack: 5, health: 4, energyCost: 2, description: 'Atacante veloz da linha de frente.' },
  { id: 'tide-warden', name: 'Guardião da Maré', element: 'Água', rarity: 'Comum', attack: 3, health: 8, energyCost: 3, description: 'Resiste aos primeiros impactos.' },
  { id: 'storm-hawk', name: 'Falcão da Tempestade', element: 'Ar', rarity: 'Incomum', attack: 7, health: 4, energyCost: 3, description: 'Golpeia antes que o inimigo reaja.', ability: 'Primeiro ataque recebe +1.' },
  { id: 'root-keeper', name: 'Guardião das Raízes', element: 'Terra', rarity: 'Incomum', attack: 4, health: 9, energyCost: 4, description: 'Uma muralha viva para o seu deck.' },
  { id: 'void-mage', name: 'Mago do Vazio', element: 'Éter', rarity: 'Raro', attack: 8, health: 5, energyCost: 4, description: 'Converte energia em dano.', ability: 'Causa +2 contra cartas feridas.' },
  { id: 'crystal-fox', name: 'Raposa Cristalina', element: 'Luz', rarity: 'Raro', attack: 6, health: 6, energyCost: 3, description: 'Ágil e imprevisível em combate.' },
  { id: 'iron-golem', name: 'Golem de Ferro', element: 'Metal', rarity: 'Épico', attack: 5, health: 12, energyCost: 5, description: 'Defesa pesada e constante.' },
  { id: 'moon-seer', name: 'Vidente Lunar', element: 'Luz', rarity: 'Épico', attack: 9, health: 7, energyCost: 5, description: 'Lê os movimentos do adversário.', ability: 'Recebe +1 de ataque no segundo turno.' },
  { id: 'frost-wolf', name: 'Lobo Glacial', element: 'Gelo', rarity: 'Incomum', attack: 6, health: 7, energyCost: 3, description: 'Congela o ritmo da batalha.' },
  { id: 'sun-forger', name: 'Forjador Solar', element: 'Fogo', rarity: 'Lendário', attack: 11, health: 8, energyCost: 6, description: 'Uma força rara de pura energia.' },
  { id: 'nightblade', name: 'Lâmina Noturna', element: 'Sombra', rarity: 'Raro', attack: 10, health: 4, energyCost: 4, description: 'Especialista em ataques decisivos.' },
  { id: 'nexa-guardian', name: 'Guardião NEXA', element: 'NEXA', rarity: 'Lendário', attack: 8, health: 13, energyCost: 6, description: 'Equilíbrio entre força e proteção.', ability: 'Ganha +1 de vida ao entrar em campo.' },
];
