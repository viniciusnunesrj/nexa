import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  NexaAsset,
  Character,
  GameItem,
  Card,
  CardFragment,
  CardTemplate,
  CollectionBoxOpenResult,
  Listing,
  NexaTransaction,
  TradeOffer,
  LedgerEntry,
  MarketStats,
  PlayerBox,
  BoxType,
  CharacterFragment,
  BoxRewardSummary,
  BoxHistoryRecord,
  UserPityState,
  LevelUpResult,
} from '../types';
import { INITIAL_CHARACTERS } from '../data/mockCharacters';
import { INITIAL_ITEMS } from '../data/mockItems';
import { INITIAL_CARDS } from '../data/mockCards';
import { GUARDIANS_TEMPLATES } from '../config/collectionsData';
import { INITIAL_LISTINGS, INITIAL_TRANSACTIONS, INITIAL_MARKET_STATS } from '../data/mockMarket';
import { INITIAL_TRADES } from '../data/mockTrades';
import { MarketplaceService } from '../services/marketplaceService';
import { TradeService } from '../services/tradeService';
import { FusionService, FusionExecutionResult } from '../services/fusionService';
import { RewardService } from '../services/rewardService';
import { LedgerService } from '../services/ledgerService';
import { EconomyService } from '../services/economyService';
import { BoxService } from '../services/boxService';
import { CharacterFragmentService } from '../services/characterFragmentService';
import { CardFragmentService } from '../services/cardFragmentService';
import { CollectionService } from '../services/collectionService';
import { ProgressionService } from '../services/progressionService';
import { soundService } from '../services/soundService';
import { useAuth } from './AuthContext';
import { SupabaseService } from '../services/supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

interface GameStateContextType {
  assets: NexaAsset[];
  listings: Listing[];
  transactions: NexaTransaction[];
  trades: TradeOffer[];
  ledger: LedgerEntry[];
  marketStats: MarketStats;
  notifications: ToastNotification[];
  // Cards & Collections State
  cards: Card[];
  cardFragments: CardFragment[];
  isClaimingSynthesis: boolean;
  synthesizeCard: (cardId: string) => void;
  claimCardSynthesis: (cardId: string) => number;
  claimSynthesisReward: (cardId: string) => number;
  stopCardSynthesis: (cardId: string) => void;
  advanceCardTime: (cardId: string, hours: number) => void;
  claimCollectionReward: (collectionId: string) => void;
  openGuardiansBox: () => CollectionBoxOpenResult;
  openRandomCollectionBox: () => CollectionBoxOpenResult;
  craftCardWithFragments: (templateId: string) => void;
  refreshCardFragments: () => void;
  // Boxes & Fragments State
  boxes: PlayerBox[];
  fragments: CharacterFragment[];
  boxCounts: Record<BoxType, number>;
  userPity: UserPityState;
  boxHistory: BoxHistoryRecord[];
  isPurchasing: boolean;
  openBox: (boxId: string) => BoxRewardSummary;
  purchaseBox: (boxType: BoxType) => { success: boolean; error?: string; box?: PlayerBox };
  unlockCharacterWithFragments: (fragmentId: string) => { success: boolean; error?: string; unlockedCharacter?: Character };
  refreshBoxes: () => void;
  dismissNotification: (id: string) => void;
  notify: (type: ToastNotification['type'], title: string, message: string) => void;
  listAsset: (assetId: string, priceNXA: number) => void;
  cancelListing: (listingId: string) => void;
  buyListing: (listingId: string) => void;
  equipCharacter: (characterId: string) => void;
  executeBattle: (characterId: string) => Promise<{
    victory: boolean;
    xpGained: number;
    nexGained: number;
    nxaGained: number;
    droppedItem: GameItem | null;
    droppedBox: PlayerBox | null;
  }>;
  executeFusion: (itemIds: string[]) => FusionExecutionResult;
  proposeTrade: (
    receiverId: string,
    offeredItemIds: string[],
    offeredNXA: number,
    requestedItemIds: string[],
    requestedNXA: number,
    note?: string
  ) => void;
  acceptTrade: (tradeId: string) => void;
  rejectTrade: (tradeId: string) => void;
  cancelTrade: (tradeId: string) => void;
  claimSeasonLevelReward: (level: number, rewardType: string, rewardValue: number | string) => void;
  resetAllDemoData: () => void;
  // Level & Progression State
  levelUpData: LevelUpResult | null;
  setLevelUpData: (data: LevelUpResult | null) => void;
  unlockedSlots: number;
  activeSynthesizingCardsCount: number;
}

const GameStateContext = createContext<GameStateContextType | undefined>(undefined);

const ASSETS_KEY = 'nexa_assets_v1';
const LISTINGS_KEY = 'nexa_listings_v1';
const TXS_KEY = 'nexa_transactions_v1';
const TRADES_KEY = 'nexa_trades_v1';
const STATS_KEY = 'nexa_stats_v1';

export const GameStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, allUsers, syncUser, updateUserBalance, addXP, addSeasonXP, claimSeasonReward } = useAuth();

  const [assets, setAssets] = useState<NexaAsset[]>(() => {
    try {
      const stored = localStorage.getItem(ASSETS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const hasCards = parsed.some((a: NexaAsset) => a.type === 'Card' || (a as any).type === 'card');
        const list = hasCards ? parsed : [...parsed, ...INITIAL_CARDS];
        return list.map((item: NexaAsset) => {
          if (item.type === 'Card' || (item as any).type === 'card') {
            return EconomyService.normalizeCardSynthesis(item as Card);
          }
          return item;
        });
      }
      return [...INITIAL_CHARACTERS, ...INITIAL_ITEMS, ...INITIAL_CARDS];
    } catch {
      return [...INITIAL_CHARACTERS, ...INITIAL_ITEMS, ...INITIAL_CARDS];
    }
  });

  const cards = assets
    .filter((a): a is Card => a.type === 'Card' || (a as any).type === 'card')
    .map((c) => EconomyService.normalizeCardSynthesis(c));
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);
  const [isClaimingSynthesis, setIsClaimingSynthesis] = useState<boolean>(false);
  const [levelUpData, setLevelUpData] = useState<LevelUpResult | null>(null);

  // Derived progression slot counters
  const unlockedSlots = ProgressionService.getUnlockedSlots(user.level);
  const activeSynthesizingCardsCount = assets.filter(
    (a) =>
      a.ownerId === user.id &&
      (a.type === 'Card' || (a as any).type === 'card') &&
      ((a as Card).state === 'ACTIVE' || (a as Card).cardStatus === 'ACTIVE')
  ).length;

  const [listings, setListings] = useState<Listing[]>(() => {
    try {
      const stored = localStorage.getItem(LISTINGS_KEY);
      return stored ? JSON.parse(stored) : INITIAL_LISTINGS;
    } catch {
      return INITIAL_LISTINGS;
    }
  });

  const [transactions, setTransactions] = useState<NexaTransaction[]>(() => {
    try {
      const stored = localStorage.getItem(TXS_KEY);
      return stored ? JSON.parse(stored) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  });

  const [trades, setTrades] = useState<TradeOffer[]>(() => {
    try {
      const stored = localStorage.getItem(TRADES_KEY);
      return stored ? JSON.parse(stored) : INITIAL_TRADES;
    } catch {
      return INITIAL_TRADES;
    }
  });

  const [marketStats, setMarketStats] = useState<MarketStats>(() => {
    try {
      const stored = localStorage.getItem(STATS_KEY);
      return stored ? JSON.parse(stored) : INITIAL_MARKET_STATS;
    } catch {
      return INITIAL_MARKET_STATS;
    }
  });

  const [ledger, setLedger] = useState<LedgerEntry[]>(() => LedgerService.getEntries());
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  // Boxes & Fragments State
  const [boxes, setBoxes] = useState<PlayerBox[]>(() => {
    return user?.id ? BoxService.getAvailableBoxes(user.id) : [];
  });
  const [fragments, setFragments] = useState<CharacterFragment[]>(() => {
    return user?.id ? CharacterFragmentService.getUserFragments(user.id) : [];
  });
  const [boxCounts, setBoxCounts] = useState<Record<BoxType, number>>(() => {
    return user?.id ? BoxService.getBoxCounts(user.id) : { RECRUIT: 0, BASIC: 0, PREMIUM: 0 };
  });
  const [userPity, setUserPity] = useState<UserPityState>(() => {
    return user?.id ? BoxService.getUserPity(user.id) : { userId: '', premiumBoxPity: 0, updatedAt: '' };
  });
  const [boxHistory, setBoxHistory] = useState<BoxHistoryRecord[]>(() => {
    return user?.id ? BoxService.getUserBoxHistory(user.id) : [];
  });

  const [cardFragments, setCardFragments] = useState<CardFragment[]>(() => {
    return user?.id ? CardFragmentService.getUserFragments(user.id) : [];
  });

  const refreshCardFragments = () => {
    if (!user?.id) return;
    setCardFragments(CardFragmentService.getUserFragments(user.id));
  };

  const refreshBoxes = () => {
    if (!user?.id) return;
    setBoxes(BoxService.getAvailableBoxes(user.id));
    setBoxCounts(BoxService.getBoxCounts(user.id));
    setFragments(CharacterFragmentService.getUserFragments(user.id));
    setUserPity(BoxService.getUserPity(user.id));
    setBoxHistory(BoxService.getUserBoxHistory(user.id));
  };

  // Sync Boxes, Cards & Fragments whenever user changes
  useEffect(() => {
    if (user?.id) {
      BoxService.grantRecruitBoxIfEligible(user.id);
      refreshBoxes();
      refreshCardFragments();

      // Online Sync from Supabase
      if (isSupabaseConfigured()) {
        SupabaseService.fetchUserCards(user.id).then((remoteCards) => {
          if (remoteCards && remoteCards.length > 0) {
            setAssets((prev) => {
              const nonCards = prev.filter((a) => a.type !== 'Card' && (a as any).type !== 'card');
              const existingCards = prev.filter(
                (a): a is Card => a.type === 'Card' || (a as any).type === 'card'
              );
              const cardMap = new Map<string, Card>();
              for (const c of existingCards) cardMap.set(c.id, c);
              for (const rc of remoteCards) {
                cardMap.set(rc.id, EconomyService.normalizeCardSynthesis(rc));
              }
              return [...nonCards, ...Array.from(cardMap.values())];
            });
          }
        }).catch(() => {});

        SupabaseService.fetchListings().then((remoteListings) => {
          if (remoteListings && remoteListings.length > 0) {
            setListings(remoteListings);
          }
        }).catch(() => {});
      }
    }
  }, [user?.id]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
      localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
      localStorage.setItem(TXS_KEY, JSON.stringify(transactions));
      localStorage.setItem(TRADES_KEY, JSON.stringify(trades));
      localStorage.setItem(STATS_KEY, JSON.stringify(marketStats));
      localStorage.setItem('nexa_ledger_entries_v1', JSON.stringify(ledger));
    } catch {
      // Storage error ignored
    }
  }, [assets, listings, transactions, trades, marketStats, ledger]);

  const notify = (type: ToastNotification['type'], title: string, message: string) => {
    const id = `note-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setNotifications((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      dismissNotification(id);
    }, 5500);
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // EQUIP CHARACTER
  const equipCharacter = (characterId: string) => {
    setAssets((prev) =>
      prev.map((asset) => {
        if (asset.type === 'Character' && asset.ownerId === user.id) {
          if (asset.id === characterId) {
            return { ...asset, isEquipped: true, status: 'EQUIPPED' };
          } else {
            return { ...asset, isEquipped: false, status: asset.status === 'EQUIPPED' ? 'IDLE' : asset.status };
          }
        }
        return asset;
      })
    );
    soundService.playClick();
    notify('success', 'Personagem Equipado', 'Seu herói principal para a arena foi atualizado.');
  };

  // LIST ASSET
  const listAsset = (assetId: string, priceNXA: number) => {
    try {
      const asset = assets.find((a) => a.id === assetId);
      if (!asset) throw new Error('Ativo não encontrado.');

      const newListing = MarketplaceService.createListing(asset, priceNXA, user);

      // Update asset status
      setAssets((prev) =>
        prev.map((a) => (a.id === assetId ? { ...a, status: 'LISTED', isEquipped: false } : a))
      );

      // Add listing
      setListings((prev) => [newListing, ...prev]);

      if (isSupabaseConfigured()) {
        SupabaseService.createListing(newListing).catch(() => {});
      }

      // Update market stats
      setMarketStats((prev) => ({
        ...prev,
        listedCount: prev.listedCount + 1,
        currentFloorPrice: Math.min(prev.currentFloorPrice, priceNXA),
      }));

      soundService.playClick();
      notify('success', 'Item Anunciado', `"${asset.name}" agora está à venda por ${priceNXA} NXA.`);
    } catch (err: any) {
      notify('error', 'Falha ao Anunciar', err.message || 'Erro desconhecido.');
    }
  };

  // CANCEL LISTING
  const cancelListing = (listingId: string) => {
    try {
      const listing = listings.find((l) => l.id === listingId);
      if (!listing) throw new Error('Anúncio não encontrado.');
      if (listing.sellerId !== user.id) throw new Error('Você só pode cancelar seus próprios anúncios.');

      setListings((prev) => prev.filter((l) => l.id !== listingId));
      setAssets((prev) =>
        prev.map((a) => (a.id === listing.itemId ? { ...a, status: 'IDLE' } : a))
      );

      if (isSupabaseConfigured()) {
        SupabaseService.updateListing(listingId, { status: 'CANCELLED' }).catch(() => {});
      }

      soundService.playClick();
      notify('info', 'Anúncio Cancelado', `O item foi devolvido ao seu inventário ativo.`);
    } catch (err: any) {
      notify('error', 'Erro ao Cancelar', err.message || 'Erro desconhecido.');
    }
  };

  // BUY LISTING
  const buyListing = async (listingId: string) => {
    try {
      const listing = listings.find((l) => l.id === listingId);
      if (!listing) throw new Error('Anúncio não encontrado.');

      // 0. Execução atômica no banco oficial Supabase via RPC
      if (isSupabaseConfigured()) {
        const atomicRes = await SupabaseService.buyMarketplaceListingAtomic({
          listingId,
          buyerId: user.id,
        });
        if (!atomicRes.success) {
          throw new Error(atomicRes.error || 'Falha na liquidação atômica da compra no mercado.');
        }
        if (atomicRes.buyerBalanceNxa !== undefined) {
          EconomyService.updateUserBalance(user.id, 'NXA', atomicRes.buyerBalanceNxa);
        }
      }

      const result = MarketplaceService.executeBuy(listing, user);

      // 1. Deduct buyer balance
      updateUserBalance(0, -listing.price);

      // 1.1 Credit seller balance if registered
      if (result.sellerBalanceGain > 0) {
        try {
          EconomyService.addCurrency(listing.sellerId, 'NXA', result.sellerBalanceGain);
        } catch {
          // Ignored if seller is demo/mock user not yet registered
        }
      }

      // 2. Transfer asset to buyer
      setAssets((prev) => {
        const exists = prev.some((a) => a.id === result.transferredItem.id);
        if (exists) {
          return prev.map((a) => (a.id === result.transferredItem.id ? result.transferredItem : a));
        }
        return [...prev, result.transferredItem];
      });

      // 3. Mark listing as SOLD
      setListings((prev) => prev.filter((l) => l.id !== listingId));

      if (isSupabaseConfigured()) {
        SupabaseService.updateListing(listingId, { status: 'SOLD', buyerId: user.id } as any).catch(() => {});
        if (result.transferredItem.type === 'Card' || (result.transferredItem as any).type === 'card') {
          SupabaseService.saveCard(result.transferredItem as Card).catch(() => {});
        }
      }

      // 4. Add transaction
      setTransactions((prev) => [result.transaction, ...prev]);

      // 5. Update market stats
      setMarketStats((prev) => {
        const newATH = Math.max(prev.allTimeHigh, listing.price);
        const newATL = Math.min(prev.allTimeLow, listing.price);
        return {
          ...prev,
          lastSalePrice: listing.price,
          allTimeHigh: newATH,
          allTimeLow: newATL,
          salesVolume: prev.salesVolume + 1,
          totalVolumeNXA: prev.totalVolumeNXA + listing.price,
          listedCount: Math.max(0, prev.listedCount - 1),
        };
      });

      // 6. Record ledger
      const buyerLedger = LedgerService.recordEntry(
        user.id,
        user.username,
        'NXA',
        -listing.price,
        result.buyerBalanceAfter,
        'MARKET_BUY',
        `Compra de "${listing.itemSnapshot.name}" de ${listing.sellerName}`
      );
      setLedger((prev) => [buyerLedger, ...prev]);

      // Sound & feedback
      soundService.playVictory();
      notify(
        'success',
        'Compra Realizada!',
        `Você adquiriu "${listing.itemSnapshot.name}" por ${listing.price} NXA (Taxa: ${result.feeAmount} NXA).`
      );
    } catch (err: any) {
      notify('error', 'Falha na Compra', err.message || 'Erro desconhecido.');
    }
  };

  // EXECUTE BATTLE
  const executeBattle = async (characterId: string) => {
    const char = assets.find((a) => a.id === characterId && a.type === 'Character') as Character;
    const power = char ? char.power : 1000;
    
    // Opponent difficulty generator
    const opponentPower = Math.floor(power * (0.8 + Math.random() * 0.45));
    const victory = Math.random() * power >= Math.random() * opponentPower;

    // 1. Identificar o userId do usuário autenticado
    const userId = user.id;

    // 2. Calcular a recompensa
    const rewards = RewardService.calculateBattleRewards(victory, user.level, user.id, user.username);

    // 3. Atualizar atomicamente o saldo persistido desse userId na base de dados
    const updatedUser = await EconomyService.applyBattleReward(userId, {
      nexGained: rewards.nexGained,
      nxaGained: rewards.nxaGained,
      xpGained: rewards.xpGained,
      victory,
    });

    // 4. Atualizar o estado global / currentUser e interface
    syncUser(updatedUser);

    // 5. Se subiu de nível, ativa o modal de celebração com animação e recompensas
    if (updatedUser.levelUpResult && updatedUser.levelUpResult.leveledUp) {
      setLevelUpData(updatedUser.levelUpResult);
      // Atualiza caixas e histórico se recompensas incluírem caixas
      setBoxes(BoxService.getAvailableBoxes(userId));
      setBoxCounts(BoxService.getBoxCounts(userId));
      try {
        const stored = localStorage.getItem(ASSETS_KEY);
        if (stored) setAssets(JSON.parse(stored));
      } catch {
        // storage fallback
      }
    }

    // 6. Registrar a transação / recompensa no histórico persistente
    if (rewards.nexGained > 0 || rewards.nxaGained > 0) {
      const ledg = LedgerService.recordEntry(
        updatedUser.id,
        updatedUser.username,
        'NEX',
        rewards.nexGained,
        updatedUser.balanceNEX,
        'BATTLE_REWARD',
        victory
          ? `Vitória na Arena vs Gladiador Bot (+${rewards.nexGained} NEX)`
          : `Recompensa de Consolação de Arena (+${rewards.nexGained} NEX)`
      );
      setLedger((prev) => [ledg, ...prev]);
    }

    // 6. Adicionar item dropado se gerado
    if (rewards.droppedItem) {
      setAssets((prev) => [rewards.droppedItem!, ...prev]);
      if (['Épico', 'Lendário', 'Mítico'].includes(rewards.droppedItem.rarity)) {
        soundService.playMythicDrop();
      }
    }

    // 7. Sorteio de drop de caixa na vitória
    let droppedBox: PlayerBox | null = null;
    if (rewards.droppedBoxType) {
      droppedBox = BoxService.grantBox(userId, rewards.droppedBoxType, 'GAMEPLAY_DROP');
      setBoxes((prev) => [...prev, droppedBox!]);
      setBoxCounts(BoxService.getBoxCounts(userId));
    }

    return {
      ...rewards,
      droppedBox,
    };
  };

  // OPEN BOX
  const openBox = (boxId: string): BoxRewardSummary => {
    try {
      const summary = BoxService.openBox(user.id, boxId);

      // Refresh assets from localStorage
      try {
        const stored = localStorage.getItem(ASSETS_KEY);
        if (stored) setAssets(JSON.parse(stored));
      } catch {
        // Fallback
      }

      // Refresh user balance in AuthContext
      const updatedUser = EconomyService.getUser(user.id);
      if (updatedUser) syncUser(updatedUser);

      // Refresh boxes, fragments, pity, history
      setBoxes(BoxService.getAvailableBoxes(user.id));
      setBoxCounts(BoxService.getBoxCounts(user.id));
      setFragments(CharacterFragmentService.getUserFragments(user.id));
      setUserPity(BoxService.getUserPity(user.id));
      setBoxHistory(BoxService.getUserBoxHistory(user.id));

      if (['Lendário', 'Mítico'].includes(summary.highestRarity)) {
        soundService.playMythicDrop();
      } else {
        soundService.playVictory();
      }

      return summary;
    } catch (err: any) {
      notify('error', 'Falha ao Abrir Caixa', err.message || 'Erro inesperado.');
      throw err;
    }
  };

  // PURCHASE BOX
  const purchaseBox = (boxType: BoxType) => {
    if (isPurchasing) {
      return { success: false, error: 'Processamento de compra em andamento. Aguarde...' };
    }
    setIsPurchasing(true);
    try {
      const res = BoxService.purchaseBox(user.id, boxType);
      if (res.success && res.box) {
        const updatedUser = EconomyService.getUser(user.id);
        if (updatedUser) syncUser(updatedUser);
        setBoxes(BoxService.getAvailableBoxes(user.id));
        setBoxCounts(BoxService.getBoxCounts(user.id));
        setLedger(LedgerService.getEntries());
        soundService.playSuccess();
        notify('success', 'Caixa Adquirida!', `Você adquiriu 1 ${res.box.name} com sucesso.`);
      } else if (res.error) {
        soundService.playError();
        notify('error', 'Compra não autorizada', res.error);
      }
      return res;
    } finally {
      setIsPurchasing(false);
    }
  };

  // UNLOCK CHARACTER WITH FRAGMENTS
  const unlockCharacterWithFragments = (fragmentId: string) => {
    const res = CharacterFragmentService.unlockCharacterWithFragments(user.id, user.username, fragmentId);
    if (res.success && res.unlockedCharacter) {
      setAssets((prev) => [res.unlockedCharacter!, ...prev]);
      try {
        const stored = localStorage.getItem(ASSETS_KEY);
        const curr = stored ? JSON.parse(stored) : [];
        curr.push(res.unlockedCharacter);
        localStorage.setItem(ASSETS_KEY, JSON.stringify(curr));
      } catch {
        // Fallback
      }

      setFragments(CharacterFragmentService.getUserFragments(user.id));
      soundService.playVictory();
      notify(
        'success',
        'Herói Sintetizado!',
        `${res.unlockedCharacter.name} foi desbloqueado com sucesso a partir de 100 fragmentos!`
      );
    } else if (res.error) {
      notify('error', 'Desbloqueio Falhou', res.error);
    }
    return res;
  };

  // EXECUTE FUSION
  const executeFusion = (itemIds: string[]): FusionExecutionResult => {
    try {
      const selectedItems = assets.filter((a) => itemIds.includes(a.id));
      const result = FusionService.executeFusion(selectedItems, user);

      // Deduct NEX cost
      updateUserBalance(-result.costNEX, 0);

      // Burn items
      setAssets((prev) => {
        const remaining = prev.filter((a) => !result.burnedItemIds.includes(a.id));
        if (result.success && result.outputAsset) {
          return [result.outputAsset, ...remaining];
        }
        return remaining;
      });

      // Record ledger
      const ledg = LedgerService.recordEntry(
        user.id,
        user.username,
        'NEX',
        -result.costNEX,
        user.balanceNEX - result.costNEX,
        'FUSION_COST',
        `Síntese no Reator (${selectedItems[0].rarity} -> ${result.outputAsset?.rarity || 'Falha'})`
      );
      setLedger((prev) => [ledg, ...prev]);

      if (result.success) {
        soundService.playMythicDrop();
        notify('success', 'Fusão Perfeita!', result.message);
      } else {
        notify('warning', 'Falha na Síntese', result.message);
      }

      return result;
    } catch (err: any) {
      notify('error', 'Erro na Forja', err.message || 'Erro desconhecido.');
      throw err;
    }
  };

  // PROPOSE TRADE
  const proposeTrade = (
    receiverId: string,
    offeredItemIds: string[],
    offeredNXA: number,
    requestedItemIds: string[],
    requestedNXA: number,
    note?: string
  ) => {
    try {
      const receiver = allUsers.find((u) => u.id === receiverId);
      if (!receiver) throw new Error('Destinatário da troca não encontrado.');

      const offered = assets.filter((a) => offeredItemIds.includes(a.id));
      const requested = assets.filter((a) => requestedItemIds.includes(a.id));

      const newTrade = TradeService.createTradeOffer(
        user,
        receiver,
        offered,
        offeredNXA,
        requested,
        requestedNXA,
        note
      );

      // Lock offered items
      setAssets((prev) =>
        prev.map((a) => (offeredItemIds.includes(a.id) ? { ...a, status: 'TRADING' } : a))
      );

      setTrades((prev) => [newTrade, ...prev]);
      soundService.playClick();
      notify('success', 'Proposta Enviada', `Proposta de troca enviada para ${receiver.username}.`);
    } catch (err: any) {
      notify('error', 'Falha na Proposta', err.message || 'Erro desconhecido.');
    }
  };

  // ACCEPT TRADE
  const acceptTrade = (tradeId: string) => {
    try {
      const trade = trades.find((t) => t.id === tradeId);
      if (!trade) throw new Error('Troca não encontrada.');

      const result = TradeService.executeAccept(trade, user);

      // Update balances
      updateUserBalance(0, result.receiverNXAChange);

      // Update assets
      setAssets((prev) => {
        const map = new Map<string, NexaAsset>();
        prev.forEach((a) => map.set(a.id, a));

        // Transfer items
        result.itemsTransferredToReceiver.forEach((a) => map.set(a.id, a));
        result.itemsTransferredToSender.forEach((a) => map.set(a.id, a));

        return Array.from(map.values());
      });

      // Mark trade ACCEPTED
      setTrades((prev) =>
        prev.map((t) => (t.id === tradeId ? { ...t, status: 'ACCEPTED' } : t))
      );

      soundService.playVictory();
      notify('success', 'Troca Concluída!', `Você e ${trade.senderName} finalizaram o intercâmbio com sucesso.`);
    } catch (err: any) {
      notify('error', 'Erro ao Aceitar', err.message || 'Erro desconhecido.');
    }
  };

  // REJECT TRADE
  const rejectTrade = (tradeId: string) => {
    try {
      const trade = trades.find((t) => t.id === tradeId);
      if (!trade) throw new Error('Troca não encontrada.');

      // Unlock items
      const offeredIds = trade.offeredItems.map((i) => i.id);
      setAssets((prev) =>
        prev.map((a) => (offeredIds.includes(a.id) ? { ...a, status: 'IDLE' } : a))
      );

      setTrades((prev) =>
        prev.map((t) => (t.id === tradeId ? { ...t, status: 'REJECTED' } : t))
      );

      soundService.playClick();
      notify('info', 'Troca Recusada', `A proposta de ${trade.senderName} foi recusada.`);
    } catch (err: any) {
      notify('error', 'Erro ao Recusar', err.message || 'Erro desconhecido.');
    }
  };

  // CANCEL TRADE
  const cancelTrade = (tradeId: string) => {
    try {
      const trade = trades.find((t) => t.id === tradeId);
      if (!trade) throw new Error('Troca não encontrada.');
      if (trade.senderId !== user.id) throw new Error('Você só pode cancelar suas próprias propostas.');

      const offeredIds = trade.offeredItems.map((i) => i.id);
      setAssets((prev) =>
        prev.map((a) => (offeredIds.includes(a.id) ? { ...a, status: 'IDLE' } : a))
      );

      setTrades((prev) =>
        prev.map((t) => (t.id === tradeId ? { ...t, status: 'CANCELLED' } : t))
      );

      soundService.playClick();
      notify('info', 'Proposta Cancelada', 'Os itens ofertados foram desbloqueados.');
    } catch (err: any) {
      notify('error', 'Erro ao Cancelar', err.message || 'Erro desconhecido.');
    }
  };

  // CLAIM SEASON REWARD
  const claimSeasonLevelReward = (level: number, rewardType: string, rewardValue: number | string) => {
    try {
      if (user.claimedSeasonRewards.includes(level)) {
        throw new Error('Esta recompensa já foi resgatada.');
      }
      if (user.seasonLevel < level) {
        throw new Error(`Alcance o nível ${level} da temporada para desbloquear.`);
      }

      claimSeasonReward(level);

      if (rewardType === 'NEX') {
        updateUserBalance(Number(rewardValue), 0);
        notify('success', 'Recompensa Resgatada', `+${rewardValue} NEX adicionados.`);
      } else if (rewardType === 'NXA') {
        updateUserBalance(0, Number(rewardValue));
        notify('success', 'Recompensa Resgatada', `+${rewardValue} NXA adicionados.`);
      } else if (rewardType === 'ITEM') {
        const item = RewardService.mintItem('Raro', user.id, user.username);
        item.name = `Item de Temporada [Nível ${level}]`;
        setAssets((prev) => [item, ...prev]);
        notify('success', 'Item de Temporada', `"${item.name}" adicionado ao seu inventário!`);
      } else {
        notify('success', 'Recompensa Resgatada', `Título/Emblema desbloqueado com sucesso!`);
      }

      soundService.playVictory();
    } catch (err: any) {
      notify('warning', 'Aviso', err.message);
    }
  };

  // CARDS & SYNTHESIS ACTIONS
  const synthesizeCard = (cardId: string) => {
    try {
      const card = assets.find((a) => a.id === cardId) as Card | undefined;
      if (!card || card.type !== 'Card') {
        throw new Error('Carta não encontrada.');
      }

      // Validação de Capacidade de Slots do Piloto
      const allowedSlots = ProgressionService.getUnlockedSlots(user.level);
      const activeSynthesizing = assets.filter(
        (a) =>
          a.ownerId === user.id &&
          (a.type === 'Card' || (a as any).type === 'card') &&
          ((a as Card).state === 'ACTIVE' || (a as Card).cardStatus === 'ACTIVE')
      );

      if (activeSynthesizing.length >= allowedSlots) {
        throw new Error(
          `Capacidade de slots atingida! Você possui ${activeSynthesizing.length}/${allowedSlots} slots ativos. Suba de nível para desbloquear mais slots!`
        );
      }

      const updatedCard = EconomyService.synthesizeCard(card, user.id);
      setAssets((prev) => prev.map((a) => (a.id === cardId ? updatedCard : a)));
      soundService.playSuccess();
      notify(
        'success',
        '⚡ Carta Sintetizada!',
        `"${card.name}" agora está sintetizando NEX ativamente (${activeSynthesizing.length + 1}/${allowedSlots} slots em uso).`
      );
    } catch (err: any) {
      notify('error', 'Falha na Síntese', err.message || 'Erro ao sintetizar carta.');
    }
  };

  const claimCardSynthesis = (cardId: string): number => {
    if (isClaimingSynthesis) {
      return 0;
    }
    setIsClaimingSynthesis(true);
    try {
      const card = assets.find((a) => a.id === cardId) as Card | undefined;
      if (!card || card.type !== 'Card') {
        throw new Error('Carta não encontrada ou já removida do inventário.');
      }

      // Executa o saque central e a destruição permanente da carta
      const result = EconomyService.claimSynthesisReward(user.id, card);

      // REGRA CRÍTICA: "SACAR = DESTRUIR A CARTA"
      // Remove a carta permanentemente da lista de ativos em memória
      setAssets((prev) => prev.filter((a) => a.id !== cardId));

      syncUser(result.user);
      setLedger(LedgerService.getEntries());
      soundService.playVictory();

      notify(
        'success',
        '💰 Saque Concluído!',
        `Você sacou +${result.claimedNEX.toFixed(2)} NEX. A carta "${result.cardName}" foi destruída permanentemente.`
      );

      return result.claimedNEX;
    } catch (err: any) {
      notify('error', 'Falha no Saque', err.message || 'Erro ao processar saque.');
      return 0;
    } finally {
      setIsClaimingSynthesis(false);
    }
  };

  const claimSynthesisReward = (cardId: string): number => {
    return claimCardSynthesis(cardId);
  };

  const stopCardSynthesis = (cardId: string) => {
    // Parar a síntese agora realiza o saque e a destruição correspondente
    claimCardSynthesis(cardId);
  };

  const advanceCardTime = (cardId: string, hours: number) => {
    try {
      const card = assets.find((a) => a.id === cardId) as Card | undefined;
      if (!card || card.type !== 'Card') return;
      const updatedCard = EconomyService.advanceCardSynthesisTime(card, hours);
      setAssets((prev) => prev.map((a) => (a.id === cardId ? updatedCard : a)));
      notify('info', '⏩ Tempo Avançado', `Avançado +${hours}h de síntese em "${card.name}".`);
    } catch (err: any) {
      notify('error', 'Erro ao Avançar Tempo', err.message || 'Erro desconhecido.');
    }
  };

  const claimCollectionReward = (collectionId: string) => {
    try {
      const result = CollectionService.claimCollectionReward(user, collectionId, cards);
      if (!result.success) {
        throw new Error(result.error || 'Não foi possível resgatar a recompensa.');
      }
      const updatedUser = EconomyService.getUser(user.id);
      if (updatedUser) syncUser(updatedUser);
      refreshCardFragments();
      setLedger(LedgerService.getEntries());
      soundService.playVictory();
      notify(
        'success',
        '🏆 Coleção Completa!',
        `Recompensa resgatada: ${result.rewardName}! (+${result.nexAwarded} NEX & +${result.fragmentsAwarded} Fragmentos)`
      );
    } catch (err: any) {
      notify('error', 'Resgate Indisponível', err.message || 'Erro ao resgatar recompensa.');
    }
  };

  const openGuardiansBox = (): CollectionBoxOpenResult => {
    if (user.balanceNEX < 1200) {
      throw new Error('Saldo insuficiente de NEX. Necessário: 1.200 NEX.');
    }
    const updatedUser = EconomyService.deductCurrency(user.id, 'NEX', 1200);
    syncUser(updatedUser);
    LedgerService.recordEntry(
      user.id,
      user.username,
      'NEX',
      -1200,
      updatedUser.balanceNEX,
      'BOX_PURCHASE',
      'Compra e Abertura: Caixa dos Quatro Guardiões (-1.200 NEX)'
    );

    const result = CollectionService.openGuardiansBox(user, cards);

    if (result.awardedCard) {
      setAssets((prev) => [...prev, result.awardedCard!]);
    }

    if (result.nexBonus > 0) {
      const u2 = EconomyService.addCurrency(user.id, 'NEX', result.nexBonus);
      syncUser(u2);
      LedgerService.recordEntry(
        user.id,
        user.username,
        'NEX',
        result.nexBonus,
        u2.balanceNEX,
        'BOX_OPENED',
        `Bônus de Abertura: Caixa dos Guardiões (+${result.nexBonus} NEX)`
      );
    }

    refreshCardFragments();
    setLedger(LedgerService.getEntries());
    soundService.playSuccess();
    return result;
  };

  const openRandomCollectionBox = (): CollectionBoxOpenResult => {
    if (user.balanceNEX < 800) {
      throw new Error('Saldo insuficiente de NEX. Necessário: 800 NEX.');
    }
    const updatedUser = EconomyService.deductCurrency(user.id, 'NEX', 800);
    syncUser(updatedUser);
    LedgerService.recordEntry(
      user.id,
      user.username,
      'NEX',
      -800,
      updatedUser.balanceNEX,
      'BOX_PURCHASE',
      'Compra e Abertura: Caixa Aleatória de Coleções (-800 NEX)'
    );

    const result = CollectionService.openRandomCollectionBox(user, cards);

    if (result.awardedCard) {
      setAssets((prev) => [...prev, result.awardedCard!]);
    }

    if (result.nexBonus > 0) {
      const u2 = EconomyService.addCurrency(user.id, 'NEX', result.nexBonus);
      syncUser(u2);
      LedgerService.recordEntry(
        user.id,
        user.username,
        'NEX',
        result.nexBonus,
        u2.balanceNEX,
        'BOX_OPENED',
        `Bônus de Abertura: Caixa Aleatória (+${result.nexBonus} NEX)`
      );
    }

    refreshCardFragments();
    setLedger(LedgerService.getEntries());
    soundService.playSuccess();
    return result;
  };

  const craftCardWithFragments = (templateId: string) => {
    try {
      const tmpl = GUARDIANS_TEMPLATES.find((t) => t.templateId === templateId);
      if (!tmpl) throw new Error('Template da carta não encontrado.');
      const result = CardFragmentService.craftCardWithFragments(user.id, tmpl, user.username);
      if (!result.success || !result.card) {
        throw new Error(result.error || 'Fragmentos insuficientes.');
      }
      setAssets((prev) => [...prev, result.card!]);
      refreshCardFragments();
      soundService.playSuccess();
      notify(
        'success',
        '✨ Carta Desbloqueada!',
        `Você forjou com sucesso "${result.card.name}" usando 100 fragmentos!`
      );
    } catch (err: any) {
      notify('error', 'Falha ao Forjar', err.message || 'Erro ao forjar carta.');
    }
  };

  // RESET ALL DEMO DATA
  const resetAllDemoData = () => {
    localStorage.removeItem(ASSETS_KEY);
    localStorage.removeItem(LISTINGS_KEY);
    localStorage.removeItem(TXS_KEY);
    localStorage.removeItem(TRADES_KEY);
    localStorage.removeItem(STATS_KEY);
    localStorage.removeItem('nexa_current_user_v1');
    localStorage.removeItem('nexa_all_users_v1');
    localStorage.removeItem('nexa_card_fragments_v1');
    localStorage.removeItem('nexa_completed_collections_v1');
    window.location.reload();
  };

  return (
    <GameStateContext.Provider
      value={{
        assets,
        cards,
        cardFragments,
        isClaimingSynthesis,
        synthesizeCard,
        claimCardSynthesis,
        claimSynthesisReward,
        stopCardSynthesis,
        advanceCardTime,
        claimCollectionReward,
        openGuardiansBox,
        openRandomCollectionBox,
        craftCardWithFragments,
        refreshCardFragments,
        listings,
        transactions,
        trades,
        ledger,
        marketStats,
        notifications,
        boxes,
        fragments,
        boxCounts,
        userPity,
        boxHistory,
        isPurchasing,
        openBox,
        purchaseBox,
        unlockCharacterWithFragments,
        refreshBoxes,
        dismissNotification,
        notify,
        listAsset,
        cancelListing,
        buyListing,
        equipCharacter,
        executeBattle,
        executeFusion,
        proposeTrade,
        acceptTrade,
        rejectTrade,
        cancelTrade,
        claimSeasonLevelReward,
        resetAllDemoData,
        levelUpData,
        setLevelUpData,
        unlockedSlots,
        activeSynthesizingCardsCount,
      }}
    >
      {children}
    </GameStateContext.Provider>
  );
};

export const useGameState = () => {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
};
