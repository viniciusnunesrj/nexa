import type { SupabaseClient } from '@supabase/supabase-js';

export interface PvpRoom {
  id: string;
  code: string;
  status: 'WAITING' | 'READY' | 'PLAYING' | 'FINISHED' | 'CANCELLED';
  round: number;
  hostId: string;
  guestId: string | null;
  hostHp: number;
  guestHp: number;
  hostNexos: number;
  guestNexos: number;
  winnerId: string | null;
}

export interface PvpRound {
  round: number;
  winner: 'HOST' | 'GUEST' | 'DRAW';
  damage: number;
  hostCard: string;
  guestCard: string;
  hostAttack: number;
  guestAttack: number;
  hostNexosSpent: number;
  guestNexosSpent: number;
  hostHp: number;
  guestHp: number;
}

export interface PvpSnapshot {
  room: PvpRoom;
  deck: string[];
  history: PvpRound[];
  submitted: boolean;
}

// Perspective only. Combat values and results are never calculated here.
export function pvpPerspective(snapshot: PvpSnapshot, userId: string) {
  const { room, history } = snapshot;
  if (userId !== room.hostId && userId !== room.guestId) throw new Error('Jogador fora da sala.');
  const host = room.hostId === userId;
  return {
    side: host ? 'HOST' as const : 'GUEST' as const,
    hp: host ? room.hostHp : room.guestHp,
    nexos: host ? room.hostNexos : room.guestNexos,
    opponentHp: host ? room.guestHp : room.hostHp,
    opponentNexos: host ? room.guestNexos : room.hostNexos,
    used: new Set(history.map(result => host ? result.hostCard : result.guestCard)),
  };
}

export async function readPvpSnapshot(client: SupabaseClient, roomId: string, userId: string, signal: AbortSignal): Promise<PvpSnapshot> {
  const rpc = async (name: string) => {
    const { data, error } = await client.rpc(name, { p_room_id: roomId }).abortSignal(signal);
    if (error || !data) throw new Error('Não foi possível sincronizar a partida.');
    return data;
  };
  // Bracket the reads: do not combine a new move/history with an old room round.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const room: PvpRoom = await rpc('get_duelo_nexal_pvp_room');
    if (userId !== room.hostId && userId !== room.guestId) throw new Error('Jogador fora da sala.');
    const column = room.hostId === userId ? 'host_deck' : 'guest_deck';
    const [history, move, deckResponse] = await Promise.all([
      rpc('get_duelo_nexal_pvp_round_history'),
      rpc('get_duelo_nexal_pvp_move_state'),
      client.from('duelo_nexal_pvp_rooms').select(column).eq('id', roomId).abortSignal(signal).single(),
    ]);
    const latest: PvpRoom = await rpc('get_duelo_nexal_pvp_room');
    if (room.round !== latest.round || room.status !== latest.status || move.round !== latest.round || move.status !== latest.status) continue;
    const deck = (deckResponse.data as unknown as Record<string, unknown> | null)?.[column];
    if (deckResponse.error || !Array.isArray(deck) || deck.length !== 4 || deck.some(id => typeof id !== 'string') || new Set(deck).size !== 4) {
      throw new Error('Não foi possível recuperar o deck da sala.');
    }
    if (!Array.isArray(history) || history.some(result => !Number.isInteger(result.round) || result.round < 1 || result.round > latest.round)) {
      throw new Error('Histórico da partida indisponível.');
    }
    const ordered: PvpRound[] = [...history].sort((a, b) => a.round - b.round);
    // A finished room may be a forfeit with no result for its current round.
    if (ordered.length < latest.round - 1 || ordered.some((result, index) => result.round !== index + 1)) continue;
    return { room: latest, deck, history: ordered, submitted: move.submitted === true };
  }
  throw new Error('A rodada mudou durante a sincronização. Reconectando...');
}
