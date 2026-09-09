import { Rarity } from '../types';

export interface DropRateItem {
  rarity: Rarity;
  rate: number;
  percentage: string;
  nxaRewardAvg: number;
  nexRewardAvg: number;
}

export const DROP_RATES: Record<Rarity, DropRateItem> = {
  Comum: {
    rarity: 'Comum',
    rate: 0.70,
    percentage: '70%',
    nxaRewardAvg: 15,
    nexRewardAvg: 120,
  },
  Incomum: {
    rarity: 'Incomum',
    rate: 0.18,
    percentage: '18%',
    nxaRewardAvg: 45,
    nexRewardAvg: 300,
  },
  Raro: {
    rarity: 'Raro',
    rate: 0.08,
    percentage: '8%',
    nxaRewardAvg: 120,
    nexRewardAvg: 800,
  },
  Épico: {
    rarity: 'Épico',
    rate: 0.03,
    percentage: '3%',
    nxaRewardAvg: 350,
    nexRewardAvg: 2500,
  },
  Lendário: {
    rarity: 'Lendário',
    rate: 0.009,
    percentage: '0.9%',
    nxaRewardAvg: 1200,
    nexRewardAvg: 8000,
  },
  Mítico: {
    rarity: 'Mítico',
    rate: 0.001,
    percentage: '0.1%',
    nxaRewardAvg: 5000,
    nexRewardAvg: 25000,
  },
};
