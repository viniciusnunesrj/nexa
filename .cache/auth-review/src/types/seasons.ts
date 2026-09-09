export type SeasonRewardType = 'NEX' | 'NXA' | 'ITEM' | 'TITLE';

export interface SeasonReward {
  level: number;
  type: SeasonRewardType;
  value: number | string;
  name: string;
  iconName?: string;
  isPremium: boolean;
}

export interface SeasonChallenge {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  progress: number;
  maxProgress: number;
  isCompleted: boolean;
  category: 'battle' | 'market' | 'fusion' | 'collection';
}

export interface SeasonConfig {
  id: string;
  name: string;
  editionLabel: string;
  slogan: string;
  startDate: string;
  endDate: string;
  maxLevel: number;
  xpPerLevel: number;
  rewards: SeasonReward[];
  challenges: SeasonChallenge[];
}
