import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { PublicProfile, PublicRankingEntry, PublicRankingPage } from '../types/publicProfile';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Resposta pública inválida.');
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Identidade pública inválida.');
  return value;
}
function optionalText(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error('Texto público inválido.');
  return value;
}
function integer(value: unknown, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) throw new Error('Estatística pública inválida.');
  return value;
}

// Explicit projection strips any unexpected fields, even if the backend changes.
export function mapPublicProfile(value: unknown): PublicProfile {
  const row = object(value);
  return {
    id: text(row.id), username: text(row.username), avatar: optionalText(row.avatar),
    bio: optionalText(row.bio), title: optionalText(row.title), level: integer(row.level, 1),
    victories: integer(row.victories), defeats: integer(row.defeats),
  };
}
export function mapPublicRankingEntry(value: unknown): PublicRankingEntry {
  const row = object(value);
  return {
    userId: text(row.user_id), username: text(row.username), avatar: optionalText(row.avatar),
    title: optionalText(row.title), level: integer(row.level, 1),
    victories: integer(row.victories), defeats: integer(row.defeats),
    rankingScore: integer(row.ranking_score), rank: integer(row.rank_position, 1),
  };
}

async function authenticatedRpc(name: string, args: Record<string, unknown>, currentUserId: string): Promise<unknown[]> {
  if (!isSupabaseConfigured() || !currentUserId) throw new Error('Entre na sua conta para acessar os perfis públicos.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user || auth.user.id !== currentUserId) throw new Error('Sessão autenticada indisponível.');
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error('Não foi possível carregar os dados públicos. Tente novamente.');
  if (!Array.isArray(data)) throw new Error('Resposta pública inválida.');
  return data;
}
function pagination(limit: number, offset: number): void {
  integer(limit, 1); integer(offset);
  if (limit > 100 || offset > 1000000) throw new Error('Paginação inválida.');
}

export const PublicProfileService = {
  async fetchProfile(userId: string, currentUserId: string): Promise<PublicProfile | null> {
    text(userId);
    if (userId.length > 128) throw new Error('Identificador público inválido.');
    const rows = await authenticatedRpc('get_public_profile_v1', { p_user_id: userId }, currentUserId);
    if (rows.length > 1) throw new Error('Resposta pública ambígua.');
    if (!rows.length) return null;
    const profile = mapPublicProfile(rows[0]);
    if (profile.id !== userId) throw new Error('O perfil retornado não corresponde ao jogador.');
    return profile;
  },
  async fetchDirectory(currentUserId: string, limit = 100, offset = 0): Promise<PublicProfile[]> {
    pagination(limit, offset);
    const rows = await authenticatedRpc('list_public_profiles_v1', { p_limit: limit, p_offset: offset }, currentUserId);
    if (rows.length > limit) throw new Error('Página pública inválida.');
    return rows.map(mapPublicProfile);
  },
  async fetchRanking(currentUserId: string, options: { limit?: number; offset?: number; search?: string; userId?: string } = {}): Promise<PublicRankingPage> {
    const { limit = 100, offset = 0, search = '', userId } = options;
    pagination(limit, offset);
    if (search.length > 100 || (userId !== undefined && (!userId.trim() || userId.length > 128))) throw new Error('Filtro público inválido.');
    const rows = await authenticatedRpc('get_public_ranking_v1', {
      p_limit: limit, p_offset: offset, p_search: search, p_user_id: userId ?? null,
    }, currentUserId);
    if (rows.length > limit) throw new Error('Página de ranking inválida.');
    const entries = rows.map(mapPublicRankingEntry);
    if (userId && entries.some(entry => entry.userId !== userId)) throw new Error('Jogador incorreto no ranking.');
    const totalUsers = rows.length ? integer(object(rows[0]).total_users) : 0;
    return { entries, totalUsers };
  },
};
