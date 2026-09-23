import { formatEconomicValue } from '../utils/formatEconomicValue';
import { getCardPower } from '../utils/cardPower';
import { CardImage } from '../components/common/CardImage';
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import { Character, NexaAsset } from '../types';
import { RARITY_CONFIG } from '../config/designTokens';
import { RarityBadge } from '../components/common/RarityBadge';
import { SellModal } from '../components/modals/SellModal';
import { TradeProposalModal } from '../components/modals/TradeProposalModal';
import { FirstAccessModal } from '../components/dashboard/FirstAccessModal';
import {
  Swords,
  ShoppingBag,
  Package,
  PackageOpen,
  Flame,
  ArrowLeftRight,
  Trophy,
  Zap,
  TrendingUp,
  Shield,
  ShieldAlert,
  Clock,
  ChevronRight,
  Sparkles,
  Gift,
  ArrowRight,
  Award,
  Layers,
  CheckCircle2,
  Lock,
  Gamepad2,
} from 'lucide-react';
import { ProgressionService } from '../services/progressionService';
import { getXpRequiredForLevel, MAX_GAME_LEVEL } from '../config/levelConfig';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user, isFirstAccess, dismissFirstAccess } = useAuth();
  const {
    assets,
    transactions,
    marketStats,
    listAsset,
    boxes,
  } = useGameState();

  const [sellingAsset, setSellingAsset] = useState<NexaAsset | null>(null);
  const [tradingAsset, setTradingAsset] = useState<NexaAsset | null>(null);
  const [showFirstAccess, setShowFirstAccess] = useState(isFirstAccess);

  React.useEffect(() => {
    setShowFirstAccess(isFirstAccess);
  }, [isFirstAccess]);

  // Find equipped character or best character
  const userCharacters = assets.filter(
    (a) => a.ownerId === user.id && a.type === 'Character'
  ) as Character[];

  const userItems = assets.filter((a) => a.ownerId === user.id);
  const userCards = userItems.filter((a) => a.type === 'Card');
  const hasBattleCard = userCards.length > 0;
  const myBoxes = boxes.filter((b) => b.ownerId === user.id);
  const hasUnopenedRecruitBox = myBoxes.some((b) => b.boxType === 'RECRUIT');
  const distinctGuardiansCards = new Set(
    assets
      .filter((a) => a.ownerId === user.id && a.type === 'Card' && (a as any).collectionId === 'guardians')
      .map((c) => c.name)
  ).size;
  const completedCollections = distinctGuardiansCards >= 4 ? 1 : 0;
  const totalCollections = 1;

  const cardPowers = userItems.filter(a => a.type === 'Card').map(getCardPower);
  const totalPower = cardPowers.some(power => power === null) ? null : cardPowers.reduce<number>((sum, power) => sum + power!, 0);
  const rareCount = userItems.filter((a) => ['Épico', 'Lendário', 'Mítico'].includes(a.rarity)).length;
  const winRate = user.victories + user.defeats > 0
    ? Math.round((user.victories / (user.victories + user.defeats)) * 100)
    : 0;

  // Level Progression & Next Rewards Calculation
  const currentLevel = user.level || 1;
  const currentExp = user.experience || 0;
  const maxExp = user.maxExperience || getXpRequiredForLevel(currentLevel);
  const xpPercent = Math.min(100, Math.round((currentExp / maxExp) * 100));

  const nextLevel = Math.min(MAX_GAME_LEVEL, currentLevel + 1);
  const isMaxLevel = currentLevel >= MAX_GAME_LEVEL;

  return (
    <div className="space-y-4">
      {/* Cinematic portal shell — art slots receive final NEXA artwork later */}
      <section className="relative isolate overflow-hidden rounded-[22px] border border-cyan-400/25 bg-[#040811] shadow-[0_30px_100px_rgba(0,0,0,.52),0_0_45px_rgba(34,211,238,.06)]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,182,212,.10),transparent_30%,transparent_70%,rgba(168,85,247,.11)),radial-gradient(circle_at_50%_0%,rgba(56,189,248,.13),transparent_38%)]" />
        <div className="absolute inset-x-[10%] top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
        <div className="absolute left-1/2 top-[44%] h-44 w-44 -translate-x-1/2 rounded-full bg-sky-400/[.06] blur-3xl" />
        <div className="absolute inset-0 opacity-[.13] [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:42px_42px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
        <div className="relative min-h-[390px] px-4 py-5 sm:min-h-[345px] sm:px-7 lg:min-h-[338px] lg:px-8">
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[28%] lg:block">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/[.12] to-transparent" />
            <div className="absolute bottom-7 left-5 h-52 w-44 -rotate-6 rounded-[32px] border border-cyan-300/15 bg-[linear-gradient(145deg,rgba(34,211,238,.12),rgba(2,6,23,.15))] shadow-[0_0_70px_rgba(34,211,238,.13)]">
              <div className="absolute inset-4 rounded-[24px] border border-cyan-300/10" />
              <Swords className="absolute bottom-8 right-7 h-12 w-12 text-cyan-300/35" />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[28%] lg:block">
            <div className="absolute inset-0 bg-gradient-to-l from-violet-500/[.13] to-transparent" />
            <div className="absolute bottom-7 right-5 h-52 w-44 rotate-6 rounded-[32px] border border-violet-300/15 bg-[linear-gradient(215deg,rgba(168,85,247,.14),rgba(2,6,23,.15))] shadow-[0_0_70px_rgba(168,85,247,.14)]">
              <div className="absolute inset-4 rounded-[24px] border border-violet-300/10" />
              <Zap className="absolute bottom-8 left-7 h-12 w-12 text-violet-300/35" />
            </div>
          </div>
          <div className="relative z-10 mx-auto flex max-w-[620px] flex-col items-center pt-1 text-center lg:pt-2">
            <div className="mb-2.5 flex items-center gap-3 font-mono text-[8px] font-bold uppercase tracking-[.34em] text-slate-500"><span className="h-px w-10 bg-cyan-400/30" /> Rede Nexus <span className="h-px w-10 bg-violet-400/30" /></div>
            <h1 className="font-heading text-[28px] font-black uppercase leading-[.94] tracking-[.015em] text-white drop-shadow-[0_3px_18px_rgba(0,0,0,.7)] sm:text-4xl">
              Sua próxima<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400">batalha começa aqui</span>
            </h1>
            <p className="mt-2.5 text-[11px] text-slate-400 sm:text-xs">Estratégia. Coleção. Evolução. Uma Rede de possibilidades.</p>
            <div className="mt-4 grid w-full max-w-[510px] grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
              <button onClick={() => onNavigate('riftbattle-v2')} className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 font-heading text-[11px] font-black uppercase tracking-[.08em] text-slate-950 shadow-[0_0_28px_rgba(34,211,238,.18)] transition hover:-translate-y-0.5 hover:bg-cyan-200"><Swords className="h-4 w-4"/> Jogar Rift Battle <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/></button>
              <button onClick={() => onNavigate('arena')} className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-violet-400/50 bg-violet-500/[.13] px-4 font-heading text-[11px] font-black uppercase tracking-[.08em] text-violet-100 shadow-[0_0_28px_rgba(168,85,247,.12)] transition hover:-translate-y-0.5 hover:bg-violet-500/[.2]"><Zap className="h-4 w-4"/> Jogar Nexus Duel <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/></button>
            </div>
          </div>
          <div className="absolute inset-x-4 bottom-4 z-20 grid grid-cols-3 overflow-hidden rounded-xl border border-cyan-300/20 bg-[#06101b]/95 shadow-[0_0_32px_rgba(34,211,238,.08),0_12px_35px_rgba(0,0,0,.38)] backdrop-blur-md sm:inset-x-7 lg:inset-x-8 lg:grid-cols-5">
            <div className="flex items-center gap-3 border-r border-white/[.07] px-3 py-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-400/25 bg-cyan-400/[.08] text-cyan-300 shadow-[0_0_16px_rgba(34,211,238,.12)]"><Layers className="h-4 w-4"/></span><div><p className="font-heading text-base font-black text-white">{userCards.length}</p><p className="text-[7px] uppercase tracking-[.12em] text-slate-500">Cartas no inventário</p></div></div>
            <div className="flex items-center gap-3 border-r border-white/[.07] px-3 py-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-400/25 bg-sky-400/[.08] text-sky-300"><Award className="h-4 w-4"/></span><div><p className="font-heading text-base font-black text-cyan-300">Nv. {currentLevel}</p><p className="text-[7px] uppercase tracking-[.12em] text-slate-500">Piloto</p></div></div>
            <div className="border-r border-white/[.07] px-3 py-2.5"><div className="flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-cyan-400/20 bg-cyan-400/[.06] text-[8px] font-black text-cyan-300">XP</span><div className="min-w-0 flex-1"><div className="flex items-baseline gap-1"><p className="font-heading text-sm font-black text-sky-300">{currentExp}</p><span className="text-[7px] text-slate-500">/ {maxExp}</span></div><div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[.08]"><div style={{width:`${xpPercent}%`}} className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 shadow-[0_0_8px_rgba(34,211,238,.5)]"/></div></div></div></div>
            <div className="hidden items-center gap-3 border-r border-white/[.07] px-3 py-2.5 lg:flex"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/[.07] text-amber-300"><PackageOpen className="h-4 w-4"/></span><div><p className="font-heading text-base font-black text-amber-300">{myBoxes.length}</p><p className="text-[7px] uppercase tracking-[.12em] text-slate-500">Caixas</p></div></div>
            <div className="hidden items-center gap-3 px-3 py-2.5 lg:flex"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-400/25 bg-violet-400/[.07] text-violet-300"><Trophy className="h-4 w-4"/></span><div><p className="font-heading text-base font-black text-violet-300">{distinctGuardiansCards}/4</p><p className="text-[7px] uppercase tracking-[.12em] text-slate-500">Guardiões</p></div></div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <button onClick={() => onNavigate('riftbattle-v2')} className="group relative min-h-[190px] overflow-hidden rounded-[18px] border border-cyan-400/45 bg-[#06121c] p-5 text-left shadow-[0_22px_55px_rgba(0,0,0,.28),inset_0_1px_0_rgba(255,255,255,.035)] transition duration-300 hover:-translate-y-1 hover:border-cyan-300/80 hover:shadow-[0_28px_65px_rgba(0,0,0,.38),0_0_35px_rgba(34,211,238,.10)]">
          <div className="absolute inset-y-0 right-0 w-[43%] bg-[radial-gradient(circle_at_center,rgba(34,211,238,.15),transparent_60%)]" />
          <div className="absolute -right-8 top-5 flex h-32 w-32 sm:-right-4 sm:top-3 sm:h-36 sm:w-36 rotate-6 items-center justify-center rounded-[28px] border border-cyan-400/15 bg-gradient-to-br from-cyan-400/[.08] to-transparent shadow-[0_0_55px_rgba(34,211,238,.12)]"><Swords className="h-12 w-12 text-cyan-300/60"/></div>
          <div className="relative flex h-full max-w-full flex-col justify-between pr-20 sm:max-w-[72%] sm:pr-0">
            <div><div className="flex items-center gap-2"><span className="font-mono text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">Jogo principal</span><span className="rounded-full border border-emerald-400/25 bg-emerald-400/[.07] px-2 py-0.5 text-[8px] font-bold uppercase text-emerald-300">● Online</span></div><h2 className="mt-1.5 font-heading text-[22px] font-black leading-none text-white">RIFT BATTLE <span className="text-cyan-300">V2</span></h2><p className="mt-2 text-[11px] leading-[1.45] text-slate-400">Combate tático em equipe. Forme seu esquadrão, enfrente o Rift e conquiste recompensas.</p><div className="mt-3 flex flex-wrap gap-1.5">{['PvE','2×2','3×3','4×4','NEX + NXA + XP'].map(x=><span key={x} className="rounded-full border border-cyan-400/20 bg-black/20 px-2.5 py-1 text-[8px] font-bold text-slate-300">{x}</span>)}</div></div>
            <span className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 font-heading text-[10px] font-black uppercase tracking-[.1em] text-slate-950">Jogar agora <ArrowRight className="h-4 w-4"/></span>
          </div>
        </button>

        <button onClick={() => onNavigate('arena')} className="group relative min-h-[190px] overflow-hidden rounded-[18px] border border-fuchsia-400/45 bg-[#110918] p-5 text-left shadow-[0_22px_55px_rgba(0,0,0,.28),inset_0_1px_0_rgba(255,255,255,.035)] transition duration-300 hover:-translate-y-1 hover:border-fuchsia-300/80 hover:shadow-[0_28px_65px_rgba(0,0,0,.38),0_0_35px_rgba(217,70,239,.10)]">
          <div className="absolute inset-y-0 right-0 w-[43%] bg-[radial-gradient(circle_at_center,rgba(217,70,239,.15),transparent_60%)]" />
          <div className="absolute -right-8 top-5 flex h-32 w-32 sm:-right-4 sm:top-3 sm:h-36 sm:w-36 -rotate-6 items-center justify-center rounded-[28px] border border-fuchsia-400/15 bg-gradient-to-br from-fuchsia-400/[.08] to-transparent shadow-[0_0_55px_rgba(217,70,239,.12)]"><Layers className="h-12 w-12 text-fuchsia-300/60"/></div>
          <div className="relative flex h-full max-w-full flex-col justify-between pr-20 sm:max-w-[72%] sm:pr-0">
            <div><div className="flex items-center gap-2"><span className="font-mono text-[9px] font-black uppercase tracking-[.18em] text-fuchsia-300">Duelo estratégico</span><span className="rounded-full border border-emerald-400/25 bg-emerald-400/[.07] px-2 py-0.5 text-[8px] font-bold uppercase text-emerald-300">● Online</span></div><h2 className="mt-1.5 font-heading text-[22px] font-black leading-none text-white">NEXUS DUEL</h2><p className="mt-2 text-[11px] leading-[1.45] text-slate-400">Duelo individual 4×4. Use suas cartas, Nexos e habilidades em confrontos PvE ou PvP.</p><div className="mt-3 flex flex-wrap gap-1.5">{['PvE','PvP','Deck 4×4','Habilidades','XP compartilhado'].map(x=><span key={x} className="rounded-full border border-fuchsia-400/20 bg-black/20 px-2.5 py-1 text-[8px] font-bold text-slate-300">{x}</span>)}</div></div>
            <span className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 font-heading text-[10px] font-black uppercase tracking-[.1em] text-white">Jogar agora <ArrowRight className="h-4 w-4"/></span>
          </div>
        </button>
      </div>

      {/* If unopened recruit box exists: Callout Banner (Requirement 20) */}
      {hasUnopenedRecruitBox && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-cyan-500/15 to-purple-500/20 border border-amber-400/40 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0 animate-bounce">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading text-sm sm:text-base font-black text-white uppercase tracking-wider">
                Recompensa disponível
              </h4>
              <p className="text-xs text-slate-300 font-mono">
                Há uma Caixa de Recruta aguardando abertura no seu inventário.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('boxes')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-heading font-black text-xs uppercase tracking-wider shadow-lg transition-all shrink-0 flex items-center gap-2 hover:scale-[1.02]"
          >
            <PackageOpen className="w-4 h-4" />
            <span>VER CAIXA</span>
          </button>
        </div>
      )}

      {/* Reference-style utility row using real NEXA systems */}
      <div className="grid gap-3 lg:grid-cols-[1.05fr_1fr_1.15fr]">
        <button onClick={() => onNavigate('progression')} className="group rounded-[16px] border border-cyan-400/20 bg-[#07111a] p-4 text-left shadow-[0_16px_40px_rgba(0,0,0,.28)] transition hover:border-cyan-300/45">
          <div className="flex items-center justify-between"><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-cyan-300"/><h3 className="font-heading text-[11px] font-black uppercase tracking-[.12em] text-cyan-300">Próximo objetivo</h3></div><span className="text-[8px] font-mono text-cyan-500">NÍVEL {isMaxLevel?MAX_GAME_LEVEL:nextLevel}</span></div>
          <p className="mt-3 text-xs font-bold text-slate-200">{isMaxLevel?'Progressão concluída':`Alcance o nível ${nextLevel}`}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.07]"><div style={{width:`${xpPercent}%`}} className="h-full rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,.55)]"/></div>
          <div className="mt-2 flex justify-between text-[8px] font-mono text-slate-500"><span>{currentExp}/{maxExp} XP</span><span>{isMaxLevel?'MAX':`Faltam ${Math.max(0,maxExp-currentExp)} XP`}</span></div>
          <div className="mt-3 flex items-center justify-between border-t border-white/[.06] pt-2 text-[8px] uppercase tracking-wider text-slate-500"><span>Progressão do piloto</span><ChevronRight className="h-3.5 w-3.5 text-cyan-300 transition group-hover:translate-x-1"/></div>
        </button>

        <button onClick={() => onNavigate('collections')} className="group rounded-[16px] border border-violet-400/20 bg-[#100a18] p-4 text-left shadow-[0_16px_40px_rgba(0,0,0,.28)] transition hover:border-violet-300/45">
          <div className="flex items-center gap-2"><Gift className="h-4 w-4 text-violet-300"/><h3 className="font-heading text-[11px] font-black uppercase tracking-[.12em] text-violet-300">Coleção & Caixas</h3></div>
          <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-lg border border-violet-400/10 bg-black/20 p-2.5"><p className="font-heading text-xl font-black text-white">{distinctGuardiansCards}<span className="text-xs text-slate-500">/4</span></p><p className="text-[8px] uppercase text-slate-500">Guardiões</p></div><div className="rounded-lg border border-amber-400/10 bg-black/20 p-2.5"><p className="font-heading text-xl font-black text-amber-300">{myBoxes.length}</p><p className="text-[8px] uppercase text-slate-500">Caixas</p></div></div>
          <div className="mt-3 flex items-center justify-between border-t border-white/[.06] pt-2 text-[8px] uppercase tracking-wider text-slate-500"><span>Acompanhar coleção</span><ChevronRight className="h-3.5 w-3.5 text-violet-300 transition group-hover:translate-x-1"/></div>
        </button>

        <div className="rounded-[16px] border border-sky-400/15 bg-[#080e17] p-4 shadow-[0_16px_40px_rgba(0,0,0,.28)]">
          <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-sky-300"/><h3 className="font-heading text-[11px] font-black uppercase tracking-[.12em] text-sky-300">Atividade recente</h3></div><button onClick={()=>onNavigate('history')} className="text-[8px] text-slate-500 hover:text-sky-300">Ver todas →</button></div>
          <div className="mt-3 space-y-2">
            {transactions.slice(0,4).map(tx=><div key={tx.id} className="flex items-center justify-between gap-2 border-b border-white/[.05] pb-1.5 text-[8px] last:border-0"><div className="min-w-0"><p className="truncate font-bold text-slate-300">{tx.itemSnapshot.name}</p><p className="truncate text-slate-600">{tx.buyerName} comprou de {tx.sellerName}</p></div><span className="shrink-0 font-bold text-cyan-300">+{formatEconomicValue(tx.amount)} NXA</span></div>)}
            {transactions.length===0&&<p className="py-5 text-center text-[9px] text-slate-500">Nenhuma atividade recente.</p>}
          </div>
        </div>
      </div>

      {/* Sell Modal */}
      <SellModal
        asset={sellingAsset}
        onClose={() => setSellingAsset(null)}
        onConfirmList={(id, price) => listAsset(id, price)}
      />

      {/* Trade Proposal Modal */}
      {tradingAsset && (
        <TradeProposalModal
          initialItem={tradingAsset}
          onClose={() => setTradingAsset(null)}
        />
      )}

      {/* First Access Celebration Modal */}
      {showFirstAccess && (
        <FirstAccessModal
          onNavigate={onNavigate}
          onDismiss={() => {
            setShowFirstAccess(false);
            dismissFirstAccess();
          }}
        />
      )}
    </div>
  );
};
