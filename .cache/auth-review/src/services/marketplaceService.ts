import { Listing, NexaAsset, NexaTransaction, NexaUser, MARKETPLACE_FEE } from '../types';
import { SecurityService } from './securityService';

export interface BuyListingResult {
  transaction: NexaTransaction;
  buyerBalanceAfter: number;
  sellerBalanceGain: number;
  feeAmount: number;
  transferredItem: NexaAsset;
}

export class MarketplaceService {
  /**
   * Create a new listing
   */
  public static createListing(
    item: NexaAsset,
    price: number,
    seller: NexaUser
  ): Listing {
    SecurityService.validatePositiveAmount(price, 'Preço de venda');
    SecurityService.validateOwnership(item, seller.id);
    SecurityService.validateAssetAvailable(item);

    const listing: Listing = {
      id: `list-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      itemId: item.id,
      sellerId: seller.id,
      sellerName: seller.username,
      sellerAvatar: seller.avatar,
      price: Math.floor(price),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      itemSnapshot: { ...item, status: 'LISTED' },
    };

    return listing;
  }

  /**
   * Buy an active listing
   */
  public static executeBuy(
    listing: Listing,
    buyer: NexaUser
  ): BuyListingResult {
    if (listing.status !== 'ACTIVE') {
      throw new Error('Este item não está mais disponível para compra no mercado.');
    }

    if (listing.sellerId === buyer.id) {
      throw new Error('Você não pode comprar um item listado por você mesmo.');
    }

    // Balance check
    SecurityService.validateSufficientBalance(buyer, listing.price, 'NXA');

    const feeAmount = Math.round(listing.price * MARKETPLACE_FEE * 100) / 100;
    const sellerGain = Math.round((listing.price - feeAmount) * 100) / 100;

    const transferredItem: NexaAsset = {
      ...listing.itemSnapshot,
      ownerId: buyer.id,
      ownerName: buyer.username,
      status: 'IDLE',
    };

    const transaction: NexaTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      listingId: listing.id,
      buyerId: buyer.id,
      buyerName: buyer.username,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      itemSnapshot: transferredItem,
      amount: listing.price,
      fee: feeAmount,
      timestamp: new Date().toISOString(),
    };

    return {
      transaction,
      buyerBalanceAfter: buyer.balanceNXA - listing.price,
      sellerBalanceGain: sellerGain,
      feeAmount,
      transferredItem,
    };
  }
}
