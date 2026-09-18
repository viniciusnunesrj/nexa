import React, { useState } from 'react';
import { ArrowLeft, Check, Heart, Shield, Sparkles, Swords, Zap } from 'lucide-react';
import { ARENA_CARDS } from '../config/arenaCards';
import type { ArenaCard } from '../config/arenaCards';

interface ArenaProps { onNavigate: (page: string) => void; }
type MatchResult = 'VICTORY' | 'DEFEAT' | 'DRAW' | null;
type DuelPhase = 'SELECT' | 'REVEAL' | 'CHARGE' | 'RESULT';
interface DuelState {
  playerCards: ArenaCard[]; cpuCards: ArenaCard[]; usedPlayer: string[]; usedCpu: string[];
  playerHp: number; cpuHp: number; playerNexos: number; cpuNexos: number; round: number;
  selectedId: string | null; investment: number; revealedCpu: ArenaCard | null; phase: DuelPhase;
  playerAttack: number | null; cpuAttack: number | null; roundMessage: string | null; roundDamage: number;
  result: MatchResult;
}

const MAX_DECK_SIZE = 6;
const MAX_ROUNDS = 4;
const freshDuel = (deck: ArenaCard[]): DuelState => {
  const playerCards = deck.slice(0, MAX_ROUNDS);
  const playerIds = new Set(playerCards.map((card) => card.id));
  const different = ARENA_CARDS.filter((card) => !playerIds.has(card.id));
  const cpuCards = [...different, ...ARENA_CARDS.filter((card) => playerIds.has(card.id))].slice(0, MAX_ROUNDS);
  return { playerCards, cpuCards, usedPlayer: [], usedCpu: [], playerHp: 12, cpuHp: 12, playerNexos: 12, cpuNexos: 12, round: 1, selectedId: null, investment: 0, revealedCpu: null, phase: 'SELECT', playerAttack: null, cpuAttack: null, roundMessage: null, roundDamage: 0, result: null };
};

export const Arena: React.FC<ArenaProps> = ({ onNavigate }) => {
  const [deck, setDeck] = useState<ArenaCard[]>([]);
  const [duel, setDuel] = useState<DuelState | null>(null);
  const toggleCard = (card: ArenaCard) => setDeck((current) => current.some((item) => item.id === card.id) ? current.filter((item) => item.id !== card.id) : current.length < MAX_DECK_SIZE ? [...current, card] : current);
  if (duel) return <DuelView duel={duel} setDuel={setDuel} onBack={() => setDuel(null)} />;

  return <div className="mx-auto max-w-5xl space-y-7">
    <header className="relative overflow-hidden rounded-2xl border border-purple-500/25 bg-gradient-to-br from-[#110c18] via-[#100d19] to-[#090a10] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-purple-500/[0.1] blur-3xl" /><div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-[10px] font-mono font-bold tracking-[0.2em] text-purple-400">NEXA</p><h1 className="mt-1 font-heading text-3xl font-black text-white sm:text-4xl">NEXA ARENA</h1><p className="mt-2 max-w-xl text-sm text-slate-300">Um modo estratégico de cartas para montar seu deck e se preparar para a batalha.</p></div>
        <button type="button" onClick={() => onNavigate('games')} className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-heading font-black uppercase tracking-[0.12em] text-slate-200 hover:border-purple-400/50"><ArrowLeft className="h-4 w-4" /> Voltar para Jogos</button>
      </div>
    </header>
    <section className="rounded-2xl border border-purple-500/25 bg-[#100d19]/90 p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="font-heading text-xl font-black text-white">Seu Deck <span className="text-purple-300">{deck.length}/{MAX_DECK_SIZE}</span></h2><p className="mt-1 text-xs text-slate-400">Escolha 6 cartas para começar.</p></div><button type="button" onClick={() => setDeck([])} disabled={!deck.length} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold uppercase text-slate-300 disabled:opacity-40">Limpar Deck</button></div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{Array.from({ length: MAX_DECK_SIZE }, (_, index) => deck[index] ? <ArenaCardView key={deck[index].id} card={deck[index]} compact /> : <div key={index} className="flex min-h-[112px] items-center justify-center rounded-xl border border-dashed border-white/15 text-xs text-slate-600">Slot {index + 1}</div>)}</div>
    </section>
    <section><div className="mb-4 flex items-end justify-between"><div><h2 className="font-heading text-xl font-black text-white">Coleção da Arena</h2><p className="mt-1 text-xs text-slate-400">Clique para adicionar ou remover uma carta.</p></div><span className="text-xs font-mono text-slate-500">{ARENA_CARDS.length} cartas</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{ARENA_CARDS.map((card) => <button key={card.id} type="button" onClick={() => toggleCard(card)} className={`text-left ${deck.some((item) => item.id === card.id) ? 'ring-2 ring-purple-400' : ''}`}><ArenaCardView card={card} selected={deck.some((item) => item.id === card.id)} /></button>)}</div></section>
    <button type="button" disabled={deck.length !== MAX_DECK_SIZE} onClick={() => setDuel(freshDuel(deck))} className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-4 font-heading text-sm font-black uppercase tracking-[0.14em] text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40"><Swords className="h-5 w-5" /> Iniciar Batalha</button>
  </div>;
};

const attackValue = (card: ArenaCard, nexos: number) => card.power + nexos * 2 + (card.abilityKind === 'IMPULSO' && nexos >= 3 ? 2 : 0);

const DuelView: React.FC<{ duel: DuelState; setDuel: React.Dispatch<React.SetStateAction<DuelState | null>>; onBack: () => void }> = ({ duel, setDuel, onBack }) => {
  const selectedCard = duel.playerCards.find((card) => card.id === duel.selectedId) || null;
  const available = duel.playerCards.filter((card) => !duel.usedPlayer.includes(card.id));
  const chooseCard = (id: string) => { if (duel.phase === 'SELECT') setDuel((current) => current ? { ...current, selectedId: id, investment: 0 } : current); };
  const confirm = () => setDuel((current) => {
    if (!current || !current.selectedId || current.phase !== 'SELECT') return current;
    const playerCard = current.playerCards.find((card) => card.id === current.selectedId);
    const cpuAvailable = current.cpuCards.filter((card) => !current.usedCpu.includes(card.id));
    if (!playerCard || !cpuAvailable.length) return current;
    const cpuCard = cpuAvailable[Math.floor(Math.random() * cpuAvailable.length)];
    const cpuInvestment = Math.min(current.cpuNexos, Math.floor(Math.random() * Math.min(4, current.cpuNexos + 1)));
    return { ...current, revealedCpu: cpuCard, playerAttack: attackValue(playerCard, current.investment), cpuAttack: attackValue(cpuCard, cpuInvestment), usedPlayer: [...current.usedPlayer, playerCard.id], usedCpu: [...current.usedCpu, cpuCard.id], phase: 'REVEAL', roundDamage: cpuInvestment, roundMessage: String(cpuInvestment) };
  });
  const advance = () => setDuel((current) => {
    if (!current) return current;
    if (current.phase === 'REVEAL') return { ...current, phase: 'CHARGE' };
    if (current.phase !== 'CHARGE' || !current.revealedCpu || current.playerAttack === null || current.cpuAttack === null) return current;
    const playerCard = current.playerCards.find((card) => card.id === current.selectedId)!;
    const cpuCard = current.revealedCpu;
    const playerWins = current.playerAttack > current.cpuAttack;
    const cpuWins = current.cpuAttack > current.playerAttack;
    const damage = playerWins ? Math.max(1, playerCard.damage - (cpuCard.abilityKind === 'BLINDAGEM' ? 2 : 0)) : cpuWins ? Math.max(1, cpuCard.damage - (playerCard.abilityKind === 'BLINDAGEM' ? 2 : 0)) : 0;
    const playerInvestment = current.investment;
    const cpuInvestment = Number(current.roundMessage);
    let playerHp = current.playerHp; let cpuHp = current.cpuHp; let playerNexos = Math.max(0, current.playerNexos - playerInvestment); let cpuNexos = Math.max(0, current.cpuNexos - cpuInvestment);
    if (playerWins) { cpuHp -= damage; if (playerCard.abilityKind === 'DRENO') playerHp = Math.min(12, playerHp + 1); if (playerCard.abilityKind === 'ECO') playerNexos = Math.min(12, playerNexos + 1); }
    if (cpuWins) { playerHp -= damage; if (cpuCard.abilityKind === 'DRENO') cpuHp = Math.min(12, cpuHp + 1); if (cpuCard.abilityKind === 'ECO') cpuNexos = Math.min(12, cpuNexos + 1); }
    return { ...current, playerHp, cpuHp, playerNexos, cpuNexos, roundDamage: damage, roundMessage: playerWins ? 'VOCÊ VENCEU O CONFRONTO' : cpuWins ? 'CPU VENCEU O CONFRONTO' : 'EMPATE NO CONFRONTO', phase: 'RESULT', result: null };
  });
  const nextRound = () => setDuel((current) => {
    if (!current || current.phase !== 'RESULT') return current;
    const result: MatchResult = current.round >= MAX_ROUNDS ? current.playerHp > current.cpuHp ? 'VICTORY' : current.playerHp < current.cpuHp ? 'DEFEAT' : 'DRAW' : null;
    return result ? { ...current, result } : { ...current, round: current.round + 1, selectedId: null, investment: 0, revealedCpu: null, playerAttack: null, cpuAttack: null, roundMessage: null, roundDamage: 0, phase: 'SELECT' };
  });
  if (duel.result) return <DuelResult result={duel.result} onAgain={() => setDuel(freshDuel(duel.playerCards))} onBack={onBack} />;
  const cpuInvestment = duel.phase === 'REVEAL' || duel.phase === 'CHARGE' || duel.phase === 'RESULT' ? Number(duel.roundMessage) : null;
  return <div className="mx-auto max-w-5xl space-y-4">
    <div className="flex items-center justify-between rounded-xl border border-purple-500/25 bg-[#100d19]/90 p-4"><div><p className="text-xs font-bold uppercase text-red-300">CPU · {duel.cpuHp} PV</p><p className="text-[10px] text-amber-300">{duel.cpuNexos} Nexos · {duel.cpuCards.length - duel.usedCpu.length} cartas</p></div><p className="text-xs font-bold uppercase tracking-widest text-purple-300">Rodada {duel.round}/{MAX_ROUNDS}</p><div className="text-right"><p className="text-xs font-bold uppercase text-purple-300">Você · {duel.playerHp} PV</p><p className="text-[10px] text-amber-300">{duel.playerNexos} Nexos</p></div></div>
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-white/10 bg-[#100d19]/80 p-3 sm:gap-6 sm:p-5">
      <div className="space-y-2">{selectedCard ? <ArenaCardView card={selectedCard} compact selected /> : <div className="flex min-h-[110px] items-center justify-center rounded-xl border border-dashed border-purple-400/40 text-xs text-slate-500">MINHA CARTA</div>}<p className="text-center text-xs font-bold text-amber-300">{duel.phase === 'SELECT' && selectedCard ? `${duel.investment} Nexos · ${attackValue(selectedCard, duel.investment)} ATK previsto` : duel.playerAttack !== null ? `${duel.investment} Nexos · ${duel.playerAttack} ATK` : 'Escolha uma carta'}</p></div>
      <p className="font-heading text-xl font-black text-purple-300">VS</p>
      <div className="space-y-2">{duel.revealedCpu ? <ArenaCardView card={duel.revealedCpu} compact /> : <div className="flex min-h-[110px] flex-col items-center justify-center rounded-xl border border-dashed border-red-400/40 bg-red-500/5 text-center text-xs text-red-200"><span className="font-heading text-lg font-black">NEXA</span>CARTA OCULTA</div>}<p className="text-center text-xs font-bold text-amber-300">{cpuInvestment === null ? 'Nexos ocultos' : `${cpuInvestment} Nexos · ${duel.cpuAttack} ATK`}</p></div>
    </div>
    {duel.phase === 'RESULT' && <section className="rounded-xl border border-purple-400/30 bg-purple-500/10 p-4 text-center"><p className="font-heading text-lg font-black text-white">{duel.roundMessage}</p><p className="mt-1 text-sm text-red-300">DANO: {duel.roundDamage}</p><button type="button" onClick={nextRound} className="mt-4 rounded-xl bg-purple-600 px-5 py-3 text-xs font-bold uppercase text-white">{duel.round >= MAX_ROUNDS ? 'Ver Resultado' : 'Próxima Rodada'}</button></section>}
    {duel.phase === 'CHARGE' && <section className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-center"><p className="text-sm font-bold text-amber-200">{duel.investment} Nexos vs {cpuInvestment} Nexos</p><p className="mt-1 text-xs text-slate-300">{duel.playerAttack} ATK vs {duel.cpuAttack} ATK</p><button type="button" onClick={advance} className="mt-4 rounded-xl bg-purple-600 px-5 py-3 text-xs font-bold uppercase text-white">Resolver Confronto</button></section>}
    {duel.phase === 'REVEAL' && <button type="button" onClick={advance} className="w-full rounded-xl border border-purple-400/40 bg-purple-500/10 py-3 text-xs font-bold uppercase text-purple-200">Mostrar Carga</button>}
    {duel.phase === 'SELECT' && selectedCard && <section className="rounded-xl border border-purple-400/30 bg-purple-500/10 p-4 text-center"><div className="flex items-center justify-center gap-4"><button type="button" onClick={() => setDuel((current) => current ? { ...current, investment: Math.max(0, current.investment - 1) } : current)} className="rounded-lg border border-white/15 px-3 py-1 text-lg text-white">-</button><span className="min-w-[110px] text-xs font-bold uppercase text-amber-300">{duel.investment} Nexos</span><button type="button" disabled={duel.investment >= duel.playerNexos} onClick={() => setDuel((current) => current ? { ...current, investment: Math.min(current.playerNexos, current.investment + 1) } : current)} className="rounded-lg border border-white/15 px-3 py-1 text-lg text-white disabled:opacity-30">+</button></div><p className="mt-3 text-sm text-purple-200">ATAQUE PREVISTO: {attackValue(selectedCard, duel.investment)} ATK</p><button type="button" onClick={confirm} className="mt-4 rounded-xl bg-purple-600 px-5 py-3 text-xs font-bold uppercase text-white">Confirmar Jogada</button></section>}
    <div><p className="mb-2 text-xs font-bold uppercase text-slate-400">Cartas disponíveis do jogador</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{available.map((card) => <button key={card.id} type="button" onClick={() => chooseCard(card.id)} className={`text-left ${duel.selectedId === card.id ? 'ring-2 ring-purple-400' : ''}`}><ArenaCardView card={card} compact selected={duel.selectedId === card.id} /></button>)}</div></div>
  </div>;
};

const DuelResult: React.FC<{ result: Exclude<MatchResult, null>; onAgain: () => void; onBack: () => void }> = ({ result, onAgain, onBack }) => <div className="mx-auto max-w-lg rounded-2xl border border-purple-500/30 bg-[#100d19] p-8 text-center"><Swords className="mx-auto h-10 w-10 text-purple-300" /><h1 className="mt-4 font-heading text-4xl font-black text-white">{result === 'VICTORY' ? 'VITÓRIA NEXAL' : result === 'DEFEAT' ? 'DERROTA NO NEXO' : 'EMPATE'}</h1><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center"><button type="button" onClick={onAgain} className="rounded-xl bg-purple-600 px-5 py-3 text-xs font-bold uppercase text-white">Jogar Novamente</button><button type="button" onClick={onBack} className="rounded-xl border border-white/10 px-5 py-3 text-xs font-bold uppercase text-slate-300">Voltar ao Deck</button></div></div>;

const ArenaCardView: React.FC<{ card: ArenaCard; compact?: boolean; selected?: boolean }> = ({ card, compact = false, selected = false }) => <div className={`rounded-xl border ${selected ? 'border-purple-400 bg-purple-500/10 shadow-[0_0_22px_rgba(168,85,247,0.25)]' : 'border-white/10 bg-[#11121c]'} p-3 ${compact ? 'min-h-[105px]' : 'min-h-[145px]'}`}><div className="flex items-start justify-between gap-2"><div><p className="font-heading text-sm font-black text-white">{card.name}</p><p className="mt-0.5 text-[10px] uppercase text-purple-300">{card.element} · {card.rarity}</p></div>{selected ? <Check className="h-4 w-4 text-purple-300" /> : <Sparkles className="h-4 w-4 text-slate-500" />}</div>{!compact && <p className="mt-3 text-xs text-slate-400">{card.description}</p>}<div className="mt-3 flex items-center gap-3 text-xs font-mono text-slate-300"><span className="inline-flex items-center gap-1"><Swords className="h-3 w-3 text-red-300" />{card.power}</span><span className="inline-flex items-center gap-1"><Heart className="h-3 w-3 text-pink-300" />{card.damage}</span><span className="ml-auto inline-flex items-center gap-1"><Zap className="h-3 w-3 text-amber-300" />{card.energyCost}</span></div>{!compact && card.ability && <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-amber-200"><Shield className="h-3 w-3" />{card.ability}</p>}</div>;
