import { Rarity } from '../types';

export interface FusionTierRule {
  inputRarity: Rarity;
  outputRarity: Rarity;
  requiredItemsCount: number; // usually 3
  costNEX: number;
  successRate: number; // 1 = 100%, 0.65 = 65%
  bonusPowerMultiplier: number;
}

export const NEXT_RARITY_MAP: Partial<Record<Rarity, Rarity>> = {
  Comum: 'Incomum',
  Incomum: 'Raro',
  Raro: 'Épico',
  Épico: 'Lendário',
  Lendário: 'Mítico',
};

export const FUSION_RULES: Record<Rarity, FusionTierRule | null> = {
  Comum: {
    inputRarity: 'Comum',
    outputRarity: 'Incomum',
    requiredItemsCount: 3,
    costNEX: 300,
    successRate: 1.0,
    bonusPowerMultiplier: 1.25,
  },
  Incomum: {
    inputRarity: 'Incomum',
    outputRarity: 'Raro',
    requiredItemsCount: 3,
    costNEX: 800,
    successRate: 1.0,
    bonusPowerMultiplier: 1.35,
  },
  Raro: {
    inputRarity: 'Raro',
    outputRarity: 'Épico',
    requiredItemsCount: 3,
    costNEX: 2500,
    successRate: 1.0,
    bonusPowerMultiplier: 1.5,
  },
  Épico: {
    inputRarity: 'Épico',
    outputRarity: 'Lendário',
    requiredItemsCount: 3,
    costNEX: 7500,
    successRate: 0.70,
    bonusPowerMultiplier: 1.8,
  },
  Lendário: {
    inputRarity: 'Lendário',
    outputRarity: 'Mítico',
    requiredItemsCount: 3,
    costNEX: 20000,
    successRate: 0.45,
    bonusPowerMultiplier: 2.2,
  },
  Mítico: null, // Maximum rarity achieved
};
