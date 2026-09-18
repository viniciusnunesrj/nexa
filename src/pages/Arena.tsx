import React, { useState } from 'react';
import { ArrowLeft, Check, Clock, Heart, Shield, Sparkles, Swords, Zap } from 'lucide-react';
import { ARENA_CARDS } from '../config/arenaCards';
import type { ArenaCard } from '../config/arenaCards';

interface ArenaProps {
  onNavigate: (page: string) => void;
}

const MAX_DECK_SIZE = 6;

export const Arena: React.FC<ArenaProps> = ({ onNavigate }) => {
  const [deck, setDeck] = useState<ArenaCard[]>([]);
  const [isPreparing, setIsPreparing] = useState(false);

  const toggleCard = (card: ArenaCard) => {
    setDeck((currentDeck) => {
      if (currentDeck.some((selected) => selected.id === card.id)) {
        return currentDeck.filter((selected) => selected.id !== card.id);
      }
      return currentDeck.length < MAX_DECK_SIZE ? [...currentDeck, card] : currentDeck;
    });
  };

  if (isPreparing) {
    return (
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="text-center">
          <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-purple-400">NEXA</p>
          <h1 className="mt-1 font-heading text-3xl font-black text-white sm:text-4xl">NEXA ARENA</h1>
          <p className="mt-2 text-slate-300">Deck preparado</p>
        </header>
        <section className="rounded-2xl border border-purple-500/25 bg-[#100d19]/90 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {deck.map((card) => <ArenaCardView key={card.id} card={card} compact />)}
          </div>
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-mono font-bold uppercase text-amber-300">
              <Clock className="h-3.5 w-3.5" /> Modo de batalha em desenvolvimento
            </div>
            <button type="button" onClick={() => setIsPreparing(false)} className="mx-auto mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-heading font-black uppercase tracking-[0.12em] text-slate-200 transition-all hover:border-purple-400/50 hover:bg-purple-500/10">
              <ArrowLeft className="h-4 w-4" /> Voltar ao Deck
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="relative overflow-hidden rounded-2xl border border-purple-500/25 bg-gradient-to-br from-[#110c18] via-[#100d19] to-[#090a10] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-purple-500/[0.1] blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-purple-400">NEXA</p>
            <h1 className="mt-1 font-heading text-3xl font-black text-white sm:text-4xl">NEXA ARENA</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">Um modo estratégico de cartas para montar seu deck e se preparar para a batalha.</p>
          </div>
          <button type="button" onClick={() => onNavigate('games')} className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-heading font-black uppercase tracking-[0.12em] text-slate-200 transition-all hover:border-purple-400/50 hover:bg-purple-500/10">
            <ArrowLeft className="h-4 w-4" /> Voltar para Jogos
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-purple-500/25 bg-[#100d19]/90 p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-heading text-xl font-black text-white">Seu Deck <span className="text-purple-300">{deck.length}/{MAX_DECK_SIZE}</span></h2>
            <p className="mt-1 text-xs text-slate-400">Escolha 6 cartas para começar.</p>
          </div>
          <button type="button" onClick={() => setDeck([])} disabled={deck.length === 0} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold uppercase text-slate-300 transition hover:border-purple-400/50 disabled:cursor-not-allowed disabled:opacity-40">Limpar Deck</button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: MAX_DECK_SIZE }, (_, index) => deck[index] ? <ArenaCardView key={deck[index].id} card={deck[index]} compact /> : <div key={index} className="flex min-h-[112px] items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/10 text-xs text-slate-600">Slot {index + 1}</div>)}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div><h2 className="font-heading text-xl font-black text-white">Coleção da Arena</h2><p className="mt-1 text-xs text-slate-400">Clique para adicionar ou remover uma carta.</p></div>
          <span className="text-xs font-mono text-slate-500">{ARENA_CARDS.length} cartas</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ARENA_CARDS.map((card) => <button key={card.id} type="button" onClick={() => toggleCard(card)} className={`relative text-left transition-transform hover:-translate-y-0.5 ${deck.some((selected) => selected.id === card.id) ? 'ring-2 ring-purple-400' : ''}`}><ArenaCardView card={card} selected={deck.some((selected) => selected.id === card.id)} /></button>)}
        </div>
      </section>

      <button type="button" disabled={deck.length !== MAX_DECK_SIZE} onClick={() => setIsPreparing(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-4 font-heading text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-40">
        <Swords className="h-5 w-5" /> Iniciar Batalha
      </button>
    </div>
  );
};

const ArenaCardView: React.FC<{ card: ArenaCard; compact?: boolean; selected?: boolean }> = ({ card, compact = false, selected = false }) => (
  <div className={`rounded-xl border ${selected ? 'border-purple-400 bg-purple-500/10' : 'border-white/10 bg-[#11121c]'} p-3 ${compact ? 'min-h-[112px]' : 'min-h-[158px]'}`}>
    <div className="flex items-start justify-between gap-2">
      <div><p className="font-heading text-sm font-black text-white">{card.name}</p><p className="mt-0.5 text-[10px] uppercase text-purple-300">{card.element} · {card.rarity}</p></div>
      {selected ? <Check className="h-4 w-4 shrink-0 text-purple-300" /> : <Sparkles className="h-4 w-4 shrink-0 text-slate-500" />}
    </div>
    {!compact && <p className="mt-3 text-xs leading-relaxed text-slate-400">{card.description}</p>}
    <div className="mt-3 flex items-center gap-3 text-xs font-mono text-slate-300">
      <span className="inline-flex items-center gap-1"><Swords className="h-3 w-3 text-red-300" />{card.attack}</span>
      <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3 text-pink-300" />{card.health}</span>
      <span className="ml-auto inline-flex items-center gap-1"><Zap className="h-3 w-3 text-amber-300" />{card.energyCost}</span>
    </div>
    {!compact && card.ability && <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-amber-200"><Shield className="h-3 w-3" />{card.ability}</p>}
  </div>
);
