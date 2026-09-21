import { LevelConfig, LevelReward } from '../types/progression';

/**
 * ============================================================================
 * LEVEL_CONFIG — Sistema Central de Experiência Progressiva do NEXA
 * ============================================================================
 * - Níveis iniciais rápidos, alimentados pelos jogos da Rede Nexus.
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
  1: { level: 1, type: 'EXCLUSIVE', name: 'Recruta Nexal', description: 'Entrada na progressão unificada da Rede Nexus. RIFT BATTLE e NEXUS DUEL alimentam o mesmo nível.', icon: 'N1', value: 'Recruta Nexal', badge: 'Início' },
  5: { level: 5, type: 'EXCLUSIVE', name: 'Operador Nexal', description: 'Marco de experiência na Rede Nexus. Libera o módulo de Coleções.', icon: 'N5', value: 'Operador Nexal', featureId: 'COLLECTIONS', badge: 'Coleções' },
  10: { level: 10, type: 'EXCLUSIVE', name: 'Combatente Nexal', description: 'Desbloqueia o quarto slot de síntese. Não aumenta Poder ou Dano das cartas.', icon: 'N10', value: 'Combatente Nexal', unlockedSlots: 4, badge: '4 Slots' },
  15: { level: 15, type: 'EXCLUSIVE', name: 'Veterano Nexus', description: 'Marco de veterania conquistado jogando RIFT BATTLE, NEXUS DUEL ou combinando os dois.', icon: 'N15', value: 'Veterano Nexus', badge: 'Veterano' },
  20: { level: 20, type: 'EXCLUSIVE', name: 'Elite Nexal', description: 'Desbloqueia o quinto slot de síntese mantendo as batalhas competitivamente equilibradas.', icon: 'N20', value: 'Elite Nexal', unlockedSlots: 5, badge: '5 Slots' },
  25: { level: 25, type: 'EXCLUSIVE', name: 'Comandante Nexus', description: 'Marco avançado de dedicação ao ecossistema de jogos NEXA.', icon: 'N25', value: 'Comandante Nexus', badge: 'Comandante' },
  30: { level: 30, type: 'EXCLUSIVE', name: 'Mestre do Vórtice', description: 'Desbloqueia o sexto e último slot de síntese.', icon: 'N30', value: 'Mestre do Vórtice', unlockedSlots: 6, badge: '6 Slots' },
  40: { level: 40, type: 'EXCLUSIVE', name: 'Lenda Nexus', description: 'Patente de alto prestígio pela progressão combinada em RIFT BATTLE e NEXUS DUEL.', icon: 'N40', value: 'Lenda Nexus', badge: 'Prestígio' },
  50: { level: 50, type: 'EXCLUSIVE', name: 'Lenda Cósmica Nexa', description: 'Prestígio máximo da conta. A vantagem é de status, não de força em batalha.', icon: 'N50', value: 'Lenda Cósmica Nexa', badge: 'Prestígio Máximo' },
};

/**
 * Obtém a recompensa configurada para um nível específico
 */
export function getLevelReward(level: number): LevelReward | undefined {
  return LEVEL_REWARDS[level];
}
