import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mapRowToCard, mapRowToListing } from '../lib/supabaseMappers';
import { SupabaseService } from './supabaseService';
import { Card, CardFragment, FragmentListing, NexaAsset } from '../types';
import { CardFragmentService } from './cardFragmentService';

export type MarketplaceOperation = 'CREATE' | 'BUY' | 'CANCEL';
export type FragmentMarketplaceOperation = MarketplaceOperation;

interface FragmentListingRow {
  id: string;
  templateId: string;
  name: string;
  rarity: FragmentListing['cardRarity'];
  image: string;
  collectionId: string;
  collectionName: string;
  quantity: number | string;
  price: number | string;
  sellerId: string;
  sellerName: string;
  status: FragmentListing['status'];
  createdAt: string;
}

function mapFragmentListing(row: FragmentListingRow): FragmentListing {
  return {
    id: row.id,
    templateId: row.templateId,
    cardName: row.name,
    cardRarity: row.rarity,
    cardImage: row.image,
    collectionId: row.collectionId,
    collectionName: row.collectionName,
    quantity: Number(row.quantity),
    price: Number(row.price),
    sellerId: row.sellerId,
    sellerName: row.sellerName,
    status: row.status,
    createdAt: row.createdAt,
  };
}

function createSecureRequestId(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  if (typeof cryptoApi?.getRandomValues !== 'function') {
    throw new Error('Não foi possível gerar um request ID seguro. Use um navegador com suporte a criptografia.');
  }
  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// UI eligibility only. PostgreSQL revalidates the actual Card under locks.
export function canSellOnlineCard(asset: NexaAsset): boolean {
  return asset.type === 'Card' && asset.status === 'IDLE' && asset.state === 'FREE'
    && asset.cardStatus === 'FREE' && asset.tradeable === true
    && !asset.synthesizedAt && !asset.lastAccrualAt && !asset.exhaustedAt;
}

export class MarketplaceOnlineService {
  public static async fetchCards(userId: string) {
    const { data, error } = await supabase.from('user_cards').select('*').eq('owner_id', userId);
    if (error) throw new Error(error.message);
    if (!Array.isArray(data)) throw new Error('Inventário remoto inválido.');
    return data.map(mapRowToCard);
  }

  public static async refresh(userId: string) {
    if (!isSupabaseConfigured()) throw new Error('Marketplace online indisponível.');
    const [cards, listings, profile] = await Promise.all([
      supabase.from('user_cards').select('*').eq('owner_id', userId),
      supabase.rpc('fetch_marketplace_listings_v2'),
      SupabaseService.fetchRemoteProfile(userId),
    ]);
    for (const response of [cards, listings]) {
      if (response.error) throw new Error(response.error.message);
    }
    if (profile === null) throw new Error('Perfil remoto não encontrado.');
    if (!Array.isArray(cards.data) || !Array.isArray(listings.data) || profile.id !== userId) {
      throw new Error('Estado remoto do Marketplace inválido.');
    }
    return { cards: cards.data.map(mapRowToCard), listings: listings.data.map(mapRowToListing),
      profile };
  }

  public static async execute(userId: string, operation: MarketplaceOperation, subject: string, price?: number) {
    if (!isSupabaseConfigured()) throw new Error('Marketplace online indisponível.');
    if (operation === 'CREATE' && (typeof price !== 'number' || !Number.isFinite(price)
      || price <= 0 || price > 1000000 || !/^\d+(\.\d{1,2})?$/.test(String(price)))) {
      throw new Error('Informe um preço entre 0,01 e 1.000.000 NXA, com até duas casas decimais.');
    }
    // Save before sending. Storage failure aborts, rather than losing a retry token.
    const key = 'nexa_marketplace_pending_v2:' + JSON.stringify([userId, operation, subject, price ?? null]);
    let requestId = localStorage.getItem(key);
    if (!requestId) {
      requestId = createSecureRequestId();
      localStorage.setItem(key, requestId);
    }
    const rpc = operation === 'CREATE' ? 'create_marketplace_listing_v2'
      : operation === 'BUY' ? 'buy_marketplace_listing_v2' : 'cancel_marketplace_listing_v2';
    const args = operation === 'CREATE'
      ? { p_card_id: subject, p_price: price, p_request_id: requestId }
      : { p_listing_id: subject, p_request_id: requestId };
    const { data, error } = await supabase.rpc(rpc, args);
    if (error) throw new Error(error.message);
    if (data?.success !== true || data.operation !== operation) throw new Error('Operação não confirmada pelo servidor.');
    // A replay result may describe an asset subsequently sold/consumed. Read current
    // state instead of manufacturing inventory or balances from that old result.
    const state = await this.refresh(userId);
    localStorage.removeItem(key);
    return state;
  }

  public static async refreshFragments(userId: string): Promise<{
    fragments: CardFragment[];
    listings: FragmentListing[];
    profile: Awaited<ReturnType<typeof SupabaseService.fetchRemoteProfile>>;
  }> {
    if (!isSupabaseConfigured()) throw new Error('Marketplace de fragmentos indisponível.');
    const [fragments, listings, profile] = await Promise.all([
      CardFragmentService.refreshOnline(userId),
      supabase.rpc('fetch_fragment_listings_v1'),
      SupabaseService.fetchRemoteProfile(userId),
    ]);
    if (listings.error) throw new Error(listings.error.message);
    if (!Array.isArray(listings.data) || profile === null || profile.id !== userId) {
      throw new Error('Estado remoto dos fragmentos inválido.');
    }
    return {
      fragments,
      listings: (listings.data as FragmentListingRow[]).map(mapFragmentListing),
      profile,
    };
  }

  public static async executeFragment(
    userId: string,
    operation: FragmentMarketplaceOperation,
    subject: string,
    quantity?: number,
    price?: number,
  ) {
    if (!isSupabaseConfigured()) throw new Error('Marketplace de fragmentos indisponível.');
    if (operation === 'CREATE') {
      if (!Number.isSafeInteger(quantity) || (quantity ?? 0) <= 0) {
        throw new Error('Informe uma quantidade inteira de fragmentos.');
      }
      if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0 || price > 1000000
        || !/^\d+(\.\d{1,2})?$/.test(String(price))) {
        throw new Error('Informe um preço entre 0,01 e 1.000.000 NXA, com até duas casas decimais.');
      }
    }
    const key = 'nexa_fragment_market_pending_v1:'
      + JSON.stringify([userId, operation, subject, quantity ?? null, price ?? null]);
    let requestId = localStorage.getItem(key);
    if (!requestId) {
      requestId = createSecureRequestId();
      localStorage.setItem(key, requestId);
    }
    const rpc = operation === 'CREATE' ? 'create_fragment_listing_v1'
      : operation === 'BUY' ? 'buy_fragment_listing_v1' : 'cancel_fragment_listing_v1';
    const args = operation === 'CREATE'
      ? { p_template_id: subject, p_quantity: quantity, p_price_nxa: price, p_request_id: requestId }
      : { p_listing_id: subject, p_request_id: requestId };
    const { data, error } = await supabase.rpc(rpc, args);
    if (error) throw new Error(error.message);
    if (data?.success !== true || data.operation !== operation) {
      throw new Error('Operação de fragmentos não confirmada pelo servidor.');
    }
    const state = await this.refreshFragments(userId);
    localStorage.removeItem(key);
    return state;
  }

  public static async craftCard(userId: string, templateId: string): Promise<{
    card: Card;
    fragments: CardFragment[];
  }> {
    if (!isSupabaseConfigured()) throw new Error('Craft online indisponível.');
    const key = 'nexa_fragment_craft_pending_v1:' + JSON.stringify([userId, templateId]);
    let requestId = localStorage.getItem(key);
    if (!requestId) {
      requestId = createSecureRequestId();
      localStorage.setItem(key, requestId);
    }
    const { data, error } = await supabase.rpc('craft_card_from_fragments_v1', {
      p_template_id: templateId,
      p_request_id: requestId,
    });
    if (error) throw new Error(error.message);
    if (data?.success !== true || data.operation !== 'CRAFT' || !data.card) {
      throw new Error('Craft não confirmado pelo servidor.');
    }
    const fragments = await CardFragmentService.refreshOnline(userId);
    localStorage.removeItem(key);
    return { card: mapRowToCard(data.card), fragments };
  }
}
