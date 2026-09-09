import { CharacterFragment, Rarity, Character, NexaAsset } from '../types';
import { FRAGMENTS_CONFIG } from '../config/boxRates';
import { CHARACTER_TEMPLATES, instantiateCharacterFromTemplate } from '../data/characterTemplates';

export const FRAGMENTS_STORAGE_KEY = 'nexa_character_fragments_v1';

export class CharacterFragmentService {
  /**
   * Obtém todos os registros de fragmentos do armazenamento local
   */
  private static getAllStoredFragments(): CharacterFragment[] {
    try {
      const stored = localStorage.getItem(FRAGMENTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Salva a coleção de fragmentos no armazenamento local
   */
  private static saveAllStoredFragments(fragments: CharacterFragment[]): void {
    try {
      localStorage.setItem(FRAGMENTS_STORAGE_KEY, JSON.stringify(fragments));
    } catch {
      // Storage error fallback
    }
  }

  /**
   * Retorna os fragmentos de um usuário específico
   */
  public static getUserFragments(userId: string): CharacterFragment[] {
    const all = this.getAllStoredFragments();
    return all.filter((f) => f.ownerId === userId);
  }

  /**
   * Busca o fragmento específico de um personagem para o usuário
   */
  public static getFragmentByCharacterName(userId: string, characterName: string): CharacterFragment | null {
    const userFrags = this.getUserFragments(userId);
    return (
      userFrags.find(
        (f) => f.characterName.toLowerCase() === characterName.toLowerCase()
      ) || null
    );
  }

  /**
   * Verifica se o usuário já possui um personagem com este nome no inventário
   */
  public static isCharacterOwned(userId: string, characterName: string, userAssets: NexaAsset[]): boolean {
    return userAssets.some(
      (a) =>
        a.ownerId === userId &&
        a.type === 'Character' &&
        a.name.toLowerCase() === characterName.toLowerCase()
    );
  }

  /**
   * Adiciona fragmentos ao usuário para um determinado personagem
   */
  public static addFragments(
    userId: string,
    characterInfo: {
      characterId?: string;
      characterName: string;
      characterClass?: string;
      characterRarity?: Rarity;
      characterImage?: string;
    },
    amount: number
  ): CharacterFragment {
    const all = this.getAllStoredFragments();
    const existingIndex = all.findIndex(
      (f) =>
        f.ownerId === userId &&
        f.characterName.toLowerCase() === characterInfo.characterName.toLowerCase()
    );

    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const existing = all[existingIndex];
      const updated: CharacterFragment = {
        ...existing,
        amount: existing.amount + amount,
        updatedAt: now,
      };
      all[existingIndex] = updated;
      this.saveAllStoredFragments(all);
      return updated;
    }

    // Criar novo registro de fragmento
    const matchingTemplate = CHARACTER_TEMPLATES.find(
      (t) => t.name.toLowerCase() === characterInfo.characterName.toLowerCase()
    );

    const newFragment: CharacterFragment = {
      id: `frag-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      fragmentId: `frag-${characterInfo.characterName.toLowerCase().replace(/\s+/g, '-')}`,
      characterId: characterInfo.characterId || matchingTemplate?.templateId || `char-tpl-${Date.now()}`,
      characterName: characterInfo.characterName,
      characterClass: characterInfo.characterClass || matchingTemplate?.class || 'Guerreiro',
      characterRarity: characterInfo.characterRarity || matchingTemplate?.rarity || 'Comum',
      characterImage: characterInfo.characterImage || matchingTemplate?.image || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
      amount,
      ownerId: userId,
      maxRequired: FRAGMENTS_CONFIG.REQUIRED_TO_UNLOCK_OR_EVOLVE,
      updatedAt: now,
    };

    all.push(newFragment);
    this.saveAllStoredFragments(all);
    return newFragment;
  }

  /**
   * Converte uma duplicata de personagem em fragmentos
   */
  public static convertDuplicateToFragments(
    userId: string,
    character: {
      name: string;
      class?: string;
      rarity: Rarity;
      image?: string;
    }
  ): { fragmentsAwarded: number; updatedFragment: CharacterFragment } {
    const awarded =
      FRAGMENTS_CONFIG.DUPLICATE_CONVERSION_RATES[character.rarity] || 15;

    const updatedFragment = this.addFragments(
      userId,
      {
        characterName: character.name,
        characterClass: character.class,
        characterRarity: character.rarity,
        characterImage: character.image,
      },
      awarded
    );

    return {
      fragmentsAwarded: awarded,
      updatedFragment,
    };
  }

  /**
   * Consome 100 fragmentos para desbloquear / sintetizar um novo personagem
   */
  public static unlockCharacterWithFragments(
    userId: string,
    userName: string,
    fragmentId: string
  ): {
    success: boolean;
    error?: string;
    unlockedCharacter?: Character;
    updatedFragment?: CharacterFragment;
  } {
    const all = this.getAllStoredFragments();
    const fragIndex = all.findIndex((f) => f.id === fragmentId && f.ownerId === userId);

    if (fragIndex < 0) {
      return { success: false, error: 'Fragmento não encontrado.' };
    }

    const fragment = all[fragIndex];
    if (fragment.amount < FRAGMENTS_CONFIG.REQUIRED_TO_UNLOCK_OR_EVOLVE) {
      return {
        success: false,
        error: `Fragmentos insuficientes. Necessário: ${FRAGMENTS_CONFIG.REQUIRED_TO_UNLOCK_OR_EVOLVE}, você possui: ${fragment.amount}.`,
      };
    }

    // Deduz 100 fragmentos
    const updatedFragment: CharacterFragment = {
      ...fragment,
      amount: fragment.amount - FRAGMENTS_CONFIG.REQUIRED_TO_UNLOCK_OR_EVOLVE,
      updatedAt: new Date().toISOString(),
    };
    all[fragIndex] = updatedFragment;
    this.saveAllStoredFragments(all);

    // Instancia o personagem desbloqueado
    const template = CHARACTER_TEMPLATES.find(
      (t) => t.name.toLowerCase() === fragment.characterName.toLowerCase()
    );

    let unlockedCharacter: Character;
    if (template) {
      unlockedCharacter = instantiateCharacterFromTemplate(template, userId, userName);
    } else {
      unlockedCharacter = {
        id: `char-unlocked-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: fragment.characterName,
        type: 'Character',
        class: fragment.characterClass as any,
        rarity: fragment.characterRarity,
        level: 1,
        power: 800,
        experience: 0,
        maxExperience: 500,
        stats: { strength: 60, defense: 60, speed: 60 },
        edition: 'Desbloqueio de Fragmento',
        ownerId: userId,
        ownerName: userName,
        createdAt: new Date().toISOString().split('T')[0],
        description: `Personagem sintetizado através de ${FRAGMENTS_CONFIG.REQUIRED_TO_UNLOCK_OR_EVOLVE} fragmentos de dados quânticos.`,
        status: 'IDLE',
        image: fragment.characterImage,
      };
    }

    return {
      success: true,
      unlockedCharacter,
      updatedFragment,
    };
  }
}
