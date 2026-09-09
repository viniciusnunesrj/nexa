import { Rarity, NexaAsset, Character, GameItem } from './assets';
import { Card } from './collections';

export type BoxType =
  | 'RECRUIT'
  | 'BASIC'
  | 'ADVANCED'
  | 'EPIC'
  | 'LEGENDARY'
  | 'GUARDIANS'
  | 'COLLECTION_DRAGONS'
  | 'COLLECTION_KNIGHTS'
  | 'COLLECTION_ABYSS'
  | 'COLLECTION_MAGES'
  | 'COLLECTION_GODS'
  | 'COLLECTION_COSMIC'
  | 'COLLECTION_HUNTERS'
  | 'PREMIUM';

export interface PlayerBox {
  id: string;
  boxType: BoxType;
  name: string;
  description: string;
  acquiredAt: string;
  ownerId: string;
  source: 'STARTER_KIT' | 'GAMEPLAY_DROP' | 'SHOP_PURCHASE' | 'SEASON_REWARD' | 'EVENT';
}

export interface CharacterFragment {
  id: string;
  fragmentId: string;
  characterId: string;
  characterName: string;
  characterClass: string;
  characterRarity: Rarity;
  characterImage: string;
  amount: number;
  ownerId: string;
  maxRequired: number; // Defaults to 100
  updatedAt: string;
}

export interface BoxDropProbabilities {
  Comum: number;
  Incomum: number;
  Raro: number;
  Épico: number;
  Lendário: number;
  Mítico: number;
}

export interface BoxDefinition {
  type: BoxType;
  name: string;
  tagline: string;
  description: string;
  priceNEX: number;
  priceNXA?: number;
  purchasableWithNEX: boolean;
  image: string;
  accentColor: string;
  glowColor: string;
  badge: string;
  possibleRarities: Rarity[];
  dropRates: BoxDropProbabilities;
  guarantees: string;
}

export interface BoxRewardSummary {
  boxId: string;
  boxType: BoxType;
  boxName: string;
  openedAt: string;
  assets: NexaAsset[];
  characters: Character[];
  items: GameItem[];
  cards?: Card[];
  fragments: CharacterFragment[];
  nexGained: number;
  nxaGained: number;
  highestRarity: Rarity;
  pityBefore: number;
  pityAfter: number;
  pityTriggered: boolean;
  duplicateCharactersConverted: Array<{
    characterName: string;
    fragmentsAwarded: number;
    totalFragmentsNow: number;
  }>;
  duplicateCardsConverted?: Array<{
    templateId?: string;
    cardName: string;
    rarity?: Rarity;
    fragmentsAwarded: number;
    totalFragmentsNow: number;
  }>;
}

export interface BoxHistoryRecord {
  id: string;
  userId: string;
  boxId: string;
  boxType: BoxType;
  boxName: string;
  timestamp: string;
  highestRarity: Rarity;
  rewardsSummary: string;
  itemsReceivedNames: string[];
  nexGained: number;
  pityBefore: number;
  pityAfter: number;
  pityTriggered: boolean;
}

export interface UserPityState {
  userId: string;
  premiumBoxPity: number; // 0 to 5
  updatedAt: string;
  boxesSinceLastEpicOrHigher?: number;
  totalBoxesOpened?: number;
  thresholdForGuaranteed?: number;
}
