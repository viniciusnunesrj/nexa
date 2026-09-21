import React, { useEffect, useRef, useState } from 'react';
import { ARENA_CARDS } from '../../config/arenaCards';
import { supabase } from '../../lib/supabase';
import { CardImage } from '../common/CardImage';
import { pvpPerspective, readPvpSnapshot } from './pvpBattleState';
import type { PvpSnapshot } from './pvpBattleState';

function PvpCard({ id }: { id: string }) {
  const card = ARENA_CARDS.find(item => item.id === id);
  return <div className="min-w-0 space-y-1">
    <CardImage templateId={id} alt={card?.name || 'Carta da partida'} className="aspect-[3/4] w-full rounded-lg object-cover" />
    <p className="break-words text-xs font-bold text-white">{card?.name || id}</p>
    {card && <p className="text-[10px] text-slate-300">PODER {card.power} · DANO {card.damage}<br />{card.ability}</p>}
  </div>;
}

export const PvpBattleBoard: React.FC<{ roomId: string; userId: string; onExit: () => void }> = ({ roomId, userId, onExit }) => {
  const [snapshot, setSnapshot] = useState<PvpSnapshot | null>(null);
  const [choice, setChoice] = useState<{ round: number; card: string | null; nexos: number }>({ round: 0, card: null, nexos: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(true);
  const controller = useRef<AbortController | null>(null);
  const reading = useRef<Promise<PvpSnapshot> | null>(null);
  const sending = useRef(false);
  const sync = useRef<() => Promise<PvpSnapshot>>(async () => { throw new Error('Sincronizando...'); });

  useEffect(() => {
    const abort = new AbortController();
    controller.current = abort;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = (): Promise<PvpSnapshot> => {
      if (reading.current) return reading.current;
      const request = readPvpSnapshot(supabase, roomId, userId, abort.signal).then(next => {
        if (!abort.signal.aborted) {
          setSnapshot(next);
          setSyncing(false);
          setError('');
        }
        return next;
      }).catch(reason => {
        if (!abort.signal.aborted) {
          setSyncing(true);
          setError(reason instanceof Error ? reason.message : 'Conexão interrompida. Reconectando...');
        }
        throw reason;
      }).finally(() => { if (reading.current === request) reading.current = null; });
      reading.current = request;
      return request;
    };
    sync.current = refresh;
    const poll = async () => {
      try { if (!sending.current) await refresh(); } catch { /* Keep retrying read-only synchronization. */ }
      if (!abort.signal.aborted) timer = setTimeout(poll, 1500);
    };
    void poll();
    return () => {
      abort.abort();
      clearTimeout(timer);
      reading.current = null;
    };
  }, [roomId, userId]);

  const perspective = snapshot ? pvpPerspective(snapshot, userId) : null;
  const room = snapshot?.room;
  const finished = room?.status === 'FINISHED' || room?.status === 'CANCELLED';
  const active = room?.status === 'READY' || room?.status === 'PLAYING';
  const selected = choice.round === room?.round ? choice.card : null;
  const nexos = choice.round === room?.round ? Math.min(choice.nexos, perspective?.nexos ?? 0) : 0;
  const locked = busy || syncing || !active || snapshot?.submitted === true;

  const submit = async () => {
    if (sending.current || locked || !selected || !snapshot || !perspective || perspective.used.has(selected)) return;
    sending.current = true;
    setBusy(true);
    const signal = controller.current!.signal;
    const round = snapshot.room.round;
    try {
      // A stale tab must reconcile before submitting to the RPC (which has no round parameter).
      if (reading.current) await reading.current;
      const current = await sync.current();
      if (signal.aborted || current.room.round !== round || current.submitted || !['READY', 'PLAYING'].includes(current.room.status)) return;
      if (!current.deck.includes(selected) || pvpPerspective(current, userId).used.has(selected)) return;
      const { error: rpcError } = await supabase.rpc('submit_duelo_nexal_pvp_move', {
        p_room_id: roomId, p_card_id: selected, p_nexos: nexos,
      }).abortSignal(signal);
      if (rpcError) throw new Error('Não foi possível confirmar o envio. Sincronizando com o servidor...');
      if (!signal.aborted) {
        setSnapshot({ ...current, submitted: true });
        setChoice({ round: 0, card: null, nexos: 0 });
      }
    } catch (reason) {
      if (!signal.aborted) setError(reason instanceof Error ? reason.message : 'Falha no envio.');
    } finally {
      // Reconcile even ambiguous network failures; never automatically resubmit a move.
      if (!signal.aborted) {
        setSyncing(true);
        try { await sync.current(); } catch { /* Polling will recover; controls stay locked. */ }
        if (!signal.aborted) setBusy(false);
      }
      sending.current = false;
    }
  };

  const forfeit = async () => {
    if (sending.current || finished || !window.confirm('Desistir desta partida PvP? O adversário receberá a vitória.')) return;
    sending.current = true;
    setBusy(true);
    const signal = controller.current!.signal;
    try {
      if (reading.current) await reading.current;
      const { error: rpcError } = await supabase.rpc('forfeit_duelo_nexal_pvp_room', { p_room_id: roomId }).abortSignal(signal);
      if (rpcError) throw new Error('Não foi possível encerrar a partida.');
    } catch (reason) {
      if (!signal.aborted) setError(reason instanceof Error ? reason.message : 'Falha ao encerrar.');
    } finally {
      if (!signal.aborted) {
        setSyncing(true);
        try { await sync.current(); } catch { /* Recover through polling. */ }
        if (!signal.aborted) setBusy(false);
      }
      sending.current = false;
    }
  };

  return <section className="mx-auto w-full min-w-0 max-w-4xl space-y-4 rounded-2xl border border-cyan-400/20 bg-[#07101f] p-3 text-white sm:p-6" aria-label="Tabuleiro PvP">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold text-cyan-300">DUELO NEXAL · PVP</p><h1 className="text-lg font-bold">Sala {room?.code || '· sincronizando'}</h1></div>
      {finished ? <button onClick={onExit} className="rounded-lg border border-white/20 px-4 py-2 text-sm">Sair da sala</button> : <button onClick={forfeit} disabled={busy || !snapshot} className="rounded-lg border border-rose-400/30 px-4 py-2 text-sm text-rose-300 disabled:opacity-40">Desistir</button>}
    </header>
    {error && <p role="alert" className="rounded-lg border border-amber-400/30 p-3 text-sm text-amber-200">{error}</p>}
    {!snapshot || !perspective ? <p role="status">Recuperando partida e deck...</p> : <>
      <div className="space-y-3 rounded-xl border border-purple-400/20 bg-purple-400/5 p-3">
        <p className="flex flex-wrap justify-between gap-2 text-sm"><strong>Adversário · PV {perspective.opponentHp}</strong><span>{perspective.opponentNexos} Nexos</span></p>
        <div className="mx-auto grid max-w-sm grid-cols-4 gap-2">{[0, 1, 2, 3].map(index => <div key={index} className={`flex aspect-[3/4] min-w-0 items-center justify-center rounded-lg border border-purple-300/20 bg-[#15172e] text-[10px] font-bold ${index < snapshot.history.length ? 'opacity-40' : ''}`}>{index < snapshot.history.length ? 'USADA' : 'NEXA'}</div>)}</div>
      </div>
      <h2 className="text-center text-lg font-bold">{finished ? 'PARTIDA ENCERRADA' : `RODADA ${room.round}`}</h2>
      <p className="flex flex-wrap justify-between gap-2 text-sm text-cyan-200"><strong>Você · PV {perspective.hp}</strong><span>{perspective.nexos} Nexos</span></p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{snapshot.deck.map(id => {
        const used = perspective.used.has(id);
        return <button key={id} type="button" disabled={locked || used} aria-pressed={selected === id} onClick={() => setChoice({ round: room.round, card: id, nexos })} className={`min-w-0 rounded-xl border p-2 text-left disabled:cursor-not-allowed ${used ? 'border-white/10 opacity-40' : selected === id ? 'border-cyan-300 bg-cyan-400/10' : 'border-white/20'}`}><PvpCard id={id} /><span className="mt-2 block text-center text-[10px] text-cyan-200">{used ? 'USADA' : selected === id ? 'SELECIONADA' : 'DISPONÍVEL'}</span></button>;
      })}</div>
      {!finished && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-cyan-400/20 p-3">
        <label htmlFor="pvp-investment" className="text-sm">Nexos: {nexos}</label>
        <input id="pvp-investment" type="range" min={0} max={perspective.nexos} value={nexos} disabled={locked} onChange={event => setChoice({ round: room.round, card: selected, nexos: Number(event.target.value) })} className="min-w-0 flex-1 accent-cyan-400" />
        <button onClick={submit} disabled={locked || !selected} className="w-full rounded-lg bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 disabled:opacity-40 sm:w-auto">{busy ? 'ENVIANDO...' : 'CONFIRMAR'}</button>
      </div>}
      <p role="status" className="text-center text-sm text-cyan-200">{finished ? room.winnerId ? room.winnerId === userId ? 'VITÓRIA' : 'DERROTA' : room.status === 'CANCELLED' ? 'SALA CANCELADA' : 'EMPATE' : syncing ? 'Sincronizando com o servidor...' : snapshot.submitted ? 'Jogada confirmada. Aguardando adversário' : 'Escolha uma carta e confirme sua jogada.'}</p>
      {finished && <p className="text-center text-sm">PV final · Você {perspective.hp} × {perspective.opponentHp} Adversário</p>}
      {/* Results remain visible while the server advances. No animation or timer gates play. */}
      {snapshot.history.length > 0 && <div className="space-y-3 border-t border-white/10 pt-4">
        <h2 className="font-bold">Rodadas resolvidas</h2>
        {[...snapshot.history].reverse().map((result, index) => {
          const host = perspective.side === 'HOST';
          return <details key={result.round} open={index === 0} className="rounded-xl border border-white/10 p-3">
            <summary className="cursor-pointer text-sm font-bold">Rodada {result.round} · {result.winner === 'DRAW' ? 'Empate' : result.winner === perspective.side ? 'Você venceu' : 'Adversário venceu'} · {result.damage} de dano</summary>
            <div className="mx-auto mt-3 grid max-w-md grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
              <div className="min-w-0"><p className="mb-2 text-xs text-cyan-300">Você</p><PvpCard id={host ? result.hostCard : result.guestCard} /><p className="mt-2 text-sm">Ataque {host ? result.hostAttack : result.guestAttack}</p></div>
              <strong>VS</strong>
              <div className="min-w-0"><p className="mb-2 text-xs text-purple-300">Adversário</p><PvpCard id={host ? result.guestCard : result.hostCard} /><p className="mt-2 text-sm">Ataque {host ? result.guestAttack : result.hostAttack}</p></div>
            </div>
            <p className="mt-3 text-center text-xs text-slate-300">PV após a rodada · Você {host ? result.hostHp : result.guestHp} × {host ? result.guestHp : result.hostHp} Adversário</p>
          </details>;
        })}
      </div>}
    </>}
  </section>;
}
