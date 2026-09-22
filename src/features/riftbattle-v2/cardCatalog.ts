import type {
  RiftBattleAbilityId,
  RiftBattleArchetype,
  RiftBattleCard,
} from './types';
import {
  isValidAttack,
  isValidDefense,
  isValidDeployCost,
  isValidHp,
  isValidSpeed,
} from './rules';

type CardDefinition = [
  id: string,
  name: string,
  rarity: string,
  archetype: RiftBattleArchetype,
  hp: number,
  attack: number,
  defense: number,
  speed: number,
  deployCost: number,
  ability: RiftBattleAbilityId,
];

const definitions: CardDefinition[] = [
  ['card-flame-guardian', 'Guardião da Chama', 'Incomum', 'TANK', 14, 4, 4, 2, 3, 'ESCUDO'],
  ['card-ice-guardian', 'Guardião do Gelo', 'Raro', 'SUPPORT', 11, 4, 3, 4, 3, 'BARREIRA'],
  ['card-storm-guardian', 'Guardião da Tempestade', 'Épico', 'SPEED', 9, 5, 1, 5, 3, 'IMPULSO'],
  ['card-abyss-guardian', 'Guardião do Abismo', 'Lendário', 'TANK', 16, 4, 5, 1, 5, 'PROTECAO'],
  ['card-dragon-red', 'Dragão Rubro', 'Incomum', 'ASSAULT', 8, 7, 1, 3, 2, 'SOBRECARGA'],
  ['card-dragon-frost', 'Dragão Glacial', 'Raro', 'TANK', 15, 4, 4, 1, 4, 'BARREIRA'],
  ['card-dragon-emerald', 'Dragão Esmeralda', 'Incomum', 'SUPPORT', 11, 4, 3, 3, 2, 'PROTECAO'],
  ['card-dragon-shadow', 'Dragão Sombrio', 'Raro', 'SPEED', 8, 5, 1, 5, 2, 'MARCA'],
  ['card-dragon-gold', 'Dragão Dourado', 'Épico', 'BALANCED', 11, 5, 3, 3, 3, 'RECARGA'],
  ['card-dragon-astral', 'Dragão Astral', 'Épico', 'SPEED', 10, 5, 2, 5, 4, 'IMPULSO'],
  ['card-dragon-volcanic', 'Dragão Vulcânico', 'Lendário', 'TANK', 16, 5, 5, 1, 5, 'SOBRECARGA'],
  ['card-dragon-celestial', 'Dragão Celestial', 'Mítico', 'BALANCED', 11, 5, 3, 4, 4, 'RECARGA'],
  ['card-knight-blade', 'Cavaleiro da Lâmina', 'Comum', 'ASSAULT', 8, 7, 1, 3, 2, 'INVESTIDA'],
  ['card-knight-black', 'Cavaleiro Negro', 'Incomum', 'TANK', 14, 4, 5, 1, 3, 'ESCUDO'],
  ['card-knight-royal', 'Cavaleiro Real', 'Incomum', 'SUPPORT', 10, 3, 2, 4, 1, 'PROTECAO'],
  ['card-knight-arcane', 'Cavaleiro Arcano', 'Raro', 'SUPPORT', 10, 4, 3, 4, 2, 'RUPTURA'],
  ['card-knight-scarlet', 'Cavaleiro Escarlate', 'Raro', 'ASSAULT', 9, 8, 1, 3, 3, 'SOBRECARGA'],
  ['card-knight-lunar', 'Cavaleiro Lunar', 'Épico', 'SPEED', 9, 5, 1, 5, 3, 'IMPULSO'],
  ['card-knight-imperial', 'Cavaleiro Imperial', 'Lendário', 'TANK', 15, 5, 5, 2, 4, 'PROTECAO'],
  ['card-knight-celestial', 'Cavaleiro Celestial', 'Mítico', 'BALANCED', 12, 6, 4, 4, 5, 'BARREIRA'],
  ['card-abyss-devourer', 'Devorador', 'Comum', 'ASSAULT', 8, 7, 1, 3, 2, 'REPARO'],
  ['card-abyss-colossus', 'Colosso Abissal', 'Incomum', 'TANK', 15, 4, 5, 1, 3, 'ESCUDO'],
  ['card-abyss-serpent', 'Serpente Sombria', 'Incomum', 'SPEED', 8, 4, 1, 5, 1, 'MARCA'],
  ['card-abyss-demon', 'Demônio do Vazio', 'Raro', 'ASSAULT', 8, 8, 1, 3, 3, 'RUPTURA'],
  ['card-abyss-kraken', 'Kraken', 'Raro', 'ASSAULT', 9, 7, 2, 2, 3, 'MARCA'],
  ['card-abyss-leviathan', 'Leviatã', 'Épico', 'TANK', 16, 4, 5, 1, 4, 'BARREIRA'],
  ['card-abyss-hydra', 'Hidra Negra', 'Lendário', 'TANK', 16, 4, 5, 1, 5, 'REPARO'],
  ['card-abyss-king', 'Rei do Abismo', 'Mítico', 'BALANCED', 13, 6, 4, 3, 5, 'REPARO'],
  ['card-mage-fire', 'Mago do Fogo', 'Comum', 'ASSAULT', 8, 6, 1, 3, 2, 'SOBRECARGA'],
  ['card-mage-ice', 'Mago do Gelo', 'Comum', 'SUPPORT', 10, 3, 2, 4, 1, 'BARREIRA'],
  ['card-mage-earth', 'Mago da Terra', 'Incomum', 'TANK', 14, 4, 4, 1, 3, 'PROTECAO'],
  ['card-mage-wind', 'Mago do Ar', 'Incomum', 'SPEED', 8, 4, 1, 5, 1, 'IMPULSO'],
  ['card-mage-light', 'Mago da Luz', 'Raro', 'SUPPORT', 10, 4, 3, 4, 3, 'RUPTURA'],
  ['card-mage-shadow', 'Mago das Sombras', 'Raro', 'SPEED', 8, 5, 1, 5, 2, 'MARCA'],
  ['card-mage-arcane', 'Mago Arcano', 'Épico', 'SUPPORT', 11, 3, 3, 4, 3, 'RECARGA'],
  ['card-mage-archmage', 'Arquimago', 'Lendário', 'SUPPORT', 12, 4, 3, 5, 4, 'RECARGA'],
  ['card-god-war', 'Deus da Guerra', 'Raro', 'ASSAULT', 8, 8, 1, 3, 3, 'SOBRECARGA'],
  ['card-god-moon', 'Deusa da Lua', 'Raro', 'SPEED', 9, 4, 2, 5, 2, 'IMPULSO'],
  ['card-god-thunder', 'Deus do Trovão', 'Épico', 'ASSAULT', 9, 8, 1, 3, 4, 'SOBRECARGA'],
  ['card-god-sea', 'Deus do Mar', 'Épico', 'TANK', 16, 4, 5, 1, 4, 'PROTECAO'],
  ['card-god-death', 'Deus da Morte', 'Épico', 'ASSAULT', 8, 8, 1, 3, 4, 'MARCA'],
  ['card-god-light', 'Deusa da Luz', 'Lendário', 'SUPPORT', 12, 3, 4, 5, 4, 'PROTECAO'],
  ['card-god-chaos', 'Deus do Caos', 'Lendário', 'ASSAULT', 9, 8, 1, 3, 5, 'SOBRECARGA'],
  ['card-god-supreme', 'Deus Supremo', 'Mítico', 'SUPPORT', 12, 4, 3, 4, 4, 'RECARGA'],
  ['card-cosmic-guardian', 'Guardião Estelar', 'Incomum', 'TANK', 14, 4, 4, 2, 3, 'ESCUDO'],
  ['card-cosmic-comet', 'Cometa Vivo', 'Raro', 'SPEED', 8, 5, 1, 5, 1, 'IMPULSO'],
  ['card-cosmic-solar', 'Entidade Solar', 'Raro', 'BALANCED', 10, 5, 3, 4, 2, 'RECARGA'],
  ['card-cosmic-lunar', 'Entidade Lunar', 'Épico', 'SUPPORT', 11, 3, 3, 4, 3, 'PROTECAO'],
  ['card-cosmic-devourer', 'Devorador de Mundos', 'Épico', 'ASSAULT', 10, 8, 1, 2, 4, 'RUPTURA'],
  ['card-cosmic-voidlord', 'Senhor do Vazio', 'Lendário', 'ASSAULT', 9, 8, 1, 3, 4, 'MARCA'],
  ['card-cosmic-being', 'Ser Cósmico', 'Lendário', 'BALANCED', 12, 6, 3, 3, 5, 'BARREIRA'],
  ['card-cosmic-primordial', 'Entidade Primordial', 'Mítico', 'TANK', 16, 4, 5, 1, 5, 'REPARO'],
  ['card-hunter-novice', 'Caçador Novato', 'Comum', 'SPEED', 8, 4, 1, 5, 1, 'MARCA'],
  ['card-hunter-shadow', 'Caçador Sombrio', 'Comum', 'SPEED', 8, 5, 1, 5, 1, 'MARCA'],
  ['card-hunter-arcane', 'Caçador Arcano', 'Incomum', 'SPEED', 9, 4, 1, 5, 2, 'RUPTURA'],
  ['card-hunter-dragonslayer', 'Caçador de Dragões', 'Incomum', 'ASSAULT', 8, 7, 1, 3, 2, 'MARCA'],
  ['card-hunter-lunar', 'Caçador Lunar', 'Raro', 'SPEED', 8, 5, 1, 5, 2, 'IMPULSO'],
  ['card-hunter-royal', 'Caçador Real', 'Raro', 'BALANCED', 10, 5, 3, 3, 3, 'MARCA'],
  ['card-hunter-ghost', 'Caçador Fantasma', 'Épico', 'SPEED', 9, 5, 1, 5, 3, 'MARCA'],
  ['card-hunter-master', 'Mestre Caçador', 'Lendário', 'SPEED', 10, 6, 2, 5, 4, 'MARCA'],
];

function toCard(definition: CardDefinition): RiftBattleCard {
  const [id, name, rarity, archetype, hp, attack, defense, speed, deployCost, ability] =
    definition;

  return {
    id,
    name,
    rarity,
    archetype,
    stats: { hp, attack, defense, speed },
    deployCost,
    ability: {
      id: ability,
      name: ability,
      description: 'Efeito provisório do RiftBattle V2.',
    },
  };
}

export const RIFTBATTLE_V2_CARDS: readonly RiftBattleCard[] = definitions.map(toCard);

export function isValidRiftBattleV2Catalog(
  cards: readonly RiftBattleCard[] = RIFTBATTLE_V2_CARDS,
): boolean {
  const ids = new Set(cards.map((card) => card.id));

  return (
    cards.length === 60 &&
    ids.size === cards.length &&
    cards.every(
      (card) =>
        isValidHp(card.stats.hp) &&
        isValidAttack(card.stats.attack) &&
        isValidDefense(card.stats.defense) &&
        isValidSpeed(card.stats.speed) &&
        isValidDeployCost(card.deployCost),
    )
  );
}

export const RIFTBATTLE_V2_CATALOG_IS_VALID = isValidRiftBattleV2Catalog();
