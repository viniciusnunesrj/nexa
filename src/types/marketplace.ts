import { NexaAsset } from './assets';

export const MARKETPLACE_FEE = 0.02; // 2%

export type ListingStatus = 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED';

export interface Listing {
  id: string;
  itemId: string;
  sellerId: string;
  sellerName: string;
  sellerAvatar?: string;
  price: number; // In NXA
  status: ListingStatus;
  createdAt: string;
  itemSnapshot: NexaAsset;
}

export interface NexaTransaction {
  id: string;
  listingId: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  itemSnapshot: NexaAsset;
  amount: number;
  fee: number;
  timestamp: string;
}
