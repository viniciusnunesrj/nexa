import { getTemplateById } from '../config/collectionsData';
import { BoxRewardSummary, CardFragment, BoxHistoryRecord } from '../types';
import { supabase, isSupabaseConfigured, getSupabaseConfigurationError } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { NexaUser, Card, PlayerBox, LedgerEntry, Listing, Character, BattlePreferences, BattleRunResult } from '../types';
import {
  mapProfileToNexaUser,
  mapRowToCard,
  mapCardToRow,
  mapRowToPlayerBox,
  mapPlayerBoxToRow,
  mapRowToLedgerEntry,
  mapLedgerEntryToRow,
  mapRowToListing,
  mapListingToRow,
  mapRowToCharacter,
  mapRowToBattlePreferences,
} from '../lib/supabaseMappers';import { getTemplateById } from '../config/collectionsData';
import { BoxRewardSummary, CardFragment, BoxHistoryRecord } from '../types';
import { supabase, isSupabaseConfigured, getSupabaseConfigurationError } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { NexaUser, Card, PlayerBox, LedgerEntry, Listing, Character, BattlePreferences, BattleRunResult } from '../types';
import {
  mapProfileToNexaUser,
  mapRowToCard,
  mapCardToRow,
  mapRowToPlayerBox,
  mapPlayerBoxToRow,
  mapRowToLedgerEntry,
  mapLedgerEntryToRow,
  mapRowToListing,
  mapListingToRow,
  mapRowToCharacter,
  mapRowToBattlePreferences,
} from '../lib/supabaseMappers';
import { MOCK_COMMUNITY_USERS, CURRENT_USER } from '../data/mockUsers';

class SupabaseServiceClass {
  private inMemoryProfiles: Map<string, NexaUser> = new Map();
  private profileRevision = 0;

  public acceptConfirmedProfile(profile: NexaUser): void {
    this.profileRevision += 1;
    this.inMemoryProfiles.set(profile.id, profile);
  }
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

  /** Strict remote read for authentication. Never substitutes memory/demo data. */
  public async fetchRemoteProfile(userId: string): Promise<NexaUser | null> {
    const revision = this.profileRevision;
    const configurationError = getSupabaseConfigurationError();
    if (configurationError) throw new Error(configurationError);
    if (!userId) throw new Error('ID de usuário ausente.');
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw new Error('Falha ao verificar profiles no Supabase: ' + error.message);
    if (!data) return null;
    if (data.id !== userId) throw new Error('O perfil retornado não corresponde ao usuário autenticado.');
    if (revision !== this.profileRevision) {
      const confirmed = this.inMemoryProfiles.get(userId);
      if (confirmed) return confirmed;
    }
    const profile = mapProfileToNexaUser(data);
    this.inMemoryProfiles.set(profile.id, profile);
    return profile;
  }

  /** Called only with a user verified by Auth.getUser(). Existing progress is
   * never overwritten. Missing rows use database defaults and the user's RLS. */
  public async ensureAuthenticatedProfile(authUser: User): Promise<NexaUser> {
    const existing = await this.fetchRemoteProfile(authUser.id);
    if (existing) return existing;
    const username = authUser.user_metadata?.username;
    if (!authUser.email || typeof username !== 'string' || !username.trim()) {
      throw new Error('Conta autenticada, mas perfil ausente e metadados insuficientes para criá-lo.');
    }
    const { error } = await supabase.from('profiles').insert({
      id: authUser.id, email: authUser.email, username: username.trim(),
    });
    // Another auth callback may have created this same profile concurrently.
    if (error && error.code !== '23505') {
      throw new Error('Conta autenticada, mas não foi possível criar seu perfil: ' + error.message);
    }
    const profile = await this.fetchRemoteProfile(authUser.id);
    if (!profile) throw new Error('Conta autenticada, mas o perfil não foi confirmado em profiles.' + (error ? ' ' + error.message : ''));
    return profile;
  }

  public async fetchProfile(userId: string): Promise<NexaUser | null> {
    const revision = this.profileRevision;
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
          if (revision !== this.profileRevision) return this.getProfileSync(userId);
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
    if (isSupabaseConfigured()) throw new Error('Diretório legado desativado online. Use PublicProfileService.');
    return Array.from(this.inMemoryProfiles.values());
  }

  public async updateEditableProfile(
    userId: string,
    updates: Partial<Pick<NexaUser, 'username' | 'avatar' | 'bio' | 'title' | 'isFirstAccess'>>
  ): Promise<NexaUser> {
    const revision = this.profileRevision;
    const configurationError = getSupabaseConfigurationError();
    if (configurationError) throw new Error(configurationError);
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.username !== undefined) payload.username = updates.username;
    if (updates.avatar !== undefined) payload.avatar = updates.avatar;
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.isFirstAccess !== undefined) payload.is_first_access = updates.isFirstAccess;
    const { data, error } = await supabase.from('profiles').update(payload)
      .eq('id', userId).select('*').maybeSingle();
    if (error) throw new Error('Falha ao salvar perfil no Supabase: ' + error.message);
    if (!data || data.id !== userId) throw new Error('O Supabase não confirmou a atualização do perfil.');
    const profile = mapProfileToNexaUser(data);
    // Empty text is valid for an edited bio/title; do not replace it with defaults.
    for (const field of ['bio', 'title', 'avatar'] as const) {
      if (updates[field] !== undefined && typeof data[field] !== 'string') {
        throw new Error('O servidor retornou dados de perfil inválidos.');
      }
      if (typeof data[field] === 'string') profile[field] = data[field];
    }
    if (revision === this.profileRevision) this.acceptConfirmedProfile(profile);
    return profile;
  }

  public async upsertProfile(user: NexaUser): Promise<NexaUser> {
    const configurationError = getSupabaseConfigurationError();
    if (configurationError) throw new Error(configurationError);
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user || data.user.id !== user.id) throw new Error('Autenticação do proprietário necessária para gravar o perfil.');
    // Never upload local balances, XP or victories, even for missing profiles.
    await this.ensureAuthenticatedProfile(data.user);
    await this.updateEditableProfile(user.id, {
      username: user.username, avatar: user.avatar, bio: user.bio,
      title: user.title, isFirstAccess: user.isFirstAccess,
    });
    const confirmed = await this.fetchRemoteProfile(user.id);
    if (!confirmed) throw new Error('Perfil não confirmado após gravação.');
    return confirmed;
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
  // CHARACTERS & BATTLE PREFERENCES
  // ==========================================================================

  /** Returns null on an unavailable remote so callers can preserve offline state. */
  public async fetchUserCharacters(userId: string): Promise<Character[] | null> {
          if (!isSupabaseConfigured()) return null;

          try {
            const { data, error } = await supabase
              .from('user_characters')
              .select('*')
              .eq('owner_id', userId)
              .order('created_at', { ascending: true });

            if (error) {
              console.warn('[SupabaseService] Erro ao carregar personagens:', error.message);
              return null;
            }

            return (data || []).map(mapRowToCharacter);
          } catch (err) {
            console.warn('[SupabaseService] Exceção ao carregar personagens:', err);
            return null;
          }
        }

  public async ensureStarterCharacter(): Promise<Character | null> {
          if (!isSupabaseConfigured()) return null;

          try {
            const { data, error } = await supabase.rpc('ensure_starter_character');
            if (error) {
              console.warn('[SupabaseService] Erro ao garantir personagem inicial:', error.message);
              return null;
            }
            if (!data || typeof data !== 'object' || !(data as any).id) return null;
            return mapRowToCharacter(data);
          } catch (err) {
            console.warn('[SupabaseService] Exceção ao garantir personagem inicial:', err);
            return null;
          }
        }

  public async fetchBattlePreferences(userId: string): Promise<BattlePreferences | null> {
          if (!isSupabaseConfigured()) return null;

          try {
            const { data, error } = await supabase
              .from('battle_preferences')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle();

            if (error) {
              console.warn('[SupabaseService] Erro ao carregar preferências de batalha:', error.message);
              return null;
            }
            return data ? mapRowToBattlePreferences(data) : null;
          } catch (err) {
            console.warn('[SupabaseService] Exceção ao carregar preferências de batalha:', err);
            return null;
          }
        }

  public async saveBattlePreferences(
    mainCardId: string | null,
    battleTeamCardIds: string[]
  ): Promise<BattlePreferences> {
          const configurationError = getSupabaseConfigurationError();
          if (configurationError) throw new Error(configurationError);

          const { data, error } = await supabase.rpc('save_battle_preferences', {
            p_main_card_id: mainCardId,
            p_battle_team_card_ids: battleTeamCardIds,
          });
          if (error) throw new Error('Falha ao salvar preferências de batalha: ' + error.message);
          if (!data || typeof data !== 'object' || !(data as any).user_id) {
            throw new Error('O Supabase não confirmou as preferências de batalha.');
          }
          return mapRowToBattlePreferences(data);
  }

  public async startBattleAtomic(requestId: string): Promise<BattleRunResult> {
    const configurationError = getSupabaseConfigurationError();
    if (configurationError) throw new Error(configurationError);
    if (!requestId.trim()) throw new Error('request_id obrigatório para iniciar a batalha.');

    const { data, error } = await supabase.rpc('start_battle_atomic', {
      p_request_id: requestId,
    });
    if (error) throw new Error('Falha ao iniciar batalha server-side: ' + error.message);
    if (!data || typeof data !== 'object') {
      throw new Error('O Supabase não retornou o resultado da batalha.');
    }
    const raw = data as Record<string, unknown>;
    const result = raw as Partial<BattleRunResult>;
    if (result.success !== true || typeof result.run_id !== 'string') {
      throw new Error('Resultado de batalha inválido retornado pelo servidor.');
    }
    const mapSnapshot = (snapshot: unknown): BattleRunResult['playerTeam'] => {
      if (!Array.isArray(snapshot)) return [];
      return snapshot.map((entry) => {
        if (!entry || typeof entry !== 'object') {
          throw new Error('O Supabase retornou um combatente inválido.');
        }
        const row = entry as Record<string, unknown>;
        return {
          position: Number(row.position),
          id: String(row.id),
          name: String(row.name),
          rarity: String(row.rarity),
          power: Number(row.power),
          attack: Number(row.attack),
          defense: Number(row.defense),
          speed: Number(row.speed),
          maxHp: Number(row.max_hp ?? row.maxHp),
          hp: Number(row.hp),
          ...(row.leader === undefined ? {} : { leader: Boolean(row.leader) }),
          ...(row.template_id === undefined && row.templateId === undefined
            ? {}
            : { templateId: String(row.template_id ?? row.templateId) }),
        };
      });
    };
    const snapshots = {
      playerTeam: mapSnapshot(raw.player_snapshot ?? raw.playerTeam),
      enemyTeam: mapSnapshot(raw.npc_snapshot ?? raw.enemyTeam),
    };
    const hpById = new Map<string, number>(
      [...snapshots.playerTeam, ...snapshots.enemyTeam].map((combatant) => [combatant.id, combatant.hp])
    );
    const events = Array.isArray(raw.events)
      ? raw.events.map((entry) => {
          if (!entry || typeof entry !== 'object') {
            throw new Error('O Supabase retornou um evento de combate inválido.');
          }
          const row = entry as Record<string, unknown>;
          const defenderId = String(row.defender_id ?? row.defenderId);
          const currentHp = hpById.get(defenderId);
          if (currentHp === undefined) {
            throw new Error('O evento de combate referencia um defensor desconhecido.');
          }
          const defenderHpAfter = Number(row.defender_hp_after ?? row.defenderHpAfter);
          const defenderHpBefore = Number(row.defender_hp_before ?? row.defenderHpBefore ?? currentHp);
          hpById.set(defenderId, defenderHpAfter);
          return {
            round: Number(row.round),
            attackerSide: (row.attacker_side ?? row.attackerSide) as 'PLAYER' | 'NPC',
            attackerId: String(row.attacker_id ?? row.attackerId),
            defenderId,
            defenderHpBefore,
            defenderHpAfter,
            damage: Number(row.damage),
            defeated: defenderHpAfter <= 0,
          };
        })
      : [];
    const reward = (raw.rewards || {}) as Record<string, unknown>;
    const resultingProfileRaw = reward.resulting_profile ?? reward.resultingProfile;
    return {
      success: true,
      idempotent: Boolean(raw.idempotent),
      run_id: String(raw.run_id),
      formula_version: String(raw.formula_version),
      rng_seed: raw.rng_seed as string | number,
      outcome: raw.outcome as BattleRunResult['outcome'],
      rounds: Number(raw.rounds),
      events,
      ...snapshots,
      rewards: {
        success: Boolean(reward.success),
        outcome: reward.outcome as BattleRunResult['rewards']['outcome'],
        xpGained: Number(reward.xp_gained ?? reward.xpGained),
        nexGained: Number(reward.nex_gained ?? reward.nexGained),
        nxaGained: Number(reward.nxa_gained ?? reward.nxaGained),
        levelUps: Number(reward.level_ups ?? reward.levelUps),
        ...(reward.balance_nex === undefined ? {} : { balanceNex: Number(reward.balance_nex) }),
        ...(reward.balance_nxa === undefined ? {} : { balanceNxa: Number(reward.balance_nxa) }),
        ...(reward.experience === undefined ? {} : { experience: Number(reward.experience) }),
        ...(reward.level === undefined ? {} : { level: Number(reward.level) }),
        ...(resultingProfileRaw && typeof resultingProfileRaw === 'object'
          ? { resultingProfile: resultingProfileRaw as NexaUser }
          : {}),
      },
      drops: Array.isArray(raw.drops) ? raw.drops : [],
    };
  }

  // ==========================================================================
  // BOXES
  // ==========================================================================

  public async fetchUserBoxes(userId: string): Promise<PlayerBox[]> {
    if (!isSupabaseConfigured()) return Array.from(this.inMemoryBoxes.values()).filter(b => b.ownerId === userId);
    const { data, error } = await supabase.from('user_boxes').select('*').eq('owner_id', userId);
    if (error) throw new Error(error.message);
    return (data || []).map(mapRowToPlayerBox);
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

  public async purchaseBoxAtomic(params: { boxType: string; requestId: string }) {
    if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.rpc('purchase_box_v2', {
      p_box_type: params.boxType, p_request_id: params.requestId,
    });
    if (error) throw new Error(error.message);
    if (!data?.success || !data.box?.id || !Number.isFinite(Number(data.new_balance))) {
      throw new Error('Resposta de compra inválida; tente novamente com a mesma solicitação.');
    }
    return { box: mapRowToPlayerBox(data.box), newBalance: Number(data.new_balance) };
  }

  public async openBoxAtomic(params: { boxId: string; requestId: string }): Promise<BoxRewardSummary> {
    if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.rpc('open_box_v2', {
      p_box_id: params.boxId, p_request_id: params.requestId,
    });
    if (error) throw new Error(error.message);
    if (!data?.success || data.box_id !== params.boxId || !data.reward?.templateId ||
        (!data.card && !data.fragment)) throw new Error('Resposta de abertura inválida; repita a solicitação.');
    const cards = data.card ? [mapRowToCard(data.card)] : [];
    return {
      boxId: data.box_id, boxType: data.box_type, boxName: data.box_name, openedAt: data.opened_at,
      assets: cards, cards, items: [], characters: [], fragments: [],
      nexGained: 0, nxaGained: 0, highestRarity: data.reward.rarity,
      pityBefore: 0, pityAfter: 0, pityTriggered: false, duplicateCharactersConverted: [],
      rewardPreview: data.reward,
      duplicateCardsConverted: data.fragment ? [{
        templateId: data.reward.templateId, cardName: data.reward.name, rarity: data.reward.rarity,
        fragmentsAwarded: Number(data.fragments_awarded), totalFragmentsNow: Number(data.fragment.quantity),
      }] : [],
    };
  }

  public async fetchBoxHistory(userId: string): Promise<BoxHistoryRecord[]> {
    const { data, error } = await supabase.from('box_operations_v1').select('request_id,result')
      .eq('owner_id', userId).eq('operation', 'OPEN').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(row => {
      const r = row.result;
      return {
        id: row.request_id, userId, boxId: r.box_id, boxType: r.box_type, boxName: r.box_name,
        timestamp: r.opened_at, highestRarity: r.reward.rarity,
        rewardsSummary: r.fragment ? r.reward.name + ' → ' + r.fragments_awarded + ' fragmentos' : r.reward.name,
        itemsReceivedNames: [r.reward.name], nexGained: 0, pityBefore: 0, pityAfter: 0, pityTriggered: false,
      };
    });
  }

  public async fetchBoxInventoryCards(userId: string): Promise<Card[]> {
    const { data, error } = await supabase.from('user_cards').select('*').eq('owner_id', userId);
    if (error) throw new Error(error.message);
    return (data || []).map(mapRowToCard);
  }

  public async fetchCardFragments(userId: string): Promise<CardFragment[]> {
    if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.from('card_fragments').select('*').eq('owner_id', userId);
    if (error) throw new Error(error.message);
    return (data || []).map(row => ({
      id: row.owner_id + ':' + row.template_id, ownerId: row.owner_id, templateId: row.template_id,
      amount: Number(row.quantity), updatedAt: row.updated_at, maxRequired: 100,
      cardName: getTemplateById(row.template_id)?.name || row.template_id, cardRarity: getTemplateById(row.template_id)?.rarity || 'Comum', cardImage: getTemplateById(row.template_id)?.image || '', collectionId: getTemplateById(row.template_id)?.collectionId || '',
    }));
  }

  public async fetchSynthesisCards(userId: string): Promise<Card[]> {
    if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.from('user_cards').select('*').eq('owner_id', userId);
    if (error) throw new Error(error.message);
    if (!Array.isArray(data) || data.some(row => row.owner_id !== userId)) throw new Error('Inventário remoto inválido.');
    return data.map(mapRowToCard);
  }

  public async claimSynthesisAtomic(params: {
    userId: string;
    cardId: string;
  }): Promise<{ success: boolean; newBalance?: number; claimedNex?: number; cardName?: string; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase não configurado' };
    }

    try {
      const { data, error } = await supabase.rpc('claim_synthesis_and_burn_atomic', {
        p_user_id: params.userId,
        p_card_id: params.cardId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && typeof data === 'object' && data.success === true) {
        if (!['number', 'string'].includes(typeof data.new_balance) || !['number', 'string'].includes(typeof data.claimed_nex)
          || String(data.new_balance).trim() === '' || String(data.claimed_nex).trim() === ''
          || !Number.isFinite(Number(data.new_balance)) || Number(data.new_balance) < 0
          || !Number.isFinite(Number(data.claimed_nex)) || Number(data.claimed_nex) <= 0) {
          return { success: false, error: 'Valores de saque inválidos na resposta do servidor' };
        }
        return {
          success: true,
          newBalance: Number((data as any).new_balance),
          claimedNex: Number((data as any).claimed_nex),
          cardName: (data as any).card_name,
        };
      }
      return { success: false, error: data?.error || 'Resposta inválida do servidor' };
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

      if (!data || data.success !== true) {
        return { success: false, error: data?.error || 'Resposta inválida ao iniciar síntese' };
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
    profile?: NexaUser;
    error?: string;
  }> {
    void params;
    return {
      success: false,
      error: 'Recompensas de batalha são aplicadas exclusivamente por start_battle_atomic.',
    };
  }
}

export const supabaseService = new SupabaseServiceClass();
export const SupabaseService = supabaseService;
import { getTemplateById } from '../config/collectionsData';
import { BoxRewardSummary, CardFragment, BoxHistoryRecord } from '../types';
import { supabase, isSupabaseConfigured, getSupabaseConfigurationError } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { NexaUser, Card, PlayerBox, LedgerEntry, Listing, Character, BattlePreferences, BattleRunResult } from '../types';
import {
  mapProfileToNexaUser,
  mapRowToCard,
  mapCardToRow,
  mapRowToPlayerBox,
  mapPlayerBoxToRow,
  mapRowToLedgerEntry,
  mapLedgerEntryToRow,
  mapRowToListing,
  mapListingToRow,
  mapRowToCharacter,
  mapRowToBattlePreferences,
} from '../lib/supabaseMappers';
import { MOCK_COMMUNITY_USERS, CURRENT_USER } from '../data/mockUsers';

class SupabaseServiceClass {
  private inMemoryProfiles: Map<string, NexaUser> = new Map();
  private profileRevision = 0;

  public acceptConfirmedProfile(profile: NexaUser): void {
    this.profileRevision += 1;
    this.inMemoryProfiles.set(profile.id, profile);
  }
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

  /** Strict remote read for authentication. Never substitutes memory/demo data. */
  public async fetchRemoteProfile(userId: string): Promise<NexaUser | null> {
    const revision = this.profileRevision;
    const configurationError = getSupabaseConfigurationError();
    if (configurationError) throw new Error(configurationError);
    if (!userId) throw new Error('ID de usuário ausente.');
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw new Error('Falha ao verificar profiles no Supabase: ' + error.message);
    if (!data) return null;
    if (data.id !== userId) throw new Error('O perfil retornado não corresponde ao usuário autenticado.');
    if (revision !== this.profileRevision) {
      const confirmed = this.inMemoryProfiles.get(userId);
      if (confirmed) return confirmed;
    }
    const profile = mapProfileToNexaUser(data);
    this.inMemoryProfiles.set(profile.id, profile);
    return profile;
  }

  /** Called only with a user verified by Auth.getUser(). Existing progress is
   * never overwritten. Missing rows use database defaults and the user's RLS. */
  public async ensureAuthenticatedProfile(authUser: User): Promise<NexaUser> {
    const existing = await this.fetchRemoteProfile(authUser.id);
    if (existing) return existing;
    const username = authUser.user_metadata?.username;
    if (!authUser.email || typeof username !== 'string' || !username.trim()) {
      throw new Error('Conta autenticada, mas perfil ausente e metadados insuficientes para criá-lo.');
    }
    const { error } = await supabase.from('profiles').insert({
      id: authUser.id, email: authUser.email, username: username.trim(),
    });
    // Another auth callback may have created this same profile concurrently.
    if (error && error.code !== '23505') {
      throw new Error('Conta autenticada, mas não foi possível criar seu perfil: ' + error.message);
    }
    const profile = await this.fetchRemoteProfile(authUser.id);
    if (!profile) throw new Error('Conta autenticada, mas o perfil não foi confirmado em profiles.' + (error ? ' ' + error.message : ''));
    return profile;
  }

  public async fetchProfile(userId: string): Promise<NexaUser | null> {
    const revision = this.profileRevision;
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
          if (revision !== this.profileRevision) return this.getProfileSync(userId);
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
    if (isSupabaseConfigured()) throw new Error('Diretório legado desativado online. Use PublicProfileService.');
    return Array.from(this.inMemoryProfiles.values());
  }

  public async updateEditableProfile(
    userId: string,
    updates: Partial<Pick<NexaUser, 'username' | 'avatar' | 'bio' | 'title' | 'isFirstAccess'>>
  ): Promise<NexaUser> {
    const revision = this.profileRevision;
    const configurationError = getSupabaseConfigurationError();
    if (configurationError) throw new Error(configurationError);
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.username !== undefined) payload.username = updates.username;
    if (updates.avatar !== undefined) payload.avatar = updates.avatar;
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.isFirstAccess !== undefined) payload.is_first_access = updates.isFirstAccess;
    const { data, error } = await supabase.from('profiles').update(payload)
      .eq('id', userId).select('*').maybeSingle();
    if (error) throw new Error('Falha ao salvar perfil no Supabase: ' + error.message);
    if (!data || data.id !== userId) throw new Error('O Supabase não confirmou a atualização do perfil.');
    const profile = mapProfileToNexaUser(data);
    // Empty text is valid for an edited bio/title; do not replace it with defaults.
    for (const field of ['bio', 'title', 'avatar'] as const) {
      if (updates[field] !== undefined && typeof data[field] !== 'string') {
        throw new Error('O servidor retornou dados de perfil inválidos.');
      }
      if (typeof data[field] === 'string') profile[field] = data[field];
    }
    if (revision === this.profileRevision) this.acceptConfirmedProfile(profile);
    return profile;
  }

  public async upsertProfile(user: NexaUser): Promise<NexaUser> {
    const configurationError = getSupabaseConfigurationError();
    if (configurationError) throw new Error(configurationError);
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user || data.user.id !== user.id) throw new Error('Autenticação do proprietário necessária para gravar o perfil.');
    // Never upload local balances, XP or victories, even for missing profiles.
    await this.ensureAuthenticatedProfile(data.user);
    await this.updateEditableProfile(user.id, {
      username: user.username, avatar: user.avatar, bio: user.bio,
      title: user.title, isFirstAccess: user.isFirstAccess,
    });
    const confirmed = await this.fetchRemoteProfile(user.id);
    if (!confirmed) throw new Error('Perfil não confirmado após gravação.');
    return confirmed;
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
  // CHARACTERS & BATTLE PREFERENCES
  // ==========================================================================

  /** Returns null on an unavailable remote so callers can preserve offline state. */
  public async fetchUserCharacters(userId: string): Promise<Character[] | null> {
          if (!isSupabaseConfigured()) return null;

          try {
            const { data, error } = await supabase
              .from('user_characters')
              .select('*')
              .eq('owner_id', userId)
              .order('created_at', { ascending: true });

            if (error) {
              console.warn('[SupabaseService] Erro ao carregar personagens:', error.message);
              return null;
            }

            return (data || []).map(mapRowToCharacter);
          } catch (err) {
            console.warn('[SupabaseService] Exceção ao carregar personagens:', err);
            return null;
          }
        }

  public async ensureStarterCharacter(): Promise<Character | null> {
          if (!isSupabaseConfigured()) return null;

          try {
            const { data, error } = await supabase.rpc('ensure_starter_character');
            if (error) {
              console.warn('[SupabaseService] Erro ao garantir personagem inicial:', error.message);
              return null;
            }
            if (!data || typeof data !== 'object' || !(data as any).id) return null;
            return mapRowToCharacter(data);
          } catch (err) {
            console.warn('[SupabaseService] Exceção ao garantir personagem inicial:', err);
            return null;
          }
        }

  public async fetchBattlePreferences(userId: string): Promise<BattlePreferences | null> {
          if (!isSupabaseConfigured()) return null;

          try {
            const { data, error } = await supabase
              .from('battle_preferences')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle();

            if (error) {
              console.warn('[SupabaseService] Erro ao carregar preferências de batalha:', error.message);
              return null;
            }
            return data ? mapRowToBattlePreferences(data) : null;
          } catch (err) {
            console.warn('[SupabaseService] Exceção ao carregar preferências de batalha:', err);
            return null;
          }
        }

  public async saveBattlePreferences(
    mainCardId: string | null,
    battleTeamCardIds: string[]
  ): Promise<BattlePreferences> {
          const configurationError = getSupabaseConfigurationError();
          if (configurationError) throw new Error(configurationError);

          const { data, error } = await supabase.rpc('save_battle_preferences', {
            p_main_card_id: mainCardId,
            p_battle_team_card_ids: battleTeamCardIds,
          });
          if (error) throw new Error('Falha ao salvar preferências de batalha: ' + error.message);
          if (!data || typeof data !== 'object' || !(data as any).user_id) {
            throw new Error('O Supabase não confirmou as preferências de batalha.');
          }
          return mapRowToBattlePreferences(data);
  }

  public async startBattleAtomic(requestId: string): Promise<BattleRunResult> {
    const configurationError = getSupabaseConfigurationError();
    if (configurationError) throw new Error(configurationError);
    if (!requestId.trim()) throw new Error('request_id obrigatório para iniciar a batalha.');

    const { data, error } = await supabase.rpc('start_battle_atomic', {
      p_request_id: requestId,
    });
    if (error) throw new Error('Falha ao iniciar batalha server-side: ' + error.message);
    if (!data || typeof data !== 'object') {
      throw new Error('O Supabase não retornou o resultado da batalha.');
    }
    const raw = data as Record<string, unknown>;
    const result = raw as Partial<BattleRunResult>;
    if (result.success !== true || typeof result.run_id !== 'string') {
      throw new Error('Resultado de batalha inválido retornado pelo servidor.');
    }
    const mapSnapshot = (snapshot: unknown): BattleRunResult['playerTeam'] => {
      if (!Array.isArray(snapshot)) return [];
      return snapshot.map((entry) => {
        if (!entry || typeof entry !== 'object') {
          throw new Error('O Supabase retornou um combatente inválido.');
        }
        const row = entry as Record<string, unknown>;
        return {
          position: Number(row.position),
          id: String(row.id),
          name: String(row.name),
          rarity: String(row.rarity),
          power: Number(row.power),
          attack: Number(row.attack),
          defense: Number(row.defense),
          speed: Number(row.speed),
          maxHp: Number(row.max_hp ?? row.maxHp),
          hp: Number(row.hp),
          ...(row.leader === undefined ? {} : { leader: Boolean(row.leader) }),
          ...(row.template_id === undefined && row.templateId === undefined
            ? {}
            : { templateId: String(row.template_id ?? row.templateId) }),
        };
      });
    };
    const snapshots = {
      playerTeam: mapSnapshot(raw.player_snapshot ?? raw.playerTeam),
      enemyTeam: mapSnapshot(raw.npc_snapshot ?? raw.enemyTeam),
    };
    const hpById = new Map<string, number>(
      [...snapshots.playerTeam, ...snapshots.enemyTeam].map((combatant) => [combatant.id, combatant.hp])
    );
    const events = Array.isArray(raw.events)
      ? raw.events.map((entry) => {
          if (!entry || typeof entry !== 'object') {
            throw new Error('O Supabase retornou um evento de combate inválido.');
          }
          const row = entry as Record<string, unknown>;
          const defenderId = String(row.defender_id ?? row.defenderId);
          const currentHp = hpById.get(defenderId);
          if (currentHp === undefined) {
            throw new Error('O evento de combate referencia um defensor desconhecido.');
          }
          const defenderHpAfter = Number(row.defender_hp_after ?? row.defenderHpAfter);
          const defenderHpBefore = Number(row.defender_hp_before ?? row.defenderHpBefore ?? currentHp);
          hpById.set(defenderId, defenderHpAfter);
          return {
            round: Number(row.round),
            attackerSide: (row.attacker_side ?? row.attackerSide) as 'PLAYER' | 'NPC',
            attackerId: String(row.attacker_id ?? row.attackerId),
            defenderId,
            defenderHpBefore,
            defenderHpAfter,
            damage: Number(row.damage),
            defeated: defenderHpAfter <= 0,
          };
        })
      : [];
    const reward = (raw.rewards || {}) as Record<string, unknown>;
    const resultingProfileRaw = reward.resulting_profile ?? reward.resultingProfile;
    return {
      success: true,
      idempotent: Boolean(raw.idempotent),
      run_id: String(raw.run_id),
      formula_version: String(raw.formula_version),
      rng_seed: raw.rng_seed as string | number,
      outcome: raw.outcome as BattleRunResult['outcome'],
      rounds: Number(raw.rounds),
      events,
      ...snapshots,
      rewards: {
        success: Boolean(reward.success),
        outcome: reward.outcome as BattleRunResult['rewards']['outcome'],
        xpGained: Number(reward.xp_gained ?? reward.xpGained),
        nexGained: Number(reward.nex_gained ?? reward.nexGained),
        nxaGained: Number(reward.nxa_gained ?? reward.nxaGained),
        levelUps: Number(reward.level_ups ?? reward.levelUps),
        ...(reward.balance_nex === undefined ? {} : { balanceNex: Number(reward.balance_nex) }),
        ...(reward.balance_nxa === undefined ? {} : { balanceNxa: Number(reward.balance_nxa) }),
        ...(reward.experience === undefined ? {} : { experience: Number(reward.experience) }),
        ...(reward.level === undefined ? {} : { level: Number(reward.level) }),
        ...(resultingProfileRaw && typeof resultingProfileRaw === 'object'
          ? { resultingProfile: resultingProfileRaw as NexaUser }
          : {}),
      },
      drops: Array.isArray(raw.drops) ? raw.drops : [],
    };
  }

  // ==========================================================================
  // BOXES
  // ==========================================================================

  public async fetchUserBoxes(userId: string): Promise<PlayerBox[]> {
    if (!isSupabaseConfigured()) return Array.from(this.inMemoryBoxes.values()).filter(b => b.ownerId === userId);
    const { data, error } = await supabase.from('user_boxes').select('*').eq('owner_id', userId);
    if (error) throw new Error(error.message);
    return (data || []).map(mapRowToPlayerBox);
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

  public async purchaseBoxAtomic(params: { boxType: string; requestId: string }) {
    if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.rpc('purchase_box_v2', {
      p_box_type: params.boxType, p_request_id: params.requestId,
    });
    if (error) throw new Error(error.message);
    if (!data?.success || !data.box?.id || !Number.isFinite(Number(data.new_balance))) {
      throw new Error('Resposta de compra inválida; tente novamente com a mesma solicitação.');
    }
    return { box: mapRowToPlayerBox(data.box), newBalance: Number(data.new_balance) };
  }

  public async openBoxAtomic(params: { boxId: string; requestId: string }): Promise<BoxRewardSummary> {
    if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.rpc('open_box_v2', {
      p_box_id: params.boxId, p_request_id: params.requestId,
    });
    if (error) throw new Error(error.message);
    if (!data?.success || data.box_id !== params.boxId || !data.reward?.templateId ||
        (!data.card && !data.fragment)) throw new Error('Resposta de abertura inválida; repita a solicitação.');
    const cards = data.card ? [mapRowToCard(data.card)] : [];
    return {
      boxId: data.box_id, boxType: data.box_type, boxName: data.box_name, openedAt: data.opened_at,
      assets: cards, cards, items: [], characters: [], fragments: [],
      nexGained: 0, nxaGained: 0, highestRarity: data.reward.rarity,
      pityBefore: 0, pityAfter: 0, pityTriggered: false, duplicateCharactersConverted: [],
      rewardPreview: data.reward,
      duplicateCardsConverted: data.fragment ? [{
        templateId: data.reward.templateId, cardName: data.reward.name, rarity: data.reward.rarity,
        fragmentsAwarded: Number(data.fragments_awarded), totalFragmentsNow: Number(data.fragment.quantity),
      }] : [],
    };
  }

  public async fetchBoxHistory(userId: string): Promise<BoxHistoryRecord[]> {
    const { data, error } = await supabase.from('box_operations_v1').select('request_id,result')
      .eq('owner_id', userId).eq('operation', 'OPEN').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(row => {
      const r = row.result;
      return {
        id: row.request_id, userId, boxId: r.box_id, boxType: r.box_type, boxName: r.box_name,
        timestamp: r.opened_at, highestRarity: r.reward.rarity,
        rewardsSummary: r.fragment ? r.reward.name + ' → ' + r.fragments_awarded + ' fragmentos' : r.reward.name,
        itemsReceivedNames: [r.reward.name], nexGained: 0, pityBefore: 0, pityAfter: 0, pityTriggered: false,
      };
    });
  }

  public async fetchBoxInventoryCards(userId: string): Promise<Card[]> {
    const { data, error } = await supabase.from('user_cards').select('*').eq('owner_id', userId);
    if (error) throw new Error(error.message);
    return (data || []).map(mapRowToCard);
  }

  public async fetchCardFragments(userId: string): Promise<CardFragment[]> {
    if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.from('card_fragments').select('*').eq('owner_id', userId);
    if (error) throw new Error(error.message);
    return (data || []).map(row => ({
      id: row.owner_id + ':' + row.template_id, ownerId: row.owner_id, templateId: row.template_id,
      amount: Number(row.quantity), updatedAt: row.updated_at, maxRequired: 100,
      cardName: getTemplateById(row.template_id)?.name || row.template_id, cardRarity: getTemplateById(row.template_id)?.rarity || 'Comum', cardImage: getTemplateById(row.template_id)?.image || '', collectionId: getTemplateById(row.template_id)?.collectionId || '',
    }));
  }

  public async fetchSynthesisCards(userId: string): Promise<Card[]> {
    if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.from('user_cards').select('*').eq('owner_id', userId);
    if (error) throw new Error(error.message);
    if (!Array.isArray(data) || data.some(row => row.owner_id !== userId)) throw new Error('Inventário remoto inválido.');
    return data.map(mapRowToCard);
  }

  public async claimSynthesisAtomic(params: {
    userId: string;
    cardId: string;
  }): Promise<{ success: boolean; newBalance?: number; claimedNex?: number; cardName?: string; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase não configurado' };
    }

    try {
      const { data, error } = await supabase.rpc('claim_synthesis_and_burn_atomic', {
        p_user_id: params.userId,
        p_card_id: params.cardId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && typeof data === 'object' && data.success === true) {
        if (!['number', 'string'].includes(typeof data.new_balance) || !['number', 'string'].includes(typeof data.claimed_nex)
          || String(data.new_balance).trim() === '' || String(data.claimed_nex).trim() === ''
          || !Number.isFinite(Number(data.new_balance)) || Number(data.new_balance) < 0
          || !Number.isFinite(Number(data.claimed_nex)) || Number(data.claimed_nex) <= 0) {
          return { success: false, error: 'Valores de saque inválidos na resposta do servidor' };
        }
        return {
          success: true,
          newBalance: Number((data as any).new_balance),
          claimedNex: Number((data as any).claimed_nex),
          cardName: (data as any).card_name,
        };
      }
      return { success: false, error: data?.error || 'Resposta inválida do servidor' };
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

      if (!data || data.success !== true) {
        return { success: false, error: data?.error || 'Resposta inválida ao iniciar síntese' };
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
    profile?: NexaUser;
    error?: string;
  }> {
    void params;
    return {
      success: false,
      error: 'Recompensas de batalha são aplicadas exclusivamente por start_battle_atomic.',
    };
  }
}

export const supabaseService = new SupabaseServiceClass();
export const SupabaseService = supabaseService;
import { MOCK_COMMUNITY_USERS, CURRENT_USER } from '../data/mockUsers';

class SupabaseServiceClass {
  private inMemoryProfiles: Map<string, NexaUser> = new Map();
  private profileRevision = 0;

  public acceptConfirmedProfile(profile: NexaUser): void {
    this.profileRevision += 1;
    this.inMemoryProfiles.set(profile.id, profile);
  }
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

  /** Strict remote read for authentication. Never substitutes memory/demo data. */
  public async fetchRemoteProfile(userId: string): Promise<NexaUser | null> {
    const revision = this.profileRevision;
    const configurationError = getSupabaseConfigurationError();
    if (configurationError) throw new Error(configurationError);
    if (!userId) throw new Error('ID de usuário ausente.');
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw new Error('Falha ao verificar profiles no Supabase: ' + error.message);
    if (!data) return null;
    if (data.id !== userId) throw new Error('O perfil retornado não corresponde ao usuário autenticado.');
    if (revision !== this.profileRevision) {
      const confirmed = this.inMemoryProfiles.get(userId);
      if (confirmed) return confirmed;
    }
    const profile = mapProfileToNexaUser(data);
    this.inMemoryProfiles.set(profile.id, profile);
    return profile;
  }

  /** Called only with a user verified by Auth.getUser(). Existing progress is
   * never overwritten. Missing rows use database defaults and the user's RLS. */
  public async ensureAuthenticatedProfile(authUser: User): Promise<NexaUser> {
    const existing = await this.fetchRemoteProfile(authUser.id);
    if (existing) return existing;
    const username = authUser.user_metadata?.username;
    if (!authUser.email || typeof username !== 'string' || !username.trim()) {
      throw new Error('Conta autenticada, mas perfil ausente e metadados insuficientes para criá-lo.');
    }
    const { error } = await supabase.from('profiles').insert({
      id: authUser.id, email: authUser.email, username: username.trim(),
    });
    // Another auth callback may have created this same profile concurrently.
    if (error && error.code !== '23505') {
      throw new Error('Conta autenticada, mas não foi possível criar seu perfil: ' + error.message);
    }
    const profile = await this.fetchRemoteProfile(authUser.id);
    if (!profile) throw new Error('Conta autenticada, mas o perfil não foi confirmado em profiles.' + (error ? ' ' + error.message : ''));
    return profile;
  }

  public async fetchProfile(userId: string): Promise<NexaUser | null> {
    const revision = this.profileRevision;
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
          if (revision !== this.profileRevision) return this.getProfileSync(userId);
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
    if (isSupabaseConfigured()) throw new Error('Diretório legado desativado online. Use PublicProfileService.');
    return Array.from(this.inMemoryProfiles.values());
  }

  public async updateEditableProfile(
    userId: string,
    updates: Partial<Pick<NexaUser, 'username' | 'avatar' | 'bio' | 'title' | 'isFirstAccess'>>
  ): Promise<NexaUser> {
    const revision = this.profileRevision;
    const configurationError = getSupabaseConfigurationError();
    if (configurationError) throw new Error(configurationError);
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.username !== undefined) payload.username = updates.username;
    if (updates.avatar !== undefined) payload.avatar = updates.avatar;
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.isFirstAccess !== undefined) payload.is_first_access = updates.isFirstAccess;
    const { data, error } = await supabase.from('profiles').update(payload)
      .eq('id', userId).select('*').maybeSingle();
    if (error) throw new Error('Falha ao salvar perfil no Supabase: ' + error.message);
    if (!data || data.id !== userId) throw new Error('O Supabase não confirmou a atualização do perfil.');
    const profile = mapProfileToNexaUser(data);
    // Empty text is valid for an edited bio/title; do not replace it with defaults.
    for (const field of ['bio', 'title', 'avatar'] as const) {
      if (updates[field] !== undefined && typeof data[field] !== 'string') {
        throw new Error('O servidor retornou dados de perfil inválidos.');
      }
      if (typeof data[field] === 'string') profile[field] = data[field];
    }
    if (revision === this.profileRevision) this.acceptConfirmedProfile(profile);
    return profile;
  }

  public async upsertProfile(user: NexaUser): Promise<NexaUser> {
    const configurationError = getSupabaseConfigurationError();
    if (configurationError) throw new Error(configurationError);
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user || data.user.id !== user.id) throw new Error('Autenticação do proprietário necessária para gravar o perfil.');
    // Never upload local balances, XP or victories, even for missing profiles.
    await this.ensureAuthenticatedProfile(data.user);
    await this.updateEditableProfile(user.id, {
      username: user.username, avatar: user.avatar, bio: user.bio,
      title: user.title, isFirstAccess: user.isFirstAccess,
    });
    const confirmed = await this.fetchRemoteProfile(user.id);
    if (!confirmed) throw new Error('Perfil não confirmado após gravação.');
    return confirmed;
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
  // CHARACTERS & BATTLE PREFERENCES
  // ==========================================================================

  /** Returns null on an unavailable remote so callers can preserve offline state. */
  public async fetchUserCharacters(userId: string): Promise<Character[] | null> {
          if (!isSupabaseConfigured()) return null;

          try {
            const { data, error } = await supabase
              .from('user_characters')
              .select('*')
              .eq('owner_id', userId)
              .order('created_at', { ascending: true });

            if (error) {
              console.warn('[SupabaseService] Erro ao carregar personagens:', error.message);
              return null;
            }

            return (data || []).map(mapRowToCharacter);
          } catch (err) {
            console.warn('[SupabaseService] Exceção ao carregar personagens:', err);
            return null;
          }
        }

  public async ensureStarterCharacter(): Promise<Character | null> {
          if (!isSupabaseConfigured()) return null;

          try {
            const { data, error } = await supabase.rpc('ensure_starter_character');
            if (error) {
              console.warn('[SupabaseService] Erro ao garantir personagem inicial:', error.message);
              return null;
            }
            if (!data || typeof data !== 'object' || !(data as any).id) return null;
            return mapRowToCharacter(data);
          } catch (err) {
            console.warn('[SupabaseService] Exceção ao garantir personagem inicial:', err);
            return null;
          }
        }

  public async fetchBattlePreferences(userId: string): Promise<BattlePreferences | null> {
          if (!isSupabaseConfigured()) return null;

          try {
            const { data, error } = await supabase
              .from('battle_preferences')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle();

            if (error) {
              console.warn('[SupabaseService] Erro ao carregar preferências de batalha:', error.message);
              return null;
            }
            return data ? mapRowToBattlePreferences(data) : null;
          } catch (err) {
            console.warn('[SupabaseService] Exceção ao carregar preferências de batalha:', err);
            return null;
          }
        }

  public async saveBattlePreferences(
    mainCardId: string | null,
    battleTeamCardIds: string[]
  ): Promise<BattlePreferences> {
          const configurationError = getSupabaseConfigurationError();
          if (configurationError) throw new Error(configurationError);

          const { data, error } = await supabase.rpc('save_battle_preferences', {
            p_main_card_id: mainCardId,
            p_battle_team_card_ids: battleTeamCardIds,
          });
          if (error) throw new Error('Falha ao salvar preferências de batalha: ' + error.message);
          if (!data || typeof data !== 'object' || !(data as any).user_id) {
            throw new Error('O Supabase não confirmou as preferências de batalha.');
          }
          return mapRowToBattlePreferences(data);
  }

  public async startBattleAtomic(requestId: string): Promise<BattleRunResult> {
    const configurationError = getSupabaseConfigurationError();
    if (configurationError) throw new Error(configurationError);
    if (!requestId.trim()) throw new Error('request_id obrigatório para iniciar a batalha.');

    const { data, error } = await supabase.rpc('start_battle_atomic', {
      p_request_id: requestId,
    });
    if (error) throw new Error('Falha ao iniciar batalha server-side: ' + error.message);
    if (!data || typeof data !== 'object') {
      throw new Error('O Supabase não retornou o resultado da batalha.');
    }
    const raw = data as Record<string, unknown>;
    const result = raw as Partial<BattleRunResult>;
    if (result.success !== true || typeof result.run_id !== 'string') {
      throw new Error('Resultado de batalha inválido retornado pelo servidor.');
    }
    const mapSnapshot = (snapshot: unknown): BattleRunResult['playerTeam'] => {
      if (!Array.isArray(snapshot)) return [];
      return snapshot.map((entry) => {
        if (!entry || typeof entry !== 'object') {
          throw new Error('O Supabase retornou um combatente inválido.');
        }
        const row = entry as Record<string, unknown>;
        return {
          position: Number(row.position),
          id: String(row.id),
          name: String(row.name),
          rarity: String(row.rarity),
          attack: Number(row.attack),
          defense: Number(row.defense),
          speed: Number(row.speed),
          maxHp: Number(row.max_hp ?? row.maxHp),
          hp: Number(row.hp),
          ...(row.leader === undefined ? {} : { leader: Boolean(row.leader) }),
          ...(row.template_id === undefined && row.templateId === undefined
            ? {}
            : { templateId: String(row.template_id ?? row.templateId) }),
        };
      });
    };
    const snapshots = {
      playerTeam: mapSnapshot(raw.player_snapshot ?? raw.playerTeam),
      enemyTeam: mapSnapshot(raw.npc_snapshot ?? raw.enemyTeam),
    };
    const hpById = new Map<string, number>(
      [...snapshots.playerTeam, ...snapshots.enemyTeam].map((combatant) => [combatant.id, combatant.hp])
    );
    const events = Array.isArray(raw.events)
      ? raw.events.map((entry) => {
          if (!entry || typeof entry !== 'object') {
            throw new Error('O Supabase retornou um evento de combate inválido.');
          }
          const row = entry as Record<string, unknown>;
          const defenderId = String(row.defender_id ?? row.defenderId);
          const currentHp = hpById.get(defenderId);
          if (currentHp === undefined) {
            throw new Error('O evento de combate referencia um defensor desconhecido.');
          }
          const defenderHpAfter = Number(row.defender_hp_after ?? row.defenderHpAfter);
          const defenderHpBefore = Number(row.defender_hp_before ?? row.defenderHpBefore ?? currentHp);
          hpById.set(defenderId, defenderHpAfter);
          return {
            round: Number(row.round),
            attackerSide: (row.attacker_side ?? row.attackerSide) as 'PLAYER' | 'NPC',
            attackerId: String(row.attacker_id ?? row.attackerId),
            defenderId,
            defenderHpBefore,
            defenderHpAfter,
            damage: Number(row.damage),
            defeated: defenderHpAfter <= 0,
          };
        })
      : [];
    const reward = (raw.rewards || {}) as Record<string, unknown>;
    const resultingProfileRaw = reward.resulting_profile ?? reward.resultingProfile;
    return {
      success: true,
      idempotent: Boolean(raw.idempotent),
      run_id: String(raw.run_id),
      formula_version: String(raw.formula_version),
      rng_seed: raw.rng_seed as string | number,
      outcome: raw.outcome as BattleRunResult['outcome'],
      rounds: Number(raw.rounds),
      events,
      ...snapshots,
      rewards: {
        success: Boolean(reward.success),
        outcome: reward.outcome as BattleRunResult['rewards']['outcome'],
        xpGained: Number(reward.xp_gained ?? reward.xpGained),
        nexGained: Number(reward.nex_gained ?? reward.nexGained),
        nxaGained: Number(reward.nxa_gained ?? reward.nxaGained),
        levelUps: Number(reward.level_ups ?? reward.levelUps),
        ...(reward.balance_nex === undefined ? {} : { balanceNex: Number(reward.balance_nex) }),
        ...(reward.balance_nxa === undefined ? {} : { balanceNxa: Number(reward.balance_nxa) }),
        ...(reward.experience === undefined ? {} : { experience: Number(reward.experience) }),
        ...(reward.level === undefined ? {} : { level: Number(reward.level) }),
        ...(resultingProfileRaw && typeof resultingProfileRaw === 'object'
          ? { resultingProfile: resultingProfileRaw as NexaUser }
          : {}),
      },
      drops: Array.isArray(raw.drops) ? raw.drops : [],
    };
  }

  // ==========================================================================
  // BOXES
  // ==========================================================================

  public async fetchUserBoxes(userId: string): Promise<PlayerBox[]> {
    if (!isSupabaseConfigured()) return Array.from(this.inMemoryBoxes.values()).filter(b => b.ownerId === userId);
    const { data, error } = await supabase.from('user_boxes').select('*').eq('owner_id', userId);
    if (error) throw new Error(error.message);
    return (data || []).map(mapRowToPlayerBox);
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

  public async purchaseBoxAtomic(params: { boxType: string; requestId: string }) {
    if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.rpc('purchase_box_v2', {
      p_box_type: params.boxType, p_request_id: params.requestId,
    });
    if (error) throw new Error(error.message);
    if (!data?.success || !data.box?.id || !Number.isFinite(Number(data.new_balance))) {
      throw new Error('Resposta de compra inválida; tente novamente com a mesma solicitação.');
    }
    return { box: mapRowToPlayerBox(data.box), newBalance: Number(data.new_balance) };
  }

  public async openBoxAtomic(params: { boxId: string; requestId: string }): Promise<BoxRewardSummary> {
    if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.rpc('open_box_v2', {
      p_box_id: params.boxId, p_request_id: params.requestId,
    });
    if (error) throw new Error(error.message);
    if (!data?.success || data.box_id !== params.boxId || !data.reward?.templateId ||
        (!data.card && !data.fragment)) throw new Error('Resposta de abertura inválida; repita a solicitação.');
    const cards = data.card ? [mapRowToCard(data.card)] : [];
    return {
      boxId: data.box_id, boxType: data.box_type, boxName: data.box_name, openedAt: data.opened_at,
      assets: cards, cards, items: [], characters: [], fragments: [],
      nexGained: 0, nxaGained: 0, highestRarity: data.reward.rarity,
      pityBefore: 0, pityAfter: 0, pityTriggered: false, duplicateCharactersConverted: [],
      rewardPreview: data.reward,
      duplicateCardsConverted: data.fragment ? [{
        templateId: data.reward.templateId, cardName: data.reward.name, rarity: data.reward.rarity,
        fragmentsAwarded: Number(data.fragments_awarded), totalFragmentsNow: Number(data.fragment.quantity),
      }] : [],
    };
  }

  public async fetchBoxHistory(userId: string): Promise<BoxHistoryRecord[]> {
    const { data, error } = await supabase.from('box_operations_v1').select('request_id,result')
      .eq('owner_id', userId).eq('operation', 'OPEN').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(row => {
      const r = row.result;
      return {
        id: row.request_id, userId, boxId: r.box_id, boxType: r.box_type, boxName: r.box_name,
        timestamp: r.opened_at, highestRarity: r.reward.rarity,
        rewardsSummary: r.fragment ? r.reward.name + ' → ' + r.fragments_awarded + ' fragmentos' : r.reward.name,
        itemsReceivedNames: [r.reward.name], nexGained: 0, pityBefore: 0, pityAfter: 0, pityTriggered: false,
      };
    });
  }

  public async fetchBoxInventoryCards(userId: string): Promise<Card[]> {
    const { data, error } = await supabase.from('user_cards').select('*').eq('owner_id', userId);
    if (error) throw new Error(error.message);
    return (data || []).map(mapRowToCard);
  }

  public async fetchCardFragments(userId: string): Promise<CardFragment[]> {
    if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.from('card_fragments').select('*').eq('owner_id', userId);
    if (error) throw new Error(error.message);
    return (data || []).map(row => ({
      id: row.owner_id + ':' + row.template_id, ownerId: row.owner_id, templateId: row.template_id,
      amount: Number(row.quantity), updatedAt: row.updated_at, maxRequired: 100,
      cardName: getTemplateById(row.template_id)?.name || row.template_id, cardRarity: getTemplateById(row.template_id)?.rarity || 'Comum', cardImage: getTemplateById(row.template_id)?.image || '', collectionId: getTemplateById(row.template_id)?.collectionId || '',
    }));
  }

  public async fetchSynthesisCards(userId: string): Promise<Card[]> {
    if (!isSupabaseConfigured()) throw new Error('Supabase não configurado');
    const { data, error } = await supabase.from('user_cards').select('*').eq('owner_id', userId);
    if (error) throw new Error(error.message);
    if (!Array.isArray(data) || data.some(row => row.owner_id !== userId)) throw new Error('Inventário remoto inválido.');
    return data.map(mapRowToCard);
  }

  public async claimSynthesisAtomic(params: {
    userId: string;
    cardId: string;
  }): Promise<{ success: boolean; newBalance?: number; claimedNex?: number; cardName?: string; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase não configurado' };
    }

    try {
      const { data, error } = await supabase.rpc('claim_synthesis_and_burn_atomic', {
        p_user_id: params.userId,
        p_card_id: params.cardId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && typeof data === 'object' && data.success === true) {
        if (!['number', 'string'].includes(typeof data.new_balance) || !['number', 'string'].includes(typeof data.claimed_nex)
          || String(data.new_balance).trim() === '' || String(data.claimed_nex).trim() === ''
          || !Number.isFinite(Number(data.new_balance)) || Number(data.new_balance) < 0
          || !Number.isFinite(Number(data.claimed_nex)) || Number(data.claimed_nex) <= 0) {
          return { success: false, error: 'Valores de saque inválidos na resposta do servidor' };
        }
        return {
          success: true,
          newBalance: Number((data as any).new_balance),
          claimedNex: Number((data as any).claimed_nex),
          cardName: (data as any).card_name,
        };
      }
      return { success: false, error: data?.error || 'Resposta inválida do servidor' };
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

      if (!data || data.success !== true) {
        return { success: false, error: data?.error || 'Resposta inválida ao iniciar síntese' };
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
    profile?: NexaUser;
    error?: string;
  }> {
    void params;
    return {
      success: false,
      error: 'Recompensas de batalha são aplicadas exclusivamente por start_battle_atomic.',
    };
  }
}

export const supabaseService = new SupabaseServiceClass();
export const SupabaseService = supabaseService;
