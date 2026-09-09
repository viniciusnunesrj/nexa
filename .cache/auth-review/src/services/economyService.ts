import { NexaUser, StoredAuthAccount, Card, CardState, SynthesisProductionStatus, LevelUpResult } from '../types';
import { AUTH_USERS_KEY, AUTH_SESSION_KEY, ASSETS_STORAGE_KEY } from './authService';
import { LedgerService } from './ledgerService';
import { MOCK_COMMUNITY_USERS, CURRENT_USER } from '../data/mockUsers';
import { ProgressionService } from './progressionService';
import { getSynthesisRateForRarity, getSynthesisCapForRarity } from '../config/synthesisConfig';
import { SupabaseService } from './supabaseService';
import { isSupabaseConfigured } from '../lib/supabase';

/**
 * In-memory fallback storage when localStorage is unavailable (e.g. Node.js automated test runner)
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

export class EconomyServiceClass {
  /**
   * Reads raw stored accounts from persistent database
   */
  private getRawAccounts(): StoredAuthAccount[] {
    const raw = storageGet(AUTH_USERS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        // fallback to seed
      }
    }

    // Default synchronous seed if storage is not yet populated
    const seeded: StoredAuthAccount[] = MOCK_COMMUNITY_USERS.map((u) => ({
      ...u,
      passwordHash: 'seeded_hash',
      salt: 'seeded_salt',
    }));
    this.saveRawAccounts(seeded);
    return seeded;
  }

  /**
   * Writes raw accounts back to the persistent database
   */
  private saveRawAccounts(accounts: StoredAuthAccount[]): void {
    storageSet(AUTH_USERS_KEY, JSON.stringify(accounts));
  }

  /**
   * Syncs active session in storage if the updated user is currently logged in
   */
  private syncActiveSessionIfCurrent(updatedUser: NexaUser): void {
    const currentSessionRaw = storageGet(AUTH_SESSION_KEY);
    if (currentSessionRaw) {
      try {
        const sessionUser = JSON.parse(currentSessionRaw) as NexaUser;
        if (sessionUser.id === updatedUser.id) {
          storageSet(AUTH_SESSION_KEY, JSON.stringify(updatedUser));
        }
      } catch {
        // ignore
      }
    }
  }

  /**
   * Retorna o usuário persistido pelo seu ID único.
   * Única fonte da verdade para dados do usuário.
   */
  public getUser(userId: string): NexaUser | null {
    if (!userId) return null;
    const accounts = this.getRawAccounts();
    let account = accounts.find((a) => a.id === userId);

    // Fallback: if user was not in accounts list yet (e.g. mock user or current_user)
    if (!account) {
      if (isSupabaseConfigured()) {
        const remoteProfile = SupabaseService.getProfileSync(userId);
        if (remoteProfile) {
          account = {
            ...remoteProfile,
            passwordHash: 'remote_synced',
            salt: 'remote_salt',
          };
          accounts.push(account);
          this.saveRawAccounts(accounts);
          const { passwordHash, salt, ...user } = account;
          return user;
        }
      }

      const match = MOCK_COMMUNITY_USERS.find((u) => u.id === userId) || (userId === CURRENT_USER.id ? CURRENT_USER : null);
      if (match) {
        account = {
          ...match,
          passwordHash: 'seeded_hash',
          salt: 'seeded_salt',
        };
        accounts.push(account);
        this.saveRawAccounts(accounts);
      } else {
        return null;
      }
    } else if (isSupabaseConfigured()) {
      // Se houver dados mais recentes do Supabase, ele é a FONTE DA VERDADE
      const remote = SupabaseService.getProfileSync(userId);
      if (remote) {
        if (
          account.balanceNEX !== remote.balanceNEX ||
          account.balanceNXA !== remote.balanceNXA ||
          account.level !== remote.level ||
          account.experience !== remote.experience
        ) {
          account = { ...account, ...remote };
          const idx = accounts.findIndex((a) => a.id === userId);
          if (idx >= 0) accounts[idx] = account;
          this.saveRawAccounts(accounts);
        }
      }
    }

    const { passwordHash, salt, ...user } = account;
    return user;
  }

  /**
   * Hidrata o cache local a partir do Supabase garantindo que a base remota
   * nunca seja sobrescrita por dados locais defasados.
   */
  public hydrateProfileFromSupabase(remoteUser: NexaUser): void {
    if (!remoteUser?.id) return;
    const accounts = this.getRawAccounts();
    const idx = accounts.findIndex((a) => a.id === remoteUser.id);
    if (idx >= 0) {
      accounts[idx] = {
        ...accounts[idx],
        ...remoteUser,
      };
    } else {
      accounts.push({
        ...remoteUser,
        passwordHash: 'remote_synced',
        salt: 'remote_salt',
      });
    }
    this.saveRawAccounts(accounts);
    this.syncActiveSessionIfCurrent(remoteUser);
  }

  /**
   * Retorna todos os usuários cadastrados sem credenciais confidenciais.
   * Conecta com a base remota compartilhada do Supabase para unificar PC, Celular e outros navegadores.
   */
  public getAllUsers(): NexaUser[] {
    const accounts = this.getRawAccounts();
    const localUsers = accounts.map(({ passwordHash, salt, ...user }) => user);

    // If Supabase has fetched profiles, merge any user created on other devices
    if (isSupabaseConfigured()) {
      // Trigger background fetch to keep profiles fresh across devices
      SupabaseService.fetchAllProfiles().then((remoteUsers) => {
        if (remoteUsers && remoteUsers.length > 0) {
          const currentAccounts = this.getRawAccounts();
          let changed = false;
          for (const ru of remoteUsers) {
            const idx = currentAccounts.findIndex((a) => a.id === ru.id);
            if (idx >= 0) {
              if (
                currentAccounts[idx].balanceNEX !== ru.balanceNEX ||
                currentAccounts[idx].experience !== ru.experience ||
                currentAccounts[idx].level !== ru.level
              ) {
                currentAccounts[idx] = { ...currentAccounts[idx], ...ru };
                changed = true;
              }
            } else {
              currentAccounts.push({
                ...ru,
                passwordHash: 'remote_synced',
                salt: 'remote_salt',
              });
              changed = true;
            }
          }
          if (changed) {
            this.saveRawAccounts(currentAccounts);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('nexa_ranking_updated'));
            }
          }
        }
      }).catch(() => {});
    }

    return localUsers;
  }

  /**
   * Salva alterações genéricas do usuário garantindo persistência na base e na sessão.
   */
  public saveUser(updatedUser: NexaUser): NexaUser {
    const accounts = this.getRawAccounts();
    const index = accounts.findIndex((a) => a.id === updatedUser.id);
    if (index === -1) {
      throw new Error(`Usuário não encontrado na base de dados: ${updatedUser.id}`);
    }

    accounts[index] = {
      ...accounts[index],
      ...updatedUser,
    };

    this.saveRawAccounts(accounts);
    this.syncActiveSessionIfCurrent(updatedUser);

    // Persiste apenas campos editáveis do perfil (bio, título, avatar, etc) no Supabase
    // NUNCA sobrescreve colunas econômicas protegidas
    if (isSupabaseConfigured()) {
      SupabaseService.updateEditableProfile(updatedUser.id, {
        username: updatedUser.username,
        avatar: updatedUser.avatar,
        bio: updatedUser.bio,
        title: updatedUser.title,
        isFirstAccess: updatedUser.isFirstAccess,
      }).catch((err) =>
        console.warn('[EconomyService] Erro ao sincronizar perfil editável no Supabase:', err)
      );
    }

    return updatedUser;
  }

  /**
   * Atualiza diretamente o saldo de NEX ou NXA no cache local não-autoritativo.
   * O banco de dados oficial Supabase só é alterado pelas RPCs SECURITY DEFINER.
   */
  public updateUserBalance(userId: string, currency: 'NEX' | 'NXA', newBalance: number): NexaUser {
    const safeBalance = Math.max(0, Math.round(newBalance));
    const accounts = this.getRawAccounts();
    const index = accounts.findIndex((a) => a.id === userId);

    if (index === -1) {
      throw new Error(`Usuário com ID "${userId}" não encontrado para atualização de saldo.`);
    }

    if (currency === 'NEX') {
      accounts[index].balanceNEX = safeBalance;
    } else {
      accounts[index].balanceNXA = safeBalance;
    }

    this.saveRawAccounts(accounts);

    const { passwordHash, salt, ...userWithoutSecrets } = accounts[index];
    this.syncActiveSessionIfCurrent(userWithoutSecrets);

    return userWithoutSecrets;
  }

  /**
   * Adiciona valor à moeda do usuário garantindo persistência imediata.
   */
  public addCurrency(userId: string, currency: 'NEX' | 'NXA', amount: number): NexaUser {
    if (amount < 0) {
      return this.removeCurrency(userId, currency, Math.abs(amount));
    }
    const user = this.getUser(userId);
    if (!user) {
      throw new Error(`Usuário com ID "${userId}" não encontrado ao adicionar ${currency}.`);
    }

    const currentBalance = currency === 'NEX' ? user.balanceNEX : user.balanceNXA;
    const newBalance = currentBalance + Math.round(amount);
    return this.updateUserBalance(userId, currency, newBalance);
  }

  /**
   * Remove valor da moeda do usuário com validação de saldo suficiente.
   */
  public removeCurrency(userId: string, currency: 'NEX' | 'NXA', amount: number): NexaUser {
    if (amount < 0) {
      return this.addCurrency(userId, currency, Math.abs(amount));
    }
    const user = this.getUser(userId);
    if (!user) {
      throw new Error(`Usuário com ID "${userId}" não encontrado ao debitar ${currency}.`);
    }

    const currentBalance = currency === 'NEX' ? user.balanceNEX : user.balanceNXA;
    if (currentBalance < amount) {
      throw new Error(
        `Saldo insuficiente de ${currency}. Necessário: ${amount.toLocaleString()}, Disponível: ${currentBalance.toLocaleString()}.`
      );
    }

    const newBalance = currentBalance - Math.round(amount);
    return this.updateUserBalance(userId, currency, newBalance);
  }

  /**
   * Alias para removeCurrency
   */
  public deductCurrency(userId: string, currency: 'NEX' | 'NXA', amount: number): NexaUser {
    return this.removeCurrency(userId, currency, amount);
  }

  /**
   * Aplica atomicamente os resultados de combate (moedas, XP, nível, vitórias/derrotas)
   * em uma ÚNICA transação na base de dados persistente.
   * Evita a condição de corrida em que múltiplos setState sobrescreviam o saldo.
   */
  public applyBattleReward(
    userId: string,
    reward: {
      nexGained: number;
      nxaGained: number;
      xpGained: number;
      victory: boolean;
    }
  ): NexaUser & { levelUpResult?: LevelUpResult } {
    const accounts = this.getRawAccounts();
    const index = accounts.findIndex((a) => a.id === userId);

    if (index === -1) {
      throw new Error(`Usuário com ID "${userId}" não encontrado ao aplicar recompensa de combate.`);
    }

    const current = accounts[index];

    // 1. Atualiza saldos
    const newNEX = Math.max(0, Math.round(current.balanceNEX + (reward.nexGained || 0)));
    const newNXA = Math.max(0, Math.round(current.balanceNXA + (reward.nxaGained || 0)));

    // 2. Calcula XP e Nível da Temporada
    const seasonXPGained = Math.floor((reward.xpGained || 0) * 1.5);
    let seasonXP = (current.seasonXP || 0) + seasonXPGained;
    let seasonLvl = current.seasonLevel || 1;
    const seasonXPPerLevel = 1000;

    while (seasonXP >= seasonXPPerLevel && seasonLvl < 20) {
      seasonXP -= seasonXPPerLevel;
      seasonLvl += 1;
    }

    // 3. Incrementa vitórias ou derrotas
    const victories = (current.victories || 0) + (reward.victory ? 1 : 0);
    const defeats = (current.defeats || 0) + (reward.victory ? 0 : 1);

    // 4. Salva dados parciais na base persistente
    accounts[index] = {
      ...current,
      balanceNEX: newNEX,
      balanceNXA: newNXA,
      seasonXP,
      seasonLevel: seasonLvl,
      victories,
      defeats,
    };

    this.saveRawAccounts(accounts);

    // 5. Centraliza a progressão do piloto via ProgressionService
    const levelUpResult = ProgressionService.addExperience(userId, reward.xpGained || 0);

    // 6. Obtém o usuário pós-progressão e sincroniza sessão
    const finalUser = this.getUser(userId) || accounts[index];
    this.syncActiveSessionIfCurrent(finalUser);

    // Persiste dados da batalha no Supabase
    if (isSupabaseConfigured()) {
      SupabaseService.applyBattleRewardAtomic({
        userId,
        victory: reward.victory,
        nexGained: reward.nexGained,
        nxaGained: reward.nxaGained,
        xpGained: reward.xpGained,
      }).then((res) => {
        if (res.success && res.balanceNex !== undefined) {
          this.updateUserBalance(userId, 'NEX', res.balanceNex);
          if (res.balanceNxa !== undefined) {
            this.updateUserBalance(userId, 'NXA', res.balanceNxa);
          }
        }
      }).catch(() => {});
    }

    return {
      ...finalUser,
      levelUpResult,
    };
  }

  /**
   * Helper: Salva alterações de uma carta diretamente no storage persistente de ativos e Supabase
   */
  public saveCardToStorage(card: Card): void {
    const raw = storageGet(ASSETS_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const updated = parsed.map((a: any) => (a.id === card.id ? card : a));
          storageSet(ASSETS_STORAGE_KEY, JSON.stringify(updated));
        }
      } catch {
        // ignore
      }
    }

    if (isSupabaseConfigured()) {
      SupabaseService.saveCard(card).catch(() => {});
    }
  }

  /**
   * Helper: Remove permanentemente uma carta do storage persistente de ativos (QUEIMA/DESTRUIÇÃO) e Supabase
   */
  public burnCardFromStorage(cardId: string): void {
    const raw = storageGet(ASSETS_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const remaining = parsed.filter((a: any) => a.id !== cardId);
          storageSet(ASSETS_STORAGE_KEY, JSON.stringify(remaining));
        }
      } catch {
        // ignore
      }
    }

    if (isSupabaseConfigured()) {
      SupabaseService.deleteCard(cardId).catch(() => {});
    }
  }

  /**
   * Normaliza e migra qualquer carta para a estrutura compatível com a máquina de estados:
   * FREE | ACTIVE | EXHAUSTED
   * Garante fallback para cartas antigas sem perder dados nem conceder produção indevida.
   */
  public normalizeCardSynthesis(card: Card): Card {
    const rawState = card.state || (card.cardStatus === 'SYNTHESIZING' ? 'ACTIVE' : card.cardStatus) || 'FREE';
    const state: CardState =
      rawState === 'EXHAUSTED' ? 'EXHAUSTED' : rawState === 'ACTIVE' ? 'ACTIVE' : 'FREE';

    const rate = card.synthesisRate || getSynthesisRateForRarity(card.rarity);
    const cap = card.synthesisCap || getSynthesisCapForRarity(card.rarity);

    let synthesizedAtMs: number | null = null;
    if (typeof card.synthesizedAt === 'number') {
      synthesizedAtMs = card.synthesizedAt;
    } else if (typeof card.synthesizedAt === 'string') {
      synthesizedAtMs = new Date(card.synthesizedAt).getTime();
    }

    let lastAccrualAtMs: number | null = null;
    if (typeof card.lastAccrualAt === 'number') {
      lastAccrualAtMs = card.lastAccrualAt;
    } else if (typeof card.lastAccrualAt === 'string') {
      lastAccrualAtMs = new Date(card.lastAccrualAt).getTime();
    } else if (state === 'ACTIVE') {
      // Fallback para cartas antigas: synthesizedAt ou data atual para evitar NaN
      lastAccrualAtMs = synthesizedAtMs || Date.now();
    }

    let exhaustedAtMs: number | null = null;
    if (typeof card.exhaustedAt === 'number') {
      exhaustedAtMs = card.exhaustedAt;
    } else if (typeof card.exhaustedAt === 'string') {
      exhaustedAtMs = new Date(card.exhaustedAt).getTime();
    }

    const accumulatedNex =
      typeof card.accumulatedNex === 'number'
        ? card.accumulatedNex
        : typeof card.totalGenerated === 'number'
        ? card.totalGenerated
        : 0;

    return {
      ...card,
      cardId: card.cardId || card.id,
      state,
      cardStatus: state,
      status: state === 'FREE' ? card.status : state,
      synthesisRate: rate,
      synthesisCap: cap,
      accumulatedNex,
      synthesizedAt: synthesizedAtMs,
      lastAccrualAt: lastAccrualAtMs,
      exhaustedAt: exhaustedAtMs,
      tradeable: state === 'FREE' && card.status === 'IDLE',
      synthesizable: state === 'FREE',
    };
  }

  /**
   * FUNÇÃO CENTRAL (Requisito 6 e 7):
   * Calcula a produção de NEX da carta de forma idempotente baseada no tempo.
   * Não depende de a página permanecer aberta.
   * Utiliza: Date.now() e lastAccrualAt.
   */
  public calculateSynthesisReward(card: Card, nowMs?: number): Card {
    const normalized = this.normalizeCardSynthesis(card);
    if (normalized.state !== 'ACTIVE') {
      return normalized;
    }

    const now = nowMs !== undefined ? nowMs : Date.now();
    const lastAccrual = normalized.lastAccrualAt
      ? typeof normalized.lastAccrualAt === 'number'
        ? normalized.lastAccrualAt
        : new Date(normalized.lastAccrualAt).getTime()
      : now;
    const elapsedMs = Math.max(0, now - lastAccrual);

    if (elapsedMs === 0) {
      return normalized;
    }

    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    const earned = elapsedHours * normalized.synthesisRate;
    const newAccumulated = Math.min(normalized.accumulatedNex + earned, normalized.synthesisCap);
    const reachedCap = newAccumulated >= normalized.synthesisCap;

    return {
      ...normalized,
      accumulatedNex: newAccumulated,
      lastAccrualAt: now,
      state: reachedCap ? 'EXHAUSTED' : 'ACTIVE',
      cardStatus: reachedCap ? 'EXHAUSTED' : 'ACTIVE',
      status: reachedCap ? 'EXHAUSTED' : 'ACTIVE',
      exhaustedAt: reachedCap ? normalized.exhaustedAt || now : null,
      tradeable: false,
      synthesizable: false,
    };
  }

  /**
   * Obtém a projeção em tempo real para exibição visual na UI
   * sem mutar prematuramente o lastAccrualAt a cada render/tick.
   */
  public getInstantSynthesisProduction(
    card: Card,
    nowMs?: number
  ): {
    cardId: string;
    state: CardState;
    cardStatus: CardState;
    ratePerHour: number;
    synthesisCap: number;
    accumulatedNex: number;
    progressPercentage: number;
    estimatedHoursToCap: number;
    isExhausted: boolean;
  } {
    const normalized = this.normalizeCardSynthesis(card);

    if (normalized.state === 'FREE') {
      return {
        cardId: normalized.id,
        state: 'FREE',
        cardStatus: 'FREE',
        ratePerHour: normalized.synthesisRate,
        synthesisCap: normalized.synthesisCap,
        accumulatedNex: 0,
        progressPercentage: 0,
        estimatedHoursToCap:
          normalized.synthesisRate > 0 ? normalized.synthesisCap / normalized.synthesisRate : 0,
        isExhausted: false,
      };
    }

    if (normalized.state === 'EXHAUSTED' || normalized.accumulatedNex >= normalized.synthesisCap) {
      return {
        cardId: normalized.id,
        state: 'EXHAUSTED',
        cardStatus: 'EXHAUSTED',
        ratePerHour: 0,
        synthesisCap: normalized.synthesisCap,
        accumulatedNex: Math.min(normalized.accumulatedNex, normalized.synthesisCap),
        progressPercentage: 100,
        estimatedHoursToCap: 0,
        isExhausted: true,
      };
    }

    // Estado ACTIVE
    const now = nowMs !== undefined ? nowMs : Date.now();
    const lastAccrual = normalized.lastAccrualAt
      ? typeof normalized.lastAccrualAt === 'number'
        ? normalized.lastAccrualAt
        : new Date(normalized.lastAccrualAt).getTime()
      : now;
    const elapsedMs = Math.max(0, now - lastAccrual);
    const elapsedHours = elapsedMs / (1000 * 60 * 60);
    const earned = elapsedHours * normalized.synthesisRate;
    const liveAccumulated = Math.min(normalized.accumulatedNex + earned, normalized.synthesisCap);
    const reachedCap = liveAccumulated >= normalized.synthesisCap;
    const remainingToCap = Math.max(0, normalized.synthesisCap - liveAccumulated);
    const estimatedHoursToCap =
      normalized.synthesisRate > 0 ? remainingToCap / normalized.synthesisRate : 0;
    const progressPercentage = Math.min(100, (liveAccumulated / normalized.synthesisCap) * 100);

    return {
      cardId: normalized.id,
      state: reachedCap ? 'EXHAUSTED' : 'ACTIVE',
      cardStatus: reachedCap ? 'EXHAUSTED' : 'ACTIVE',
      ratePerHour: reachedCap ? 0 : normalized.synthesisRate,
      synthesisCap: normalized.synthesisCap,
      accumulatedNex: liveAccumulated,
      progressPercentage,
      estimatedHoursToCap,
      isExhausted: reachedCap,
    };
  }

  /**
   * Compatibilidade com chamadas de status existentes
   */
  public calculateSynthesisProduction(card: Card, customNowMs?: number): SynthesisProductionStatus {
    const prod = this.getInstantSynthesisProduction(card, customNowMs);
    return {
      cardId: card.id,
      cardStatus: prod.cardStatus,
      ratePerHour: prod.ratePerHour,
      totalGenerated: prod.accumulatedNex,
      synthesisCap: prod.synthesisCap,
      unclaimedAmount: prod.accumulatedNex,
      projectedTotal: prod.accumulatedNex,
      isExhausted: prod.isExhausted,
      hoursElapsed: 0,
      estimatedHoursToCap: prod.estimatedHoursToCap,
      progressPercentage: prod.progressPercentage,
    };
  }

  public getSynthesisStatus(card: Card, customNowMs?: number): SynthesisProductionStatus {
    return this.calculateSynthesisProduction(card, customNowMs);
  }

  public calculateAccumulatedNEX(card: Card, customNowMs?: number): number {
    return this.getInstantSynthesisProduction(card, customNowMs).accumulatedNex;
  }

  /**
   * SÍNTESE (Requisito 10):
   * Inicia o processo de síntese de uma carta livre (FREE).
   * Valida: posse, estado FREE, status IDLE.
   * Define: state = ACTIVE, accumulatedNex = 0, synthesizedAt = Date.now(), lastAccrualAt = Date.now()
   */
  public synthesizeCard(card: Card, userId: string, nowMs?: number): Card {
    if (card.ownerId !== userId) {
      throw new Error('Você só pode sintetizar cartas que pertencem à sua conta.');
    }

    const normalized = this.normalizeCardSynthesis(card);

    if (normalized.state === 'ACTIVE') {
      throw new Error('Esta carta já está sintetizando NEX ativamente.');
    }
    if (normalized.state === 'EXHAUSTED') {
      throw new Error('Esta carta já atingiu seu limite de produção e está esgotada.');
    }
    if (card.status === 'LISTED' || card.status === 'TRADING') {
      throw new Error('Não é possível sintetizar uma carta enquanto ela estiver listada ou em troca.');
    }

    const now = nowMs !== undefined ? nowMs : Date.now();
    const rate = normalized.synthesisRate;
    const cap = normalized.synthesisCap;

    const synthesizedCard: Card = {
      ...normalized,
      state: 'ACTIVE',
      cardStatus: 'ACTIVE',
      status: 'ACTIVE',
      synthesisRate: rate,
      synthesisCap: cap,
      accumulatedNex: 0,
      synthesizedAt: now,
      lastAccrualAt: now,
      exhaustedAt: null,
      tradeable: false,
      synthesizable: false,
    };

    this.saveCardToStorage(synthesizedCard);

    if (isSupabaseConfigured()) {
      SupabaseService.startSynthesisAtomic({
        userId,
        cardId: card.id,
      }).catch((err) => {
        console.warn('[EconomyService] Erro ao iniciar síntese atômica no Supabase:', err);
      });
    }

    return synthesizedCard;
  }

  /**
   * SACAR NEX (Requisitos 11, 12, 13, 14, 15):
   * Realiza o saque dos rendimentos acumulados de NEX e DESTRÓI a carta.
   * REGRA CRÍTICA: "SACAR = DESTRUIR A CARTA."
   * A carta NÃO é resetada para FREE; ela é permanentemente removida do inventário.
   */
  public claimSynthesisReward(
    userId: string,
    card: Card,
    nowMs?: number
  ): {
    claimedNEX: number;
    user: NexaUser;
    cardDestroyedId: string;
    cardName: string;
  } {
    if (card.ownerId !== userId) {
      throw new Error('Você não possui permissão para realizar o saque desta carta.');
    }

    const normalized = this.normalizeCardSynthesis(card);

    if (normalized.state === 'FREE') {
      throw new Error('Apenas cartas em síntese ativa ou esgotadas acumulam NEX para saque.');
    }

    // Calcula produção consolidada até o momento exato do saque
    const consolidated = this.calculateSynthesisReward(normalized, nowMs);
    const amountToCredit = consolidated.accumulatedNex;

    if (amountToCredit <= 0) {
      throw new Error('Nenhum NEX disponível para saque no momento.');
    }

    // 1. Adiciona o saldo de NEX ao usuário
    const updatedUser = this.addCurrency(userId, 'NEX', amountToCredit);

    // 2. Registra transação de recompensa no Ledger (Requisito 14)
    LedgerService.recordEntry(
      userId,
      updatedUser.username,
      'NEX',
      amountToCredit,
      updatedUser.balanceNEX,
      'SYNTHESIS_REWARD',
      `Saque de rendimentos de síntese da carta "${card.name}" (+${amountToCredit.toFixed(2)} NEX)`,
      {
        cardId: card.id,
      }
    );

    // 3. Registra transação de queima permanente da carta no Ledger (Requisito 14)
    LedgerService.recordEntry(
      userId,
      updatedUser.username,
      'NEX',
      0,
      updatedUser.balanceNEX,
      'CARD_BURNED',
      `Carta "${card.name}" destruída permanentemente após o saque de síntese (${amountToCredit.toFixed(2)} NEX)`,
      {
        cardId: card.id,
        reason: 'SYNTHESIS_WITHDRAWAL',
      }
    );

    // 4. QUEIMA E REMOVE A CARTA DO STORAGE PERSISTENTE
    this.burnCardFromStorage(card.id);

    // 5. Executa a transação atômica no Supabase para garantir integridade server-side
    if (isSupabaseConfigured()) {
      SupabaseService.claimSynthesisAtomic({
        userId,
        cardId: card.id,
        nexReward: amountToCredit,
      }).then((res) => {
        if (res.success && res.newBalance !== undefined) {
          this.updateUserBalance(userId, 'NEX', res.newBalance);
        }
      }).catch((err) => {
        console.warn('[EconomyService] Erro ao sincronizar claimSynthesisAtomic no Supabase:', err);
      });
    }

    return {
      claimedNEX: amountToCredit,
      user: updatedUser,
      cardDestroyedId: card.id,
      cardName: card.name,
    };
  }

  /**
   * Wrapper para compatibilidade com chamadas legadas de claimSynthesisRewards
   */
  public claimSynthesisRewards(
    userId: string,
    card: Card,
    customNowMs?: number
  ): {
    updatedCard: Card;
    claimedNEX: number;
    user: NexaUser;
    productionBefore: number;
    productionAfter: number;
    exhausted: boolean;
  } {
    const res = this.claimSynthesisReward(userId, card, customNowMs);
    const deadCard: Card = {
      ...card,
      state: 'EXHAUSTED',
      cardStatus: 'EXHAUSTED',
      status: 'EXHAUSTED',
      accumulatedNex: 0,
      tradeable: false,
      synthesizable: false,
    };
    return {
      updatedCard: deadCard,
      claimedNEX: res.claimedNEX,
      user: res.user,
      productionBefore: 0,
      productionAfter: res.claimedNEX,
      exhausted: true,
    };
  }

  /**
   * Avança o tempo de sintetização para simulação e testes (Requisito 16)
   */
  public advanceCardSynthesisTime(card: Card, additionalHours: number): Card {
    const normalized = this.normalizeCardSynthesis(card);
    if (normalized.state !== 'ACTIVE') return normalized;
    const addedMs = additionalHours * 3600000;
    const currentLastAccrual = normalized.lastAccrualAt
      ? typeof normalized.lastAccrualAt === 'number'
        ? normalized.lastAccrualAt
        : new Date(normalized.lastAccrualAt).getTime()
      : Date.now();
    const movedCard: Card = {
      ...normalized,
      lastAccrualAt: currentLastAccrual - addedMs,
    };
    const updated = this.calculateSynthesisReward(movedCard);
    this.saveCardToStorage(updated);
    return updated;
  }

  /**
   * Para a síntese da carta sacando os rendimentos e destruindo a carta
   */
  public stopSynthesis(
    card: Card,
    userId: string
  ): { updatedCard: Card; user: NexaUser; claimedNEX: number } {
    const res = this.claimSynthesisReward(userId, card);
    const deadCard: Card = {
      ...card,
      state: 'EXHAUSTED',
      cardStatus: 'EXHAUSTED',
      status: 'EXHAUSTED',
      accumulatedNex: 0,
      tradeable: false,
      synthesizable: false,
    };
    return { updatedCard: deadCard, user: res.user, claimedNEX: res.claimedNEX };
  }

  /**
   * Obtém o ranking global de jogadores calculado dinamicamente
   * Fórmula: rankingScore = (level * 100) + (wins * 50) + Math.floor(xp / 10)
   */
  public getGlobalRanking(currentUserId?: string) {
    const users = this.getAllUsers();
    const raw = users.map((u) => {
      const level = typeof u.level === 'number' && !isNaN(u.level) && u.level > 0 ? u.level : 1;
      const xp = typeof u.experience === 'number' && !isNaN(u.experience)
        ? u.experience
        : typeof (u as any).xp === 'number' && !isNaN((u as any).xp)
        ? (u as any).xp
        : 0;
      const wins = typeof u.victories === 'number' && !isNaN(u.victories)
        ? u.victories
        : typeof (u as any).wins === 'number' && !isNaN((u as any).wins)
        ? (u as any).wins
        : 0;
      const losses = typeof u.defeats === 'number' && !isNaN(u.defeats)
        ? u.defeats
        : typeof (u as any).losses === 'number' && !isNaN((u as any).losses)
        ? (u as any).losses
        : 0;

      const rankingScore = (level * 100) + (wins * 50) + Math.floor(xp / 10);
      let updatedAt = Date.now();
      if (u.createdAt) {
        const parsed = new Date(u.createdAt).getTime();
        if (!isNaN(parsed)) updatedAt = parsed;
      }

      return {
        userId: u.id,
        username: u.username || 'Piloto Anônimo',
        avatar: u.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80',
        level,
        xp,
        wins,
        losses,
        rankingScore,
        updatedAt,
        title: u.title || 'Recruta da Cidadela',
        isCurrentUser: Boolean(currentUserId && u.id === currentUserId),
      };
    });

    raw.sort((a, b) => {
      if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;
      if (b.level !== a.level) return b.level - a.level;
      if (b.xp !== a.xp) return b.xp - a.xp;
      return b.wins - a.wins;
    });

    const ranked = raw.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    return {
      top100: ranked.slice(0, 100),
      myPosition: currentUserId ? ranked.find((e) => e.userId === currentUserId) || null : null,
      totalUsers: ranked.length,
      all: ranked,
    };
  }
}

export const EconomyService = new EconomyServiceClass();
