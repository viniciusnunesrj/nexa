import { NexaAsset } from './assets';

export type TradeStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export interface TradeOffer {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  offeredItems: NexaAsset[];
  offeredNXA: number;
  requestedItems: NexaAsset[];
  requestedNXA: number;
  status: TradeStatus;
  createdAt: string;
  expiresAt: string;
  note?: string;
}

export type TradeProposal = TradeOffer;
