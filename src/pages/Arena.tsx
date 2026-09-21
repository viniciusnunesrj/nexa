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
      // Reserve the actual layout above the canvas plus a small bottom margin.
      const board = boardRef.current;
      if (board) board.style.setProperty('--nexa-board-top', `${Math.max(0, board.getBoundingClientRect().top + window.scrollY)}px`);
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
  return <div ref={boardRef} className="duel-canvas">
    <style>{`
      .duel-canvas { position: relative; width: min(100%, max(0px, calc((100dvh - var(--nexa-board-top, 160px) - 24px) * 16 / 9))); aspect-ratio: 16 / 9; margin-inline: auto; min-height: 0; box-sizing: border-box; overflow: hidden; isolation: isolate; container-type: inline-size; color: #eef6ff; border: 1px solid #22445a; border-radius: 1.4cqw; background: linear-gradient(145deg, #091726, #111529 60%, #0b1020); }
      .duel-layout { position: absolute; inset: 0; display: grid; grid-template-rows: 9% 38% 6% 38% 9%; min-height: 0; }
      .duel-hud { display: flex; align-items: center; justify-content: space-between; gap: 1cqw; padding: 0 2cqw; min-width: 0; overflow: hidden; font-size: 1.1cqw; }
      .duel-hud > div:first-child { flex-wrap: nowrap; gap: 1cqw; font-size: 1.2cqw; white-space: nowrap; }
      .duel-hud > div:first-child > div { width: 10cqw; height: .6cqw; }
      .duel-hud p { margin: 0; max-width: 48%; text-align: right; font-size: 1cqw; line-height: 1.3; }
      .duel-round { text-align: right; color: #a5b4fc; font-weight: 800; font-size: 1.1cqw; letter-spacing: .08em; }
      .duel-row { display: flex; justify-content: center; align-items: center; gap: 1.2cqw; min-height: 0; }
      .duel-slot { position: relative; height: 94%; width: auto; aspect-ratio: .70 / 1; flex: 0 0 auto; min-width: 0; min-height: 0; border-radius: .8cqw; background: #050d18; box-shadow: inset 0 0 0 1px #ffffff14; }
      .duel-slot[data-active="true"] { z-index: 20; }
      .duel-mover { position: absolute; inset: 0; display: block; width: 100%; height: 100%; padding: 0; border: 0; background: transparent; color: inherit; text-align: left; perspective: 900px; transform-origin: center; }
      button.duel-mover { cursor: pointer; }
      button.duel-mover:disabled { cursor: default; }
      button.duel-mover:focus-visible { outline: 2px solid #67e8f9; outline-offset: 3px; }
      .duel-motion-content { position: absolute; inset: 0; width: 100%; height: 100%; }
      .duel-portrait { position: absolute; inset: 0; width: 100%; height: 100%; min-height: 0; min-width: 0; aspect-ratio: .70 / 1; box-sizing: border-box; overflow: hidden; border: 1px solid #627393; border-radius: .8cqw; background: #0d1b2c; }
      .duel-portrait[data-selected="true"] { border-color: #67e8f9; box-shadow: 0 0 1.2cqw #22d3ee55; }
      .duel-portrait[data-used="true"], .duel-turn[data-used="true"] { opacity: .35; filter: grayscale(1); }
      .duel-front { display: grid; grid-template-rows: 8% 12% minmax(0, 1fr) 13% 14%; padding: .65cqw; gap: .2cqw; }
      .duel-meta { display: flex; align-items: center; justify-content: space-between; gap: .3cqw; overflow: hidden; font-size: .68cqw; text-transform: uppercase; color: #a5b4fc; white-space: nowrap; }
      .duel-name { align-self: center; margin: 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; font-size: 1.25cqw; font-weight: 900; line-height: 1.2; }
      .duel-art { display: grid; place-items: center; min-height: 0; overflow: hidden; border-block: 1px solid #ffffff1c; background: linear-gradient(150deg, #1c3b52, #282347); font-size: 5.3cqw; line-height: 1; }
      .duel-card-stats { display: flex; align-items: center; justify-content: space-between; gap: .4cqw; min-width: 0; overflow: hidden; font-size: .86cqw; white-space: nowrap; }
      .duel-card-stats b { color: #67e8f9; }
      .duel-card-stats span:last-child b { color: #fda4af; }
      .duel-ability { align-self: center; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; margin: 0; overflow: hidden; text-align: center; font-size: .86cqw; line-height: 1.2; color: #cbd5e1; }
      .duel-back { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1cqw; border-color: #8b7ac9; background: repeating-linear-gradient(135deg, #ffffff03 0 1px, transparent 1px 1cqw), linear-gradient(145deg, #142039, #241c3a); }
      .duel-back::before { content: ''; position: absolute; inset: .7cqw; border: 1px solid #a5b4fc40; border-radius: .5cqw; }
      .duel-back strong { font-size: 1.5cqw; letter-spacing: .2em; color: #ddd6fe; }
      .duel-back span { font-size: 5cqw; line-height: 1; color: #67e8f9; }
      .duel-back small { font-size: .75cqw; letter-spacing: .1em; color: #c4b5fd; }
      .duel-turn { position: absolute; inset: 0; width: 100%; height: 100%; transform-style: preserve-3d; }
      .duel-turn-face { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
      .duel-gap { display: flex; align-items: center; justify-content: center; min-height: 0; pointer-events: none; }
      .duel-gap p { margin: 0; font-size: 1.05cqw; font-weight: 800; letter-spacing: .16em; color: #a5c5d9; }
      .duel-gap strong { font-size: 1.8cqw; color: #c4b5fd; }
      .duel-anchor { position: absolute; top: 50%; width: 0; height: 0; pointer-events: none; }
      .duel-anchor-cpu { left: 39%; }
      .duel-anchor-player { left: 61%; }
      .duel-invest { position: absolute; right: 1%; top: 27%; width: 16%; }
      .duel-invest > div { width: 100%; padding: .7cqw; border-radius: .8cqw; box-shadow: none; }
      .duel-invest p { font-size: .95cqw; line-height: 1.2; margin-top: .5cqw; letter-spacing: 0; }
      .duel-invest > div > div { margin-top: .6cqw; gap: .3cqw; }
      .duel-invest > div > div > button { width: 3cqw; height: 3cqw; font-size: 1.8cqw; border-radius: .4cqw; }
      .duel-invest > div > div > span { min-width: 0; font-size: 1.3cqw; }
      .duel-invest > div > div:nth-of-type(2) > span { font-size: .8cqw; }
      .duel-invest > div > button { margin-top: .7cqw; padding: .8cqw .2cqw; font-size: .9cqw; border-radius: .5cqw; }
      .duel-values { position: absolute; inset: 45% 1% auto; display: flex; justify-content: space-between; pointer-events: none; font-size: 1cqw; font-weight: 800; }
      .duel-values span { max-width: 16%; line-height: 1.4; color: #fde68a; }
      .duel-values span:last-child { text-align: right; color: #67e8f9; }
      .nexa-reveal-values { animation: nexa-values-in 1400ms step-end both; }
      @keyframes nexa-values-in { from { visibility: hidden; } to { visibility: visible; } }
      .nexa-impact { animation: nexa-impact 350ms ease-out; }
      @keyframes nexa-impact { 30% { transform: translateY(-7px); filter: brightness(1.8); } 65% { transform: translateY(4px); } }
      .nexa-clash { animation: nexa-clash 500ms ease-out; }
      @keyframes nexa-clash { 50% { transform: scale(1.06); filter: brightness(1.4); } }
    `}</style>
    <div className="duel-layout">
      <header className="duel-hud">
        <DuelStats label="CPU" hp={duel.cpuHp} nexos={duel.cpuNexos} />
        <div className="duel-round">DUELO NEXAL · RODADA {duel.round}/{MAX_ROUNDS}</div>
      </header>
      <div className="duel-row" aria-label="Cartas da CPU">
        {duel.cpuCards.map((card) => {
          const active = playing && duel.revealedCpu?.id === card.id;
          const used = duel.usedCpu.includes(card.id);
          return <div key={card.id} ref={(node) => { slots.current['cpu:' + card.id] = node; }} className="duel-slot" data-active={active}>
            <div className="duel-mover" style={movingStyle('cpu:' + card.id, active)}>
              <div className={`duel-motion-content ${active && duel.phase === 'RESULT' && duel.cpuAttack! < duel.playerAttack! ? 'nexa-impact' : active && duel.phase === 'CHARGE' ? 'nexa-clash' : ''}`}>
                <FlipCard card={card} active={active} revealed={active || (!!duel.revealedCpu && duel.phase !== 'REVEAL' && used)} used={used && !active} />
              </div>
            </div>
          </div>;
        })}
      </div>
      <div className="duel-gap">
        {!playing && !selectedCard ? <p>ESCOLHA SEU CAMPEÃO</p> : <strong>VS</strong>}
      </div>
      <div className="duel-row" aria-label="Suas cartas">
        {duel.playerCards.map((card) => {
          const active = playing && duel.selectedId === card.id;
          const used = duel.usedPlayer.includes(card.id);
          return <div key={card.id} ref={(node) => { slots.current['player:' + card.id] = node; }} className="duel-slot" data-active={active}>
            <button type="button" aria-label={`${card.name}${used ? ', usada' : ''}`} aria-pressed={duel.selectedId === card.id} disabled={used || playing} onClick={() => chooseCard(card.id)} className="duel-mover" style={movingStyle('player:' + card.id, active)}>
              <div className={`duel-motion-content ${active && duel.phase === 'RESULT' && duel.playerAttack! < duel.cpuAttack! ? 'nexa-impact' : active && duel.phase === 'CHARGE' ? 'nexa-clash' : ''}`}>
                <DuelPortrait card={card} selected={duel.selectedId === card.id} used={used && !active} />
              </div>
            </button>
          </div>;
        })}
      </div>
      <footer className="duel-hud">
        <DuelStats label="VOCÊ" hp={duel.playerHp} nexos={duel.playerNexos} player />
        <p role="status">{duel.phase === 'RESULT' ? <>{duel.roundMessage} · Impacto: {duel.roundDamage} PV<br />Próxima rodada em instantes</> : duel.phase === 'CHARGE' ? 'Confronto!' : playing ? 'Confronto em andamento' : '4 cartas · 4 rodadas'}</p>
      </footer>
    </div>
    <div ref={cpuTarget} className="duel-anchor duel-anchor-cpu" />
    <div ref={playerTarget} className="duel-anchor duel-anchor-player" />
    {!playing && selectedCard && <aside className="duel-invest"><InvestPanel card={selectedCard} duel={duel} setDuel={setDuel} confirm={confirm} /></aside>}
    {playing && <div aria-live="polite" className={`duel-values ${duel.phase === 'REVEAL' ? 'nexa-reveal-values' : ''}`}>
      <span>CPU · {duel.cpuInvestment} ◆ · {duel.cpuAttack} ATK</span>
      <span>VOCÊ · {duel.investment} ◆ · {duel.playerAttack} ATK</span>
    </div>}
  </div>;
};

// Battle-only presentation: deck selection keeps its existing BattleCard markup.
const DuelPortrait: React.FC<{ card: ArenaCard; selected?: boolean; used?: boolean; hidden?: boolean }> = ({ card, selected = false, used = false, hidden = false }) => hidden
  ? <div className="duel-portrait duel-back"><strong>NEXA</strong><span>◇</span><small>CARTA OCULTA</small></div>
  : <div className="duel-portrait duel-front" data-selected={selected} data-used={used}>
    <div className="duel-meta"><span>{card.element} · {card.rarity}</span><span>{used ? 'USADA' : 'NEXA'}</span></div>
    <p className="duel-name" title={card.name}>{card.name}</p>
    <div className="duel-art" aria-hidden="true">{ELEMENT_ICONS[card.element] || '✦'}</div>
    <div className="duel-card-stats"><span><b>PODER</b> {card.power}</span><span><b>DANO</b> {card.damage}</span></div>
    <p className="duel-ability" title={card.ability}>{card.ability}</p>
  </div>;
const DuelStats: React.FC<{ label: string; hp: number; nexos: number; player?: boolean }> = ({ label, hp, nexos, player = false }) => <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold"><span className={player ? 'text-cyan-300' : 'text-rose-300'}>{label}</span><span>{hp}/12 PV</span><span className="text-amber-300">◆ {nexos}</span><LifeBar hp={hp} player={player} /></div>;
const InvestPanel: React.FC<{ card: ArenaCard; duel: DuelState; setDuel: React.Dispatch<React.SetStateAction<DuelState | null>>; confirm: () => void }> = ({ card, duel, setDuel, confirm }) => <div className="w-48 rounded-2xl border border-cyan-300/30 bg-[#061321]/90 p-3 text-center shadow-[0_0_35px_rgba(34,211,238,.16)]"><p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Nexos a investir</p><div className="mt-2 flex items-center justify-center gap-2"><button type="button" onClick={() => setDuel((current) => current ? { ...current, investment: Math.max(0, current.investment - 1) } : current)} className="h-8 w-8 rounded-lg border border-cyan-300/30 text-xl">−</button><span className="min-w-7 text-xl font-black text-amber-300">{duel.investment}</span><button type="button" disabled={duel.investment >= duel.playerNexos} onClick={() => setDuel((current) => current ? { ...current, investment: Math.min(current.playerNexos, current.investment + 1) } : current)} className="h-8 w-8 rounded-lg border border-cyan-300/30 text-xl disabled:opacity-30">+</button></div><NexoBar count={duel.investment} highlighted /><p className="mt-2 text-xs font-black text-amber-300">ATAQUE PREVISTO: {attackValue(card, duel.investment)}</p><button type="button" onClick={confirm} className="mt-3 w-full rounded-xl bg-gradient-to-r from-amber-300 to-orange-400 px-2 py-2.5 text-[10px] font-black uppercase text-slate-950 shadow-[0_0_22px_rgba(251,191,36,.38)]">Confirmar Jogada</button></div>;
const LifeBar: React.FC<{ hp: number; player?: boolean }> = ({ hp, player = false }) => <div className="h-2 w-20 overflow-hidden rounded-full bg-black/50 sm:w-32"><div className={`h-full transition-all ${player ? 'bg-gradient-to-r from-cyan-400 to-emerald-300' : 'bg-gradient-to-r from-rose-500 to-orange-400'}`} style={{ width: `${Math.max(0, hp) / 12 * 100}%` }} /></div>;
const NexoBar: React.FC<{ count: number; highlighted?: boolean; player?: boolean }> = ({ count, highlighted = false, player = false }) => <div className={`mt-1 flex max-w-[145px] flex-wrap gap-0.5 text-[11px] ${highlighted || player ? 'text-cyan-300' : 'text-amber-400'}`}>{Array.from({ length: 12 }, (_, index) => <span key={index} className={index < count ? 'opacity-100 drop-shadow-[0_0_4px_currentColor]' : 'opacity-20'}>◆</span>)}</div>;
const HiddenCard: React.FC<{ compact?: boolean }> = ({ compact = false }) => <div className={`relative flex ${compact ? 'min-h-[110px]' : 'h-[220px] w-[165px]'} w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-purple-300/50 bg-[radial-gradient(circle_at_50%_35%,rgba(97,58,178,.55),transparent_35%),linear-gradient(145deg,#11162e,#090b19)] text-center shadow-[inset_0_0_25px_rgba(168,85,247,.22),0_0_16px_rgba(168,85,247,.18)]`}><div className="absolute inset-2 rounded-lg border border-cyan-300/20" /><span className="relative font-heading text-sm font-black tracking-[.25em] text-purple-200">NEXA</span><span className="relative my-1 text-3xl text-cyan-300 drop-shadow-[0_0_10px_currentColor]">◇</span><span className="relative text-[7px] font-bold uppercase tracking-[.2em] text-purple-300">DUEL<br />CARTA OCULTA</span></div>;
const DuelResult: React.FC<{ duel: DuelState; onAgain: () => void; onBack: () => void; onGames: () => void }> = ({ duel, onAgain, onBack, onGames }) => <div className="mx-auto max-w-4xl rounded-[28px] border border-cyan-400/30 bg-[radial-gradient(circle_at_top,rgba(80,40,150,.35),transparent_60%),#080c18] p-8 text-center shadow-[0_0_80px_rgba(34,211,238,.14)]"><Swords className="mx-auto h-10 w-10 text-cyan-300" /><h1 className="mt-4 font-heading text-4xl font-black text-white">{duel.result === 'VICTORY' ? 'VITÓRIA NEXAL' : duel.result === 'DEFEAT' ? 'DERROTA NO NEXO' : 'EMPATE'}</h1><p className="mt-3 text-sm text-slate-300">PV FINAL: {duel.playerHp} · NEXOS RESTANTES: {duel.playerNexos} · RODADAS: {duel.round}</p><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center"><button type="button" onClick={onAgain} className="rounded-xl bg-purple-600 px-5 py-3 text-xs font-bold uppercase text-white">Jogar Novamente</button><button type="button" onClick={onBack} className="rounded-xl border border-white/10 px-5 py-3 text-xs font-bold uppercase text-slate-300">Alterar de Deck</button><button type="button" onClick={onGames} className="rounded-xl border border-white/10 px-5 py-3 text-xs font-bold uppercase text-slate-300">Voltar para Jogos</button></div></div>;
const FlipCard: React.FC<{ card: ArenaCard; active: boolean; revealed: boolean; used: boolean }> = ({ card, active, revealed, used }) => <div className="duel-turn" data-used={used} style={{ transform: revealed ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: active ? 'transform 450ms ease-out 950ms' : 'none' }}><div className="duel-turn-face"><DuelPortrait card={card} hidden /></div><div className="duel-turn-face" style={{ transform: 'rotateY(180deg)' }}><DuelPortrait card={card} selected={active} used={used} /></div></div>;
const BattleCard: React.FC<{ card: ArenaCard; compact?: boolean; battle?: boolean; selected?: boolean; hidden?: boolean; used?: boolean }> = ({ card, compact = false, battle = false, selected = false, hidden = false, used = false }) => hidden ? <HiddenCard compact={compact} /> : <div className={`relative overflow-hidden rounded-xl border ${selected ? 'border-cyan-300 shadow-[0_0_32px_rgba(34,211,238,.48)]' : rarityStyle[card.rarity] || 'border-white/20'} bg-[#0b1222] ${battle ? 'h-[230px] w-[165px] p-2.5 sm:h-[270px] sm:w-[195px] sm:p-3' : compact ? 'min-h-[128px] p-2 sm:min-h-[150px] sm:p-2.5' : 'min-h-[145px] p-3'}`}><div className={`absolute inset-0 opacity-75 ${card.element === 'Fogo' ? 'bg-[radial-gradient(circle_at_50%_42%,rgba(249,115,22,.42),transparent_48%)]' : card.element === 'Água' ? 'bg-[radial-gradient(circle_at_50%_42%,rgba(34,211,238,.42),transparent_48%)]' : card.element === 'Ar' ? 'bg-[radial-gradient(circle_at_50%_42%,rgba(96,165,250,.42),transparent_48%)]' : card.element === 'Terra' ? 'bg-[radial-gradient(circle_at_50%_42%,rgba(132,204,22,.38),transparent_48%)]' : 'bg-[radial-gradient(circle_at_50%_42%,rgba(168,85,247,.45),transparent_48%)]'}`} /><div className="relative z-10 flex items-center justify-between text-[7px] font-black uppercase tracking-wider text-cyan-200"><span>{card.element} · {card.rarity}</span><span>{used ? 'USADA' : 'NEXA'}</span></div><p className={`relative z-10 mt-1 truncate text-center font-heading font-black text-white ${battle ? 'text-sm' : 'text-[10px]'}`}>{card.name}</p><div className={`relative z-10 my-1 flex items-center justify-center border-y border-white/10 bg-black/20 ${battle ? 'h-28 text-6xl' : 'h-12 text-3xl'}`}><span className="drop-shadow-[0_0_16px_currentColor]">{ELEMENT_ICONS[card.element] || '✦'}</span><span className="absolute bottom-1 right-1 text-[7px] font-bold uppercase text-slate-300">{card.element}</span></div><div className="relative z-10 flex justify-between text-[9px] font-mono text-slate-100"><span><b className="text-cyan-300">PODER</b> {card.power}</span><span><b className="text-rose-300">DANO</b> {card.damage}</span></div>{card.ability && <p className={`relative z-10 mt-1 truncate text-center text-[8px] ${battle ? 'text-amber-200' : 'text-slate-400'}`}>{card.ability}</p>}{selected && <Check className="absolute right-2 top-2 z-20 h-3 w-3 text-cyan-300" />}</div>;
