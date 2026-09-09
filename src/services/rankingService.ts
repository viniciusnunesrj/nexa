import { NexaUser } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mapProfileToNexaUser } from '../lib/supabaseMappers';
import { EconomyService } from './economyService';
import { authService } from './authService';

export interface RankingEntry {
  userId: string;
  username: string;
  avatar: string;
  level: number;
  xp: number;
  wins: number;
  losses: number;
  rankingScore: number;
  updatedAt: number;
  rank: number;
  title?: string;
  isCurrentUser: boolean;
}

export interface GlobalRankingResult {
  top100: RankingEntry[];
  myPosition: RankingEntry | null;
  totalUsers: number;
  all: RankingEntry[];
}

/**
 * Fórmula Centralizada de Pontuação do Ranking Global NEXA:
 * rankingScore = (level * 100) + (wins * 50) + Math.floor(xp / 10)
 */
export function calculateRankingScore(data: {
  level?: number;
  wins?: number;
  victories?: number;
  xp?: number;
  experience?: number;
}): number {
  const level = typeof data.level === 'number' && !isNaN(data.level) ? Math.max(1, Math.floor(data.level)) : 1;
  const wins = typeof data.wins === 'number' && !isNaN(data.wins)
    ? Math.max(0, Math.floor(data.wins))
    : typeof data.victories === 'number' && !isNaN(data.victories)
    ? Math.max(0, Math.floor(data.victories))
    : 0;
  const xp = typeof data.xp === 'number' && !isNaN(data.xp)
    ? Math.max(0, Math.floor(data.xp))
    : typeof data.experience === 'number' && !isNaN(data.experience)
    ? Math.max(0, Math.floor(data.experience))
    : 0;

  return (level * 100) + (wins * 50) + Math.floor(xp / 10);
}

/**
 * Ordenação Oficial do Ranking:
 * 1. maior rankingScore
 * 2. em caso de empate, maior level
 * 3. em caso de empate, maior XP
 * 4. em caso de empate, maior número de vitórias
 */
export function sortRankingEntries(a: RankingEntry, b: RankingEntry): number {
  if (b.rankingScore !== a.rankingScore) {
    return b.rankingScore - a.rankingScore;
  }
  if (b.level !== a.level) {
    return b.level - a.level;
  }
  if (b.xp !== a.xp) {
    return b.xp - a.xp;
  }
  return b.wins - a.wins;
}

class RankingServiceClass {
  private cachedOnlineProfiles: NexaUser[] = [];
  private isFetching = false;

  constructor() {
    if (typeof window !== 'undefined' && isSupabaseConfigured()) {
      this.fetchOnlineGlobalRanking().catch(() => {});
    }
  }

  /**
   * Busca diretamente os perfis oficiais da tabela public.profiles no Supabase
   * e ordena todos os jogadores globalmente (fonte única de verdade online).
   */
  public async fetchOnlineGlobalRanking(currentUserId?: string): Promise<GlobalRankingResult> {
    if (isSupabaseConfigured()) {
      try {
        this.isFetching = true;
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('level', { ascending: false });

        if (error) {
          console.warn('[RankingService] Erro ao consultar public.profiles no Supabase:', error.message);
        } else {
          this.cachedOnlineProfiles = (data || []).map(mapProfileToNexaUser);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('nexa_ranking_updated'));
          }
          return this.computeRankingFromUsers(this.cachedOnlineProfiles, currentUserId);
        }
      } catch (err) {
        console.warn('[RankingService] Exceção ao consultar ranking Supabase:', err);
      } finally {
        this.isFetching = false;
      }
      // Errors retain only the last remote snapshot (empty on first access).
      // Never re-enter a getter that could initiate another request.
      return this.computeRankingFromUsers(this.cachedOnlineProfiles, currentUserId);
    }

    return this.getLocalRanking(currentUserId);
  }

  /**
   * Calcula o ranking global com os dados em cache do Supabase ou fallback offline.
   */
  public getGlobalRanking(currentUserId?: string): GlobalRankingResult {
    // Online reads are side-effect free, including an empty remote snapshot.
    // The constructor and Leaderboard's existing poll initiate remote requests.
    if (isSupabaseConfigured()) {
      return this.computeRankingFromUsers(this.cachedOnlineProfiles, currentUserId);
    }

    return this.getLocalRanking(currentUserId);
  }

  private getLocalRanking(currentUserId?: string): GlobalRankingResult {
    // Fallback secundário isolado para desenvolvimento offline
    let users: NexaUser[] = EconomyService.getAllUsers();
    if (!users || users.length === 0) {
      users = authService.getAllUsers();
    }

    return this.computeRankingFromUsers(users, currentUserId);
  }

  /**
   * Constrói e ordena a tabela de ranking a partir da lista de usuários
   */
  private computeRankingFromUsers(users: NexaUser[], currentUserId?: string): GlobalRankingResult {
    const rawEntries: Omit<RankingEntry, 'rank'>[] = users.map((u) => {
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

      // Recalcula o rankingScore usando a fórmula centralizada
      const rankingScore = calculateRankingScore({ level, wins, xp });

      let updatedAt = Date.now();
      if (u.createdAt) {
        const parsed = new Date(u.createdAt).getTime();
        if (!isNaN(parsed)) {
          updatedAt = parsed;
        }
      }

      const isCurrentUser = Boolean(currentUserId && u.id === currentUserId);

      return {
        userId: u.id,
        username: u.username || 'Piloto Anônimo',
        avatar:
          u.avatar ||
          'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80',
        level,
        xp,
        wins,
        losses,
        rankingScore,
        updatedAt,
        title: u.title || 'Recruta da Cidadela',
        isCurrentUser,
      };
    });

    // Ordenação estrita: 1. rankingScore, 2. level, 3. xp, 4. wins
    rawEntries.sort((a, b) => sortRankingEntries(a as RankingEntry, b as RankingEntry));

    // Atribuição de posições (1-indexed)
    const rankedList: RankingEntry[] = rawEntries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    // Top 100
    const top100 = rankedList.slice(0, 100);

    // Minha posição (encontra mesmo fora do Top 100)
    const myPosition = currentUserId
      ? rankedList.find((entry) => entry.userId === currentUserId) || null
      : null;

    return {
      top100,
      myPosition,
      totalUsers: rankedList.length,
      all: rankedList,
    };
  }

}

export const RankingService = new RankingServiceClass();
