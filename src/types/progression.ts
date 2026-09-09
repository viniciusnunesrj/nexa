import { BoxType } from './boxes';
import { Rarity, NexaClass } from './assets';

export type LevelRewardType =
  | 'BOX'
  | 'NEX'
  | 'NXA'
  | 'CHARACTER'
  | 'FEATURE_UNLOCK'
  | 'SLOT_UNLOCK'
  | 'EXCLUSIVE';

export interface LevelReward {
  level: number;
  type: LevelRewardType;
  name: string;
  description: string;
  icon: string;
  value?: number | string;
  boxType?: BoxType;
  unlockedSlots?: number;
  featureId?: 'COLLECTIONS' | 'SLOT_EXPANSION' | 'TITLES';
  characterDetails?: {
    name: string;
    class: NexaClass;
    rarity: Rarity;
    power: number;
    image: string;
  };
  badge?: string;
}

export interface LevelConfig {
  level: number;
  xpRequired: number; // XP to complete this level (transition to level + 1)
  cumulativeXp: number; // Total XP accumulated from level 1 to reach this level
}

export interface LevelUpResult {
  leveledUp: boolean;
  previousLevel: number;
  newLevel: number;
  levelsGained: number[];
  rewardsGranted: LevelReward[];
  unlockedSlots: number;
  previousSlots: number;
  newSlotsUnlocked: boolean;
  leftoverXp: number;
  maxXpForNewLevel: number;
}

export interface LevelUpRecord {
  id: string;
  userId: string;
  previousLevel: number;
  newLevel: number;
  reward: string;
  rewardsList: LevelReward[];
  timestamp: string;
}
