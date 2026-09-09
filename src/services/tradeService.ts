import { TradeOffer, NexaAsset, NexaUser } from '../types';
import { SecurityService } from './securityService';

export class TradeService {
  /**
   * Create a trade proposal
   */
  public static createTradeOffer(
    sender: NexaUser,
    receiver: NexaUser,
    offeredItems: NexaAsset[],
    offeredNXA: number,
    requestedItems: NexaAsset[],
    requestedNXA: number,
    note?: string
  ): TradeOffer {
    if (sender.id === receiver.id) {
      throw new Error('Não é possível criar uma proposta de troca com você mesmo.');
    }

    if (offeredItems.length === 0 && offeredNXA <= 0) {
      throw new Error('Você deve oferecer pelo menos um item ou tokens NXA.');
    }

    if (requestedItems.length === 0 && requestedNXA <= 0) {
      throw new Error('Você deve solicitar pelo menos um item ou tokens NXA.');
    }

    if (offeredNXA > 0) {
      SecurityService.validateSufficientBalance(sender, offeredNXA, 'NXA');
    }

    for (const item of offeredItems) {
      SecurityService.validateOwnership(item, sender.id);
      SecurityService.validateAssetAvailable(item);
    }

    const trade: TradeOffer = {
      id: `trd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      senderId: sender.id,
      senderName: sender.username,
      receiverId: receiver.id,
      receiverName: receiver.username,
      offeredItems: offeredItems.map((item) => ({ ...item, status: 'TRADING' })),
      offeredNXA: Math.max(0, offeredNXA),
      requestedItems,
      requestedNXA: Math.max(0, requestedNXA),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      note: note || '',
    };

    return trade;
  }

  /**
   * Execute atomic acceptance of trade offer
   */
  public static executeAccept(
    trade: TradeOffer,
    currentUser: NexaUser
  ) {
    if (trade.status !== 'PENDING') {
      throw new Error('Esta proposta de troca não está mais ativa.');
    }

    if (trade.receiverId !== currentUser.id) {
      throw new Error('Apenas o destinatário da proposta pode aceitá-la.');
    }

    // Check receiver NXA if requested
    if (trade.requestedNXA > 0) {
      SecurityService.validateSufficientBalance(currentUser, trade.requestedNXA, 'NXA');
    }

    // Swap items ownership
    const itemsTransferredToReceiver = trade.offeredItems.map((item) => ({
      ...item,
      ownerId: trade.receiverId,
      ownerName: trade.receiverName,
      status: 'IDLE' as const,
    }));

    const itemsTransferredToSender = trade.requestedItems.map((item) => ({
      ...item,
      ownerId: trade.senderId,
      ownerName: trade.senderName,
      status: 'IDLE' as const,
    }));

    return {
      itemsTransferredToReceiver,
      itemsTransferredToSender,
      receiverNXAChange: trade.offeredNXA - trade.requestedNXA,
      senderNXAChange: trade.requestedNXA - trade.offeredNXA,
    };
  }
}
