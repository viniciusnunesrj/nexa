import { BoxType, BoxDefinition, BoxDropProbabilities, Rarity } from '../types';
import {
  ALL_CARD_TEMPLATES,
  GUARDIANS_TEMPLATES,
  DRAGONS_TEMPLATES,
  KNIGHTS_TEMPLATES,
  ABYSS_TEMPLATES,
  MAGES_TEMPLATES,
  GODS_TEMPLATES,
  COSMIC_TEMPLATES,
  HUNTERS_TEMPLATES,
  getTemplateById,
} from './collectionsData';

export interface BoxConfigItem {
  id: BoxType;
  name: string;
  tagline: string;
  description: string;
  priceNEX: number;
  purchasableWithNEX: boolean;
  category: 'GENERAL' | 'COLLECTION';
  collectionId?: string;
  image: string;
  accentColor: string;
  glowColor: string;
  badge: string;
  guarantees: string;
  possibleRarities: Rarity[];
  rarityWeights: Record<Rarity, number>;
  rewardPoolTemplateIds?: string[];
}

/* ========================================================================
   ESTRUTURA CENTRAL DE CONFIGURAÇÃO DE TODAS AS CAIXAS (BOX_CONFIG)
   ======================================================================== */
export const BOX_CONFIG: Record<BoxType, BoxConfigItem> = {
  // CAIXA DE RECRUTA (Requisito 8)
  RECRUIT: {
    id: 'RECRUIT',
    name: 'Caixa de Recruta',
    tagline: 'Boas-Vindas à Ordem',
    description: 'Caixa gratuita concedida exclusivamente a novas contas (1 única vez). Contém cartas iniciais Comuns e Incomuns.',
    priceNEX: 0,
    purchasableWithNEX: false,
    category: 'GENERAL',
    image: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80',
    accentColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.4)',
    badge: 'BOAS-VINDAS',
    guarantees: '1 Carta Garantida (75% Comum, 25% Incomum)',
    possibleRarities: ['Comum', 'Incomum'],
    rarityWeights: {
      Comum: 75,
      Incomum: 25,
      Raro: 0,
      Épico: 0,
      Lendário: 0,
      Mítico: 0,
    },
  },

  // CAIXA BÁSICA (Requisito 8)
  BASIC: {
    id: 'BASIC',
    name: 'Caixa Básica',
    tagline: 'Suprimento Padrão de Campo',
    description: 'Caixa inicial acessível por 100 NEX ou conquistada em vitórias na Arena (25% chance). Pool aberto em todas as coleções.',
    priceNEX: 100,
    purchasableWithNEX: true,
    category: 'GENERAL',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    accentColor: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    badge: 'PADRÃO',
    guarantees: '1 Carta Colecionável (55% Comum, 30% Incomum, 12% Raro, 3% Épico)',
    possibleRarities: ['Comum', 'Incomum', 'Raro', 'Épico'],
    rarityWeights: {
      Comum: 55,
      Incomum: 30,
      Raro: 12,
      Épico: 3,
      Lendário: 0,
      Mítico: 0,
    },
  },

  // CAIXA AVANÇADA (Requisito 8)
  ADVANCED: {
    id: 'ADVANCED',
    name: 'Caixa Avançada',
    tagline: 'Reforço Tático Especializado',
    description: 'Equilíbrio ideal entre custo e raridade. Maiores probabilidades de cartas Raras e Épicas, com pequena chance de Lendárias.',
    priceNEX: 300,
    purchasableWithNEX: true,
    category: 'GENERAL',
    image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    accentColor: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    badge: 'AVANÇADA',
    guarantees: '1 Carta (35% Comum, 30% Incomum, 22% Raro, 10% Épico, 3% Lendário)',
    possibleRarities: ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário'],
    rarityWeights: {
      Comum: 35,
      Incomum: 30,
      Raro: 22,
      Épico: 10,
      Lendário: 3,
      Mítico: 0,
    },
  },

  // CAIXA ÉPICA (Requisito 8)
  EPIC: {
    id: 'EPIC',
    name: 'Caixa Épica',
    tagline: 'Arsenal Quântico de Alta Frequência',
    description: 'Alta densidade de cartas Raras e Épicas. Chances sólidas de Lendárias e chance de relíquias Míticas primordiais.',
    priceNEX: 750,
    purchasableWithNEX: true,
    category: 'GENERAL',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    accentColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.5)',
    badge: 'ALTA RARIDADE',
    guarantees: '1 Carta (15% Comum, 20% Incomum, 30% Raro, 25% Épico, 9% Lendário, 1% Mítico)',
    possibleRarities: ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário', 'Mítico'],
    rarityWeights: {
      Comum: 15,
      Incomum: 20,
      Raro: 30,
      Épico: 25,
      Lendário: 9,
      Mítico: 1,
    },
  },

  // CAIXA LENDÁRIA (Requisito 8)
  LEGENDARY: {
    id: 'LEGENDARY',
    name: 'Caixa Lendária',
    tagline: 'Câmara Proibida dos Titãs',
    description: 'A caixa definitiva da Cidadela. Probabilidades extraordinárias de cartas Épicas e Lendárias, com 5% de chance de Mítica.',
    priceNEX: 2000,
    purchasableWithNEX: true,
    category: 'GENERAL',
    image: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80',
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    badge: 'SUPREMA',
    guarantees: '1 Carta (5% Comum, 10% Incomum, 20% Raro, 30% Épico, 30% Lendário, 5% Mítico)',
    possibleRarities: ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário', 'Mítico'],
    rarityWeights: {
      Comum: 5,
      Incomum: 10,
      Raro: 20,
      Épico: 30,
      Lendário: 30,
      Mítico: 5,
    },
  },

  // CAIXA DOS QUATRO GUARDIÕES (Requisito 8)
  GUARDIANS: {
    id: 'GUARDIANS',
    name: 'Caixa dos Quatro Guardiões',
    tagline: 'Exclusiva da Coleção dos Guardiões',
    description: 'Contém EXCLUSIVAMENTE uma das 4 cartas da coleção: Chama, Gelo, Tempestade ou Abismo.',
    priceNEX: 500,
    purchasableWithNEX: true,
    category: 'COLLECTION',
    collectionId: 'guardians',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    accentColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.5)',
    badge: '4 GUARDIÕES',
    guarantees: '1 das 4 Cartas dos Guardiões (Incomum 40%, Raro 30%, Épico 20%, Lendário 10%)',
    possibleRarities: ['Incomum', 'Raro', 'Épico', 'Lendário'],
    rarityWeights: {
      Comum: 0,
      Incomum: 40,
      Raro: 30,
      Épico: 20,
      Lendário: 10,
      Mítico: 0,
    },
    rewardPoolTemplateIds: GUARDIANS_TEMPLATES.map((t) => t.templateId),
  },

  // CAIXA DRAGÕES ANCESTRAIS (Requisito 9)
  COLLECTION_DRAGONS: {
    id: 'COLLECTION_DRAGONS',
    name: 'Caixa Dragões Ancestrais',
    tagline: 'Exclusiva da Coleção dos Dragões',
    description: 'Garante 1 das 8 cartas da coleção Dragões Ancestrais. Ideal para completar a coleção sem interferência externa.',
    priceNEX: 600,
    purchasableWithNEX: true,
    category: 'COLLECTION',
    collectionId: 'dragons',
    image: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80',
    accentColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.5)',
    badge: 'DRAGÕES',
    guarantees: '1 das 8 Cartas Draconianas (Incomum 25%, Raro 30%, Épico 25%, Lendário 15%, Mítico 5%)',
    possibleRarities: ['Incomum', 'Raro', 'Épico', 'Lendário', 'Mítico'],
    rarityWeights: {
      Comum: 0,
      Incomum: 25,
      Raro: 30,
      Épico: 25,
      Lendário: 15,
      Mítico: 5,
    },
    rewardPoolTemplateIds: DRAGONS_TEMPLATES.map((t) => t.templateId),
  },

  // CAIXA CAVALEIROS DE ELDORIA (Requisito 9)
  COLLECTION_KNIGHTS: {
    id: 'COLLECTION_KNIGHTS',
    name: 'Caixa Cavaleiros de Eldoria',
    tagline: 'Exclusiva da Ordem dos Cavaleiros',
    description: 'Garante 1 das 8 cartas da nobre guarda de Eldoria. Do Cavaleiro da Lâmina ao supremo Cavaleiro Celestial.',
    priceNEX: 600,
    purchasableWithNEX: true,
    category: 'COLLECTION',
    collectionId: 'knights',
    image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.5)',
    badge: 'CAVALEIROS',
    guarantees: '1 das 8 Cartas de Eldoria (Comum 20%, Incomum 30%, Raro 25%, Épico 15%, Lendário 8%, Mítico 2%)',
    possibleRarities: ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário', 'Mítico'],
    rarityWeights: {
      Comum: 20,
      Incomum: 30,
      Raro: 25,
      Épico: 15,
      Lendário: 8,
      Mítico: 2,
    },
    rewardPoolTemplateIds: KNIGHTS_TEMPLATES.map((t) => t.templateId),
  },

  // CAIXA CRIATURAS DO ABISMO (Requisito 9)
  COLLECTION_ABYSS: {
    id: 'COLLECTION_ABYSS',
    name: 'Caixa Criaturas do Abismo',
    tagline: 'Exclusiva das Fossas Quânticas',
    description: 'Garante 1 das 8 cartas de horrores marinhos e entidades do vazio abissal de NEXA.',
    priceNEX: 600,
    purchasableWithNEX: true,
    category: 'COLLECTION',
    collectionId: 'abyss',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    accentColor: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.5)',
    badge: 'ABISMO',
    guarantees: '1 das 8 Cartas Abissais (Comum 20%, Incomum 30%, Raro 25%, Épico 15%, Lendário 8%, Mítico 2%)',
    possibleRarities: ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário', 'Mítico'],
    rarityWeights: {
      Comum: 20,
      Incomum: 30,
      Raro: 25,
      Épico: 15,
      Lendário: 8,
      Mítico: 2,
    },
    rewardPoolTemplateIds: ABYSS_TEMPLATES.map((t) => t.templateId),
  },

  // CAIXA MAGOS ELEMENTAIS (Requisito 9)
  COLLECTION_MAGES: {
    id: 'COLLECTION_MAGES',
    name: 'Caixa Magos Elementais',
    tagline: 'Exclusiva do Conclave dos Elementos',
    description: 'Garante 1 das 8 cartas de eruditos e manipuladores das forças arcanas e naturais.',
    priceNEX: 600,
    purchasableWithNEX: true,
    category: 'COLLECTION',
    collectionId: 'mages',
    image: 'https://images.unsplash.com/photo-1517824806704-9040b037703b?w=600&auto=format&fit=crop&q=80',
    accentColor: '#ec4899',
    glowColor: 'rgba(236, 72, 153, 0.5)',
    badge: 'MAGOS',
    guarantees: '1 das 8 Cartas Elementais (Comum 30%, Incomum 30%, Raro 25%, Épico 10%, Lendário 5%)',
    possibleRarities: ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário'],
    rarityWeights: {
      Comum: 30,
      Incomum: 30,
      Raro: 25,
      Épico: 10,
      Lendário: 5,
      Mítico: 0,
    },
    rewardPoolTemplateIds: MAGES_TEMPLATES.map((t) => t.templateId),
  },

  // CAIXA DEUSES ANTIGOS (Requisito 9)
  COLLECTION_GODS: {
    id: 'COLLECTION_GODS',
    name: 'Caixa Deuses Antigos',
    tagline: 'Exclusiva do Panteão Supremo',
    description: 'Caixa de prestígio divino. Garante 1 das 8 divindades primordiais com sínteses de altíssimo rendimento.',
    priceNEX: 700,
    purchasableWithNEX: true,
    category: 'COLLECTION',
    collectionId: 'gods',
    image: 'https://images.unsplash.com/photo-1533158307587-828f0a76ef46?w=600&auto=format&fit=crop&q=80',
    accentColor: '#eab308',
    glowColor: 'rgba(234, 179, 8, 0.5)',
    badge: 'DIVINA',
    guarantees: '1 Divindade (Raro 30%, Épico 45%, Lendário 20%, Mítico 5%)',
    possibleRarities: ['Raro', 'Épico', 'Lendário', 'Mítico'],
    rarityWeights: {
      Comum: 0,
      Incomum: 0,
      Raro: 30,
      Épico: 45,
      Lendário: 20,
      Mítico: 5,
    },
    rewardPoolTemplateIds: GODS_TEMPLATES.map((t) => t.templateId),
  },

  // CAIXA ENTIDADES CÓSMICAS (Requisito 9)
  COLLECTION_COSMIC: {
    id: 'COLLECTION_COSMIC',
    name: 'Caixa Entidades Cósmicas',
    tagline: 'Exclusiva das Nebulosas Profundas',
    description: 'Garante 1 das 8 entidades astrofísicas. De cometas vivos ao senhor do vazio e entidade primordial.',
    priceNEX: 700,
    purchasableWithNEX: true,
    category: 'COLLECTION',
    collectionId: 'cosmic',
    image: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=600&auto=format&fit=crop&q=80',
    accentColor: '#6366f1',
    glowColor: 'rgba(99, 102, 241, 0.5)',
    badge: 'CÓSMICA',
    guarantees: '1 Entidade Cósmica (Incomum 20%, Raro 30%, Épico 30%, Lendário 15%, Mítico 5%)',
    possibleRarities: ['Incomum', 'Raro', 'Épico', 'Lendário', 'Mítico'],
    rarityWeights: {
      Comum: 0,
      Incomum: 20,
      Raro: 30,
      Épico: 30,
      Lendário: 15,
      Mítico: 5,
    },
    rewardPoolTemplateIds: COSMIC_TEMPLATES.map((t) => t.templateId),
  },

  // CAIXA CAÇADORES (Requisito 9)
  COLLECTION_HUNTERS: {
    id: 'COLLECTION_HUNTERS',
    name: 'Caixa Caçadores',
    tagline: 'Exclusiva da Guilda de Rastreamento',
    description: 'Garante 1 dos 8 especialistas em caça de feras e relíquias das terras selvagens de NEXA.',
    priceNEX: 600,
    purchasableWithNEX: true,
    category: 'COLLECTION',
    collectionId: 'hunters',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    accentColor: '#14b8a6',
    glowColor: 'rgba(20, 184, 166, 0.5)',
    badge: 'CAÇADORES',
    guarantees: '1 Caçador (Comum 30%, Incomum 25%, Raro 25%, Épico 15%, Lendário 5%)',
    possibleRarities: ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário'],
    rarityWeights: {
      Comum: 30,
      Incomum: 25,
      Raro: 25,
      Épico: 15,
      Lendário: 5,
      Mítico: 0,
    },
    rewardPoolTemplateIds: HUNTERS_TEMPLATES.map((t) => t.templateId),
  },

  // Alias para retrocompatibilidade
  PREMIUM: {
    id: 'PREMIUM',
    name: 'Caixa Épica',
    tagline: 'Arsenal Quântico de Alta Frequência',
    description: 'Alta densidade de cartas Raras e Épicas com chances de relíquias Lendárias e Míticas.',
    priceNEX: 750,
    purchasableWithNEX: true,
    category: 'GENERAL',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    accentColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.5)',
    badge: 'ALTA RARIDADE',
    guarantees: '1 Carta (15% Comum, 20% Incomum, 30% Raro, 25% Épico, 9% Lendário, 1% Mítico)',
    possibleRarities: ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário', 'Mítico'],
    rarityWeights: {
      Comum: 15,
      Incomum: 20,
      Raro: 30,
      Épico: 25,
      Lendário: 9,
      Mítico: 1,
    },
  },
};

/* ========================================================================
   FUNÇÃO CENTRAL: RESOLVE O REWARD POOL DA CAIXA
   ======================================================================== */
export function getRewardPoolForBox(boxType: BoxType) {
  const config = BOX_CONFIG[boxType] || BOX_CONFIG.BASIC;
  if (config.rewardPoolTemplateIds && config.rewardPoolTemplateIds.length > 0) {
    const templates = config.rewardPoolTemplateIds
      .map((id) => getTemplateById(id))
      .filter((t): t is NonNullable<typeof t> => !!t);
    if (templates.length > 0) return templates;
  }
  return ALL_CARD_TEMPLATES;
}

/* ========================================================================
   SISTEMA DE LOOT RIGOROSO (Requisito 10)
   1. Escolhe raridade baseada nos pesos percentuais da caixa
   2. Filtra cartas daquela raridade dentro do pool da caixa
   3. Se a raridade não tiver cartas no pool, seleciona a mais próxima
   4. Escolhe aleatoriamente dentro das filtradas
   5. Retorna a carta
   ======================================================================== */
export function rollBoxReward(boxType: BoxType) {
  const config = BOX_CONFIG[boxType] || BOX_CONFIG.BASIC;
  const pool = getRewardPoolForBox(boxType);

  const weights = config.rarityWeights;
  const tiers: Rarity[] = ['Mítico', 'Lendário', 'Épico', 'Raro', 'Incomum', 'Comum'];

  // Soma dos pesos
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const rand = Math.random() * (totalWeight > 0 ? totalWeight : 100);
  let cumulative = 0;
  let chosenRarity: Rarity = 'Comum';

  for (const r of tiers) {
    cumulative += weights[r] || 0;
    if (rand <= cumulative && (weights[r] || 0) > 0) {
      chosenRarity = r;
      break;
    }
  }

  // Filtra cartas daquela raridade dentro do pool específico
  let matchingCards = pool.filter((c) => c.rarity === chosenRarity);

  // Fallback: se o pool da caixa não possui a raridade sorteada, pega a raridade mais próxima disponível
  if (matchingCards.length === 0) {
    const availableRarities = Array.from(new Set(pool.map((c) => c.rarity)));
    const rarityIndex: Record<Rarity, number> = {
      Comum: 1,
      Incomum: 2,
      Raro: 3,
      Épico: 4,
      Lendário: 5,
      Mítico: 6,
    };
    const targetIdx = rarityIndex[chosenRarity];
    availableRarities.sort(
      (a, b) => Math.abs(rarityIndex[a] - targetIdx) - Math.abs(rarityIndex[b] - targetIdx)
    );
    const fallbackRarity = availableRarities[0] || 'Comum';
    matchingCards = pool.filter((c) => c.rarity === fallbackRarity);
  }

  const selectedTemplate =
    matchingCards[Math.floor(Math.random() * matchingCards.length)] || pool[0];
  return selectedTemplate;
}

/* ========================================================================
   COMPATIBILIDADE COM FORMATO ANTERIOR (BOX_DROP_RATES & BOX_DEFINITIONS)
   ======================================================================== */
export const BOX_DROP_RATES: Record<BoxType, BoxDropProbabilities> = Object.keys(BOX_CONFIG).reduce(
  (acc, key) => {
    const boxType = key as BoxType;
    const weights = BOX_CONFIG[boxType].rarityWeights;
    const total = Object.values(weights).reduce((a, b) => a + b, 0) || 100;
    acc[boxType] = {
      Comum: weights.Comum / total,
      Incomum: weights.Incomum / total,
      Raro: weights.Raro / total,
      Épico: weights.Épico / total,
      Lendário: weights.Lendário / total,
      Mítico: weights.Mítico / total,
    };
    return acc;
  },
  {} as Record<BoxType, BoxDropProbabilities>
);

export const BOX_DEFINITIONS: Record<BoxType, BoxDefinition> = Object.keys(BOX_CONFIG).reduce(
  (acc, key) => {
    const boxType = key as BoxType;
    const cfg = BOX_CONFIG[boxType];
    acc[boxType] = {
      type: boxType,
      name: cfg.name,
      tagline: cfg.tagline,
      description: cfg.description,
      priceNEX: cfg.priceNEX,
      purchasableWithNEX: cfg.purchasableWithNEX,
      image: cfg.image,
      accentColor: cfg.accentColor,
      glowColor: cfg.glowColor,
      badge: cfg.badge,
      possibleRarities: cfg.possibleRarities,
      dropRates: BOX_DROP_RATES[boxType],
      guarantees: cfg.guarantees,
    };
    return acc;
  },
  {} as Record<BoxType, BoxDefinition>
);

export const GAMEPLAY_BOX_DROP_RATES = {
  VICTORY_BASIC_BOX_CHANCE: 0.25,
  DEFEAT_BASIC_BOX_CHANCE: 0.0,
};

export const PITY_CONFIG = {
  PREMIUM_BOX_PITY_THRESHOLD: 5,
  ELIGIBLE_PITY_RARITIES: ['Épico', 'Lendário', 'Mítico'] as Rarity[],
};

export const FRAGMENTS_CONFIG = {
  REQUIRED_TO_UNLOCK_OR_EVOLVE: 100,
  DUPLICATE_CONVERSION_RATES: {
    Comum: 10,
    Incomum: 15,
    Raro: 25,
    Épico: 35,
    Lendário: 50,
    Mítico: 75,
  } as Record<Rarity, number>,
};
