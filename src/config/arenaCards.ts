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

export const ARENA_ABILITY_DESCRIPTIONS: Record<NonNullable<ArenaCard['abilityKind']>, string> = {
  IMPULSO: 'Com 3+ Nexos, recebe +2 de Ataque.',
  BLINDAGEM: 'Ao perder a rodada, reduz o Dano recebido em 2 (mínimo 1).',
  DRENO: 'Ao vencer a rodada, recupera 1 PV (máximo 12).',
  ECO: 'Ao vencer a rodada, recupera 1 Nexo (máximo 12).',
};

export const ARENA_RARITY_ROLES: Record<string, string> = {
  Comum: 'Base confiável',
  Incomum: 'Especialista',
  Raro: 'Tático',
  Épico: 'Alta pressão',
  Lendário: 'Elite',
  Mítico: 'Prestígio máximo',
};

export const ARENA_CARDS: ArenaCard[] = [
  { id: 'card-flame-guardian', name: 'Guardião da Chama', element: 'Fogo', rarity: 'Incomum', attack: 5, health: 6, energyCost: 3, power: 5, damage: 3, description: 'Guardião da Chama.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
  { id: 'card-ice-guardian', name: 'Guardião do Gelo', element: 'Água', rarity: 'Raro', attack: 5, health: 6, energyCost: 3, power: 5, damage: 4, description: 'Guardião do Gelo.', ability: 'BLINDAGEM', abilityKind: 'BLINDAGEM' },
  { id: 'card-storm-guardian', name: 'Guardião da Tempestade', element: 'Arcano', rarity: 'Épico', attack: 6, health: 6, energyCost: 3, power: 6, damage: 4, description: 'Guardião da Tempestade.', ability: 'DRENO', abilityKind: 'DRENO' },
  { id: 'card-abyss-guardian', name: 'Guardião do Abismo', element: 'Sombra', rarity: 'Lendário', attack: 7, health: 6, energyCost: 3, power: 7, damage: 5, description: 'Guardião do Abismo.', ability: 'ECO', abilityKind: 'ECO' },
  { id: 'card-dragon-red', name: 'Dragão Rubro', element: 'Fogo', rarity: 'Incomum', attack: 4, health: 6, energyCost: 3, power: 4, damage: 3, description: 'Dragão Rubro.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
  { id: 'card-dragon-frost', name: 'Dragão Glacial', element: 'Água', rarity: 'Raro', attack: 5, health: 6, energyCost: 3, power: 5, damage: 4, description: 'Dragão Glacial.', ability: 'BLINDAGEM', abilityKind: 'BLINDAGEM' },
  { id: 'card-dragon-emerald', name: 'Dragão Esmeralda', element: 'Natureza', rarity: 'Incomum', attack: 5, health: 6, energyCost: 3, power: 5, damage: 3, description: 'Dragão Esmeralda.', ability: 'ECO', abilityKind: 'ECO' },
  { id: 'card-dragon-shadow', name: 'Dragão Sombrio', element: 'Sombra', rarity: 'Raro', attack: 5, health: 6, energyCost: 3, power: 5, damage: 4, description: 'Dragão Sombrio.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
  { id: 'card-dragon-gold', name: 'Dragão Dourado', element: 'Luz', rarity: 'Épico', attack: 6, health: 6, energyCost: 3, power: 6, damage: 4, description: 'Dragão Dourado.', ability: 'DRENO', abilityKind: 'DRENO' },
  { id: 'card-dragon-astral', name: 'Dragão Astral', element: 'Arcano', rarity: 'Épico', attack: 6, health: 6, energyCost: 3, power: 6, damage: 4, description: 'Dragão Astral.', ability: 'ECO', abilityKind: 'ECO' },
  { id: 'card-dragon-volcanic', name: 'Dragão Vulcânico', element: 'Fogo', rarity: 'Lendário', attack: 5, health: 6, energyCost: 3, power: 5, damage: 6, description: 'Dragão Vulcânico.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
  { id: 'card-dragon-celestial', name: 'Dragão Celestial', element: 'Luz', rarity: 'Mítico', attack: 8, health: 6, energyCost: 3, power: 8, damage: 4, description: 'Dragão Celestial.', ability: 'DRENO', abilityKind: 'DRENO' },
  { id: 'card-knight-blade', name: 'Cavaleiro da Lâmina', element: 'Luz', rarity: 'Comum', attack: 4, health: 6, energyCost: 3, power: 4, damage: 2, description: 'Cavaleiro da Lâmina.', ability: 'IMPULSO', abilityKind: 'IMPULSO', starter: true },
  { id: 'card-knight-black', name: 'Cavaleiro Negro', element: 'Sombra', rarity: 'Incomum', attack: 5, health: 6, energyCost: 3, power: 5, damage: 3, description: 'Cavaleiro Negro.', ability: 'DRENO', abilityKind: 'DRENO' },
  { id: 'card-knight-royal', name: 'Cavaleiro Real', element: 'Luz', rarity: 'Incomum', attack: 4, health: 6, energyCost: 3, power: 4, damage: 3, description: 'Cavaleiro Real.', ability: 'BLINDAGEM', abilityKind: 'BLINDAGEM' },
  { id: 'card-knight-arcane', name: 'Cavaleiro Arcano', element: 'Arcano', rarity: 'Raro', attack: 6, health: 6, energyCost: 3, power: 6, damage: 3, description: 'Cavaleiro Arcano.', ability: 'ECO', abilityKind: 'ECO' },
  { id: 'card-knight-scarlet', name: 'Cavaleiro Escarlate', element: 'Fogo', rarity: 'Raro', attack: 5, health: 6, energyCost: 3, power: 5, damage: 4, description: 'Cavaleiro Escarlate.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
  { id: 'card-knight-lunar', name: 'Cavaleiro Lunar', element: 'Luz', rarity: 'Épico', attack: 6, health: 6, energyCost: 3, power: 6, damage: 4, description: 'Cavaleiro Lunar.', ability: 'DRENO', abilityKind: 'DRENO' },
  { id: 'card-knight-imperial', name: 'Cavaleiro Imperial', element: 'Luz', rarity: 'Lendário', attack: 7, health: 6, energyCost: 3, power: 7, damage: 4, description: 'Cavaleiro Imperial.', ability: 'BLINDAGEM', abilityKind: 'BLINDAGEM' },
  { id: 'card-knight-celestial', name: 'Cavaleiro Celestial', element: 'Luz', rarity: 'Mítico', attack: 7, health: 6, energyCost: 3, power: 7, damage: 5, description: 'Cavaleiro Celestial.', ability: 'ECO', abilityKind: 'ECO' },
  { id: 'card-abyss-devourer', name: 'Devorador', element: 'Sombra', rarity: 'Comum', attack: 3, health: 6, energyCost: 3, power: 3, damage: 3, description: 'Devorador.', ability: 'ECO', abilityKind: 'ECO', starter: true },
  { id: 'card-abyss-colossus', name: 'Colosso Abissal', element: 'Sombra', rarity: 'Incomum', attack: 4, health: 6, energyCost: 3, power: 4, damage: 3, description: 'Colosso Abissal.', ability: 'BLINDAGEM', abilityKind: 'BLINDAGEM' },
  { id: 'card-abyss-serpent', name: 'Serpente Sombria', element: 'Sombra', rarity: 'Incomum', attack: 5, health: 6, energyCost: 3, power: 5, damage: 3, description: 'Serpente Sombria.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
  { id: 'card-abyss-demon', name: 'Demônio do Vazio', element: 'Sombra', rarity: 'Raro', attack: 5, health: 6, energyCost: 3, power: 5, damage: 4, description: 'Demônio do Vazio.', ability: 'DRENO', abilityKind: 'DRENO' },
  { id: 'card-abyss-kraken', name: 'Kraken', element: 'Água', rarity: 'Raro', attack: 4, health: 6, energyCost: 3, power: 4, damage: 5, description: 'Kraken.', ability: 'BLINDAGEM', abilityKind: 'BLINDAGEM' },
  { id: 'card-abyss-leviathan', name: 'Leviatã', element: 'Água', rarity: 'Épico', attack: 5, health: 6, energyCost: 3, power: 5, damage: 5, description: 'Leviatã.', ability: 'BLINDAGEM', abilityKind: 'BLINDAGEM' },
  { id: 'card-abyss-hydra', name: 'Hidra Negra', element: 'Sombra', rarity: 'Lendário', attack: 6, health: 6, energyCost: 3, power: 6, damage: 6, description: 'Hidra Negra.', ability: 'DRENO', abilityKind: 'DRENO' },
  { id: 'card-abyss-king', name: 'Rei do Abismo', element: 'Sombra', rarity: 'Mítico', attack: 5, health: 6, energyCost: 3, power: 5, damage: 7, description: 'Rei do Abismo.', ability: 'BLINDAGEM', abilityKind: 'BLINDAGEM' },
  { id: 'card-mage-fire', name: 'Mago do Fogo', element: 'Fogo', rarity: 'Comum', attack: 4, health: 6, energyCost: 3, power: 4, damage: 2, description: 'Mago do Fogo.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
  { id: 'card-mage-ice', name: 'Mago do Gelo', element: 'Água', rarity: 'Comum', attack: 4, health: 6, energyCost: 3, power: 4, damage: 2, description: 'Mago do Gelo.', ability: 'BLINDAGEM', abilityKind: 'BLINDAGEM', starter: true },
  { id: 'card-mage-earth', name: 'Mago da Terra', element: 'Natureza', rarity: 'Incomum', attack: 4, health: 6, energyCost: 3, power: 4, damage: 3, description: 'Mago da Terra.', ability: 'BLINDAGEM', abilityKind: 'BLINDAGEM' },
  { id: 'card-mage-wind', name: 'Mago do Ar', element: 'Natureza', rarity: 'Incomum', attack: 5, health: 6, energyCost: 3, power: 5, damage: 3, description: 'Mago do Ar.', ability: 'ECO', abilityKind: 'ECO' },
  { id: 'card-mage-light', name: 'Mago da Luz', element: 'Luz', rarity: 'Raro', attack: 6, health: 6, energyCost: 3, power: 6, damage: 3, description: 'Mago da Luz.', ability: 'DRENO', abilityKind: 'DRENO' },
  { id: 'card-mage-shadow', name: 'Mago das Sombras', element: 'Sombra', rarity: 'Raro', attack: 5, health: 6, energyCost: 3, power: 5, damage: 4, description: 'Mago das Sombras.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
  { id: 'card-mage-arcane', name: 'Mago Arcano', element: 'Arcano', rarity: 'Épico', attack: 6, health: 6, energyCost: 3, power: 6, damage: 4, description: 'Mago Arcano.', ability: 'ECO', abilityKind: 'ECO' },
  { id: 'card-mage-archmage', name: 'Arquimago', element: 'Arcano', rarity: 'Lendário', attack: 7, health: 6, energyCost: 3, power: 7, damage: 4, description: 'Arquimago.', ability: 'DRENO', abilityKind: 'DRENO' },
  { id: 'card-god-war', name: 'Deus da Guerra', element: 'Fogo', rarity: 'Raro', attack: 5, health: 6, energyCost: 3, power: 5, damage: 4, description: 'Deus da Guerra.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
  { id: 'card-god-moon', name: 'Deusa da Lua', element: 'Luz', rarity: 'Raro', attack: 5, health: 6, energyCost: 3, power: 5, damage: 4, description: 'Deusa da Lua.', ability: 'DRENO', abilityKind: 'DRENO' },
  { id: 'card-god-thunder', name: 'Deus do Trovão', element: 'Arcano', rarity: 'Épico', attack: 6, health: 6, energyCost: 3, power: 6, damage: 4, description: 'Deus do Trovão.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
  { id: 'card-god-sea', name: 'Deus do Mar', element: 'Água', rarity: 'Épico', attack: 5, health: 6, energyCost: 3, power: 5, damage: 5, description: 'Deus do Mar.', ability: 'BLINDAGEM', abilityKind: 'BLINDAGEM' },
  { id: 'card-god-death', name: 'Deus da Morte', element: 'Sombra', rarity: 'Épico', attack: 6, health: 6, energyCost: 3, power: 6, damage: 5, description: 'Deus da Morte.', ability: 'DRENO', abilityKind: 'DRENO' },
  { id: 'card-god-light', name: 'Deusa da Luz', element: 'Luz', rarity: 'Lendário', attack: 7, health: 6, energyCost: 3, power: 7, damage: 4, description: 'Deusa da Luz.', ability: 'ECO', abilityKind: 'ECO' },
  { id: 'card-god-chaos', name: 'Deus do Caos', element: 'Sombra', rarity: 'Lendário', attack: 6, health: 6, energyCost: 3, power: 6, damage: 6, description: 'Deus do Caos.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
  { id: 'card-god-supreme', name: 'Deus Supremo', element: 'Luz', rarity: 'Mítico', attack: 8, health: 6, energyCost: 3, power: 8, damage: 5, description: 'Deus Supremo.', ability: 'BLINDAGEM', abilityKind: 'BLINDAGEM' },
  { id: 'card-cosmic-guardian', name: 'Guardião Estelar', element: 'Arcano', rarity: 'Incomum', attack: 4, health: 6, energyCost: 3, power: 4, damage: 3, description: 'Guardião Estelar.', ability: 'BLINDAGEM', abilityKind: 'BLINDAGEM' },
  { id: 'card-cosmic-comet', name: 'Cometa Vivo', element: 'Arcano', rarity: 'Raro', attack: 5, health: 6, energyCost: 3, power: 5, damage: 4, description: 'Cometa Vivo.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
  { id: 'card-cosmic-solar', name: 'Entidade Solar', element: 'Fogo', rarity: 'Raro', attack: 6, health: 6, energyCost: 3, power: 6, damage: 3, description: 'Entidade Solar.', ability: 'DRENO', abilityKind: 'DRENO' },
  { id: 'card-cosmic-lunar', name: 'Entidade Lunar', element: 'Luz', rarity: 'Épico', attack: 6, health: 6, energyCost: 3, power: 6, damage: 4, description: 'Entidade Lunar.', ability: 'ECO', abilityKind: 'ECO' },
  { id: 'card-cosmic-devourer', name: 'Devorador de Mundos', element: 'Sombra', rarity: 'Épico', attack: 5, health: 6, energyCost: 3, power: 5, damage: 5, description: 'Devorador de Mundos.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
  { id: 'card-cosmic-voidlord', name: 'Senhor do Vazio', element: 'Sombra', rarity: 'Lendário', attack: 7, health: 6, energyCost: 3, power: 7, damage: 5, description: 'Senhor do Vazio.', ability: 'DRENO', abilityKind: 'DRENO' },
  { id: 'card-cosmic-being', name: 'Ser Cósmico', element: 'Arcano', rarity: 'Lendário', attack: 7, health: 6, energyCost: 3, power: 7, damage: 4, description: 'Ser Cósmico.', ability: 'ECO', abilityKind: 'ECO' },
  { id: 'card-cosmic-primordial', name: 'Entidade Primordial', element: 'Luz', rarity: 'Mítico', attack: 6, health: 6, energyCost: 3, power: 6, damage: 6, description: 'Entidade Primordial.', ability: 'ECO', abilityKind: 'ECO' },
  { id: 'card-hunter-novice', name: 'Caçador Novato', element: 'Natureza', rarity: 'Comum', attack: 4, health: 6, energyCost: 3, power: 4, damage: 3, description: 'Caçador Novato.', ability: 'DRENO', abilityKind: 'DRENO', starter: true },
  { id: 'card-hunter-shadow', name: 'Caçador Sombrio', element: 'Sombra', rarity: 'Comum', attack: 4, health: 6, energyCost: 3, power: 4, damage: 2, description: 'Caçador Sombrio.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
  { id: 'card-hunter-arcane', name: 'Caçador Arcano', element: 'Arcano', rarity: 'Incomum', attack: 5, health: 6, energyCost: 3, power: 5, damage: 3, description: 'Caçador Arcano.', ability: 'ECO', abilityKind: 'ECO' },
  { id: 'card-hunter-dragonslayer', name: 'Caçador de Dragões', element: 'Fogo', rarity: 'Incomum', attack: 5, health: 6, energyCost: 3, power: 5, damage: 3, description: 'Caçador de Dragões.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
  { id: 'card-hunter-lunar', name: 'Caçador Lunar', element: 'Luz', rarity: 'Raro', attack: 6, health: 6, energyCost: 3, power: 6, damage: 3, description: 'Caçador Lunar.', ability: 'DRENO', abilityKind: 'DRENO' },
  { id: 'card-hunter-royal', name: 'Caçador Real', element: 'Luz', rarity: 'Raro', attack: 5, health: 6, energyCost: 3, power: 5, damage: 4, description: 'Caçador Real.', ability: 'BLINDAGEM', abilityKind: 'BLINDAGEM' },
  { id: 'card-hunter-ghost', name: 'Caçador Fantasma', element: 'Sombra', rarity: 'Épico', attack: 6, health: 6, energyCost: 3, power: 6, damage: 4, description: 'Caçador Fantasma.', ability: 'ECO', abilityKind: 'ECO' },
  { id: 'card-hunter-master', name: 'Mestre Caçador', element: 'Natureza', rarity: 'Lendário', attack: 7, health: 6, energyCost: 3, power: 7, damage: 5, description: 'Mestre Caçador.', ability: 'IMPULSO', abilityKind: 'IMPULSO' },
];
