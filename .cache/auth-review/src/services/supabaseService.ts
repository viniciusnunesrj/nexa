import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { NexaUser, Card, PlayerBox, LedgerEntry, Listing } from '../types';
import {
  mapProfileToNexaUser,
  mapNexaUserToProfileRow,
  mapRowToCard,
  mapCardToRow,
  mapRowToPlayerBox,
  mapPlayerBoxToRow,
  mapRowToLedgerEntry,
  mapLedgerEntryToRow,
  mapRowToListing,
  mapListingToRow,
} from '../lib/supabaseMappers';
import { MOCK_COMMUNITY_USERS, CURRENT_USER } from '../data/mockUsers';

class SupabaseServiceClass {
  private inMemoryProfiles: Map<string, NexaUser> = new Map();
  private inMemoryCards: Map<string, Card> = new Map();
  private inMemoryBoxes: Map<string, PlayerBox> = new Map();
  private inMemoryTransactions: LedgerEntry[] = [];
  private inMemoryListings: Map<string, Listing> = new Map();

  constructor() {
    // Seed in-memory baseline
    for (const u of MOCK_COMMUNITY_USERS) {
      this.inMemoryProfiles.set(u.id, u);
    }
    this.inMemoryProfiles.set(CURRENT_USER.id, CURRENT_USER);
  }

  // ==========================================================================
  // PROFILES & USERS
  // ==========================================================================

  public async fetchProfile(userId: string): Promise<NexaUser | null> {
    if (!userId) return null;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.warn('[SupabaseService] Erro ao buscar perfil:', error.message);
        } else if (data) {
          const user = mapProfileToNexaUser(data);
          this.inMemoryProfiles.set(user.id, user);
          return user;
        }
      } catch (err) {
        console.warn('[SupabaseService] Exceção ao consultar Supabase profiles:', err);
      }
    }

    return this.inMemoryProfiles.get(userId) || null;
  }

  public getProfileSync(userId: string): NexaUser | null {
    return this.inMemoryProfiles.get(userId) || null;
  }

  public async fetchAllProfiles(): Promise<NexaUser[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('level', { ascending: false });

        if (error) {
          console.warn('[SupabaseService] Erro ao buscar todos os perfis:', error.message);
        } else if (data && data.length > 0) {
          const users = data.map(mapProfileToNexaUser);
          for (const u of users) {
            this.inMemoryProfiles.set(u.id, u);
          }
          return users;
        }
      } catch (err) {
        console.warn('[SupabaseService] Exceção ao listar perfis:', err);
      }
    }

    return Array.from(this.inMemoryProfiles.values());
  }

  public async updateEditableProfile(
    userId: string,
    updates: Partial<Pick<NexaUser, 'username' | 'avatar' | 'bio' | 'title' | 'isFirstAccess'>>
  ): Promise<void> {
    const existing = this.inMemoryProfiles.get(userId);
    if (existing) {
      this.inMemoryProfiles.set(userId, { ...existing, ...updates });
    }

    if (isSupabaseConfigured()) {
      try {
        const payload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (updates.username !== undefined) payload.username = updates.username;
        if (updates.avatar !== undefined) payload.avatar = updates.avatar;
        if (updates.bio !== undefined) payload.bio = updates.bio;
        if (updates.title !== undefined) payload.title = updates.title;
        if (updates.isFirstAccess !== undefined) payload.is_first_access = updates.isFirstAccess;

        const { error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', userId);

        if (error) {
          console.warn('[SupabaseService] Erro ao atualizar perfil editável no Supabase:', error.message);
        }
      } catch (err) {
        console.warn('[SupabaseService] Exceção no updateEditableProfile:', err);
      }
    }
  }

  public async upsertProfile(user: NexaUser): Promise<NexaUser> {
    this.inMemoryProfiles.set(user.id, user);

    if (isSupabaseConfigured()) {
      try {
        // Verifica se o perfil já existe no Supabase
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (existing) {
          // NUNCA sobrescrever colunas econômicas via upsertProfile!
          // Atualiza apenas dados de perfil do usuário (bio, title, avatar, etc)
          await this.updateEditableProfile(user.id, {
            username: user.username,
            avatar: user.avatar,
            bio: user.bio,
            title: user.title,
            isFirstAccess: user.isFirstAccess,
          });
        } else {
          // Se for inserção inicial do perfil (novo registro)
          const row = mapNexaUserToProfileRow(user);
          const { error } = await supabase
            .from('profiles')
            .insert(row);

          if (error) {
            console.warn('[SupabaseService] Erro ao inserir perfil inicial no Supabase:', error.message);
          }
        }
      } catch (err) {
        console.warn('[SupabaseService] Exceção no upsertProfile seguro:', err);
      }
    }

    return user;
  }

  // ==========================================================================
  // CARDS & SYNTHESIS
  // ==========================================================================

  public async fetchUserCards(userId: string): Promise<Card[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('user_cards')
          .select('*')
          .eq('owner_id', userId);

        if (error) {
          console.warn('[SupabaseService] Erro ao carregar cartas:', error.message);
        } else if (data) {
          const cards = data.map(mapRowToCard);
          for (const c of cards) {
            this.inMemoryCards.set(c.id, c);
          }
          return cards;
        }
      } catch (err) {
        console.warn('[SupabaseService] Exceção ao carregar cartas:', err);
      }
    }

    return Array.from(this.inMemoryCards.values()).filter((c) => c.ownerId === userId);
  }

  public async saveCard(card: Card): Promise<void> {
    this.inMemoryCards.set(card.id, card);

    if (isSupabaseConfigured()) {
      try {
        const row = mapCardToRow(card);
        const { error } = await supabase
          .from('user_cards')
          .upsert(row, { onConflict: 'id' });

        if (error) {
          console.warn('[SupabaseService] Erro ao salvar carta no Supabase:', error.message);
        }
      } catch (err) {
        console.warn('[SupabaseService] Exceção ao salvar carta:', err);
      }
    }
  }

  public async deleteCard(cardId: string): Promise<void> {
    this.inMemoryCards.delete(cardId);

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('user_cards')
          .delete()
          .eq('id', cardId);

        if (error) {
          console.warn('[SupabaseService] Erro ao deletar carta no Supabase:', error.message);
        }
      } catch (err) {
        console.warn('[SupabaseService] Exceção ao deletar carta:', err);
      }
    }
  }

  // ==========================================================================
  // BOXES
  // ==========================================================================

  public async fetchUserBoxes(userId: string): Promise<PlayerBox[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('user_boxes')
          .select('*')
          .eq('owner_id', userId);

        if (error) {
          console.warn('[SupabaseService] Erro ao carregar caixas do Supabase:', error.message);
        } else if (data) {
          const boxes = data.map(mapRowToPlayerBox);
          for (const b of boxes) {
            this.inMemoryBoxes.set(b.id, b);
          }
          return boxes;
        }
      } catch (err) {
        console.warn('[SupabaseService] Exceção ao carregar caixas:', err);
      }
    }

    return Array.from(this.inMemoryBoxes.values()).filter((b) => b.ownerId === userId);
  }

  public async saveBox(box: PlayerBox): Promise<void> {
    this.inMemoryBoxes.set(box.id, box);

    if (isSupabaseConfigured()) {
      try {
        const row = mapPlayerBoxToRow(box);
        const { error } = await supabase
          .from('user_boxes')
          .upsert(row, { onConflict: 'id' });

        if (error) {
          console.warn('[SupabaseService] Erro ao salvar caixa:', error.message);
        }
      } catch (err) {
        console.warn('[SupabaseService] Exceção ao salvar caixa:', err);
      }
    }
  }

  public async deleteBox(boxId: string): Promise<void> {
    this.inMemoryBoxes.delete(boxId);

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('user_boxes')
          .delete()
          .eq('id', boxId);

        if (error) {
          console.warn('[SupabaseService] Erro ao remover caixa:', error.message);
        }
      } catch (err) {
        console.warn('[SupabaseService] Exceção ao remover caixa:', err);
      }
    }
  }

  // ==========================================================================
  // TRANSACTIONS & LEDGER
  // ==========================================================================

  public async fetchTransactions(userId?: string): Promise<LedgerEntry[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (userId) {
          query = query.eq('user_id', userId);
        }

        const { data, error } = await query;
        if (error) {
          console.warn('[SupabaseService] Erro ao buscar transações:', error.message);
        } else if (data) {
          return data.map(mapRowToLedgerEntry);
        }
      } catch (err) {
        console.warn('[SupabaseService] Exceção ao buscar transações:', err);
      }
    }

    return userId
      ? this.inMemoryTransactions.filter((t) => t.userId === userId)
      : this.inMemoryTransactions;
  }

  public async recordTransaction(entry: LedgerEntry): Promise<void> {
    this.inMemoryTransactions.unshift(entry);

    if (isSupabaseConfigured()) {
      try {
        const row = mapLedgerEntryToRow(entry);
        const { error } = await supabase.from('transactions').insert(row);
        if (error) {
          console.warn('[SupabaseService] Erro ao registrar transação:', error.message);
        }
      } catch (err) {
        console.warn('[SupabaseService] Exceção ao registrar transação:', err);
      }
    }
  }

  // ==========================================================================
  // MARKETPLACE LISTINGS
  // ==========================================================================

  public async fetchListings(): Promise<Listing[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('marketplace_listings')
          .select('*')
          .eq('status', 'ACTIVE')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[SupabaseService] Erro ao carregar anúncios:', error.message);
        } else if (data) {
          const listings = data.map(mapRowToListing);
          for (const l of listings) {
            this.inMemoryListings.set(l.id, l);
          }
          return listings;
        }
      } catch (err) {
        console.warn('[SupabaseService] Exceção ao buscar anúncios:', err);
      }
    }

    return Array.from(this.inMemoryListings.values());
  }

  public async createListing(listing: Listing): Promise<void> {
    this.inMemoryListings.set(listing.id, listing);

    if (isSupabaseConfigured()) {
      try {
        const row = mapListingToRow(listing);
        const { error } = await supabase.from('marketplace_listings').insert(row);
        if (error) {
          console.warn('[SupabaseService] Erro ao criar anúncio:', error.message);
        }
      } catch (err) {
        console.warn('[SupabaseService] Exceção ao criar anúncio:', err);
      }
    }
  }

  public async updateListing(listingId: string, updates: Partial<Listing>): Promise<void> {
    const existing = this.inMemoryListings.get(listingId);
    if (existing) {
      this.inMemoryListings.set(listingId, { ...existing, ...updates });
    }

    if (isSupabaseConfigured()) {
      try {
        const payload: Record<string, any> = {};
        if (updates.status) payload.status = updates.status;
        if ((updates as any).buyerId) payload.buyer_id = (updates as any).buyerId;
        if (updates.status === 'SOLD') payload.sold_at = new Date().toISOString();

        const { error } = await supabase
          .from('marketplace_listings')
          .update(payload)
          .eq('id', listingId);

        if (error) {
          console.warn('[SupabaseService] Erro ao atualizar anúncio:', error.message);
        }
      } catch (err) {
        console.warn('[SupabaseService] Exceção ao atualizar anúncio:', err);
      }
    }
  }

  // ==========================================================================
  // ATOMIC RPC METHODS (SECURITY DEFINER / SERVER-SIDE CONSISTENCY)
  // ==========================================================================

  public async purchaseBoxAtomic(params: {
    userId: string;
    boxId: string;
    boxType: string;
    boxName: string;
    costNex: number;
  }): Promise<{ success: boolean; newBalance?: number; boxId?: string; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase não configurado' };
    }

    try {
      const { data, error } = await supabase.rpc('purchase_box_atomic', {
        p_user_id: params.userId,
        p_box_id: params.boxId,
        p_box_type: params.boxType,
        p_box_name: params.boxName,
        p_cost_nex: params.costNex,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && typeof data === 'object') {
        if ((data as any).success === false) {
          return { success: false, error: (data as any).error || 'Falha na compra da caixa' };
        }
        return {
          success: true,
          newBalance: Number((data as any).new_balance),
          boxId: (data as any).box_id || params.boxId,
        };
      }
      return { success: false, error: 'Resposta inválida do servidor' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro de rede ao comprar caixa' };
    }
  }

  public async openBoxAtomic(params: {
    userId: string;
    boxId: string;
  }): Promise<{ success: boolean; boxType?: string; boxName?: string; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase não configurado' };
    }

    try {
      const { data, error } = await supabase.rpc('open_box_atomic', {
        p_user_id: params.userId,
        p_box_id: params.boxId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && typeof data === 'object') {
        if ((data as any).success === false) {
          return { success: false, error: (data as any).error || 'Falha ao consumir caixa' };
        }
        return {
          success: true,
          boxType: (data as any).box_type,
          boxName: (data as any).box_name,
        };
      }
      return { success: false, error: 'Resposta inválida do servidor' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro de conexão ao abrir caixa' };
    }
  }

  public async claimSynthesisAtomic(params: {
    userId: string;
    cardId: string;
    nexReward?: number;
  }): Promise<{ success: boolean; newBalance?: number; claimedNex?: number; cardName?: string; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase não configurado' };
    }

    try {
      const { data, error } = await supabase.rpc('claim_synthesis_and_burn_atomic', {
        p_user_id: params.userId,
        p_card_id: params.cardId,
        p_nex_reward: params.nexReward ?? null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && typeof data === 'object') {
        if ((data as any).success === false) {
          return { success: false, error: (data as any).error || 'Falha ao sacar síntese' };
        }
        return {
          success: true,
          newBalance: Number((data as any).new_balance),
          claimedNex: Number((data as any).claimed_nex),
          cardName: (data as any).card_name,
        };
      }
      return { success: false, error: 'Resposta inválida do servidor' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro de conexão ao resgatar síntese' };
    }
  }

  public async startSynthesisAtomic(params: {
    userId: string;
    cardId: string;
  }): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase não configurado' };
    }

    try {
      const { data, error } = await supabase.rpc('start_synthesis_atomic', {
        p_user_id: params.userId,
        p_card_id: params.cardId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && (data as any).success === false) {
        return { success: false, error: (data as any).error || 'Falha ao iniciar síntese' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro de rede' };
    }
  }

  public async buyMarketplaceListingAtomic(params: {
    listingId: string;
    buyerId: string;
  }): Promise<{
    success: boolean;
    buyerBalanceNxa?: number;
    sellerGainNxa?: number;
    feeNxa?: number;
    error?: string;
  }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase não configurado' };
    }

    try {
      const { data, error } = await supabase.rpc('buy_marketplace_listing_atomic', {
        p_listing_id: params.listingId,
        p_buyer_id: params.buyerId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && (data as any).success === false) {
        return { success: false, error: (data as any).error || 'Falha na compra' };
      }

      return {
        success: true,
        buyerBalanceNxa: Number((data as any).buyer_balance_nxa),
        sellerGainNxa: Number((data as any).seller_gain_nxa),
        feeNxa: Number((data as any).fee_nxa),
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro de conexão no marketplace' };
    }
  }

  public async applyBattleRewardAtomic(params: {
    userId: string;
    victory: boolean;
    nexGained: number;
    nxaGained: number;
    xpGained: number;
  }): Promise<{
    success: boolean;
    balanceNex?: number;
    balanceNxa?: number;
    level?: number;
    experience?: number;
    leveledUp?: boolean;
    error?: string;
  }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase não configurado' };
    }

    try {
      const { data, error } = await supabase.rpc('apply_battle_reward_atomic', {
        p_user_id: params.userId,
        p_victory: params.victory,
        p_nex_gained: params.nexGained,
        p_nxa_gained: params.nxaGained,
        p_xp_gained: params.xpGained,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && (data as any).success === false) {
        return { success: false, error: (data as any).error || 'Falha ao aplicar recompensa' };
      }

      return {
        success: true,
        balanceNex: Number((data as any).balance_nex),
        balanceNxa: Number((data as any).balance_nxa),
        level: Number((data as any).level),
        experience: Number((data as any).experience),
        leveledUp: Boolean((data as any).leveled_up),
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro de rede' };
    }
  }
}

export const supabaseService = new SupabaseServiceClass();
export const SupabaseService = supabaseService;
