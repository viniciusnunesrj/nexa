import {
  Card,
  CardCollection,
  CardTemplate,
  CollectionBoxOpenResult,
  NexaUser,
} from '../types';
import {
  COLLECTIONS_DATA,
  GUARDIANS_TEMPLATES,
  ALL_CARD_TEMPLATES,
  getTemplatesByCollection,
} from '../config/collectionsData';
import { CardFragmentService } from './cardFragmentService';
import { EconomyService } from './economyService';
import { LedgerService } from './ledgerService';

const COMPLETED_COLLECTIONS_KEY = 'nexa_completed_collections_v1';
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

export interface CollectionProgress {
  collection: CardCollection;
  totalCards: number;
  ownedCount: number;
  isComplete: boolean;
  percentage: number;
  templatesStatus: Array<{
    template: CardTemplate;
    isOwned: boolean;
    ownedCard?: Card;
  }>;
  rewardClaimed: boolean;
}

export class CollectionServiceClass {
  public getCollections(): CardCollection[] {
    return COLLECTIONS_DATA;
  }

  private getClaimedRewards(): Record<string, boolean> {
    const raw = storageGet(COMPLETED_COLLECTIONS_KEY);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  private setClaimedReward(userId: string, collectionId: string): void {
    const records = this.getClaimedRewards();
    records[`${userId}_${collectionId}`] = true;
    storageSet(COMPLETED_COLLECTIONS_KEY, JSON.stringify(records));
  }

  public isRewardClaimed(userId: string, collectionId: string): boolean {
    const records = this.getClaimedRewards();
    return !!records[`${userId}_${collectionId}`];
  }

  /**
   * Avalia o progresso de uma coleção para um usuário específico
   */
  public getCollectionProgress(
    userId: string,
    collectionId: string,
    userCards: Card[]
  ): CollectionProgress {
    const collection = COLLECTIONS_DATA.find((c) => c.id === collectionId) || COLLECTIONS_DATA[0];
    const templates = collection.cardTemplates;

    const templatesStatus = templates.map((tmpl) => {
      const matchingCard = userCards.find(
        (c) => c.ownerId === userId && c.templateId === tmpl.templateId
      );
      return {
        template: tmpl,
        isOwned: !!matchingCard,
        ownedCard: matchingCard,
      };
    });

    const ownedCount = templatesStatus.filter((t) => t.isOwned).length;
    const totalCards = templates.length;
    const isComplete = ownedCount === totalCards && totalCards > 0;
    const percentage = totalCards > 0 ? Math.round((ownedCount / totalCards) * 100) : 0;
    const rewardClaimed = this.isRewardClaimed(userId, collectionId);

    return {
      collection,
      totalCards,
      ownedCount,
      isComplete,
      percentage,
      templatesStatus,
      rewardClaimed,
    };
  }

  /**
   * Resgata a recompensa de coleção 100% completa.
   * NÃO consome as cartas do jogador (Requisito 6).
   */
  public claimCollectionReward(
    user: NexaUser,
    collectionId: string,
    userCards: Card[]
  ): {
    success: boolean;
    rewardName: string;
    nexAwarded: number;
    fragmentsAwarded: number;
    error?: string;
  } {
    const progress = this.getCollectionProgress(user.id, collectionId, userCards);

    if (!progress.isComplete) {
      return {
        success: false,
        rewardName: '',
        nexAwarded: 0,
        fragmentsAwarded: 0,
        error: `Coleção incompleta (${progress.ownedCount}/${progress.totalCards}). Você precisa de todas as ${progress.totalCards} cartas.`,
      };
    }

    if (progress.rewardClaimed) {
      return {
        success: false,
        rewardName: '',
        nexAwarded: 0,
        fragmentsAwarded: 0,
        error: 'A recompensa desta coleção já foi resgatada anteriormente.',
      };
    }

    // 1. Marca como resgatada
    this.setClaimedReward(user.id, collectionId);

    // 2. Concede bônus de NEX conforme a coleção
    const rewardValues: Record<string, number> = {
      guardians: 1500,
      dragons: 2500,
      knights: 2000,
      abyss: 2200,
      mages: 2000,
      gods: 3500,
      cosmic: 3200,
      hunters: 2000,
    };
    const nexReward = rewardValues[collectionId] || 1500;
    const updatedUser = EconomyService.addCurrency(user.id, 'NEX', nexReward);

    // 3. Concede 100 fragmentos da carta mais rara da coleção
    const colTemplates = getTemplatesByCollection(collectionId);
    const sortedByRarity = [...colTemplates].sort((a, b) => {
      const order: Record<string, number> = {
        Mítico: 6,
        Lendário: 5,
        Épico: 4,
        Raro: 3,
        Incomum: 2,
        Comum: 1,
      };
      return (order[b.rarity] || 0) - (order[a.rarity] || 0);
    });
    const keyCard = sortedByRarity[0] || GUARDIANS_TEMPLATES[0];
    CardFragmentService.addDuplicateFragments(user.id, keyCard, 100);

    // 4. Registra no Ledger
    LedgerService.recordEntry(
      user.id,
      user.username,
      'NEX',
      nexReward,
      updatedUser.balanceNEX,
      'COLLECTION_REWARD',
      `Recompensa por completar a coleção "${progress.collection.name}" (+${nexReward} NEX & 100 Fragmentos de ${keyCard.name})`
    );

    return {
      success: true,
      rewardName: progress.collection.rewardBoxName,
      nexAwarded: nexReward,
      fragmentsAwarded: 100,
    };
  }

  /**
   * Abre uma Caixa dos Quatro Guardiões diretamente.
   */
  public openGuardiansBox(
    user: NexaUser,
    userCards: Card[]
  ): CollectionBoxOpenResult {
    const templates = GUARDIANS_TEMPLATES;
    const template = templates[Math.floor(Math.random() * templates.length)];

    const alreadyOwns = userCards.some(
      (c) => c.ownerId === user.id && c.templateId === template.templateId
    );

    if (alreadyOwns) {
      const { fragmentsAwarded } = CardFragmentService.addDuplicateFragments(user.id, template, 15);
      return {
        boxName: 'Caixa dos Quatro Guardiões',
        isDuplicate: true,
        cardTemplate: template,
        awardedFragments: fragmentsAwarded,
        nexBonus: 0,
      };
    } else {
      const newCard: Card = {
        id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: template.name,
        type: 'Card',
        templateId: template.templateId,
        collectionId: template.collectionId,
        collectionName: 'Os Quatro Guardiões',
        element: template.element,
        elementIcon: template.elementIcon,
        rarity: template.rarity,
        image: template.image,
        edition: 'Coleção Guardiões',
        ownerId: user.id,
        ownerName: user.username,
        createdAt: new Date().toISOString(),
        description: template.description,
        status: 'IDLE',
        cardStatus: 'FREE',
        synthesisRate: template.synthesisRate,
        synthesisCap: template.synthesisCap,
        totalGenerated: 0,
        marketValue: template.marketValue,
        tradeable: true,
        synthesizable: true,
      };

      return {
        boxName: 'Caixa dos Quatro Guardiões',
        isDuplicate: false,
        cardTemplate: template,
        awardedCard: newCard,
        nexBonus: 0,
      };
    }
  }

  /**
   * Abre uma Caixa Aleatória de Coleções
   */
  public openRandomCollectionBox(
    user: NexaUser,
    userCards: Card[]
  ): CollectionBoxOpenResult {
    const template = ALL_CARD_TEMPLATES[Math.floor(Math.random() * ALL_CARD_TEMPLATES.length)];

    const alreadyOwns = userCards.some(
      (c) => c.ownerId === user.id && c.templateId === template.templateId
    );

    if (alreadyOwns) {
      const { fragmentsAwarded } = CardFragmentService.addDuplicateFragments(user.id, template, 15);
      return {
        boxName: 'Caixa Aleatória de Coleção',
        isDuplicate: true,
        cardTemplate: template,
        awardedFragments: fragmentsAwarded,
        nexBonus: 0,
      };
    } else {
      const newCard: Card = {
        id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: template.name,
        type: 'Card',
        templateId: template.templateId,
        collectionId: template.collectionId,
        collectionName: template.collectionId,
        element: template.element,
        elementIcon: template.elementIcon,
        rarity: template.rarity,
        image: template.image,
        edition: 'Edição de Coleção',
        ownerId: user.id,
        ownerName: user.username,
        createdAt: new Date().toISOString(),
        description: template.description,
        status: 'IDLE',
        cardStatus: 'FREE',
        synthesisRate: template.synthesisRate,
        synthesisCap: template.synthesisCap,
        totalGenerated: 0,
        marketValue: template.marketValue,
        tradeable: true,
        synthesizable: true,
      };

      return {
        boxName: 'Caixa Aleatória de Coleção',
        isDuplicate: false,
        cardTemplate: template,
        awardedCard: newCard,
        nexBonus: 0,
      };
    }
  }
}

export const CollectionService = new CollectionServiceClass();
