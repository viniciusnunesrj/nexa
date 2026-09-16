import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mapRowToCard, mapRowToLedgerEntry } from '../lib/supabaseMappers';
import { SupabaseService } from './supabaseService';
import type { TradeOffer } from '../types';
import type { OnlineTradeInput, TradeOperation } from '../types/trades';

function requestId(): string {
  const api = globalThis.crypto;
  if (typeof api?.randomUUID === 'function') return api.randomUUID();
  if (typeof api?.getRandomValues !== 'function') throw new Error('Não foi possível gerar um request ID seguro.');
  const bytes = api.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

function mapOffer(row: any, userId: string): TradeOffer {
  if (!row || typeof row.id !== 'string' || ![row.sender_id, row.receiver_id].includes(userId)
    || !Array.isArray(row.offered_items) || !Array.isArray(row.requested_items)
    || !['PENDING','ACCEPTED','REJECTED','CANCELLED','EXPIRED'].includes(row.status)
    || !Number.isFinite(Number(row.offered_nxa)) || !Number.isFinite(Number(row.requested_nxa))) {
    throw new Error('Proposta remota inválida.');
  }
  return { id: row.id, senderId: row.sender_id, receiverId: row.receiver_id,
    senderName: row.sender_name, receiverName: row.receiver_name,
    senderAvatar: row.sender_avatar || undefined, receiverAvatar: row.receiver_avatar || undefined,
    offeredItems: row.offered_items.map(mapRowToCard), requestedItems: row.requested_items.map(mapRowToCard),
    offeredNXA: Number(row.offered_nxa), requestedNXA: Number(row.requested_nxa), status: row.status,
    createdAt: row.created_at, expiresAt: row.expires_at, note: row.note || '' };
}

export class TradeOnlineService {
  private static async assertSession(userId: string) {
    if (!isSupabaseConfigured()) throw new Error('P2P online indisponível.');
    const { data, error } = await supabase.auth.getUser();
    if (error || !userId || data.user?.id !== userId) throw new Error('Sessão alterada. Entre na sua conta novamente.');
  }

  public static async fetchOffers(userId: string, offset = 0): Promise<TradeOffer[]> {
    await this.assertSession(userId);
    const { data, error } = await supabase.rpc('fetch_my_trade_offers_v2', { p_limit: 100, p_offset: offset });
    if (error) throw new Error(error.message);
    if (!Array.isArray(data)) throw new Error('Propostas remotas inválidas.');
    await this.assertSession(userId);
    return data.map(row => mapOffer(row, userId));
  }

  public static async fetchCandidates(userId: string, ownerId: string, offset = 0) {
    await this.assertSession(userId);
    const { data, error } = await supabase.rpc('fetch_trade_cards_v2', { p_owner_id: ownerId, p_limit: 100, p_offset: offset });
    if (error) throw new Error(error.message);
    if (!Array.isArray(data) || data.some(row => row.owner_id !== ownerId)) throw new Error('Cartas remotas inválidas.');
    await this.assertSession(userId);
    return data.map(mapRowToCard);
  }

  public static async refresh(userId: string) {
    await this.assertSession(userId);
    const [cards, profile, trades, ledger] = await Promise.all([
      supabase.from('user_cards').select('*').eq('owner_id', userId),
      SupabaseService.fetchRemoteProfile(userId), this.fetchOffers(userId),
      supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
    ]);
    if (cards.error) throw new Error(cards.error.message);
    if (ledger.error) throw new Error(ledger.error.message);
    if (!profile || profile.id !== userId || !Array.isArray(cards.data) || !Array.isArray(ledger.data)
      || cards.data.some(c => c.owner_id !== userId) || ledger.data.some(t => t.user_id !== userId)) {
      throw new Error('Estado remoto da troca inválido.');
    }
    await this.assertSession(userId);
    return { cards: cards.data.map(mapRowToCard), profile, trades, ledger: ledger.data.map(mapRowToLedgerEntry) };
  }

  public static async execute(userId: string, operation: TradeOperation, input: OnlineTradeInput | string) {
    await this.assertSession(userId);
    if (operation === 'CREATE') {
      if (typeof input === 'string' || input.receiverId === userId || !input.receiverId
        || !Array.isArray(input.offeredItemIds) || !Array.isArray(input.requestedItemIds)
        || input.offeredItemIds.length > 10 || input.requestedItemIds.length > 10
        || [input.offeredNXA,input.requestedNXA].some(n => !Number.isInteger(n) || n < 0 || n > 1000000)
        || (input.offeredItemIds.length === 0 && input.offeredNXA === 0)
        || (input.requestedItemIds.length === 0 && input.requestedNXA === 0)
        || (input.note || '').length > 500) throw new Error('Proposta inválida. Use até 10 cartas por lado e NXA inteiros.');
      const ids = [...input.offeredItemIds,...input.requestedItemIds];
      if (new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string' || !id.trim())) throw new Error('Cartas inválidas ou duplicadas.');
    } else if (!['ACCEPT','REJECT','CANCEL'].includes(operation) || typeof input !== 'string' || !input) {
      throw new Error('Operação de troca inválida.');
    }
    const intent = typeof input === 'string' ? input : { ...input,
      offeredItemIds: [...input.offeredItemIds].sort(), requestedItemIds: [...input.requestedItemIds].sort(), note: input.note || '' };
    // Storage contains retry identifiers, never authoritative offers or balances.
    const key = 'nexa_trade_pending_v2:' + JSON.stringify([userId,operation,intent]);
    let id = localStorage.getItem(key);
    if (!id) { id = requestId(); localStorage.setItem(key,id); }
    const args = typeof intent === 'string' ? { p_offer_id: intent, p_request_id: id } : {
      p_receiver_id: intent.receiverId, p_offered_card_ids: intent.offeredItemIds,
      p_requested_card_ids: intent.requestedItemIds, p_offered_nxa: intent.offeredNXA,
      p_requested_nxa: intent.requestedNXA, p_note: intent.note, p_request_id: id,
    };
    const rpc = { CREATE: 'create_trade_offer_v2', ACCEPT: 'accept_trade_offer_v2',
      REJECT: 'reject_trade_offer_v2', CANCEL: 'cancel_trade_offer_v2' }[operation];
    const { data, error } = await supabase.rpc(rpc,args);
    if (error) throw new Error(error.message);
    if (data?.success !== true || data.operation !== operation || typeof data.offer_id !== 'string') {
      throw new Error('Troca não confirmada pelo servidor.');
    }
    // Retain the retry token if refresh fails after commit. Never replay snapshots.
    const state = await this.refresh(userId);
    localStorage.removeItem(key);
    return state;
  }
}
