import { NexaUser, LevelReward, LevelUpResult, LevelUpRecord, Character } from '../types';
import {
  LEVEL_CONFIG,
  LEVEL_REWARDS,
  MAX_GAME_LEVEL,
  getXpRequiredForLevel,
  getSlotsForLevel,
  getLevelReward,
} from '../config/levelConfig';
import { EconomyService } from './economyService';
import { BoxService } from './boxService';
import { LedgerService } from './ledgerService';

const LEVEL_UP_HISTORY_KEY = 'nexa_level_up_history_v1';
const ASSETS_KEY = 'nexa_assets_v1';

/**
 * In-memory fallback for environments without window.localStorage (e.g. Node tests)
 */
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

export class ProgressionServiceClass {
  /**
   * Obtém o usuário a partir do serviço de economia central
   */
  public getUser(userId: string): NexaUser | null {
    return EconomyService.getUser(userId);
  }

  /**
   * Retorna os registros de histórico de Level Up de um usuário
   */
  public getLevelUpHistory(userId: string): LevelUpRecord[] {
    try {
      const raw = storageGet(LEVEL_UP_HISTORY_KEY);
      if (!raw) return [];
      const allRecords = JSON.parse(raw) as LevelUpRecord[];
      return allRecords.filter((r) => r.userId === userId);
    } catch {
      return [];
    }
  }

  public getLevelHistory(userId: string): LevelUpRecord[] {
    return this.getLevelUpHistory(userId);
  }

  /**
   * Salva um novo registro no histórico de Level Up
   */
  private recordLevelUpHistory(
    userId: string,
    previousLevel: number,
    newLevel: number,
    rewards: LevelReward[]
  ): void {
    try {
      const raw = storageGet(LEVEL_UP_HISTORY_KEY);
      const allRecords = raw ? (JSON.parse(raw) as LevelUpRecord[]) : [];

      const rewardSummary = rewards.map((r) => `${r.icon} ${r.name}`).join(', ') || 'Nenhuma recompensa';

      const newRecord: LevelUpRecord = {
        id: `lvlup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId,
        previousLevel,
        newLevel,
        reward: rewardSummary,
        rewardsList: rewards,
        timestamp: new Date().toISOString(),
      };

      allRecords.unshift(newRecord);
      storageSet(LEVEL_UP_HISTORY_KEY, JSON.stringify(allRecords));
    } catch {
      // Storage fallback
    }
  }

  /**
   * Retorna a quantidade de slots desbloqueados para um determinado nível
   */
  public getUnlockedSlots(level: number): number {
    return getSlotsForLevel(level);
  }

  /**
   * Verifica se uma funcionalidade do jogo está desbloqueada pelo nível
   */
  public isFeatureUnlocked(userLevel: number, feature: 'COLLECTIONS'): boolean {
    if (feature === 'COLLECTIONS') {
      return userLevel >= 10;
    }
    return true;
  }

  /**
   * Resgata uma recompensa de nível garantindo que nunca seja resgatada duas vezes.
   */
  public claimLevelReward(
    userId: string,
    level: number
  ): { success: boolean; message: string; reward?: LevelReward; user?: NexaUser } {
    const user = EconomyService.getUser(userId);
    if (!user) {
      return { success: false, message: 'Piloto não encontrado.' };
    }

    if (user.level < level) {
      return {
        success: false,
        message: `Você precisa alcançar o Nível ${level} para reivindicar esta recompensa. Seu nível atual é ${user.level}.`,
      };
    }

    const claimed = new Set(user.levelRewardsClaimed || []);
    if (claimed.has(level)) {
      return {
        success: false,
        message: `A recompensa do Nível ${level} já foi coletada anteriormente. Não é permitido resgatar duas vezes.`,
      };
    }

    const reward = getLevelReward(level);
    if (!reward) {
      return {
        success: false,
        message: `Nenhuma recompensa cadastrada para o Nível ${level}.`,
      };
    }

    claimed.add(level);
    let updatedUser: NexaUser = {
      ...user,
      levelRewardsClaimed: Array.from(claimed),
    };

    // Conceder recompensa
    const grantRes = this.grantLevelReward(updatedUser, reward);
    updatedUser = {
      ...grantRes.user,
      levelRewardsClaimed: Array.from(claimed),
    };

    EconomyService.saveUser(updatedUser);

    return {
      success: true,
      message: `Recompensa do Nível ${level} resgatada com sucesso! (${reward.name})`,
      reward,
      user: updatedUser,
    };
  }

  /**
   * Retorna as próximas recompensas a partir do nível atual
   */
  public getNextRewards(currentLevel: number, count = 2): LevelReward[] {
    const rewards: LevelReward[] = [];
    for (let lvl = currentLevel + 1; lvl <= MAX_GAME_LEVEL; lvl++) {
      const rew = getLevelReward(lvl);
      if (rew) {
        rewards.push(rew);
        if (rewards.length >= count) break;
      }
    }
    return rewards;
  }

  /**
   * Retorna a trilha completa de progressão com status de desbloqueio para o usuário
   */
  public getProgressionTimeline(
    userLevel: number,
    claimedRewards: number[] = []
  ): Array<LevelReward & { isReached: boolean; isClaimed: boolean }> {
    const claimedSet = new Set(claimedRewards);
    const timeline: Array<LevelReward & { isReached: boolean; isClaimed: boolean }> = [];

    // Prioritários: todos os níveis configurados na tabela LEVEL_REWARDS
    const sortedLevels = Object.keys(LEVEL_REWARDS)
      .map(Number)
      .sort((a, b) => a - b);

    for (const lvl of sortedLevels) {
      const reward = LEVEL_REWARDS[lvl];
      if (reward) {
        timeline.push({
          ...reward,
          isReached: userLevel >= lvl,
          isClaimed: claimedSet.has(lvl),
        });
      }
    }

    return timeline;
  }

  /**
   * Centraliza a concessão de itens/moedas/caixas/desbloqueios para uma recompensa
   * Garante que uma recompensa não seja duplicada.
   */
  private grantLevelReward(
    user: NexaUser,
    reward: LevelReward
  ): { user: NexaUser; description: string } {
    let currentUser = user;
    const desc = `${reward.icon} ${reward.name} (Nível ${reward.level})`;

    // 1. Caixa
    if (reward.type === 'BOX' && reward.boxType) {
      BoxService.grantBox(currentUser.id, reward.boxType, 'SEASON_REWARD');
      LedgerService.recordEntry(
        currentUser.id,
        currentUser.username,
        'NEX',
        0,
        currentUser.balanceNEX,
        'LEVEL_REWARD',
        `Recompensa de Nível ${reward.level}: ${reward.name}`
      );
    }

    // 2. Moeda NEX
    if (reward.type === 'NEX' && typeof reward.value === 'number') {
      currentUser = EconomyService.addCurrency(currentUser.id, 'NEX', reward.value);
      LedgerService.recordEntry(
        currentUser.id,
        currentUser.username,
        'NEX',
        reward.value,
        currentUser.balanceNEX,
        'LEVEL_REWARD',
        `Recompensa de Nível ${reward.level}: +${reward.value} NEX`
      );
    }

    // 3. Moedas mistas ou NXA especial (ex: Nível 9, 10, 14, 19, 28, 35, 45, 50)
    if (reward.level === 9) {
      currentUser = EconomyService.addCurrency(currentUser.id, 'NXA', 20);
    } else if (reward.level === 10) {
      currentUser = EconomyService.addCurrency(currentUser.id, 'NEX', 100);
    } else if (reward.level === 14) {
      currentUser = EconomyService.addCurrency(currentUser.id, 'NXA', 25);
    } else if (reward.level === 19) {
      currentUser = EconomyService.addCurrency(currentUser.id, 'NXA', 30);
    } else if (reward.level === 28) {
      currentUser = EconomyService.addCurrency(currentUser.id, 'NXA', 50);
    } else if (reward.level === 35) {
      currentUser = EconomyService.addCurrency(currentUser.id, 'NXA', 100);
    } else if (reward.level === 45) {
      currentUser = EconomyService.addCurrency(currentUser.id, 'NXA', 150);
    } else if (reward.level === 50) {
      currentUser = EconomyService.addCurrency(currentUser.id, 'NXA', 500);
    }

    // 4. Personagem
    if (reward.type === 'CHARACTER' && reward.characterDetails) {
      const details = reward.characterDetails;
      const newChar: Character = {
        id: `char-lvl${reward.level}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: details.name,
        type: 'Character',
        class: details.class,
        rarity: details.rarity,
        level: 1,
        power: details.power,
        experience: 0,
        maxExperience: 500,
        stats: {
          strength: 65,
          defense: 70,
          speed: 60,
        },
        edition: `Recompensa Nível ${reward.level}`,
        ownerId: currentUser.id,
        ownerName: currentUser.username,
        createdAt: new Date().toISOString().split('T')[0],
        description: reward.description,
        status: 'IDLE',
        image: details.image,
      };

      try {
        const stored = storageGet(ASSETS_KEY);
        const existing = stored ? JSON.parse(stored) : [];
        storageSet(ASSETS_KEY, JSON.stringify([newChar, ...existing]));
      } catch {
        // storage fallback
      }

      LedgerService.recordEntry(
        currentUser.id,
        currentUser.username,
        'NEX',
        0,
        currentUser.balanceNEX,
        'LEVEL_REWARD',
        `Personagem desbloqueado: ${details.name} (Nível ${reward.level})`
      );
    }

    // 5. Desbloqueio Exclusivo / Título
    if (reward.level === 30) {
      currentUser.title = 'Mestre do Vórtice';
      currentUser = EconomyService.addCurrency(currentUser.id, 'NEX', 1000);
    } else if (reward.level === 50) {
      currentUser.title = 'Lenda Cósmica Nexa';
      BoxService.grantBox(currentUser.id, 'PREMIUM', 'SEASON_REWARD');
      currentUser = EconomyService.addCurrency(currentUser.id, 'NEX', 5000);
    }

    // 6. Slots adicionais
    if (reward.unlockedSlots) {
      currentUser.unlockedSlots = Math.max(currentUser.unlockedSlots || 1, reward.unlockedSlots);
    }

    // Garantir que dados de progressão passem íntegros
    currentUser = {
      ...currentUser,
      level: user.level,
      experience: user.experience,
      maxExperience: user.maxExperience,
      unlockedSlots: Math.max(currentUser.unlockedSlots || 1, user.unlockedSlots || 1),
      levelRewardsClaimed: user.levelRewardsClaimed,
    };

    return { user: currentUser, description: desc };
  }

  /**
   * ============================================================================
   * addExperience(userId, amount)
   * ============================================================================
   * Centraliza a distribuição de XP com validação de segurança, cálculo de
   * sobras progressivas sem perda de XP e desbloqueio atômico de recompensas.
   * ============================================================================
   */
  public addExperience(userId: string, amount: number): LevelUpResult {
    if (amount <= 0) {
      const user = EconomyService.getUser(userId);
      const lvl = user?.level || 1;
      const slots = this.getUnlockedSlots(lvl);
      return {
        leveledUp: false,
        previousLevel: lvl,
        newLevel: lvl,
        levelsGained: [],
        rewardsGranted: [],
        unlockedSlots: slots,
        previousSlots: slots,
        newSlotsUnlocked: false,
        leftoverXp: user?.experience || 0,
        maxXpForNewLevel: user?.maxExperience || getXpRequiredForLevel(lvl),
      };
    }

    const user = EconomyService.getUser(userId);
    if (!user) {
      throw new Error(`Piloto não encontrado para adição de experiência: ID ${userId}`);
    }

    const previousLevel = user.level || 1;
    const previousSlots = user.unlockedSlots || this.getUnlockedSlots(previousLevel);
    let currentLvl = previousLevel;
    let currentExp = (user.experience || 0) + Math.round(amount);
    let requiredExp = getXpRequiredForLevel(currentLvl);

    const levelsGained: number[] = [];
    const rewardsGranted: LevelReward[] = [];
    const claimedRewards = new Set(user.levelRewardsClaimed || []);

    // Se usuário for nível 1 e ainda não tiver a recompensa inicial registrada
    if (!claimedRewards.has(1)) {
      claimedRewards.add(1);
    }

    // Loop de evolução enquanto tiver XP suficiente para transitar de nível
    while (currentExp >= requiredExp && currentLvl < MAX_GAME_LEVEL) {
      currentExp -= requiredExp;
      currentLvl += 1;
      levelsGained.push(currentLvl);
      requiredExp = getXpRequiredForLevel(currentLvl);

      // Conceder recompensa do novo nível se ainda não resgatada
      const reward = getLevelReward(currentLvl);
      if (reward && !claimedRewards.has(currentLvl)) {
        rewardsGranted.push(reward);
        claimedRewards.add(currentLvl);
      }
    }

    const newSlots = this.getUnlockedSlots(currentLvl);
    const leveledUp = levelsGained.length > 0;
    const newSlotsUnlocked = newSlots > previousSlots;

    // Atualiza o usuário
    let updatedUser: NexaUser = {
      ...user,
      level: currentLvl,
      experience: currentExp,
      maxExperience: requiredExp,
      unlockedSlots: newSlots,
      levelRewardsClaimed: Array.from(claimedRewards),
    };

    // Salva o usuário base antes de processar moedas e recompensas
    EconomyService.saveUser(updatedUser);

    // Concede todas as recompensas ganhas atomicamente
    for (const rew of rewardsGranted) {
      const grantRes = this.grantLevelReward(updatedUser, rew);
      updatedUser = {
        ...grantRes.user,
        level: currentLvl,
        experience: currentExp,
        maxExperience: requiredExp,
        unlockedSlots: Math.max(newSlots, grantRes.user.unlockedSlots || newSlots),
        levelRewardsClaimed: Array.from(claimedRewards),
      };
    }

    // Persiste o usuário no banco de contas local
    EconomyService.saveUser(updatedUser);

    // Registra no histórico de Level Up se subiu de nível
    if (leveledUp) {
      this.recordLevelUpHistory(userId, previousLevel, currentLvl, rewardsGranted);

      LedgerService.recordEntry(
        userId,
        updatedUser.username,
        'NEX',
        0,
        updatedUser.balanceNEX,
        'LEVEL_UP',
        `LEVEL UP! Piloto avançou do Nível ${previousLevel} para o Nível ${currentLvl}.`
      );
    }

    return {
      leveledUp,
      previousLevel,
      newLevel: currentLvl,
      levelsGained,
      rewardsGranted,
      unlockedSlots: newSlots,
      previousSlots,
      newSlotsUnlocked,
      leftoverXp: currentExp,
      maxXpForNewLevel: requiredExp,
    };
  }
}

export const ProgressionService = new ProgressionServiceClass();
