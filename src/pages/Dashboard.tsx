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
      <section className="relative overflow-hidden rounded-[22px] border border-cyan-400/25 bg-[#050912] shadow-[0_24px_90px_rgba(0,0,0,.42)]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,182,212,.08),transparent_30%,transparent_70%,rgba(168,85,247,.09)),radial-gradient(circle_at_50%_0%,rgba(56,189,248,.10),transparent_38%)]" />
        <div className="relative min-h-[320px] px-5 py-5 sm:px-8 lg:min-h-[350px]">
          <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-[28%] lg:block">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/[.12] to-transparent" />
            <div className="absolute bottom-8 left-8 flex h-44 w-36 -rotate-6 items-center justify-center rounded-[28px] border border-cyan-300/20 bg-cyan-400/[.05] shadow-[0_0_60px_rgba(34,211,238,.12)]">
              <Swords className="h-14 w-14 text-cyan-300/65" />
            </div>
            <span className="absolute bottom-5 left-8 font-mono text-[8px] uppercase tracking-[.25em] text-cyan-500/50">Arte Rift · slot</span>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[28%] lg:block">
            <div className="absolute inset-0 bg-gradient-to-l from-violet-500/[.13] to-transparent" />
            <div className="absolute bottom-8 right-8 flex h-44 w-36 rotate-6 items-center justify-center rounded-[28px] border border-violet-300/20 bg-violet-400/[.05] shadow-[0_0_60px_rgba(168,85,247,.14)]">
              <Zap className="h-14 w-14 text-violet-300/65" />
            </div>
            <span className="absolute bottom-5 right-8 font-mono text-[8px] uppercase tracking-[.25em] text-violet-400/50">Arte Duel · slot</span>
          </div>
          <div className="relative z-10 mx-auto flex max-w-[650px] flex-col items-center text-center">
            <div className="mb-3 flex items-center gap-3 font-mono text-[8px] font-bold uppercase tracking-[.3em] text-slate-500"><span className="h-px w-10 bg-cyan-400/30" /> Rede Nexus <span className="h-px w-10 bg-violet-400/30" /></div>
            <h1 className="font-heading text-3xl font-black uppercase leading-[.95] tracking-[.02em] text-white sm:text-4xl">
              Sua próxima<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400">batalha começa aqui</span>
            </h1>
            <p className="mt-3 text-xs text-slate-400 sm:text-sm">Estratégia. Coleção. Evolução. Uma Rede de possibilidades.</p>
            <div className="mt-5 grid w-full max-w-[510px] grid-cols-1 gap-3 sm:grid-cols-2">
              <button onClick={() => onNavigate('riftbattle-v2')} className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 font-heading text-[11px] font-black uppercase tracking-[.08em] text-slate-950 shadow-[0_0_28px_rgba(34,211,238,.18)] transition hover:-translate-y-0.5 hover:bg-cyan-200"><Swords className="h-4 w-4"/> Jogar Rift Battle <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/></button>
              <button onClick={() => onNavigate('arena')} className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-violet-400/50 bg-violet-500/[.13] px-4 font-heading text-[11px] font-black uppercase tracking-[.08em] text-violet-100 shadow-[0_0_28px_rgba(168,85,247,.12)] transition hover:-translate-y-0.5 hover:bg-violet-500/[.2]"><Zap className="h-4 w-4"/> Jogar Nexus Duel <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/></button>
            </div>
          </div>
          <div className="absolute inset-x-5 bottom-4 z-20 grid grid-cols-3 overflow-hidden rounded-xl border border-cyan-400/15 bg-[#06101b]/95 backdrop-blur-md sm:inset-x-8 lg:grid-cols-4">
            <div className="border-r border-white/[.07] px-4 py-3"><p className="font-heading text-lg font-black text-white">{userCards.length}</p><p className="text-[8px] uppercase tracking-[.12em] text-slate-500">Cartas no inventário</p></div>
            <div className="border-r border-white/[.07] px-4 py-3"><p className="font-heading text-lg font-black text-cyan-300">Nv. {currentLevel}</p><p className="text-[8px] uppercase tracking-[.12em] text-slate-500">Piloto</p></div>
            <div className="border-r border-white/[.07] px-4 py-3"><p className="font-heading text-lg font-black text-sky-300">{currentExp} / {maxExp}</p><p className="text-[8px] uppercase tracking-[.12em] text-slate-500">XP</p></div>
            <div className="hidden px-4 py-3 lg:block"><p className="font-heading text-lg font-black text-violet-300">{Math.max(0,maxExp-currentExp)}</p><p className="text-[8px] uppercase tracking-[.12em] text-slate-500">XP para próximo nível</p></div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <button onClick={() => onNavigate('riftbattle-v2')} className="group relative min-h-[205px] overflow-hidden rounded-[18px] border border-cyan-400/50 bg-[#07131d] p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-300">
          <div className="absolute inset-y-0 right-0 w-[43%] bg-[radial-gradient(circle_at_center,rgba(34,211,238,.15),transparent_60%)]" />
          <div className="absolute right-5 top-5 flex h-28 w-28 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[.04]"><Swords className="h-12 w-12 text-cyan-300/60"/></div>
          <div className="relative flex h-full max-w-[70%] flex-col justify-between">
            <div><div className="flex items-center gap-2"><span className="font-mono text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">Jogo principal</span><span className="rounded-full border border-emerald-400/25 bg-emerald-400/[.07] px-2 py-0.5 text-[8px] font-bold uppercase text-emerald-300">● Online</span></div><h2 className="mt-2 font-heading text-2xl font-black text-white">RIFT BATTLE <span className="text-cyan-300">V2</span></h2><p className="mt-2 text-xs leading-5 text-slate-400">Combate tático em equipe. Forme seu esquadrão, enfrente o Rift e conquiste recompensas.</p><div className="mt-3 flex flex-wrap gap-1.5">{['PvE','2×2','3×3','4×4','NEX + NXA + XP'].map(x=><span key={x} className="rounded-full border border-cyan-400/20 bg-black/20 px-2.5 py-1 text-[8px] font-bold text-slate-300">{x}</span>)}</div></div>
            <span className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 font-heading text-[10px] font-black uppercase tracking-[.1em] text-slate-950">Jogar agora <ArrowRight className="h-4 w-4"/></span>
          </div>
        </button>

        <button onClick={() => onNavigate('arena')} className="group relative min-h-[205px] overflow-hidden rounded-[18px] border border-fuchsia-400/50 bg-[#120a19] p-5 text-left transition hover:-translate-y-0.5 hover:border-fuchsia-300">
          <div className="absolute inset-y-0 right-0 w-[43%] bg-[radial-gradient(circle_at_center,rgba(217,70,239,.15),transparent_60%)]" />
          <div className="absolute right-5 top-5 flex h-28 w-28 items-center justify-center rounded-2xl border border-fuchsia-400/15 bg-fuchsia-400/[.04]"><Layers className="h-12 w-12 text-fuchsia-300/60"/></div>
          <div className="relative flex h-full max-w-[70%] flex-col justify-between">
            <div><div className="flex items-center gap-2"><span className="font-mono text-[9px] font-black uppercase tracking-[.18em] text-fuchsia-300">Duelo estratégico</span><span className="rounded-full border border-emerald-400/25 bg-emerald-400/[.07] px-2 py-0.5 text-[8px] font-bold uppercase text-emerald-300">● Online</span></div><h2 className="mt-2 font-heading text-2xl font-black text-white">NEXUS DUEL</h2><p className="mt-2 text-xs leading-5 text-slate-400">Duelo individual 4×4. Use suas cartas, Nexos e habilidades em confrontos PvE ou PvP.</p><div className="mt-3 flex flex-wrap gap-1.5">{['PvE','PvP','Deck 4×4','Habilidades','XP compartilhado'].map(x=><span key={x} className="rounded-full border border-fuchsia-400/20 bg-black/20 px-2.5 py-1 text-[8px] font-bold text-slate-300">{x}</span>)}</div></div>
            <span className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 font-heading text-[10px] font-black uppercase tracking-[.1em] text-white">Jogar agora <ArrowRight className="h-4 w-4"/></span>
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

      {/* Requirement 4: PROGRESSÃO & PRÓXIMO NÍVEL NO DASHBOARD */}
      <div className="p-4 sm:p-5 rounded-[18px] bg-gradient-to-br from-[#09111b] via-[#090b13] to-[#08090f] border border-cyan-500/20 shadow-[0_20px_60px_rgba(0,0,0,0.22)] relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_430px] lg:items-center gap-5">
          {/* Left: Level & XP Progress Bar */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono font-bold uppercase tracking-wider">
                <Award className="w-3.5 h-3.5" />
                <span>PROGRESSÃO DO PILOTO</span>
              </div>
              <button
                onClick={() => onNavigate('progression')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                <span>Ver progressão completa</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-baseline gap-3">
              <h2 className="font-heading text-2xl sm:text-3xl font-black text-white tracking-tight">
                NÍVEL {currentLevel}
              </h2>
              <span className="text-sm font-mono text-cyan-400 font-bold">
                {currentExp} / {maxExp} XP
              </span>
            </div>

            {/* Glowing progress bar */}
            <div className="space-y-1.5">
              <div className="h-3.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
                <div
                  style={{ width: `${xpPercent}%` }}
                  className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.5)] transition-all duration-700"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Progresso para Nível {nextLevel} ({xpPercent}%)</span>
                <span>Faltam {Math.max(0, maxExp - currentExp)} XP</span>
              </div>
            </div>
          </div>

          {/* Right: Online progression objectives */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-[#0a0914] border border-cyan-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono uppercase text-cyan-400 font-bold mb-1">
                  <span>PRÓXIMO OBJETIVO</span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40">
                    {isMaxLevel ? `Nv. ${MAX_GAME_LEVEL}` : `Nv. ${nextLevel}`}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono block">
                  {isMaxLevel ? 'Progressão concluída' : 'Avance jogando os dois jogos'}
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                  <h4 className="font-heading font-bold text-white text-xs">
                    {isMaxLevel ? 'Nível máximo atingido' : `Alcançar o Nível ${nextLevel}`}
                  </h4>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-white/10 text-[10px] font-mono text-slate-400">
                {isMaxLevel ? 'Patente máxima do piloto.' : `Faltam ${Math.max(0, maxExp - currentExp)} XP`}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0d091a] border border-purple-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono uppercase text-purple-300 font-bold mb-1">
                  <span>REDE NEXUS</span>
                  <Shield className="w-4 h-4 text-purple-300" />
                </div>
                <span className="text-xs text-slate-400 font-mono block">Progressão compartilhada</span>
                <div className="mt-2">
                  <h4 className="font-heading font-bold text-white text-xs">
                    Nível e XP compartilhados nos jogos
                  </h4>
                  <span className="text-[10px] font-mono text-purple-300">
                    Rift Battle e Nexus Duel alimentam a mesma conta.
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-white/10 text-[10px] font-mono text-slate-400">
                Nível concede progressão e recursos de conta, sem bônus direto de combate.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <button onClick={() => onNavigate('progression')} className="rounded-[18px] border border-cyan-400/20 bg-[#07111b] p-4 text-left transition hover:border-cyan-300/40">
          <div className="flex items-center justify-between"><span className="font-mono text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">Progressão</span><Award className="h-4 w-4 text-cyan-300"/></div>
          <p className="mt-2 font-heading text-lg font-black text-white">Nível {currentLevel}</p><p className="mt-1 text-[10px] text-slate-500">{currentExp}/{maxExp} XP · {xpPercent}% concluído</p>
        </button>
        <button onClick={() => onNavigate('boxes')} className="rounded-[18px] border border-amber-400/20 bg-[#121009] p-4 text-left transition hover:border-amber-300/40">
          <div className="flex items-center justify-between"><span className="font-mono text-[9px] font-black uppercase tracking-[.18em] text-amber-300">Caixas</span><PackageOpen className="h-4 w-4 text-amber-300"/></div>
          <p className="mt-2 font-heading text-lg font-black text-white">{myBoxes.length} no inventário</p><p className="mt-1 text-[10px] text-slate-500">Abra caixas e expanda sua coleção.</p>
        </button>
        <button onClick={() => onNavigate('collections')} className="rounded-[18px] border border-violet-400/20 bg-[#100b18] p-4 text-left transition hover:border-violet-300/40">
          <div className="flex items-center justify-between"><span className="font-mono text-[9px] font-black uppercase tracking-[.18em] text-violet-300">Coleções</span><Trophy className="h-4 w-4 text-violet-300"/></div>
          <p className="mt-2 font-heading text-lg font-black text-white">{distinctGuardiansCards}/4 Guardiões</p><p className="mt-1 text-[10px] text-slate-500">Acompanhe as cartas da coleção.</p>
        </button>
      </div>

      {/* Compact live dashboard — only existing NEXA data */}
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.15fr]">
        <div className="rounded-[18px] border border-cyan-400/15 bg-[#07101a] p-4">
          <div className="flex items-center justify-between"><h3 className="font-heading text-xs font-black uppercase tracking-[.1em] text-cyan-300">Arsenal</h3><button onClick={() => onNavigate('inventory')} className="text-[9px] font-mono text-slate-500 hover:text-cyan-300">Ver tudo →</button></div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {userItems.slice(0,3).map(item=><button key={item.id} onClick={()=>onNavigate('inventory')} className="group min-w-0"><div className="aspect-[.82] overflow-hidden rounded-lg border border-white/[.07] bg-black/30"><CardImage asset={item} src={item.image} alt={item.name} className="h-full w-full object-cover transition group-hover:scale-105"/></div><p className="mt-1 truncate text-[9px] font-bold text-slate-300">{item.name}</p></button>)}
            {userItems.length===0 && <p className="col-span-3 py-6 text-center text-[10px] text-slate-500">Nenhuma carta no inventário.</p>}
          </div>
        </div>

        <div className="rounded-[18px] border border-violet-400/15 bg-[#0d0a15] p-4">
          <div className="flex items-center justify-between"><h3 className="font-heading text-xs font-black uppercase tracking-[.1em] text-violet-300">Status da conta</h3><Shield className="h-4 w-4 text-violet-300"/></div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-white/[.035] px-3 py-2"><span className="text-[9px] uppercase text-slate-500">Poder do arsenal</span><strong className="text-xs text-cyan-300">{totalPower===null?'—':totalPower.toLocaleString('pt-BR')}</strong></div>
            <div className="flex items-center justify-between rounded-xl bg-white/[.035] px-3 py-2"><span className="text-[9px] uppercase text-slate-500">Cartas raras+</span><strong className="text-xs text-violet-300">{rareCount}</strong></div>
            <div className="flex items-center justify-between rounded-xl bg-white/[.035] px-3 py-2"><span className="text-[9px] uppercase text-slate-500">Coleção Guardiões</span><strong className="text-xs text-white">{distinctGuardiansCards}/4</strong></div>
            <div className="flex items-center justify-between rounded-xl bg-white/[.035] px-3 py-2"><span className="text-[9px] uppercase text-slate-500">Caixas</span><strong className="text-xs text-amber-300">{myBoxes.length}</strong></div>
          </div>
        </div>

        <div className="rounded-[18px] border border-white/[.08] bg-[#090d14] p-4">
          <div className="flex items-center justify-between"><h3 className="font-heading text-xs font-black uppercase tracking-[.1em] text-sky-300">Atividade do mercado</h3><button onClick={() => onNavigate('history')} className="text-[9px] font-mono text-slate-500 hover:text-sky-300">Histórico →</button></div>
          <div className="mt-3 space-y-2">
            {transactions.slice(0,4).map(tx=><div key={tx.id} className="flex items-center justify-between gap-3 border-b border-white/[.05] pb-2 text-[9px] last:border-0"><div className="min-w-0"><p className="truncate font-bold text-slate-300">{tx.itemSnapshot.name}</p><p className="truncate text-slate-600">{tx.buyerName} comprou de {tx.sellerName}</p></div><span className="shrink-0 font-bold text-cyan-300">{formatEconomicValue(tx.amount)} NXA</span></div>)}
            {transactions.length===0 && <p className="py-6 text-center text-[10px] text-slate-500">Nenhuma atividade recente.</p>}
          </div>
          <button onClick={()=>onNavigate('marketplace')} className="mt-3 w-full rounded-lg border border-cyan-400/15 bg-cyan-400/[.05] py-2 text-[9px] font-black uppercase tracking-[.1em] text-cyan-300 transition hover:bg-cyan-400/[.1]">Acessar marketplace</button>
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
