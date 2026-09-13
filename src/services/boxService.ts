import {
  BoxType,
  PlayerBox,
  BoxRewardSummary,
  BoxHistoryRecord,
  UserPityState,
  Rarity,
  Card,
  NexaAsset,
} from '../types';
import {
  BOX_CONFIG,
  BOX_DEFINITIONS,
  rollBoxReward,
  FRAGMENTS_CONFIG,
  PITY_CONFIG,
} from '../config/boxRates';
import { CharacterFragmentService } from './characterFragmentService';
import { CardFragmentService } from './cardFragmentService';
import { EconomyService } from './economyService';
import { LedgerService } from './ledgerService';
import { ASSETS_STORAGE_KEY } from './authService';
import { SupabaseService } from './supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';

export const BOXES_STORAGE_KEY = 'nexa_player_boxes_v1';
export const PITY_STORAGE_KEY = 'nexa_pity_states_v1';
export const BOX_HISTORY_STORAGE_KEY = 'nexa_box_history_v1';

const memoryStore: Record<string, string> = {};

function storageGet(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return memoryStore[key] || null;
  } catch {
    return memoryStore[key] || null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
  memoryStore[key] = value;
}

export class BoxService {
  private static onlineBoxes = new Map<string, PlayerBox[]>();
  private static revisions = new Map<string, number>();
  private static purchases = new Map<string, Promise<{ success: boolean; error?: string; box?: PlayerBox; updatedBalance?: number }>>();
  private static openings = new Map<string, Promise<BoxRewardSummary>>();
  private static requestId(key: string): string {
    const saved = storageGet(key);
    if (saved) return saved;
    const id = crypto.randomUUID();
    storageSet(key, id);
    return id;
  }
  public static async refreshOnlineBoxes(userId: string): Promise<PlayerBox[]> {
    const revision = this.revisions.get(userId) || 0;
    const boxes = await SupabaseService.fetchUserBoxes(userId);
    if (revision === (this.revisions.get(userId) || 0)) this.onlineBoxes.set(userId, boxes);
    return this.onlineBoxes.get(userId) || [];
  }
  private static async purchaseOnline(userId: string, boxType: BoxType) {
    const key = 'nexa_box_purchase_pending:' + userId + ':' + boxType;
    const running = this.purchases.get(key);
    if (running) return running;
    const task = (async () => {
      try {
        const result = await SupabaseService.purchaseBoxAtomic({ boxType, requestId: this.requestId(key) });
        this.revisions.set(userId, (this.revisions.get(userId) || 0) + 1);
        // Refresh from server: an idempotent old purchase result must not resurrect a consumed box.
        await this.refreshOnlineBoxes(userId);
        const profile = await SupabaseService.fetchRemoteProfile(userId);
        if (!profile) throw new Error('Compra confirmada; perfil ainda não sincronizado. Repita a solicitação.');
        EconomyService.updateUserBalance(userId, 'NEX', profile.balanceNEX);
        storageSet(key, '');
        return { success: true, box: result.box, updatedBalance: result.newBalance };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Compra não confirmada; tente novamente.' };
      }
    })();
    this.purchases.set(key, task);
    try { return await task; } finally { this.purchases.delete(key); }
  }
  private static async openOnline(userId: string, boxId: string): Promise<BoxRewardSummary> {
    const key = 'nexa_box_open_pending:' + userId + ':' + boxId;
    const running = this.openings.get(key);
    if (running) return running;
    const task = (async () => {
      const summary = await SupabaseService.openBoxAtomic({ boxId, requestId: this.requestId(key) });
      this.revisions.set(userId, (this.revisions.get(userId) || 0) + 1);
      this.onlineBoxes.set(userId, (this.onlineBoxes.get(userId) || []).filter(box => box.id !== boxId));
      // Only confirmed summary is shown. No local mint, roll, delete RPC or fragment credit.
      storageSet(key, '');
      return summary;
    })();
    this.openings.set(key, task);
    try { return await task; } finally { this.openings.delete(key); }
  }


  /**
   * Obtém todas as caixas armazenadas no sistema
   */
  public static getAllStoredBoxes(): PlayerBox[] {
    try {
      const stored = storageGet(BOXES_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Salva todas as caixas no armazenamento local
   */
  public static saveAllStoredBoxes(boxes: PlayerBox[]): void {
    storageSet(BOXES_STORAGE_KEY, JSON.stringify(boxes));
  }

  /**
   * Retorna as caixas disponíveis pertencentes a um usuário
   */
  public static getAvailableBoxes(userId: string): PlayerBox[] {
    if (isSupabaseConfigured()) return this.onlineBoxes.get(userId) || [];
    return this.getAllStoredBoxes().filter(box => box.ownerId === userId);
  }

  /**
   * Retorna o contador de caixas por tipo para um usuário
   */
  public static getBoxCounts(userId: string): Record<string, number> {
    const boxes = this.getAvailableBoxes(userId);
    const counts: Record<string, number> = {};
    for (const b of boxes) {
      counts[b.boxType] = (counts[b.boxType] || 0) + 1;
    }
    return counts;
  }

  /**
   * Concede uma nova caixa ao inventário do usuário
   */
  public static grantBox(
    userId: string,
    boxType: BoxType,
    source: PlayerBox['source'] = 'GAMEPLAY_DROP'
  ): PlayerBox {
    if (isSupabaseConfigured()) {
      throw new Error('Concessão local de caixa bloqueada online; é necessária confirmação por RPC segura.');
    }
    const all = this.getAllStoredBoxes();
    const config = BOX_CONFIG[boxType] || BOX_CONFIG.BASIC;

    const newBox: PlayerBox = {
      id: `box-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      boxType,
      name: config.name,
      description: config.description,
      acquiredAt: new Date().toISOString(),
      ownerId: userId,
      source,
    };

    all.push(newBox);
    this.saveAllStoredBoxes(all);

    return newBox;
  }

  /**
   * Garante exatamente 1 Caixa de Recruta para novas contas com flag persistente
   * Requisito 19: Nunca conceder infinitamente.
   */
  public static grantRecruitBoxIfEligible(userId: string): PlayerBox | null {
    if (!userId) return null;
    if (isSupabaseConfigured()) {
      // TODO: provision the starter box through an authenticated server RPC.
      console.warn('[NEXA BOX] Caixa de recruta online suspensa até existir RPC segura.');
      return null;
    }
    const flagKey = `nexa_starter_pack_claimed_${userId}`;
    const claimedFlag = storageGet(flagKey);

    const user = EconomyService.getUser(userId);
    if (claimedFlag === 'true' || user?.starterPackClaimed) {
      return null;
    }

    // Checa se já possui ou abriu Caixa de Recruta
    const userBoxes = this.getAvailableBoxes(userId);
    const hasRecruit = userBoxes.some((b) => b.boxType === 'RECRUIT');
    const history = this.getUserBoxHistory(userId);
    const openedRecruit = history.some((h) => h.boxType === 'RECRUIT');

    if (hasRecruit || openedRecruit) {
      storageSet(flagKey, 'true');
      return null;
    }

    const newBox = this.grantBox(userId, 'RECRUIT', 'STARTER_KIT');
    storageSet(flagKey, 'true');
    return newBox;
  }

  /**
   * Compra atômica de caixa com NEX:
   * 1. verificar usuário logado
   * 2. verificar saldo NEX
   * 3. verificar preço da caixa
   * 4. impedir compra se saldo < preço
   * 5. descontar saldo NEX do jogador PRIMEIRO
   * 6. criar a caixa e adicionar ao inventário DEPOIS
   * 7. salvar o novo saldo e o inventário
   * 8. registrar a transação no histórico (Ledger: BOX_PURCHASE, -preço)
   * 9. atualizar a interface imediatamente
   */
  public static async purchaseBox(
    userId: string,
    boxType: BoxType
  ): Promise<{
    success: boolean;
    error?: string;
    box?: PlayerBox;
    updatedBalance?: number;
  }> {
    if (!userId) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    if (isSupabaseConfigured()) return this.purchaseOnline(userId, boxType);
    const user = EconomyService.getUser(userId);
    if (!user) {
      return { success: false, error: 'Usuário não encontrado no sistema.' };
    }

    const config = BOX_CONFIG[boxType];
    if (!config) {
      return { success: false, error: 'Tipo de caixa não reconhecido.' };
    }

    if (!config.purchasableWithNEX || config.priceNEX <= 0) {
      return { success: false, error: 'Esta caixa não está à venda com NEX.' };
    }

    const price = config.priceNEX;

    // 4. Impedir compra se saldo < preço
    if (user.balanceNEX < price) {
      return {
        success: false,
        error: `Saldo insuficiente de NEX. Necessário: ${price.toLocaleString()} NEX, Saldo atual: ${user.balanceNEX.toLocaleString()} NEX.`,
      };
    }

    // 5. Descontar saldo NEX do jogador PRIMEIRO
    let updatedUser;
    try {
      updatedUser = EconomyService.removeCurrency(userId, 'NEX', price);
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Falha ao descontar saldo NEX.',
      };
    }

    // 6. Criar a caixa e adicionar ao inventário DEPOIS
    const grantedBox = this.grantBox(userId, boxType, 'SHOP_PURCHASE');

    // 8. Registrar transação no Ledger
    LedgerService.recordEntry(
      userId,
      user.username,
      'NEX',
      -price,
      updatedUser.balanceNEX,
      'BOX_PURCHASE',
      `Compra de ${config.name} na loja de caixas (-${price.toLocaleString()} NEX)`
    );

    return {
      success: true,
      box: grantedBox,
      updatedBalance: updatedUser.balanceNEX,
    };
  }

  /**
   * Realiza a abertura da caixa:
   * 1. verificar se o jogador possui a caixa
   * 2. remover a caixa do inventário
   * 3. sortear a recompensa ANTES da animação
   * 4. se for carta nova: adicionar ao inventário
   * 5. se for carta repetida: converter em fragmentos (+10 a +25 fragmentos daquela carta)
   * 6. atualizar coleção caso seja carta de coleção
   * 7. registrar no histórico: BOX_OPEN e CARD_DUPLICATE
   * 8. sem geração de NEX grátis do nada
   */
  public static async openBox(userId: string, boxId: string): Promise<BoxRewardSummary> {
    if (isSupabaseConfigured()) return this.openOnline(userId, boxId);
    const allBoxes = this.getAllStoredBoxes();
    const boxIndex = allBoxes.findIndex((b) => b.id === boxId && b.ownerId === userId);

    if (boxIndex < 0) {
      throw new Error('Caixa não encontrada no inventário ou já consumida.');
    }

    const targetBox = allBoxes[boxIndex];
    const boxType = targetBox.boxType;
    const config = BOX_CONFIG[boxType] || BOX_CONFIG.BASIC;

    const user = EconomyService.getUser(userId);
    if (!user) {
      throw new Error('Usuário autenticado não localizado na base.');
    }

    // 2. Remove a caixa do inventário
    allBoxes.splice(boxIndex, 1);
    this.saveAllStoredBoxes(allBoxes);

    // 3. Sorteia a recompensa rigorosamente baseada nos pesos ANTES da animação
    const cardTemplate = rollBoxReward(boxType);

    // 4. Carrega inventário atual do usuário para detecção de duplicatas
    let currentAssets: NexaAsset[] = [];
    try {
      const storedAssets = storageGet(ASSETS_STORAGE_KEY);
      currentAssets = storedAssets ? JSON.parse(storedAssets) : [];
    } catch {
      currentAssets = [];
    }

    const isOwned = currentAssets.some(
      (a) =>
        ((a.type as string) === 'Card' || (a.type as string) === 'card' || (a as any).templateId) &&
        (a as any).templateId === cardTemplate.templateId &&
        a.ownerId === userId
    );

    const rewardCards: Card[] = [];
    const duplicateCardsConversions: NonNullable<BoxRewardSummary['duplicateCardsConverted']> = [];
    const highestRarity: Rarity = cardTemplate.rarity;

    if (isOwned) {
      // 5. Carta repetida: converte em fragmentos daquela carta
      const fragmentsAmount =
        FRAGMENTS_CONFIG.DUPLICATE_CONVERSION_RATES[cardTemplate.rarity] || 15;
      const conv = CardFragmentService.addDuplicateFragments(
        userId,
        cardTemplate,
        fragmentsAmount
      );

      duplicateCardsConversions.push({
        templateId: cardTemplate.templateId,
        cardName: cardTemplate.name,
        rarity: cardTemplate.rarity,
        fragmentsAwarded: conv.fragmentsAwarded,
        totalFragmentsNow: conv.fragment.amount,
      });

      // Registrar CARD_DUPLICATE
      LedgerService.recordEntry(
        userId,
        user.username,
        'NEX',
        0,
        user.balanceNEX,
        'CARD_DUPLICATE',
        `Duplicata de [${cardTemplate.name}] convertida em +${conv.fragmentsAwarded} fragmentos`
      );
    } else {
      // 4. Carta nova: cria o ativo Card e adiciona ao inventário
      const newCard: Card = {
        id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: cardTemplate.name,
        type: 'Card',
        edition: 'Gênese',
        collectionName: cardTemplate.collectionId,
        totalGenerated: 0,
        rarity: cardTemplate.rarity,
        element: cardTemplate.element,
        status: 'IDLE',
        cardStatus: 'FREE',
        tradeable: true,
        synthesizable: true,
        createdAt: new Date().toISOString(),
        ownerId: userId,
        ownerName: user.username,
        templateId: cardTemplate.templateId,
        collectionId: cardTemplate.collectionId,
        synthesisRate: cardTemplate.synthesisRate,
        synthesisCap: cardTemplate.synthesisCap,
        marketValue: cardTemplate.marketValue,
        elementIcon: cardTemplate.elementIcon,
        image: cardTemplate.image,
        description: cardTemplate.description,
      };

      currentAssets.push(newCard);
      storageSet(ASSETS_STORAGE_KEY, JSON.stringify(currentAssets));
      rewardCards.push(newCard);

    }

    // 8. Registrar transação BOX_OPEN
    LedgerService.recordEntry(
      userId,
      user.username,
      'NEX',
      0,
      user.balanceNEX,
      'BOX_OPEN',
      `Abertura de ${config.name}: obteve carta ${cardTemplate.name} (${cardTemplate.rarity})`
    );

    // Salvar registro de histórico
    const historyRecord: BoxHistoryRecord = {
      id: `box-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      boxId: targetBox.id,
      boxType,
      boxName: config.name,
      timestamp: new Date().toISOString(),
      highestRarity,
      rewardsSummary: isOwned
        ? `Duplicata de ${cardTemplate.name} -> +${duplicateCardsConversions[0]?.fragmentsAwarded} fragmentos`
        : `Nova Carta: ${cardTemplate.name} (${cardTemplate.rarity})`,
      itemsReceivedNames: [cardTemplate.name],
      nexGained: 0, // Requisito 22: Não criar dinheiro grátis do nada na abertura
      pityBefore: 0,
      pityAfter: 0,
      pityTriggered: false,
    };
    this.saveBoxHistoryRecord(historyRecord);

    return {
      boxId: targetBox.id,
      boxType,
      boxName: config.name,
      openedAt: historyRecord.timestamp,
      assets: rewardCards,
      characters: [],
      items: [],
      cards: rewardCards,
      fragments: CharacterFragmentService.getUserFragments(userId),
      nexGained: 0,
      nxaGained: 0,
      highestRarity,
      pityBefore: 0,
      pityAfter: 0,
      pityTriggered: false,
      duplicateCharactersConverted: [],
      duplicateCardsConverted: duplicateCardsConversions,
    };
  }

  /**
   * Salva o histórico de caixas abertas
   */
  private static saveBoxHistoryRecord(record: BoxHistoryRecord): void {
    try {
      const stored = storageGet(BOX_HISTORY_STORAGE_KEY);
      const all: BoxHistoryRecord[] = stored ? JSON.parse(stored) : [];
      all.unshift(record);
      storageSet(BOX_HISTORY_STORAGE_KEY, JSON.stringify(all));
    } catch {
      // ignore
    }
  }

  /**
   * Retorna o histórico de caixas abertas pelo usuário
   */
  public static getUserBoxHistory(userId: string): BoxHistoryRecord[] {
    try {
      const stored = storageGet(BOX_HISTORY_STORAGE_KEY);
      const all: BoxHistoryRecord[] = stored ? JSON.parse(stored) : [];
      return all.filter((h) => h.userId === userId);
    } catch {
      return [];
    }
  }

  /**
   * Obtém o estado de Pity do usuário
   */
  public static getUserPity(userId: string): UserPityState {
    try {
      const stored = storageGet(PITY_STORAGE_KEY);
      const all: UserPityState[] = stored ? JSON.parse(stored) : [];
      const found = all.find((p) => p.userId === userId);
      return (
        found || {
          userId,
          premiumBoxPity: 0,
          updatedAt: new Date().toISOString(),
          boxesSinceLastEpicOrHigher: 0,
          totalBoxesOpened: 0,
          thresholdForGuaranteed: PITY_CONFIG.PREMIUM_BOX_PITY_THRESHOLD,
        }
      );
    } catch {
      return {
        userId,
        premiumBoxPity: 0,
        updatedAt: new Date().toISOString(),
        boxesSinceLastEpicOrHigher: 0,
        totalBoxesOpened: 0,
        thresholdForGuaranteed: PITY_CONFIG.PREMIUM_BOX_PITY_THRESHOLD,
      };
    }
  }
}
