import React, { useEffect, useRef, useState } from 'react';
import { ARENA_CARDS } from '../../config/arenaCards';
import { CardImage } from '../common/CardImage';
import type { PvpRound, PvpSnapshot } from './pvpBattleState';
import './pvpRoundReveal.css';

interface Presentation { result: PvpRound; before: PvpSnapshot | null; after: PvpSnapshot }

// Presentation only: this component cannot submit moves or update the match.
export const PvpRoundReveal: React.FC<{ snapshot: PvpSnapshot | null; userId: string }> = ({ snapshot, userId }) => {
  const previous = useRef<PvpSnapshot | null>(null);
  const seen = useRef<number | null>(null);
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [step, setStep] = useState(0);
  const result = snapshot?.history.at(-1);

  useEffect(() => {
    if (!snapshot) return;
    const round = result?.round ?? 0;
    // On reconnect, retain history without replaying old rounds or blocking play.
    if (seen.current !== null && round > seen.current && result) {
      setStep(1);
      setPresentation({ result, before: previous.current, after: snapshot });
    }
    seen.current = round;
    previous.current = snapshot;
  }, [snapshot, result]);

  useEffect(() => {
    if (!presentation) return;
    setStep(1);
    const timers = [500, 1000, 1550, 2050, 2450, 2750].map((delay, index) =>
      setTimeout(() => setStep(index + 2), delay));
    timers.push(setTimeout(() => { setPresentation(null); setStep(0); }, 3800));
    return () => timers.forEach(clearTimeout);
  }, [presentation]);

  if (!presentation) return null;
  const { result: round, before, after } = presentation;
  const host = after.room.hostId === userId;
  const mine = host ? 'HOST' : 'GUEST';
  return <div className={`pvp-round-reveal pvp-reveal-step-${step}`} role="dialog" aria-modal="true" aria-label={`Confronto da rodada ${round.round}`}>
    <div className="pvp-reveal-panel">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold tracking-widest text-cyan-300">CONFRONTO · RODADA {round.round}</p>
        <button autoFocus type="button" onClick={() => { setPresentation(null); setStep(0); }} className="rounded-lg border border-white/20 px-3 py-2 text-xs text-slate-300">Pular apresentação</button>
      </div>
      <div className="pvp-reveal-cards">
        {[mine, host ? 'GUEST' : 'HOST'].map((side, index) => {
          const isHost = side === 'HOST';
          const id = isHost ? round.hostCard : round.guestCard;
          const card = ARENA_CARDS.find(item => item.id === id);
          const spent = isHost ? round.hostNexosSpent : round.guestNexosSpent;
          const attack = isHost ? round.hostAttack : round.guestAttack;
          const hp = isHost ? round.hostHp : round.guestHp;
          const won = round.winner === side;
          const lost = round.winner !== 'DRAW' && !won;
          const beforeHp = before && (isHost ? before.room.hostHp : before.room.guestHp);
          const beforeNexos = before && (isHost ? before.room.hostNexos : before.room.guestNexos);
          const afterNexos = isHost ? after.room.hostNexos : after.room.guestNexos;
          // Labels describe observed server effects; they never determine the outcome.
          const effect = card?.abilityKind === 'IMPULSO' && spent >= 3 ? 'IMPULSO' :
            card?.abilityKind === 'BLINDAGEM' && lost ? 'BLINDAGEM' :
            card?.abilityKind === 'DRENO' && won && before?.room.round === round.round && hp > beforeHp! ? 'DRENO · PV RECUPERADO' :
            card?.abilityKind === 'ECO' && won && before?.room.round === round.round && afterNexos > beforeNexos! - spent ? 'ECO · NEXO RECUPERADO' : null;
          return <React.Fragment key={side}>
            {index === 1 && <strong className="pvp-reveal-vs">VS</strong>}
            <div className={`pvp-reveal-fighter ${index === 0 ? 'pvp-reveal-mine' : 'pvp-reveal-rival'} ${won ? 'pvp-reveal-winner' : lost ? 'pvp-reveal-loser' : ''}`}>
              <p className="mb-2 text-center text-[10px] font-bold tracking-wider text-cyan-200">{index === 0 ? 'MINHA CARTA' : 'CARTA ADVERSÁRIA'}</p>
              <div className="pvp-reveal-art"><CardImage templateId={id} alt={card?.name || id} className="h-full w-full rounded-xl object-cover" /></div>
              <p className="mt-2 min-h-8 text-center text-xs font-bold text-white">{card?.name || id}</p>
              <div className="pvp-reveal-values">
                <span>PODER <b>{card?.power ?? '—'}</b></span>
                <span className="pvp-show-energy">NEXOS <b>{spent}</b></span>
                <span className="pvp-show-attack">ATAQUE FINAL <b>{attack}</b></span>
              </div>
              <p className="pvp-show-attack mt-2 min-h-8 text-center text-[10px] font-bold text-amber-200">{effect}</p>
              <p className="pvp-show-winner text-center text-xs font-black text-cyan-200">{won ? 'VENCEDOR' : round.winner === 'DRAW' ? 'EMPATE' : ' '}</p>
            </div>
          </React.Fragment>;
        })}
      </div>
      <div className="pvp-show-damage mt-4 rounded-xl border border-cyan-300/20 bg-cyan-400/5 p-3 text-center" aria-live="polite">
        <p className="text-xl font-black text-white">{round.winner === 'DRAW' ? 'EMPATE' : `${round.damage} DE DANO`}</p>
        <p className="mt-1 text-sm text-cyan-200">PV · Você {host ? round.hostHp : round.guestHp} × {host ? round.guestHp : round.hostHp} Adversário</p>
      </div>
    </div>
  </div>;
};
