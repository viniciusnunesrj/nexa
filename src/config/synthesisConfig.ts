import { Rarity } from '../types';

/**
 * Configuração central de produção e tetos de síntese por raridade.
 * Conforme Requisitos 4 e 5:
 * 
 * Taxas de Produção:
 * - Comum: 1 NEX/h
 * - Incomum: 2 NEX/h
 * - Raro: 5 NEX/h
 * - Épico: 12 NEX/h
 * - Lendário: 30 NEX/h
 * - Mítico: 75 NEX/h
 * 
 * Limites Máximos (synthesisCap):
 * - Comum: 100 NEX
 * - Incomum: 250 NEX
 * - Raro: 750 NEX
 * - Épico: 2.000 NEX
 * - Lendário: 5.000 NEX
 * - Mítico: 15.000 NEX
 */

export interface SynthesisRarityConfig {
  ratePerHour: number;
  synthesisCap: number;
}

export const SYNTHESIS_CONFIG_BY_RARITY: Record<Rarity, SynthesisRarityConfig> = {
  Comum: {
    ratePerHour: 1,
    synthesisCap: 100,
  },
  Incomum: {
    ratePerHour: 2,
    synthesisCap: 250,
  },
  Raro: {
    ratePerHour: 5,
    synthesisCap: 750,
  },
  Épico: {
    ratePerHour: 12,
    synthesisCap: 2000,
  },
  Lendário: {
    ratePerHour: 30,
    synthesisCap: 5000,
  },
  Mítico: {
    ratePerHour: 75,
    synthesisCap: 15000,
  },
};

/**
 * Retorna a taxa de produção (NEX/h) padrão para a raridade da carta.
 */
export function getSynthesisRateForRarity(rarity: Rarity): number {
  return SYNTHESIS_CONFIG_BY_RARITY[rarity]?.ratePerHour ?? 1;
}

/**
 * Retorna a capacidade máxima (synthesisCap) padrão para a raridade da carta.
 */
export function getSynthesisCapForRarity(rarity: Rarity): number {
  return SYNTHESIS_CONFIG_BY_RARITY[rarity]?.synthesisCap ?? 100;
}
