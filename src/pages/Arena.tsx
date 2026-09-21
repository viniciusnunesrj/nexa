import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Swords } from 'lucide-react';
import { ARENA_CARDS } from '../config/arenaCards';
import type { ArenaCard } from '../config/arenaCards';

interface ArenaProps { onNavigate: (page: string) => void; }
type MatchResult = 'VICTORY' | 'DEFEAT' | 'DRAW' | null;
type DuelPhase = 'SELECT' | 'REVEAL' | 'CHARGE' | 'RESULT';
interface DuelState {
  playerCards: ArenaCard[]; cpuCards: ArenaCard[]; usedPlayer: string[]; usedCpu: string[];
  playerHp: number; cpuHp: number; playerNexos: number; cpuNexos: number; round: number;
  selectedId: string | null; investment: number; cpuInvestment: number; revealedCpu: ArenaCard | null;
  phase: DuelPhase; playerAttack: number | null; cpuAttack: number | null; roundMessage: string | null;
  roundDamage: number; result: MatchResult;
}

const MAX_DECK_SIZE = 4;
const MAX_ROUNDS = 4;
const ELEMENT_ICONS: Record<string, string> = { Fogo: '🔥', Água: '💧', Ar: '🌪', Terra: '🌿', Luz: '✦', Sombra: '☾', Éter: '◇', Metal: '⚙', NEXA: '✧', Gelo: '❄' };
const rarityStyle: Record<string, string> = { Comum: 'border-slate-300/40', Incomum: 'border-cyan-300/50', Raro: 'border-blue-400/70 shadow-blue-500/10', Épico: 'border-fuchsia-400/70 shadow-fuchsia-500/20', Lendário: 'border-amber-300 shadow-amber-400/25' };
const freshDuel = (deck: ArenaCard[]): DuelState => {
  const playerCards = deck.slice(0, MAX_ROUNDS);
  const playerIds = new Set(playerCards.map((card) => card.id));
  const different = ARENA_CARDS.filter((card) => !playerIds.has(card.id));
  return { playerCards, cpuCards: [...different, ...ARENA_CARDS.filter((card) => playerIds.has(card.id))].slice(0, MAX_ROUNDS), usedPlayer: [], usedCpu: [], playerHp: 12, cpuHp: 12, playerNexos: 12, cpuNexos: 12, round: 1, selectedId: null, investment: 0, cpuInvestment: 0, revealedCpu: null, phase: 'SELECT', playerAttack: null, cpuAttack: null, roundMessage: null, roundDamage: 0, result: null };
};
const attackValue = (card: ArenaCard, nexos: number) => card.power + nexos * 2 + (card.abilityKind === 'IMPULSO' && nexos >= 3 ? 2 : 0);

export const Arena: React.FC<ArenaProps> = ({ onNavigate }) => {
  const [deck, setDeck] = useState<ArenaCard[]>([]);
  const [duel, setDuel] = useState<DuelState | null>(null);
  const toggleCard = (card: ArenaCard) => setDeck((current) => current.some((item) => item.id === card.id) ? current.filter((item) => item.id !== card.id) : current.length < MAX_DECK_SIZE ? [...current, card] : current);
  if (duel) return <DuelView duel={duel} setDuel={setDuel} onBack={() => setDuel(null)} onGames={() => onNavigate('games')} />;
  return <div className="mx-auto max-w-5xl space-y-7"><header className="relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.18),transparent_45%),#0a0e1c] p-6 sm:p-8"><div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-mono font-bold tracking-[.3em] text-cyan-300">NEXA / ARENA</p><h1 className="mt-1 font-heading text-3xl font-black text-white sm:text-4xl">NEXA ARENA</h1><p className="mt-2 max-w-xl text-sm text-slate-300">Monte seu esquadrão e entre no Duelo Nexal.</p></div><button type="button" onClick={() => onNavigate('games')} className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-black uppercase text-slate-200"><ArrowLeft className="h-4 w-4" /> Voltar para Jogos</button></div></header><section className="rounded-2xl border border-cyan-400/20 bg-[#0b1020]/90 p-4 sm:p-6"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-heading text-xl font-black text-white">Seu Deck <span className="text-cyan-300">{deck.length}/{MAX_DECK_SIZE}</span></h2><p className="mt-1 text-xs text-slate-400">Escolha 4 cartas para começar.</p></div><button type="button" onClick={() => setDeck([])} disabled={!deck.length} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold uppercase text-slate-300 disabled:opacity-40">Limpar Deck</button></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: MAX_DECK_SIZE }, (_, index) => deck[index] ? <BattleCard key={deck[index].id} card={deck[index]} compact /> : <div key={index} className="flex min-h-[112px] items-center justify-center rounded-xl border border-dashed border-white/15 text-xs text-slate-600">Slot {index + 1}</div>)}</div></section><section><div className="mb-4 flex items-end justify-between"><div><h2 className="font-heading text-xl font-black text-white">Coleção da Arena</h2><p className="mt-1 text-xs text-slate-400">Clique para adicionar ou remover uma carta.</p></div><span className="text-xs font-mono text-slate-500">{ARENA_CARDS.length} cartas</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{ARENA_CARDS.map((card) => <button key={card.id} type="button" onClick={() => toggleCard(card)} className={`text-left ${deck.some((item) => item.id === card.id) ? 'ring-2 ring-cyan-300' : ''}`}><BattleCard card={card} selected={deck.some((item) => item.id === card.id)} /></button>)}</div></section><button type="button" disabled={deck.length !== MAX_DECK_SIZE} onClick={() => setDuel(freshDuel(deck))} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-5 py-4 font-heading text-sm font-black uppercase tracking-[.14em] text-white disabled:cursor-not-allowed disabled:opacity-40"><Swords className="h-5 w-5" /> Iniciar Batalha</button></div>;
};

const DuelView: React.FC<{ duel: DuelState; setDuel: React.Dispatch<React.SetStateAction<DuelState | null>>; onBack: () => void; onGames: () => void }> = ({ duel, setDuel, onBack, onGames }) => {
  const selectedCard = duel.playerCards.find((card) => card.id === duel.selectedId) || null;
  const boardRef = useRef<HTMLDivElement>(null);
  const cpuTarget = useRef<HTMLDivElement>(null);
  const playerTarget = useRef<HTMLDivElement>(null);
  const slots = useRef<Record<string, HTMLDivElement | null>>({});
  const [travel, setTravel] = useState<Record<string, { x: number; y: number }>>({});
  // Measure reserved slots, never the transformed cards, including after a resize.
  useLayoutEffect(() => {
    const measure = () => {
      const next: Record<string, { x: number; y: number }> = {};
      for (const [key, slot] of Object.entries<HTMLDivElement | null>(slots.current)) {
        const target = key.startsWith('cpu:') ? cpuTarget.current : playerTarget.current;
        if (!slot || !target) continue;
        const from = slot.getBoundingClientRect();
        const to = target.getBoundingClientRect();
        next[key] = { x: to.left + to.width / 2 - from.left - from.width / 2, y: to.top + to.height / 2 - from.top - from.height / 2 };
      }
      setTravel(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (boardRef.current) observer.observe(boardRef.current);
    return () => observer.disconnect();
  }, [duel.result]);
  const movingStyle = (key: string, active: boolean): React.CSSProperties => ({
    transform: active && travel[key] ? `translate(${travel[key].x}px, ${travel[key].y}px) scale(1.18)` : 'translate(0, 0) scale(1)',
    transition: active ? `transform 400ms ease-out ${key.startsWith('cpu:') ? '400ms' : '0ms'}` : 'none',
  });

  useEffect(() => {
    if (duel.phase === 'REVEAL') { const timer = window.setTimeout(() => setDuel((current) => current ? { ...current, phase: 'CHARGE' } : current), 2200); return () => window.clearTimeout(timer); }
    if (duel.phase === 'RESULT') { const timer = window.setTimeout(() => setDuel((current) => { if (!current) return current; const result: MatchResult = current.playerHp <= 0 ? 'DEFEAT' : current.cpuHp <= 0 ? 'VICTORY' : current.round >= MAX_ROUNDS ? current.playerHp > current.cpuHp ? 'VICTORY' : current.playerHp < current.cpuHp ? 'DEFEAT' : 'DRAW' : null; return result ? { ...current, result } : { ...current, round: current.round + 1, selectedId: null, investment: 0, cpuInvestment: 0, revealedCpu: null, playerAttack: null, cpuAttack: null, roundMessage: null, roundDamage: 0, phase: 'SELECT' }; }), 1500); return () => window.clearTimeout(timer); }
    if (duel.phase === 'CHARGE') { const timer = window.setTimeout(() => setDuel((current) => { if (!current || !current.revealedCpu || current.playerAttack === null || current.cpuAttack === null) return current; const playerCard = current.playerCards.find((card) => card.id === current.selectedId); if (!playerCard) return current; const playerWins = current.playerAttack > current.cpuAttack; const cpuWins = current.cpuAttack > current.playerAttack; const damage = playerWins ? Math.max(1, playerCard.damage - (current.revealedCpu.abilityKind === 'BLINDAGEM' ? 2 : 0)) : cpuWins ? Math.max(1, current.revealedCpu.damage - (playerCard.abilityKind === 'BLINDAGEM' ? 2 : 0)) : 0; let playerHp = current.playerHp; let cpuHp = current.cpuHp; let playerNexos = Math.max(0, current.playerNexos - current.investment); let cpuNexos = Math.max(0, current.cpuNexos - current.cpuInvestment); if (playerWins) { cpuHp -= damage; if (playerCard.abilityKind === 'DRENO') playerHp = Math.min(12, playerHp + 1); if (playerCard.abilityKind === 'ECO') playerNexos = Math.min(12, playerNexos + 1); } if (cpuWins) { playerHp -= damage; if (current.revealedCpu.abilityKind === 'DRENO') cpuHp = Math.min(12, cpuHp + 1); if (current.revealedCpu.abilityKind === 'ECO') cpuNexos = Math.min(12, cpuNexos + 1); } return { ...current, playerHp, cpuHp, playerNexos, cpuNexos, roundDamage: damage, roundMessage: playerWins ? `CPU sofreu -${damage} PV` : cpuWins ? `VOCÊ sofreu -${damage} PV` : 'EMPATE NO CONFRONTO', phase: 'RESULT' }; }), 1500); return () => window.clearTimeout(timer); }
    return undefined;
  }, [duel.phase, setDuel]);
  const chooseCard = (id: string) => { if (duel.phase === 'SELECT') setDuel((current) => current ? { ...current, selectedId: id, investment: 0 } : current); };
  const confirm = () => setDuel((current) => { if (!current || !current.selectedId || current.phase !== 'SELECT') return current; const playerCard = current.playerCards.find((card) => card.id === current.selectedId); const cpuAvailable = current.cpuCards.filter((card) => !current.usedCpu.includes(card.id)); if (!playerCard || !cpuAvailable.length) return current; const cpuCard = cpuAvailable[Math.floor(Math.random() * cpuAvailable.length)]; const cpuInvestment = Math.min(current.cpuNexos, Math.floor(Math.random() * Math.min(4, current.cpuNexos + 1))); return { ...current, revealedCpu: cpuCard, playerAttack: attackValue(playerCard, current.investment), cpuAttack: attackValue(cpuCard, cpuInvestment), cpuInvestment, usedPlayer: [...current.usedPlayer, playerCard.id], usedCpu: [...current.usedCpu, cpuCard.id], phase: 'REVEAL' }; });
  if (duel.result) return <DuelResult duel={duel} onAgain={() => setDuel(freshDuel(duel.playerCards))} onBack={onBack} onGames={onGames} />;
  const playing = duel.phase !== 'SELECT';
  return <div ref={boardRef} className="nexa-duel relative mx-auto rounded-2xl border border-cyan-400/20 bg-[#050914] text-white">
    <style>{`
      /* Every dimension follows the board, not the viewport or card contents. */
      .nexa-duel { width: 100%; max-width: 1120px; aspect-ratio: 16 / 9; min-height: 0; overflow: hidden; container-type: inline-size; isolation: isolate; background-image: linear-gradient(135deg, #071725, #17132e 55%, #080e1c); }
      .nexa-hand { position: absolute; left: 19%; width: 62%; display: flex; justify-content: space-between; }
      .nexa-hand-cpu { top: 12%; }
      .nexa-hand-player { bottom: 12%; }
      .nexa-slot { position: relative; width: 23.3871%; aspect-ratio: 3 / 4; min-width: 0; flex: 0 0 23.3871%; border-radius: 1cqw; background: #060b18; box-shadow: inset 0 0 0 1px #ffffff18; }
      .nexa-moving { position: absolute; inset: 0; width: 100%; height: 100%; perspective: 900px; transform-origin: center; }
      .nexa-slot[data-active="true"] { z-index: 20; }
      .nexa-card-face, .nexa-card-face > div { width: 100%; height: 100%; min-height: 0; min-width: 0; }
      .nexa-card-face > div { overflow: hidden; padding: .6cqw; border-radius: .8cqw; }
      .nexa-card-face > div > div:nth-of-type(2) { font-size: .75cqw; line-height: 1.2; letter-spacing: 0; white-space: nowrap; overflow: hidden; }
      .nexa-card-face > div > p { margin-top: .3cqw; font-size: 1.1cqw; line-height: 1.2; }
      .nexa-card-face > div > p:last-of-type:not(:first-of-type) { font-size: .85cqw; }
      .nexa-card-face > div > div:nth-of-type(3) { height: 48%; margin: .4cqw 0; font-size: 4cqw; }
      .nexa-card-face > div > div:nth-of-type(3) > span:last-child { font-size: .7cqw; }
      .nexa-card-face > div > div:nth-of-type(4) { gap: .2cqw; font-size: .9cqw; line-height: 1.2; white-space: nowrap; }
      .nexa-card-face > div > svg { width: 1cqw; height: 1cqw; top: .5cqw; right: .5cqw; }
      .nexa-card-face > div > span { font-size: 1.4cqw; line-height: 1.2; }
      .nexa-card-face > div > span:nth-of-type(2) { font-size: 4cqw; margin: .5cqw 0; }
      .nexa-card-face > div > span:last-child { font-size: .8cqw; }
      .nexa-flip { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; }
      .nexa-flip-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
      .nexa-center { position: absolute; inset: 0; pointer-events: none; }
      .nexa-target { position: absolute; top: 50%; width: 17.11%; aspect-ratio: 3 / 4; transform: translate(-50%, -50%); }
      .nexa-target-cpu { left: 39%; }
      .nexa-target-player { left: 61%; }
      .nexa-vs { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 2cqw; }
      .nexa-hud { position: absolute; left: 2%; right: 2%; height: 9%; display: flex; align-items: center; justify-content: space-between; gap: 1cqw; overflow: hidden; }
      .nexa-hud-top { top: 1%; }
      .nexa-hud-bottom { bottom: 1%; border-top: 1px solid #ffffff15; }
      .nexa-hud > div:first-child { flex-wrap: nowrap; gap: 1cqw; font-size: 1.25cqw; white-space: nowrap; }
      .nexa-hud > div:first-child > div { width: 12cqw; height: .7cqw; }
      .nexa-round, .nexa-status { font-size: 1.05cqw; line-height: 1.3; letter-spacing: .05em; }
      .nexa-select { position: absolute; right: 1%; top: 25%; width: 16%; height: 50%; display: flex; align-items: center; justify-content: center; pointer-events: auto; }
      .nexa-select > p { font-size: 1.15cqw; line-height: 1.4; }
      .nexa-select > p > span { font-size: .95cqw; margin-top: 1cqw; }
      .nexa-select > div { width: 100%; padding: .7cqw; border-radius: 1cqw; box-shadow: none; }
      .nexa-select > div > p { font-size: 1cqw; line-height: 1.2; margin-top: .5cqw; letter-spacing: 0; }
      .nexa-select > div > div { margin-top: .6cqw; gap: .3cqw; font-size: 1cqw; }
      .nexa-select > div > div > button { width: 3.3cqw; height: 3.3cqw; font-size: 2cqw; border-radius: .5cqw; }
      .nexa-select > div > div > span { min-width: 0; font-size: 1.4cqw; }
      .nexa-select > div > div:nth-of-type(2) > span { font-size: .85cqw; }
      .nexa-select > div > button { margin-top: .8cqw; padding: .8cqw .2cqw; font-size: .95cqw; border-radius: .5cqw; }
      .nexa-values { position: absolute; inset: 46% 1% auto; display: flex; justify-content: space-between; gap: 1cqw; font-size: 1cqw; }
      .nexa-values > span { max-width: 17%; padding: .5cqw; border-radius: .5cqw; }
      .nexa-reveal-values { animation: nexa-values-in 1400ms step-end both; }
      @keyframes nexa-values-in { from { visibility: hidden; } to { visibility: visible; } }
      .nexa-impact { animation: nexa-impact 350ms ease-out; }
      @keyframes nexa-impact { 30% { transform: translateY(-7px); filter: brightness(1.8); } 65% { transform: translateY(4px); } }
      .nexa-clash { animation: nexa-clash 500ms ease-out; }
      @keyframes nexa-clash { 50% { transform: scale(1.06); filter: brightness(1.4); } }
    `}</style>
    <header className="nexa-hud nexa-hud-top">
      <DuelStats label="CPU" hp={duel.cpuHp} nexos={duel.cpuNexos} />
      <div className="nexa-round text-right font-black uppercase text-purple-300">Duelo Nexal<br /><span className="text-slate-400">Rodada {duel.round}/{MAX_ROUNDS}</span></div>
    </header>
    <div className="nexa-hand nexa-hand-cpu">
      {duel.cpuCards.map((card) => {
        const active = playing && duel.revealedCpu?.id === card.id;
        const used = duel.usedCpu.includes(card.id);
        return <div key={card.id} ref={(node) => { slots.current['cpu:' + card.id] = node; }} className="nexa-slot" data-active={active}>
          <div className="nexa-moving" style={movingStyle('cpu:' + card.id, active)}>
            <div className={active && duel.phase === 'RESULT' && duel.cpuAttack! < duel.playerAttack! ? 'nexa-impact h-full' : active && duel.phase === 'CHARGE' ? 'nexa-clash h-full' : 'h-full'}>
              <FlipCard card={card} active={active} revealed={active || (!!duel.revealedCpu && duel.phase !== 'REVEAL' && used)} used={used && !active} />
            </div>
          </div>
        </div>;
      })}
    </div>
    <main className="nexa-center">
      <div ref={cpuTarget} className="nexa-target nexa-target-cpu" />
      <span className="nexa-vs font-heading font-black text-purple-200">VS</span>
      <div ref={playerTarget} className="nexa-target nexa-target-player" />
      {!playing && <div className="nexa-select">
        {selectedCard ? <InvestPanel card={selectedCard} duel={duel} setDuel={setDuel} confirm={confirm} /> : <p className="text-center text-xs font-bold uppercase tracking-widest text-cyan-200">Escolha seu campeão<br /><span className="mt-2 block text-[10px] text-slate-500">Selecione uma carta abaixo</span></p>}
      </div>}
      {playing && <div aria-live="polite" className={`nexa-values pointer-events-none font-black ${duel.phase === 'REVEAL' ? 'nexa-reveal-values' : ''}`}>
        <span className="rounded-md bg-[#050914]/95 p-1 text-amber-200">{`CPU · ${duel.cpuInvestment} ◆ · ${duel.cpuAttack} ATK`}</span>
        <span className="rounded-md bg-[#050914]/95 p-1 text-cyan-200">VOCÊ · {duel.investment} ◆ · {duel.playerAttack} ATK</span>
      </div>}
    </main>
    <div className="nexa-hand nexa-hand-player">
      {duel.playerCards.map((card) => {
        const active = playing && duel.selectedId === card.id;
        const used = duel.usedPlayer.includes(card.id);
        return <div key={card.id} ref={(node) => { slots.current['player:' + card.id] = node; }} className="nexa-slot" data-active={active}>
          <button type="button" aria-label={`${card.name}${used ? ', usada' : ''}`} aria-pressed={duel.selectedId === card.id} disabled={used || playing} onClick={() => chooseCard(card.id)} className="nexa-moving block text-left disabled:cursor-default" style={movingStyle('player:' + card.id, active)}>
            <div className={active && duel.phase === 'RESULT' && duel.playerAttack! < duel.cpuAttack! ? 'nexa-impact h-full' : active && duel.phase === 'CHARGE' ? 'nexa-clash h-full' : 'h-full'}>
              <div className={`nexa-card-face ${used && !active ? 'opacity-30 grayscale' : ''}`}><BattleCard card={card} compact selected={duel.selectedId === card.id} used={used && !active} /></div>
            </div>
          </button>
        </div>;
      })}
    </div>
    <footer className="nexa-hud nexa-hud-bottom">
      <DuelStats label="VOCÊ" hp={duel.playerHp} nexos={duel.playerNexos} player />
      <p role="status" className="nexa-status max-w-[50%] text-right font-bold uppercase text-slate-400">{duel.phase === 'RESULT' ? <><span className="text-rose-300">{duel.roundMessage} · Impacto: {duel.roundDamage} PV</span><br />Próxima rodada em instantes</> : duel.phase === 'CHARGE' ? 'Confronto!' : playing ? 'Confronto em andamento' : '4 cartas · 4 rodadas'}</p>
    </footer>
  </div>;
};

const DuelStats: React.FC<{ label: string; hp: number; nexos: number; player?: boolean }> = ({ label, hp, nexos, player = false }) => <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold"><span className={player ? 'text-cyan-300' : 'text-rose-300'}>{label}</span><span>{hp}/12 PV</span><span className="text-amber-300">◆ {nexos}</span><LifeBar hp={hp} player={player} /></div>;
const InvestPanel: React.FC<{ card: ArenaCard; duel: DuelState; setDuel: React.Dispatch<React.SetStateAction<DuelState | null>>; confirm: () => void }> = ({ card, duel, setDuel, confirm }) => <div className="w-48 rounded-2xl border border-cyan-300/30 bg-[#061321]/90 p-3 text-center shadow-[0_0_35px_rgba(34,211,238,.16)]"><p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Nexos a investir</p><div className="mt-2 flex items-center justify-center gap-2"><button type="button" onClick={() => setDuel((current) => current ? { ...current, investment: Math.max(0, current.investment - 1) } : current)} className="h-8 w-8 rounded-lg border border-cyan-300/30 text-xl">−</button><span className="min-w-7 text-xl font-black text-amber-300">{duel.investment}</span><button type="button" disabled={duel.investment >= duel.playerNexos} onClick={() => setDuel((current) => current ? { ...current, investment: Math.min(current.playerNexos, current.investment + 1) } : current)} className="h-8 w-8 rounded-lg border border-cyan-300/30 text-xl disabled:opacity-30">+</button></div><NexoBar count={duel.investment} highlighted /><p className="mt-2 text-xs font-black text-amber-300">ATAQUE PREVISTO: {attackValue(card, duel.investment)}</p><button type="button" onClick={confirm} className="mt-3 w-full rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-2 py-2.5 text-[10px] font-black uppercase text-slate-950 shadow-[0_0_22px_rgba(251,191,36,.38)]">Confirmar Jogada</button></div>;
const LifeBar: React.FC<{ hp: number; player?: boolean }> = ({ hp, player = false }) => <div className="h-2 w-20 overflow-hidden rounded-full bg-black/50 sm:w-32"><div className={`h-full transition-all ${player ? 'bg-gradient-to-r from-cyan-400 to-emerald-300' : 'bg-gradient-to-r from-rose-500 to-orange-400'}`} style={{ width: `${Math.max(0, hp) / 12 * 100}%` }} /></div>;
const NexoBar: React.FC<{ count: number; highlighted?: boolean; player?: boolean }> = ({ count, highlighted = false, player = false }) => <div className={`mt-1 flex max-w-[145px] flex-wrap gap-0.5 text-[11px] ${highlighted || player ? 'text-cyan-300' : 'text-amber-400'}`}>{Array.from({ length: 12 }, (_, index) => <span key={index} className={index < count ? 'opacity-100 drop-shadow-[0_0_4px_currentColor]' : 'opacity-20'}>◆</span>)}</div>;
const HiddenCard: React.FC<{ compact?: boolean }> = ({ compact = false }) => <div className={`relative flex ${compact ? 'min-h-[110px]' : 'h-[220px] w-[165px]'} w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-purple-300/50 bg-[radial-gradient(circle_at_50%_35%,rgba(97,58,178,.55),transparent_35%),linear-gradient(145deg,#11162e,#090b19)] text-center shadow-[inset_0_0_25px_rgba(168,85,247,.22),0_0_16px_rgba(168,85,247,.18)]`}><div className="absolute inset-2 rounded-lg border border-cyan-300/20" /><span className="relative font-heading text-sm font-black tracking-[.25em] text-purple-200">NEXA</span><span className="relative my-1 text-3xl text-cyan-300 drop-shadow-[0_0_10px_currentColor]">◇</span><span className="relative text-[7px] font-bold uppercase tracking-[.2em] text-purple-300">DUEL<br />CARTA OCULTA</span></div>;
const DuelResult: React.FC<{ duel: DuelState; onAgain: () => void; onBack: () => void; onGames: () => void }> = ({ duel, onAgain, onBack, onGames }) => <div className="mx-auto max-w-4xl rounded-[28px] border border-cyan-400/30 bg-[radial-gradient(circle_at_top,rgba(80,40,150,.35),transparent_60%),#080c18] p-8 text-center shadow-[0_0_80px_rgba(34,211,238,.14)]"><Swords className="mx-auto h-10 w-10 text-cyan-300" /><h1 className="mt-4 font-heading text-4xl font-black text-white">{duel.result === 'VICTORY' ? 'VITÓRIA NEXAL' : duel.result === 'DEFEAT' ? 'DERROTA NO NEXO' : 'EMPATE'}</h1><p className="mt-3 text-sm text-slate-300">PV FINAL: {duel.playerHp} · NEXOS RESTANTES: {duel.playerNexos} · RODADAS: {duel.round}</p><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center"><button type="button" onClick={onAgain} className="rounded-xl bg-purple-600 px-5 py-3 text-xs font-bold uppercase text-white">Jogar Novamente</button><button type="button" onClick={onBack} className="rounded-xl border border-white/10 px-5 py-3 text-xs font-bold uppercase text-slate-300">Alterar de Deck</button><button type="button" onClick={onGames} className="rounded-xl border border-white/10 px-5 py-3 text-xs font-bold uppercase text-slate-300">Voltar para Jogos</button></div></div>;
const FlipCard: React.FC<{ card: ArenaCard; active: boolean; revealed: boolean; used: boolean }> = ({ card, active, revealed, used }) => <div className={`nexa-flip ${used ? 'opacity-40 grayscale' : ''}`} style={{ transform: revealed ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: active ? 'transform 450ms ease-out 950ms' : 'none' }}><div className="nexa-flip-face nexa-card-face"><HiddenCard compact /></div><div className="nexa-flip-face nexa-card-face" style={{ transform: 'rotateY(180deg)' }}><BattleCard card={card} compact selected={active} used={used} /></div></div>;

const BattleCard: React.FC<{ card: ArenaCard; compact?: boolean; battle?: boolean; selected?: boolean; hidden?: boolean; used?: boolean }> = ({ card, compact = false, battle = false, selected = false, hidden = false, used = false }) => hidden ? <HiddenCard compact={compact} /> : <div className={`relative overflow-hidden rounded-xl border ${selected ? 'border-cyan-300 shadow-[0_0_32px_rgba(34,211,238,.48)]' : rarityStyle[card.rarity] || 'border-white/20'} bg-[#0b1222] ${battle ? 'h-[230px] w-[165px] p-2.5 sm:h-[270px] sm:w-[195px] sm:p-3' : compact ? 'min-h-[128px] p-2 sm:min-h-[150px] sm:p-2.5' : 'min-h-[145px] p-3'}`}><div className={`absolute inset-0 opacity-75 ${card.element === 'Fogo' ? 'bg-[radial-gradient(circle_at_50%_42%,rgba(249,115,22,.42),transparent_48%)]' : card.element === 'Água' ? 'bg-[radial-gradient(circle_at_50%_42%,rgba(34,211,238,.42),transparent_48%)]' : card.element === 'Ar' ? 'bg-[radial-gradient(circle_at_50%_42%,rgba(96,165,250,.42),transparent_48%)]' : card.element === 'Terra' ? 'bg-[radial-gradient(circle_at_50%_42%,rgba(132,204,22,.38),transparent_48%)]' : 'bg-[radial-gradient(circle_at_50%_42%,rgba(168,85,247,.45),transparent_48%)]'}`} /><div className="relative z-10 flex items-center justify-between text-[7px] font-black uppercase tracking-wider text-cyan-200"><span>{card.element} · {card.rarity}</span><span>{used ? 'USADA' : 'NEXA'}</span></div><p className={`relative z-10 mt-1 truncate text-center font-heading font-black text-white ${battle ? 'text-sm' : 'text-[10px]'}`}>{card.name}</p><div className={`relative z-10 my-1 flex items-center justify-center border-y border-white/10 bg-black/20 ${battle ? 'h-28 text-6xl' : 'h-12 text-3xl'}`}><span className="drop-shadow-[0_0_16px_currentColor]">{ELEMENT_ICONS[card.element] || '✦'}</span><span className="absolute bottom-1 right-1 text-[7px] font-bold uppercase text-slate-300">{card.element}</span></div><div className="relative z-10 flex justify-between text-[9px] font-mono text-slate-100"><span><b className="text-cyan-300">PODER</b> {card.power}</span><span><b className="text-rose-300">DANO</b> {card.damage}</span></div>{card.ability && <p className={`relative z-10 mt-1 truncate text-center text-[8px] ${battle ? 'text-amber-200' : 'text-slate-400'}`}>{card.ability}</p>}{selected && <Check className="absolute right-2 top-2 z-20 h-3 w-3 text-cyan-300" />}</div>;
