import { CardFragment, CardTemplate, Card } from '../types';

const CARD_FRAGMENTS_KEY = 'nexa_card_fragments_v1';
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

export class CardFragmentServiceClass {
  private getAllFragments(): CardFragment[] {
    const raw = storageGet(CARD_FRAGMENTS_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  private saveFragments(fragments: CardFragment[]): void {
    storageSet(CARD_FRAGMENTS_KEY, JSON.stringify(fragments));
  }

  public getUserFragments(userId: string): CardFragment[] {
    if (!userId) return [];
    return this.getAllFragments().filter((f) => f.ownerId === userId);
  }

  public getFragmentCount(userId: string, templateId: string): number {
    const frags = this.getUserFragments(userId);
    const item = frags.find((f) => f.templateId === templateId);
    return item ? item.amount : 0;
  }

  public addFragments(
    userId: string,
    template: CardTemplate,
    amount: number
  ): { fragment: CardFragment; fragmentsAwarded: number } {
    return this.addDuplicateFragments(userId, template, amount);
  }

  /**
   * Converte uma duplicata recebida em fragmentos da carta.
   * Concede 25 a 50 fragmentos dependendo da raridade da carta.
   */
  public addDuplicateFragments(userId: string, template: CardTemplate, bonusAmount?: number): {
    fragment: CardFragment;
    fragmentsAwarded: number;
  } {
    const fragments = this.getAllFragments();
    const existingIndex = fragments.findIndex(
      (f) => f.ownerId === userId && f.templateId === template.templateId
    );

    // Quantidade base de fragmentos ao receber duplicata
    const defaultAmount = bonusAmount || (template.rarity === 'Lendário' ? 35 : template.rarity === 'Épico' ? 30 : 25);

    let updatedFragment: CardFragment;

    if (existingIndex !== -1) {
      fragments[existingIndex].amount += defaultAmount;
      fragments[existingIndex].updatedAt = new Date().toISOString();
      updatedFragment = fragments[existingIndex];
    } else {
      updatedFragment = {
        id: `cfrag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        templateId: template.templateId,
        cardName: template.name,
        cardRarity: template.rarity,
        cardImage: template.image,
        collectionId: template.collectionId,
        amount: defaultAmount,
        ownerId: userId,
        maxRequired: 100,
        updatedAt: new Date().toISOString(),
      };
      fragments.push(updatedFragment);
    }

    this.saveFragments(fragments);
    return { fragment: updatedFragment, fragmentsAwarded: defaultAmount };
  }

  /**
   * Sintetiza/Desbloqueia a carta a partir de 100 fragmentos acumulados
   */
  public craftCardWithFragments(userId: string, template: CardTemplate, ownerName: string): {
    success: boolean;
    error?: string;
    card?: Card;
  } {
    const fragments = this.getAllFragments();
    const index = fragments.findIndex(
      (f) => f.ownerId === userId && f.templateId === template.templateId
    );

    if (index === -1 || fragments[index].amount < 100) {
      const current = index !== -1 ? fragments[index].amount : 0;
      return {
        success: false,
        error: `Fragmentos insuficientes. Necessário: 100, Atual: ${current}.`,
      };
    }

    // Deduz 100 fragmentos
    fragments[index].amount -= 100;
    fragments[index].updatedAt = new Date().toISOString();
    this.saveFragments(fragments);

    // Cria a nova carta em estado FREE
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
      ownerId: userId,
      ownerName,
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

    return { success: true, card: newCard };
  }
}

export const CardFragmentService = new CardFragmentServiceClass();
