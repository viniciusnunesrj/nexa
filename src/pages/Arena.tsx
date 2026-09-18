import React, { useState } from 'react';
import { ArrowLeft, Check, Heart, Shield, Sparkles, Swords, Zap } from 'lucide-react';
import { ARENA_CARDS } from '../config/arenaCards';
import type { ArenaCard } from '../config/arenaCards';

interface ArenaProps { onNavigate: (page: string) => void; }
type Unit = ArenaCard & { hp: number; hasAttacked: boolean };
type BattleResult = 'VICTORY' | 'DEFEAT' | null;
interface BattleState {
  playerHp: number; enemyHp: number; playerEnergy: number; playerMaxEnergy: number;
  enemyEnergy: number; playerHand: Unit[]; playerDeck: Unit[]; playerField: Unit[];
  enemyHand: Unit[]; enemyDeck: Unit[]; enemyField: Unit[]; selectedAttacker: string | null;
  result: BattleResult;
}

const MAX_DECK_SIZE = 6;
const MAX_FIELD_SIZE = 3;
const unit = (card: ArenaCard): Unit => ({ ...card, hp: card.health, hasAttacked: false });
const freshBattle = (deck: ArenaCard[]): BattleState => ({
  playerHp: 20, enemyHp: 20, playerEnergy: 3, playerMaxEnergy: 3, enemyEnergy: 3,
  playerHand: deck.slice(0, 3).map(unit), playerDeck: deck.slice(3).map(unit), playerField: [],
  enemyHand: ARENA_CARDS.slice(0, 5).map(unit), enemyDeck: ARENA_CARDS.slice(5).map(unit),
  enemyField: [], selectedAttacker: null, result: null,
});

export const Arena: React.FC<ArenaProps> = ({ onNavigate }) => {
  const [deck, setDeck] = useState<ArenaCard[]>([]);
  const [battle, setBattle] = useState<BattleState | null>(null);

  const toggleCard = (card: ArenaCard) => setDeck((current) => current.some((item) => item.id === card.id)
    ? current.filter((item) => item.id !== card.id)
    : current.length < MAX_DECK_SIZE ? [...current, card] : current);

  const startBattle = () => setBattle(freshBattle(deck));

  if (battle) {
    return <BattleView battle={battle} setBattle={setBattle} onBack={() => setBattle(null)} />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="relative overflow-hidden rounded-2xl border border-purple-500/25 bg-gradient-to-br from-[#110c18] via-[#100d19] to-[#090a10] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-purple-500/[0.1] blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-[10px] font-mono font-bold tracking-[0.2em] text-purple-400">NEXA</p><h1 className="mt-1 font-heading text-3xl font-black text-white sm:text-4xl">NEXA ARENA</h1><p className="mt-2 max-w-xl text-sm text-slate-300">Um modo estratégico de cartas para montar seu deck e se preparar para a batalha.</p></div>
          <button type="button" onClick={() => onNavigate('games')} className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-heading font-black uppercase tracking-[0.12em] text-slate-200 hover:border-purple-400/50"><ArrowLeft className="h-4 w-4" /> Voltar para Jogos</button>
        </div>
      </header>
      <section className="rounded-2xl border border-purple-500/25 bg-[#100d19]/90 p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="font-heading text-xl font-black text-white">Seu Deck <span className="text-purple-300">{deck.length}/{MAX_DECK_SIZE}</span></h2><p className="mt-1 text-xs text-slate-400">Escolha 6 cartas para começar.</p></div><button type="button" onClick={() => setDeck([])} disabled={!deck.length} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold uppercase text-slate-300 disabled:opacity-40">Limpar Deck</button></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{Array.from({ length: MAX_DECK_SIZE }, (_, index) => deck[index] ? <ArenaCardView key={deck[index].id} card={deck[index]} compact /> : <div key={index} className="flex min-h-[112px] items-center justify-center rounded-xl border border-dashed border-white/15 text-xs text-slate-600">Slot {index + 1}</div>)}</div>
      </section>
      <section><div className="mb-4 flex items-end justify-between"><div><h2 className="font-heading text-xl font-black text-white">Coleção da Arena</h2><p className="mt-1 text-xs text-slate-400">Clique para adicionar ou remover uma carta.</p></div><span className="text-xs font-mono text-slate-500">{ARENA_CARDS.length} cartas</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{ARENA_CARDS.map((card) => <button key={card.id} type="button" onClick={() => toggleCard(card)} className={`text-left ${deck.some((item) => item.id === card.id) ? 'ring-2 ring-purple-400' : ''}`}><ArenaCardView card={card} selected={deck.some((item) => item.id === card.id)} /></button>)}</div></section>
      <button type="button" disabled={deck.length !== MAX_DECK_SIZE} onClick={startBattle} className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-4 font-heading text-sm font-black uppercase tracking-[0.14em] text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40"><Swords className="h-5 w-5" /> Iniciar Batalha</button>
    </div>
  );
};

const BattleView: React.FC<{ battle: BattleState; setBattle: React.Dispatch<React.SetStateAction<BattleState | null>>; onBack: () => void }> = ({ battle, setBattle, onBack }) => {
  const playCard = (id: string) => setBattle((current) => {
    if (!current) return current;
    const card = current.playerHand.find((item) => item.id === id);
    if (!card || current.playerEnergy < card.energyCost || current.playerField.length >= MAX_FIELD_SIZE) return current;
    return { ...current, playerEnergy: current.playerEnergy - card.energyCost, playerHand: current.playerHand.filter((item) => item.id !== id), playerField: [...current.playerField, { ...card, hasAttacked: false }] };
  });

  const attack = (targetId?: string) => setBattle((current) => {
    if (!current || current.result) return current;
    const attacker = current.playerField.find((item) => item.id === current.selectedAttacker);
    if (!attacker || attacker.hasAttacked || (targetId && !current.enemyField.some((item) => item.id === targetId))) return current;
    if (!targetId && current.enemyField.length) return current;
    let enemyHp = current.enemyHp;
    let enemyField = current.enemyField.map((item) => item);
    if (targetId) enemyField = enemyField.map((item) => item.id === targetId ? { ...item, hp: item.hp - attacker.attack } : item).filter((item) => item.hp > 0);
    else enemyHp -= attacker.attack;
    const playerField = current.playerField.map((item) => item.id === attacker.id ? { ...item, hasAttacked: true } : item);
    return { ...current, enemyHp, enemyField, playerField, selectedAttacker: null, result: enemyHp <= 0 ? 'VICTORY' : current.result };
  });

  const endTurn = () => setBattle((current) => {
    if (!current || current.result) return current;
    let next = { ...current, enemyHand: [...current.enemyHand], enemyDeck: [...current.enemyDeck], enemyField: [...current.enemyField], playerField: [...current.playerField] };
    const cpuCard = next.enemyHand.find((item) => item.energyCost <= next.enemyEnergy);
    if (cpuCard && next.enemyField.length < MAX_FIELD_SIZE) {
      next.enemyEnergy -= cpuCard.energyCost;
      next.enemyHand = next.enemyHand.filter((item) => item.id !== cpuCard.id);
      next.enemyField = [...next.enemyField, { ...cpuCard, hasAttacked: false }];
    }
    for (const attacker of next.enemyField) {
      if (attacker.hasAttacked) continue;
      const target = next.playerField[0];
      if (target) next.playerField = next.playerField.map((item) => item.id === target.id ? { ...item, hp: item.hp - attacker.attack } : item).filter((item) => item.hp > 0);
      else next.playerHp -= attacker.attack;
      next.enemyField = next.enemyField.map((item) => item.id === attacker.id ? { ...item, hasAttacked: true } : item);
      if (next.playerHp <= 0) break;
    }
    if (next.playerHp <= 0) return { ...next, result: 'DEFEAT' };
    const maxEnergy = Math.min(10, next.playerMaxEnergy + 1);
    const drawn = next.playerDeck[0];
    return { ...next, playerMaxEnergy: maxEnergy, playerEnergy: maxEnergy, playerHand: drawn ? [...next.playerHand, drawn] : next.playerHand, playerDeck: drawn ? next.playerDeck.slice(1) : next.playerDeck, playerField: next.playerField.map((item) => ({ ...item, hasAttacked: false })), enemyField: next.enemyField.map((item) => ({ ...item, hasAttacked: false })), selectedAttacker: null, enemyEnergy: Math.min(10, next.enemyEnergy + 1) };
  });

  const commanderTarget = battle.enemyField.length === 0 && battle.selectedAttacker ? attack : undefined;
  if (battle.result) return <BattleOverlay result={battle.result} onAgain={() => setBattle(freshBattle(battle.playerField.concat(battle.playerHand, battle.playerDeck).map(({ hp: _hp, hasAttacked: _used, ...card }) => card)))} onBack={onBack} />;
  return <div className="mx-auto max-w-5xl space-y-4">
    <div className="flex items-center justify-between rounded-xl border border-purple-500/25 bg-[#100d19]/90 p-4"><div><p className="text-xs font-bold uppercase text-red-300">CPU · HP {battle.enemyHp}</p><p className="text-[10px] text-slate-500">Mão {battle.enemyHand.length} · Deck {battle.enemyDeck.length}</p></div><div className="text-right"><p className="text-xs font-bold uppercase text-purple-300">Jogador · HP {battle.playerHp}</p><p className="text-[10px] text-amber-300">Energia {battle.playerEnergy}/{battle.playerMaxEnergy}</p></div></div>
    <BattleZone title="Campo CPU" cards={battle.enemyField} onCardClick={(card) => attack(card.id)} selectedId={null} />
    <button type="button" disabled={!commanderTarget} onClick={() => commanderTarget?.()} className="w-full rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-xs font-bold uppercase text-red-200 disabled:opacity-30">Atacar comandante CPU · {battle.enemyHp} HP</button>
    <BattleZone title="Seu Campo" cards={battle.playerField} onCardClick={(card) => setBattle((current) => current ? { ...current, selectedAttacker: current.selectedAttacker === card.id ? null : card.id } : current)} selectedId={battle.selectedAttacker} />
    <div><p className="mb-2 text-xs font-bold uppercase text-slate-400">Sua mão · {battle.playerHand.length}</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{battle.playerHand.map((card) => <button key={card.id} type="button" onClick={() => playCard(card.id)} className="text-left"><ArenaCardView card={card} /></button>)}</div></div>
    <button type="button" onClick={endTurn} className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 font-heading text-xs font-black uppercase tracking-widest text-white hover:bg-purple-500">Encerrar Turno</button>
  </div>;
};

const BattleZone: React.FC<{ title: string; cards: Unit[]; onCardClick: (card: Unit) => void; selectedId: string | null }> = ({ title, cards, onCardClick, selectedId }) => <section className="rounded-xl border border-white/10 bg-[#100d19]/80 p-3"><p className="mb-2 text-xs font-bold uppercase text-slate-400">{title} · {cards.length}/{MAX_FIELD_SIZE}</p><div className="grid min-h-[105px] grid-cols-3 gap-2">{cards.map((card) => <button key={card.id} type="button" onClick={() => onCardClick(card)} className={`text-left ${selectedId === card.id ? 'ring-2 ring-purple-400' : ''}`}><ArenaCardView card={card} unit={card} compact /></button>)}</div></section>;

const BattleOverlay: React.FC<{ result: Exclude<BattleResult, null>; onAgain: () => void; onBack: () => void }> = ({ result, onAgain, onBack }) => <div className="mx-auto max-w-lg rounded-2xl border border-purple-500/30 bg-[#100d19] p-8 text-center"><Swords className="mx-auto h-10 w-10 text-purple-300" /><h1 className="mt-4 font-heading text-4xl font-black text-white">{result === 'VICTORY' ? 'VITÓRIA' : 'DERROTA'}</h1><p className="mt-2 text-sm text-slate-400">A batalha local terminou.</p><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center"><button type="button" onClick={onAgain} className="rounded-xl bg-purple-600 px-5 py-3 text-xs font-bold uppercase text-white">Jogar Novamente</button><button type="button" onClick={onBack} className="rounded-xl border border-white/10 px-5 py-3 text-xs font-bold uppercase text-slate-300">Voltar ao Deck</button></div></div>;

const ArenaCardView: React.FC<{ card: ArenaCard; unit?: Unit; compact?: boolean; selected?: boolean }> = ({ card, unit: activeUnit, compact = false, selected = false }) => <div className={`rounded-xl border ${selected ? 'border-purple-400 bg-purple-500/10' : 'border-white/10 bg-[#11121c]'} p-3 ${compact ? 'min-h-[92px]' : 'min-h-[145px]'}`}><div className="flex items-start justify-between gap-2"><div><p className="font-heading text-sm font-black text-white">{card.name}</p><p className="mt-0.5 text-[10px] uppercase text-purple-300">{card.element} · {card.rarity}</p></div>{selected ? <Check className="h-4 w-4 text-purple-300" /> : <Sparkles className="h-4 w-4 text-slate-500" />}</div>{!compact && <p className="mt-3 text-xs text-slate-400">{card.description}</p>}<div className="mt-3 flex items-center gap-3 text-xs font-mono text-slate-300"><span className="inline-flex items-center gap-1"><Swords className="h-3 w-3 text-red-300" />{card.attack}</span><span className="inline-flex items-center gap-1"><Heart className="h-3 w-3 text-pink-300" />{activeUnit ? activeUnit.hp : card.health}</span><span className="ml-auto inline-flex items-center gap-1"><Zap className="h-3 w-3 text-amber-300" />{card.energyCost}</span></div>{!compact && activeUnit && <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-slate-500"><Shield className="h-3 w-3" />Clique para jogar/selecionar</p>}</div>;
