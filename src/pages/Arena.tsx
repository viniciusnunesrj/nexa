import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Heart, Shield, Sparkles, Swords, Zap } from 'lucide-react';
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

const MAX_DECK_SIZE = 6;
const MAX_ROUNDS = 4;
const ELEMENT_ICONS: Record<string, string> = { Fogo: '🔥', Água: '💧', Ar: '🌪', Terra: '🌿', Luz: '✨', Sombra: '🌑', Éter: '☄', Metal: '⚙', NEXA: '✦', Gelo: '❄' };
const freshDuel = (deck: ArenaCard[]): DuelState => {
  const playerCards = deck.slice(0, MAX_DECK_SIZE);
  const playerIds = new Set(playerCards.map((card) => card.id));
  const different = ARENA_CARDS.filter((card) => !playerIds.has(card.id));
  const cpuCards = [...different, ...ARENA_CARDS.filter((card) => playerIds.has(card.id))].slice(0, MAX_DECK_SIZE);
  return { playerCards, cpuCards, usedPlayer: [], usedCpu: [], playerHp: 12, cpuHp: 12, playerNexos: 12, cpuNexos: 12, round: 1, selectedId: null, investment: 0, cpuInvestment: 0, revealedCpu: null, phase: 'SELECT', playerAttack: null, cpuAttack: null, roundMessage: null, roundDamage: 0, result: null };
};
const attackValue = (card: ArenaCard, nexos: number) => card.power + nexos * 2 + (card.abilityKind === 'IMPULSO' && nexos >= 3 ? 2 : 0);

export const Arena: React.FC<ArenaProps> = ({ onNavigate }) => {
  const [deck, setDeck] = useState<ArenaCard[]>([]);
  const [duel, setDuel] = useState<DuelState | null>(null);
  const toggleCard = (card: ArenaCard) => setDeck((current) => current.some((item) => item.id === card.id) ? current.filter((item) => item.id !== card.id) : current.length < MAX_DECK_SIZE ? [...current, card] : current);
  if (duel) return <DuelView duel={duel} setDuel={setDuel} onBack={() => setDuel(null)} onGames={() => onNavigate('games')} />;

  return <div className="mx-auto max-w-5xl space-y-7">
    <header className="relative overflow-hidden rounded-2xl border border-purple-500/25 bg-gradient-to-br from-[#110c18] via-[#100d19] to-[#090a10] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-purple-500/[0.1] blur-3xl" /><div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-[10px] font-mono font-bold tracking-[0.2em] text-purple-400">NEXA</p><h1 className="mt-1 font-heading text-3xl font-black text-white sm:text-4xl">NEXA ARENA</h1><p className="mt-2 max-w-xl text-sm text-slate-300">Um modo estratégico de cartas para montar seu deck e se preparar para a batalha.</p></div>
        <button type="button" onClick={() => onNavigate('games')} className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-heading font-black uppercase tracking-[0.12em] text-slate-200 hover:border-purple-400/50"><ArrowLeft className="h-4 w-4" /> Voltar para Jogos</button>
      </div>
    </header>
    <section className="rounded-2xl border border-purple-500/25 bg-[#100d19]/90 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="font-heading text-xl font-black text-white">Seu Deck <span className="text-purple-300">{deck.length}/{MAX_DECK_SIZE}</span></h2><p className="mt-1 text-xs text-slate-400">Escolha 6 cartas para começar.</p></div><button type="button" onClick={() => setDeck([])} disabled={!deck.length} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold uppercase text-slate-300 disabled:opacity-40">Limpar Deck</button></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{Array.from({ length: MAX_DECK_SIZE }, (_, index) => deck[index] ? <BattleCard key={deck[index].id} card={deck[index]} compact /> : <div key={index} className="flex min-h-[112px] items-center justify-center rounded-xl border border-dashed border-white/15 text-xs text-slate-600">Slot {index + 1}</div>)}</div>
    </section>
    <section><div className="mb-4 flex items-end justify-between"><div><h2 className="font-heading text-xl font-black text-white">Coleção da Arena</h2><p className="mt-1 text-xs text-slate-400">Clique para adicionar ou remover uma carta.</p></div><span className="text-xs font-mono text-slate-500">{ARENA_CARDS.length} cartas</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{ARENA_CARDS.map((card) => <button key={card.id} type="button" onClick={() => toggleCard(card)} className={`text-left ${deck.some((item) => item.id === card.id) ? 'ring-2 ring-purple-400' : ''}`}><BattleCard card={card} selected={deck.some((item) => item.id === card.id)} /></button>)}</div></section>
    <button type="button" disabled={deck.length !== MAX_DECK_SIZE} onClick={() => setDuel(freshDuel(deck))} className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-4 font-heading text-sm font-black uppercase tracking-[0.14em] text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40"><Swords className="h-5 w-5" /> Iniciar Batalha</button>
  </div>;
};

const DuelView: React.FC<{ duel: DuelState; setDuel: React.Dispatch<React.SetStateAction<DuelState | null>>; onBack: () => void; onGames: () => void }> = ({ duel, setDuel, onBack, onGames }) => {
  const selectedCard = duel.playerCards.find((card) => card.id === duel.selectedId) || null;
  const available = duel.playerCards.filter((card) => !duel.usedPlayer.includes(card.id));

  useEffect(() => {
    if (duel.phase === 'REVEAL') {
      const timer = window.setTimeout(() => setDuel((current) => current ? { ...current, phase: 'CHARGE' } : current), 700);
      return () => window.clearTimeout(timer);
    }
    if (duel.phase === 'CHARGE') {
      const timer = window.setTimeout(() => setDuel((current) => {
        if (!current || !current.revealedCpu || current.playerAttack === null || current.cpuAttack === null) return current;
        const playerCard = current.playerCards.find((card) => card.id === current.selectedId);
        if (!playerCard) return current;
        const playerWins = current.playerAttack > current.cpuAttack;
        const cpuWins = current.cpuAttack > current.playerAttack;
        const damage = playerWins ? Math.max(1, playerCard.damage - (current.revealedCpu.abilityKind === 'BLINDAGEM' ? 2 : 0)) : cpuWins ? Math.max(1, current.revealedCpu.damage - (playerCard.abilityKind === 'BLINDAGEM' ? 2 : 0)) : 0;
        let playerHp = current.playerHp; let cpuHp = current.cpuHp; let playerNexos = Math.max(0, current.playerNexos - current.investment); let cpuNexos = Math.max(0, current.cpuNexos - current.cpuInvestment);
        if (playerWins) { cpuHp -= damage; if (playerCard.abilityKind === 'DRENO') playerHp = Math.min(12, playerHp + 1); if (playerCard.abilityKind === 'ECO') playerNexos = Math.min(12, playerNexos + 1); }
        if (cpuWins) { playerHp -= damage; if (current.revealedCpu.abilityKind === 'DRENO') cpuHp = Math.min(12, cpuHp + 1); if (current.revealedCpu.abilityKind === 'ECO') cpuNexos = Math.min(12, cpuNexos + 1); }
        return { ...current, playerHp, cpuHp, playerNexos, cpuNexos, roundDamage: damage, roundMessage: playerWins ? 'VITÓRIA NO CONFRONTO' : cpuWins ? 'DERROTA NO CONFRONTO' : 'EMPATE NO CONFRONTO', phase: 'RESULT' };
      }), 1500);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [duel.phase, setDuel]);

  const chooseCard = (id: string) => { if (duel.phase === 'SELECT') setDuel((current) => current ? { ...current, selectedId: id, investment: 0 } : current); };
  const confirm = () => setDuel((current) => {
    if (!current || !current.selectedId || current.phase !== 'SELECT') return current;
    const playerCard = current.playerCards.find((card) => card.id === current.selectedId);
    const cpuAvailable = current.cpuCards.filter((card) => !current.usedCpu.includes(card.id));
    if (!playerCard || !cpuAvailable.length) return current;
    const cpuCard = cpuAvailable[Math.floor(Math.random() * cpuAvailable.length)];
    const cpuInvestment = Math.min(current.cpuNexos, Math.floor(Math.random() * Math.min(4, current.cpuNexos + 1)));
    return { ...current, revealedCpu: cpuCard, playerAttack: attackValue(playerCard, current.investment), cpuAttack: attackValue(cpuCard, cpuInvestment), cpuInvestment, usedPlayer: [...current.usedPlayer, playerCard.id], usedCpu: [...current.usedCpu, cpuCard.id], phase: 'REVEAL' };
  });
  const nextRound = () => setDuel((current) => {
    if (!current || current.phase !== 'RESULT') return current;
    const result: MatchResult = current.playerHp <= 0 ? 'DEFEAT' : current.cpuHp <= 0 ? 'VICTORY' : current.round >= MAX_ROUNDS ? current.playerHp > current.cpuHp ? 'VICTORY' : current.playerHp < current.cpuHp ? 'DEFEAT' : 'DRAW' : null;
    return result ? { ...current, result } : { ...current, round: current.round + 1, selectedId: null, investment: 0, cpuInvestment: 0, revealedCpu: null, playerAttack: null, cpuAttack: null, roundMessage: null, roundDamage: 0, phase: 'SELECT' };
  });
  if (duel.result) return <DuelResult duel={duel} onAgain={() => setDuel(freshDuel(duel.playerCards))} onBack={onBack} onGames={onGames} />;

  const showNumbers = duel.phase !== 'SELECT';
  return <div className="mx-auto max-w-5xl">
    <div className="relative z-10 flex items-center justify-between px-1 py-2 sm:px-4"><div className="min-w-0"><p className="text-xs font-bold uppercase text-red-300">CPU</p><LifeBar hp={duel.cpuHp} /><NexoBar count={duel.cpuNexos} /><p className="mt-1 text-[10px] text-slate-500">Reserva: {duel.cpuCards.map((card) => duel.usedCpu.includes(card.id) ? '✓' : '?').join(' ')}</p></div><p className="px-2 text-center font-heading text-xs font-black uppercase tracking-[0.25em] text-purple-200">Duelo Nexal<br /><span className="font-mono text-purple-400">Rodada {duel.round} / {MAX_ROUNDS}</span></p><div className="min-w-0 text-right"><p className="text-xs font-bold uppercase text-purple-300">JOGADOR</p><div className="flex justify-end"><LifeBar hp={duel.playerHp} /></div><div className="flex justify-end"><NexoBar count={duel.playerNexos} /></div></div></div>
    <div className="relative overflow-hidden rounded-[32px] border border-purple-400/25 bg-[radial-gradient(circle_at_center,rgba(99,52,160,0.2),transparent_45%),linear-gradient(180deg,#120d20,#080b16)] px-3 py-5 shadow-[0_20px_90px_rgba(35,14,73,0.35)] sm:px-8 sm:py-7">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(168,85,247,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,.18)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="relative flex justify-center"><div className={duel.revealedCpu ? 'animate-[fadeIn_0.7s_ease-out]' : ''}>{duel.revealedCpu ? <BattleCard card={duel.revealedCpu} battle /> : <HiddenCard />}</div></div>
      <div className="my-4 text-center text-xs font-bold uppercase tracking-widest text-amber-300">{showNumbers ? `${duel.cpuInvestment} NEXOS INVESTIDOS · ${duel.cpuAttack} ATK` : 'NEXOS OCULTOS'}</div>
      <div className={`flex items-center justify-center gap-3 py-2 text-purple-300 ${duel.phase === 'CHARGE' ? 'scale-110 transition-transform' : ''}`}><span className="text-lg">⚔</span><span className="font-heading text-xl font-black">VS</span><span className="text-lg">⚔</span></div>
      <div className="my-4 text-center text-xs font-bold uppercase tracking-widest text-amber-300">{selectedCard && duel.phase === 'SELECT' ? `${duel.investment} NEXOS · ${attackValue(selectedCard, duel.investment)} ATK PREVISTO` : showNumbers ? `${duel.investment} NEXOS INVESTIDOS · ${duel.playerAttack} ATK` : 'ESCOLHA UMA CARTA'}</div>
      <div className="flex justify-center"><div className={duel.phase === 'RESULT' ? 'scale-105 transition-transform' : duel.phase === 'CHARGE' ? 'translate-y-1 transition-transform' : ''}>{selectedCard ? <BattleCard card={selectedCard} battle selected={duel.phase === 'SELECT'} /> : <div className="flex h-[300px] w-[220px] items-center justify-center rounded-2xl border border-dashed border-purple-400/40 text-center text-xs text-slate-500">ESCOLHA UMA<br />CARTA DO DECK</div>}</div></div>
      {duel.phase === 'RESULT' && <div className="mt-5 text-center"><p className="font-heading text-xl font-black text-white">{duel.roundMessage}</p><p className="mt-1 text-lg font-bold text-red-300">-{duel.roundDamage} PV</p><button type="button" onClick={nextRound} className="mt-3 rounded-xl bg-purple-600 px-5 py-3 text-xs font-bold uppercase text-white">{duel.round >= MAX_ROUNDS ? 'Ver Resultado' : 'Próxima Rodada →'}</button></div>}
      {duel.phase === 'SELECT' && selectedCard && <div className="mx-auto mt-4 max-w-sm rounded-xl border border-amber-400/25 bg-amber-500/5 p-3 text-center"><p className="text-xs font-bold uppercase text-amber-300">Nexos a investir</p><div className="mt-2 flex items-center justify-center gap-3"><button type="button" onClick={() => setDuel((current) => current ? { ...current, investment: Math.max(0, current.investment - 1) } : current)} className="rounded-lg border border-white/15 px-3 py-1 text-lg text-white">−</button><NexoBar count={duel.investment} highlighted /><button type="button" disabled={duel.investment >= duel.playerNexos} onClick={() => setDuel((current) => current ? { ...current, investment: Math.min(current.playerNexos, current.investment + 1) } : current)} className="rounded-lg border border-white/15 px-3 py-1 text-lg text-white disabled:opacity-30">+</button></div><button type="button" onClick={confirm} className="mt-3 rounded-xl bg-purple-600 px-5 py-3 text-xs font-bold uppercase text-white">Confirmar Jogada</button></div>}
    </div>
    <div className="relative mt-5"><p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Seu Deck · escolha uma carta</p><div className="flex gap-2 overflow-x-auto pb-2 sm:justify-center">{duel.playerCards.map((card) => { const used = duel.usedPlayer.includes(card.id); return <button key={card.id} type="button" disabled={used || duel.phase !== 'SELECT'} onClick={() => chooseCard(card.id)} className={`min-w-[112px] text-left transition ${used ? 'opacity-30 grayscale' : ''} ${duel.selectedId === card.id ? '-translate-y-2 ring-2 ring-purple-400' : ''}`}><BattleCard card={card} compact selected={duel.selectedId === card.id} /><span className="block -mt-5 px-3 pb-2 text-[9px] font-bold uppercase text-slate-500">{used ? '✓ USADA' : 'DISPONÍVEL'}</span></button>; })}</div></div>
  </div>;
};

const LifeBar: React.FC<{ hp: number }> = ({ hp }) => <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-slate-300"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-black/40 sm:w-28"><div className="h-full bg-red-400 transition-all" style={{ width: `${Math.max(0, hp) / 12 * 100}%` }} /></div>{hp}/12 PV</div>;
const NexoBar: React.FC<{ count: number; highlighted?: boolean }> = ({ count, highlighted = false }) => <div className={`mt-1 flex max-w-[145px] flex-wrap gap-0.5 text-[11px] ${highlighted ? 'text-amber-300' : 'text-amber-500'}`}>{Array.from({ length: 12 }, (_, index) => <span key={index} className={index < count ? 'opacity-100' : 'opacity-20'}>◆</span>)}</div>;
const HiddenCard: React.FC = () => <div className="flex h-[300px] w-[220px] flex-col items-center justify-center rounded-2xl border-2 border-red-400/30 bg-[radial-gradient(circle,#2b183e,#11121c)] text-center text-red-200 shadow-[0_0_35px_rgba(239,68,68,0.16)]"><span className="font-heading text-3xl font-black">NEXA</span><span className="my-3 text-4xl text-purple-300">◇</span><span className="text-xs font-bold uppercase tracking-[0.25em]">DUEL<br />Carta oculta</span></div>;
const DuelResult: React.FC<{ duel: DuelState; onAgain: () => void; onBack: () => void; onGames: () => void }> = ({ duel, onAgain, onBack, onGames }) => <div className="mx-auto max-w-4xl rounded-[28px] border border-purple-500/30 bg-[#100d19] p-8 text-center"><Swords className="mx-auto h-10 w-10 text-purple-300" /><h1 className="mt-4 font-heading text-4xl font-black text-white">{duel.result === 'VICTORY' ? 'VITÓRIA NEXAL' : duel.result === 'DEFEAT' ? 'DERROTA NO NEXO' : 'EMPATE'}</h1><p className="mt-3 text-sm text-slate-300">PV FINAL: {duel.playerHp} · NEXOS RESTANTES: {duel.playerNexos} · RODADAS: {duel.round}</p><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center"><button type="button" onClick={onAgain} className="rounded-xl bg-purple-600 px-5 py-3 text-xs font-bold uppercase text-white">Jogar Novamente</button><button type="button" onClick={onBack} className="rounded-xl border border-white/10 px-5 py-3 text-xs font-bold uppercase text-slate-300">Alterar de Deck</button><button type="button" onClick={onGames} className="rounded-xl border border-white/10 px-5 py-3 text-xs font-bold uppercase text-slate-300">Voltar para Jogos</button></div></div>;

const BattleCard: React.FC<{ card: ArenaCard; compact?: boolean; battle?: boolean; selected?: boolean }> = ({ card, compact = false, battle = false, selected = false }) => <div className={`relative rounded-2xl border ${selected ? 'border-purple-300 shadow-[0_0_28px_rgba(168,85,247,0.35)]' : card.rarity === 'Lendário' ? 'border-amber-400/60 shadow-[0_0_20px_rgba(251,191,36,0.12)]' : 'border-white/15'} bg-gradient-to-b from-[#1d1b31] to-[#11121c] ${battle ? 'h-[300px] w-[220px] p-4 sm:h-[330px] sm:w-[250px] sm:p-5' : compact ? 'min-h-[105px] p-3' : 'min-h-[145px] p-3'}`}><div className="text-center text-[9px] font-bold uppercase tracking-widest text-purple-300">{card.rarity}</div><p className={`mt-1 text-center font-heading font-black text-white ${battle ? 'text-lg' : 'text-sm'}`}>{card.name}</p><div className={`flex items-center justify-center ${battle ? 'h-36 text-7xl' : 'h-8 text-xl'}`}>{ELEMENT_ICONS[card.element] || '✦'}</div>{!compact && !battle && <p className="mt-2 text-xs text-slate-400">{card.description}</p>}<div className="absolute bottom-3 left-3 right-3 flex justify-between text-xs font-mono text-slate-200"><span><b className="text-red-300">POD</b> {card.power}</span><span><b className="text-pink-300">DANO</b> {card.damage}</span></div>{battle && card.ability && <p className="absolute bottom-10 left-3 right-3 text-center text-[10px] text-amber-200">{card.ability}</p>}{selected && <Check className="absolute right-3 top-3 h-4 w-4 text-purple-300" />}</div>;
