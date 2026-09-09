export type LedgerType = 
  | 'BATTLE_REWARD' 
  | 'MARKET_BUY' 
  | 'MARKET_SALE' 
  | 'MARKET_FEE' 
  | 'FUSION_COST' 
  | 'SEASON_REWARD' 
  | 'TRADE_TRANSFER'
  | 'BOX_PURCHASE'
  | 'BOX_OPENED'
  | 'BOX_OPEN'
  | 'CARD_DUPLICATE'
  | 'SYNTHESIS_REWARD'
  | 'CARD_BURNED'
  | 'COLLECTION_REWARD'
  | 'LEVEL_UP'
  | 'LEVEL_REWARD';

export interface LedgerEntry {
  id: string;
  userId: string;
  userName: string;
  currency: 'NEX' | 'NXA';
  amount: number; // positive = credit, negative = debit
  balanceAfter: number;
  type: LedgerType;
  description: string;
  timestamp: string;
  cardId?: string;
  reason?: string;
  productionBefore?: number;
  productionAfter?: number;
}

export interface PricePoint {
  date: string;
  price: number;
  volume: number;
}

export interface MarketStats {
  currentFloorPrice: number;
  lastSalePrice: number;
  allTimeHigh: number;
  allTimeLow: number;
  salesVolume: number;
  totalVolumeNXA: number;
  totalSupply: number;
  listedCount: number;
  priceHistory: PricePoint[];
}

export interface FusionLog {
  id: string;
  userId: string;
  itemsUsedNames: string[];
  inputRarity: string;
  resultRarity: string;
  success: boolean;
  costNEX: number;
  resultItemName?: string;
  timestamp: string;
}
