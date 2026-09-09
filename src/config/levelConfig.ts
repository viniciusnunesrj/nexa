import { LevelConfig, LevelReward } from '../types/progression';

/**
 * ============================================================================
 * LEVEL_CONFIG — Sistema Central de Experiência Progressiva do NEXA
 * ============================================================================
 * - Níveis iniciais rápidos (2 a 4 vitórias na Arena).
 * - Dificuldade aumenta progressivamente para valorizar a progressão do jogador.
 * - Suporte até o nível 50 (Prestígio Máximo).
 * ============================================================================
 */
export const MAX_GAME_LEVEL = 50;

/**
 * Tabela com XP necessária para transitar de cada nível N para N+1
 */
export const LEVEL_CONFIG: Record<number, LevelConfig> = {
  1: { level: 1, xpRequired: 300, cumulativeXp: 0 },
  2: { level: 2, xpRequired: 450, cumulativeXp: 300 },
  3: { level: 3, xpRequired: 650, cumulativeXp: 750 },
  4: { level: 4, xpRequired: 900, cumulativeXp: 1400 },
  5: { level: 5, xpRequired: 1200, cumulativeXp: 2300 },
  6: { level: 6, xpRequired: 1550, cumulativeXp: 3500 },
  7: { level: 7, xpRequired: 1950, cumulativeXp: 5050 },
  8: { level: 8, xpRequired: 2400, cumulativeXp: 7000 },
  9: { level: 9, xpRequired: 2900, cumulativeXp: 9400 },
  10: { level: 10, xpRequired: 3500, cumulativeXp: 12300 },
  11: { level: 11, xpRequired: 4200, cumulativeXp: 15800 },
  12: { level: 12, xpRequired: 5000, cumulativeXp: 20000 },
  13: { level: 13, xpRequired: 5900, cumulativeXp: 25000 },
  14: { level: 14, xpRequired: 6900, cumulativeXp: 30900 },
  15: { level: 15, xpRequired: 8000, cumulativeXp: 37800 },
  16: { level: 16, xpRequired: 9200, cumulativeXp: 45800 },
  17: { level: 17, xpRequired: 10500, cumulativeXp: 55000 },
  18: { level: 18, xpRequired: 11900, cumulativeXp: 65500 },
  19: { level: 19, xpRequired: 13400, cumulativeXp: 77400 },
  20: { level: 20, xpRequired: 15000, cumulativeXp: 90800 },
  21: { level: 21, xpRequired: 16700, cumulativeXp: 105800 },
  22: { level: 22, xpRequired: 18500, cumulativeXp: 122500 },
  23: { level: 23, xpRequired: 20400, cumulativeXp: 141000 },
  24: { level: 24, xpRequired: 22400, cumulativeXp: 161400 },
  25: { level: 25, xpRequired: 24500, cumulativeXp: 183800 },
  26: { level: 26, xpRequired: 26700, cumulativeXp: 208300 },
  27: { level: 27, xpRequired: 29000, cumulativeXp: 235000 },
  28: { level: 28, xpRequired: 31400, cumulativeXp: 264000 },
  29: { level: 29, xpRequired: 33900, cumulativeXp: 295400 },
  30: { level: 30, xpRequired: 36500, cumulativeXp: 329300 },
  31: { level: 31, xpRequired: 39500, cumulativeXp: 365800 },
  32: { level: 32, xpRequired: 43000, cumulativeXp: 405300 },
  33: { level: 33, xpRequired: 47000, cumulativeXp: 448300 },
  34: { level: 34, xpRequired: 51500, cumulativeXp: 495300 },
  35: { level: 35, xpRequired: 56500, cumulativeXp: 546800 },
  36: { level: 36, xpRequired: 62000, cumulativeXp: 603300 },
  37: { level: 37, xpRequired: 68000, cumulativeXp: 665300 },
  38: { level: 38, xpRequired: 74500, cumulativeXp: 733300 },
  39: { level: 39, xpRequired: 81500, cumulativeXp: 807800 },
  40: { level: 40, xpRequired: 89000, cumulativeXp: 889300 },
  41: { level: 41, xpRequired: 97500, cumulativeXp: 978300 },
  42: { level: 42, xpRequired: 107000, cumulativeXp: 1075800 },
  43: { level: 43, xpRequired: 117500, cumulativeXp: 1182800 },
  44: { level: 44, xpRequired: 129000, cumulativeXp: 1300300 },
  45: { level: 45, xpRequired: 141500, cumulativeXp: 1429300 },
  46: { level: 46, xpRequired: 155000, cumulativeXp: 1570800 },
  47: { level: 47, xpRequired: 170000, cumulativeXp: 1725800 },
  48: { level: 48, xpRequired: 186500, cumulativeXp: 1895800 },
  49: { level: 49, xpRequired: 204500, cumulativeXp: 2082300 },
  50: { level: 50, xpRequired: 250000, cumulativeXp: 2286800 },
};

/**
 * Retorna a XP necessária para subir a partir do nível fornecido
 */
export function getXpRequiredForLevel(level: number): number {
  if (level >= MAX_GAME_LEVEL) {
    return LEVEL_CONFIG[MAX_GAME_LEVEL].xpRequired;
  }
  const config = LEVEL_CONFIG[level];
  if (config) return config.xpRequired;
  // Fallback exponencial caso ultrapasse nível tabelado
  return Math.floor(300 * Math.pow(1.18, level - 1));
}

/**
 * ============================================================================
 * SLOTS_CONFIG — Sistema de Capacidade Ativa por Nível
 * ============================================================================
 * Conforme especificação oficial:
 * - Level 1-9:   3 slots de síntese
 * - Level 10-19: 4 slots de síntese
 * - Level 20-29: 5 slots de síntese
 * - Level 30+:   6 slots de síntese
 * ============================================================================
 */
export const SLOTS_CONFIG = [
  { minLevel: 1, maxLevel: 9, slots: 3, description: '3 Slots Iniciais de Síntese' },
  { minLevel: 10, maxLevel: 19, slots: 4, description: '4 Slots de Síntese (Desbloqueado no Nv. 10)' },
  { minLevel: 20, maxLevel: 29, slots: 5, description: '5 Slots de Síntese (Desbloqueado no Nv. 20)' },
  { minLevel: 30, maxLevel: 999, slots: 6, description: '6 Slots Supremos de Síntese (Desbloqueado no Nv. 30)' },
];

export function getUnlockedSlotsForLevel(level: number): number {
  if (level >= 30) return 6;
  if (level >= 20) return 5;
  if (level >= 10) return 4;
  return 3;
}

export const getSlotsForLevel = getUnlockedSlotsForLevel;

/**
 * ============================================================================
 * LEVEL_REWARDS — Recompensas e Desbloqueios por Nível
 * ============================================================================
 * Configuração central facilmente expansível e customizável.
 * ============================================================================
 */
export const LEVEL_REWARDS: Record<number, LevelReward> = {
  1: {
    level: 1,
    type: 'BOX',
    name: 'Caixa de Recruta',
    description: 'Caixa inicial com herói e equipamento tático para o novato.',
    icon: '📦',
    boxType: 'RECRUIT',
    value: 'RECRUIT',
    badge: 'Boas-Vindas',
  },
  2: {
    level: 2,
    type: 'BOX',
    name: 'Caixa Comum',
    description: 'Caixa de suprimentos comum com cartas e itens táticos.',
    icon: '📦',
    boxType: 'BASIC',
    value: 'BASIC',
    badge: 'Caixa Comum',
  },
  3: {
    level: 3,
    type: 'NEX',
    name: '50 NEX',
    description: 'Crédito energético transferido para sua conta.',
    icon: '💰',
    value: 50,
    badge: 'Moeda',
  },
  4: {
    level: 4,
    type: 'NEX',
    name: '100 NEX',
    description: 'Suprimento financeiro adicional de créditos NEX.',
    icon: '💰',
    value: 100,
    badge: 'Moeda',
  },
  5: {
    level: 5,
    type: 'BOX',
    name: 'Caixa Rara',
    description: 'Caixa rara com taxas aprimoradas para relíquias e heróis raros.',
    icon: '📦',
    boxType: 'ADVANCED',
    value: 'ADVANCED',
    badge: 'Caixa Rara',
  },
  6: {
    level: 6,
    type: 'BOX',
    name: 'Caixa Básica',
    description: 'Caixa militar padrão com novos itens táticos.',
    icon: '📦',
    boxType: 'BASIC',
    value: 'BASIC',
    badge: 'Loot',
  },
  7: {
    level: 7,
    type: 'NEX',
    name: '100 NEX',
    description: 'Créditos NEX transferidos diretamente para o seu saldo.',
    icon: '💰',
    value: 100,
    badge: 'Moeda',
  },
  8: {
    level: 8,
    type: 'BOX',
    name: 'Caixa Especial',
    description: 'Caixa avançada com taxas aprimoradas para relíquias raras.',
    icon: '✨',
    boxType: 'ADVANCED',
    value: 'ADVANCED',
    badge: 'Especial',
  },
  9: {
    level: 9,
    type: 'NEX',
    name: '150 NEX + 20 NXA',
    description: 'Recompensa dupla de tokens para preparar o salto ao nível 10.',
    icon: '💎',
    value: 150,
    badge: 'Tokens',
  },
  10: {
    level: 10,
    type: 'CHARACTER',
    name: 'Personagem Raro + 100 NEX + Coleções',
    description: 'Heroína Valquíria Nova (Rara) + 100 NEX + Desbloqueio de Coleções + 4 Slots!',
    icon: '🎖️',
    value: 100,
    featureId: 'COLLECTIONS',
    unlockedSlots: 4,
    characterDetails: {
      name: 'Valquíria Nova',
      class: 'Guerreiro',
      rarity: 'Raro',
      power: 140,
      image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    },
    badge: 'Marco Épico',
  },
  11: {
    level: 11,
    type: 'NEX',
    name: '150 NEX',
    description: 'Créditos energéticos para manter a forja ativa.',
    icon: '💰',
    value: 150,
    badge: 'Moeda',
  },
  12: {
    level: 12,
    type: 'BOX',
    name: 'Caixa Básica',
    description: 'Caixa de suprimentos para expansão do arsenal.',
    icon: '📦',
    boxType: 'BASIC',
    value: 'BASIC',
    badge: 'Loot',
  },
  13: {
    level: 13,
    type: 'NEX',
    name: '200 NEX',
    description: 'Bolsa de créditos NEX adicionada à carteira.',
    icon: '💰',
    value: 200,
    badge: 'Moeda',
  },
  14: {
    level: 14,
    type: 'NEX',
    name: '200 NEX + 25 NXA',
    description: 'Recursos valiosos para aquisições no marketplace.',
    icon: '💎',
    value: 200,
    badge: 'Tokens',
  },
  15: {
    level: 15,
    type: 'BOX',
    name: 'Caixa Épica',
    description: 'Caixa Épica com garantias de relíquias ancestrais!',
    icon: '⚡',
    boxType: 'EPIC',
    value: 'EPIC',
    badge: 'Caixa Épica',
  },
  16: {
    level: 16,
    type: 'NEX',
    name: '250 NEX',
    description: 'Créditos para aprimoramento de cartas e fusões.',
    icon: '💰',
    value: 250,
    badge: 'Moeda',
  },
  17: {
    level: 17,
    type: 'BOX',
    name: 'Caixa Básica',
    description: 'Suprimentos da frota para combates avançados.',
    icon: '📦',
    boxType: 'BASIC',
    value: 'BASIC',
    badge: 'Loot',
  },
  18: {
    level: 18,
    type: 'NEX',
    name: '300 NEX',
    description: 'Créditos transferidos para o piloto veterano.',
    icon: '💰',
    value: 300,
    badge: 'Moeda',
  },
  19: {
    level: 19,
    type: 'NEX',
    name: '300 NEX + 30 NXA',
    description: 'Injeção de capital preparatória para a Caixa Premium.',
    icon: '💎',
    value: 300,
    badge: 'Tokens',
  },
  20: {
    level: 20,
    type: 'CHARACTER',
    name: 'Personagem Épico Ignis Prime',
    description: 'Herói Arcano Ignis Prime (Épico) + 5 Slots de Síntese Desbloqueados!',
    icon: '🔥',
    unlockedSlots: 5,
    characterDetails: {
      name: 'Ignis Prime',
      class: 'Mago',
      rarity: 'Épico',
      power: 280,
      image: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    },
    badge: 'Marco Lendário',
  },
  22: {
    level: 22,
    type: 'NEX',
    name: '400 NEX',
    description: 'Recompensa por maestria de combate.',
    icon: '💰',
    value: 400,
    badge: 'Moeda',
  },
  25: {
    level: 25,
    type: 'BOX',
    name: 'Caixa Lendária',
    description: 'Caixa Lendária com alta probabilidade de armas e fragmentos lendários!',
    icon: '✨',
    boxType: 'LEGENDARY',
    value: 'LEGENDARY',
    badge: 'Caixa Lendária',
  },
  28: {
    level: 28,
    type: 'BOX',
    name: 'Caixa Especial + 50 NXA',
    description: 'Caixa com taxas nobres e tokens raros NXA.',
    icon: '✨',
    boxType: 'ADVANCED',
    value: 'ADVANCED_50NXA',
    badge: 'Combo',
  },
  30: {
    level: 30,
    type: 'EXCLUSIVE',
    name: 'Título: Mestre do Vórtice',
    description: 'Título exclusivo de prestígio "Mestre do Vórtice" + 6 Slots Supremos!',
    icon: '👑',
    value: 'Mestre do Vórtice',
    unlockedSlots: 6,
    badge: 'Título Exclusivo',
  },
  35: {
    level: 35,
    type: 'NEX',
    name: '1.500 NEX + 100 NXA',
    description: 'Grande tesouro da Ordem dos Campeões.',
    icon: '💎',
    value: 1500,
    badge: 'Tesouro',
  },
  40: {
    level: 40,
    type: 'CHARACTER',
    name: 'Personagem Lendário Astraea Solar',
    description: 'Tecnomante Lendária Astraea Solar (Poder 550) concedida ao piloto!',
    icon: '⭐',
    characterDetails: {
      name: 'Astraea Solar',
      class: 'Tecnomante',
      rarity: 'Lendário',
      power: 550,
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    },
    badge: 'Lendário',
  },
  45: {
    level: 45,
    type: 'NEX',
    name: '2.500 NEX + 150 NXA',
    description: 'Reserva de energia de nível estelar para comandantes.',
    icon: '💎',
    value: 2500,
    badge: 'Estelar',
  },
  50: {
    level: 50,
    type: 'EXCLUSIVE',
    name: 'Recompensa Máxima: Caixa Mítica & Prestígio',
    description: 'Título Supremo "Lenda Cósmica Nexa" + Caixa Mítica + 5.000 NEX + 500 NXA!',
    icon: '🪐',
    boxType: 'PREMIUM',
    value: 5000,
    badge: 'Prestígio Máximo',
  },
};

/**
 * Obtém a recompensa configurada para um nível específico
 */
export function getLevelReward(level: number): LevelReward | undefined {
  return LEVEL_REWARDS[level];
}
