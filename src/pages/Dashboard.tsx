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
        <div className="relative min-h-[390px] px-4 py-5 sm:min-h-[345px] sm:px-7 lg:h-[344px] lg:min-h-0 lg:px-8">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <picture>
              <source media="(min-width: 1024px)" srcSet="/assets/nexa-rivals-hero.png" />
              <img src="/assets/nexa-rivals-hero-movel.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-center opacity-95 lg:left-1/2 lg:top-1/2 lg:h-[112%] lg:w-[112%] lg:max-w-none lg:-translate-x-1/2 lg:-translate-y-1/2 lg:opacity-100" />
            </picture>
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,8,18,.01)_0%,rgba(2,8,18,.03)_24%,rgba(2,8,18,.34)_40%,rgba(2,8,18,.54)_50%,rgba(2,8,18,.34)_60%,rgba(2,8,18,.03)_76%,rgba(2,8,18,.01)_100%)] lg:bg-[linear-gradient(90deg,rgba(2,8,18,.02)_0%,rgba(2,8,18,.08)_28%,rgba(2,8,18,.52)_41%,rgba(2,8,18,.68)_50%,rgba(2,8,18,.52)_59%,rgba(2,8,18,.08)_72%,rgba(2,8,18,.02)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#050b14]/90 via-[#050b14]/35 to-transparent" />
          </div>
          <div className="pointer-events-none absolute -bottom-16 left-[-3%] z-0 h-32 w-[42%] rounded-[50%] bg-cyan-400/[.13] blur-[55px] lg:block" />
          <div className="pointer-events-none absolute -bottom-16 right-[-3%] z-0 h-32 w-[42%] rounded-[50%] bg-fuchsia-500/[.13] blur-[55px] lg:block" />
          <div className="relative z-10 mx-auto flex max-w-[590px] flex-col items-center pt-1 text-center lg:pt-1">
            <div className="mb-2.5 flex items-center gap-3 font-mono text-[8px] font-bold uppercase tracking-[.34em] text-slate-500"><span className="h-px w-10 bg-cyan-400/30" /> Rede Nexus <span className="h-px w-10 bg-violet-400/30" /></div>
            <h1 className="font-heading text-[28px] font-black uppercase leading-[.94] tracking-[.015em] text-white drop-shadow-[0_3px_18px_rgba(0,0,0,.7)] sm:text-4xl">
              Sua próxima<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400">batalha começa aqui</span>
            </h1>
            <p className="mt-2.5 text-[11px] text-slate-400 sm:text-xs">Estratégia. Coleção. Evolução. Uma Rede de possibilidades.</p>
            <div className="mt-4 hidden w-full max-w-[510px] grid-cols-1 gap-2.5 lg:grid lg:grid-cols-2 lg:gap-3">
              <button onClick={() => onNavigate('riftbattle-v2')} className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 font-heading text-[11px] font-black uppercase tracking-[.08em] text-slate-950 shadow-[0_0_28px_rgba(34,211,238,.18)] transition hover:-translate-y-0.5 hover:bg-cyan-200"><Swords className="h-4 w-4"/> Jogar Rift Battle <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/></button>
              <button onClick={() => onNavigate('arena')} className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-violet-400/50 bg-violet-500/[.13] px-4 font-heading text-[11px] font-black uppercase tracking-[.08em] text-violet-100 shadow-[0_0_28px_rgba(168,85,247,.12)] transition hover:-translate-y-0.5 hover:bg-violet-500/[.2]"><Zap className="h-4 w-4"/> Jogar Nexus Duel <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/></button>
            </div>
          </div>
          <div className="absolute inset-x-4 bottom-3 z-20 overflow-hidden rounded-xl border border-cyan-300/20 bg-[#06101b]/95 backdrop-blur-md sm:inset-x-7 lg:left-[7%] lg:right-[7%]">
            <div className="grid grid-cols-5">
              <div className="flex min-h-[58px] items-center justify-center gap-1.5 border-r border-white/[.07] px-1.5 sm:gap-2 sm:px-2 lg:justify-start lg:gap-3 lg:px-4"><Layers className="h-4 w-4 shrink-0 text-cyan-300 lg:h-5 lg:w-5"/><div className="min-w-0"><p className="font-heading text-sm font-black text-white lg:text-base">{userCards.length}</p><p className="text-[7px] font-medium uppercase leading-tight tracking-[.04em] text-slate-300 sm:text-[8px] lg:text-[9px] lg:tracking-[.09em]">Cartas<span className="hidden lg:inline"> no inventário</span></p></div></div>
              <div className="flex min-h-[58px] items-center justify-center gap-1.5 border-r border-white/[.07] px-1.5 sm:gap-2 sm:px-2 lg:justify-start lg:gap-3 lg:px-4"><Award className="h-4 w-4 shrink-0 text-sky-300 lg:h-5 lg:w-5"/><div className="min-w-0"><p className="font-heading text-sm font-black text-cyan-300 lg:text-base">Nv. {currentLevel}</p><p className="text-[7px] font-medium uppercase tracking-[.04em] text-slate-300 sm:text-[8px] lg:text-[9px] lg:tracking-[.09em]">Piloto</p></div></div>
              <div className="flex min-h-[58px] items-center justify-center gap-1 border-r border-white/[.07] px-1.5 sm:gap-2 sm:px-2 lg:justify-start lg:gap-3 lg:px-4"><span className="shrink-0 text-[7px] font-black text-cyan-300 lg:text-[8px]">XP</span><div className="min-w-0 flex-1"><p className="font-heading text-[11px] font-black text-sky-300 sm:text-xs lg:text-sm">{currentExp}<span className="hidden ml-1 text-[7px] font-normal text-slate-500 sm:inline">/ {maxExp}</span></p><p className="hidden text-[8px] font-medium text-slate-300 lg:block">Para o próximo nível</p><div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[.08]"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" style={{width:`${xpPercent}%`}}/></div></div></div>
              <div className="flex min-h-[58px] items-center justify-center gap-1.5 px-1.5 sm:gap-2 sm:px-2 lg:border-r lg:border-white/[.07] lg:justify-start lg:gap-3 lg:px-4"><Trophy className="h-4 w-4 shrink-0 text-amber-300 lg:h-5 lg:w-5"/><div className="min-w-0"><p className="font-heading text-sm font-black text-white lg:text-base">{user.victories}</p><p className="text-[7px] font-medium leading-tight text-slate-300 sm:text-[8px]">Vitórias<span className="hidden lg:inline"> totais</span></p></div></div>
              <div className="flex min-h-[58px] items-center justify-center gap-1 px-1 sm:gap-2 sm:px-2 lg:justify-start lg:gap-3 lg:px-4"><Swords className="h-4 w-4 shrink-0 text-violet-300 lg:h-5 lg:w-5"/><div className="min-w-0"><p className="font-heading text-sm font-black text-white lg:text-base">{user.victories + user.defeats}</p><p className="text-[7px] font-medium leading-tight text-slate-300 sm:text-[8px]"><span className="lg:hidden">Batalhas</span><span className="hidden lg:inline">Batalhas registradas</span></p></div></div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <button onClick={() => onNavigate('riftbattle-v2')} className="group relative min-h-[178px] overflow-hidden rounded-[18px] border border-cyan-400/45 bg-[#06121c] p-4 text-left shadow-[0_22px_55px_rgba(0,0,0,.28),inset_0_1px_0_rgba(255,255,255,.035)] transition duration-300 hover:-translate-y-1 hover:border-cyan-300/80 hover:shadow-[0_28px_65px_rgba(0,0,0,.38),0_0_35px_rgba(34,211,238,.10)]">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <img src="/assets/rift-battle-card.png" alt="" aria-hidden="true" className="absolute inset-y-0 right-0 h-full w-[82%] object-cover object-right opacity-100 transition duration-500 group-hover:scale-[1.015]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#06121c] from-[0%] via-[#06121c]/98 via-[45%] to-[#06121c]/8 to-[80%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#06121c]/45 via-transparent to-[#06121c]/10" />
          </div>
          <div className="relative z-10 flex h-full max-w-full flex-col justify-between pr-20 sm:max-w-[68%] sm:pr-0">
            <div><div className="flex items-center gap-2"><span className="font-mono text-[10px] font-black uppercase tracking-[.16em] text-cyan-300">Jogo principal</span><span className="rounded-full border border-emerald-400/25 bg-emerald-400/[.07] px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-300">● Online</span></div><h2 className="mt-1.5 font-heading text-[20px] font-black leading-none text-white">RIFT BATTLE <span className="text-fuchsia-400 drop-shadow-[0_0_10px_rgba(232,121,249,.45)]">V2</span></h2><p className="mt-1.5 text-[12px] leading-[1.4] text-slate-300">Combate tático em equipe. Forme seu esquadrão, enfrente o Rift e conquiste recompensas.</p><div className="mt-2.5 flex flex-wrap gap-1.5">{['PvE','2×2','3×3','4×4','NEX + NXA + XP'].map(x=><span key={x} className="rounded-full border border-cyan-400/20 bg-black/20 px-2.5 py-1 text-[10px] font-bold text-slate-200">{x}</span>)}</div></div>
            <span className="mt-2.5 inline-flex h-9 w-full sm:w-[78%] items-center justify-center gap-2 rounded-xl bg-cyan-300 font-heading text-[10px] font-black uppercase tracking-[.1em] text-slate-950">Jogar agora <ArrowRight className="h-4 w-4"/></span>
          </div>
        </button>

        <button onClick={() => onNavigate('arena')} className="group relative min-h-[178px] overflow-hidden rounded-[18px] border border-fuchsia-400/45 bg-[#110918] p-4 text-left shadow-[0_22px_55px_rgba(0,0,0,.28),inset_0_1px_0_rgba(255,255,255,.035)] transition duration-300 hover:-translate-y-1 hover:border-fuchsia-300/80 hover:shadow-[0_28px_65px_rgba(0,0,0,.38),0_0_35px_rgba(217,70,239,.10)]">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <img src="/assets/nexus-duel-card.png" alt="" aria-hidden="true" className="absolute inset-y-0 right-0 h-full w-[82%] object-cover object-right opacity-100 transition duration-500 group-hover:scale-[1.015]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#110918] from-[0%] via-[#110918]/98 via-[45%] to-[#110918]/8 to-[80%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#110918]/45 via-transparent to-[#110918]/10" />
          </div>
          <div className="relative z-10 flex h-full max-w-full flex-col justify-between pr-20 sm:max-w-[68%] sm:pr-0">
            <div><div className="flex items-center gap-2"><span className="font-mono text-[10px] font-black uppercase tracking-[.16em] text-fuchsia-300">Duelo estratégico</span><span className="rounded-full border border-emerald-400/25 bg-emerald-400/[.07] px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-300">● Online</span></div><h2 className="mt-1.5 font-heading text-[20px] font-black leading-none text-white">NEXUS DUEL</h2><p className="mt-1.5 text-[12px] leading-[1.4] text-slate-300">Duelo individual 4×4. Use suas cartas, Nexos e habilidades em confrontos PvE ou PvP.</p><div className="mt-2.5 flex flex-wrap gap-1.5">{['PvE','PvP','Deck 4×4','Habilidades','XP compartilhado'].map(x=><span key={x} className="rounded-full border border-fuchsia-400/20 bg-black/20 px-2.5 py-1 text-[10px] font-bold text-slate-200">{x}</span>)}</div></div>
            <span className="mt-2.5 inline-flex h-9 w-full sm:w-[78%] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 font-heading text-[10px] font-black uppercase tracking-[.1em] text-white">Jogar agora <ArrowRight className="h-4 w-4"/></span>
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
      <div className="grid items-stretch gap-3 lg:grid-cols-[1.02fr_1.08fr_.98fr]">
        <button onClick={()=>onNavigate('progression')} className="group h-[172px] rounded-[14px] border border-cyan-400/30 bg-[#06111b] p-3.5 text-left shadow-[0_0_24px_rgba(34,211,238,.06)] transition hover:border-cyan-300/50">
          <div className="flex h-7 items-center justify-between"><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-cyan-300"/><h3 className="font-heading text-[11px] font-black uppercase tracking-[.11em] text-cyan-300">Próximo objetivo</h3></div><span className="text-[7px] font-mono text-cyan-400">NV. {isMaxLevel?MAX_GAME_LEVEL:nextLevel}</span></div>
          <div className="mt-2 space-y-1.5">
            <div className="grid grid-cols-[22px_1fr_auto] items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded border border-cyan-400/20 bg-cyan-400/[.07]"><Award className="h-3 w-3 text-cyan-300"/></span><span className="truncate text-[11px] font-bold text-slate-200">{isMaxLevel?'Progressão concluída':`Alcance o nível ${nextLevel}`}</span><span className="text-[7px] font-bold text-cyan-300">{currentLevel}/{isMaxLevel?MAX_GAME_LEVEL:nextLevel}</span></div>
            <div className="grid grid-cols-[22px_1fr_auto] items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded border border-sky-400/20 bg-sky-400/[.07]"><Zap className="h-3 w-3 text-sky-300"/></span><div className="h-1.5 overflow-hidden rounded-full bg-white/[.08]"><div style={{width:`${xpPercent}%`}} className="h-full rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,.6)]"/></div><span className="text-[8px] text-slate-400">{currentExp}/{maxExp} XP</span></div>
            <div className="grid grid-cols-[22px_1fr_auto] items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded border border-violet-400/20 bg-violet-400/[.07]"><Trophy className="h-3 w-3 text-violet-300"/></span><span className="truncate text-[10px] text-slate-400">XP para próximo nível</span><span className="text-[7px] font-bold text-violet-300">{Math.max(0,maxExp-currentExp)}</span></div>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-white/[.06] pt-2 text-[7px] font-bold uppercase tracking-wider text-cyan-400"><span>Progressão do piloto</span><ChevronRight className="h-3 w-3"/></div>
        </button>

        <button onClick={()=>onNavigate('collections')} className="group h-[172px] overflow-hidden rounded-[14px] border border-cyan-400/25 bg-[#070e17] p-3.5 text-left shadow-[0_0_24px_rgba(56,189,248,.06)] transition hover:border-fuchsia-300/45">
          <div className="flex h-7 items-center justify-between"><div className="flex items-center gap-2"><Gift className="h-4 w-4 text-fuchsia-300"/><h3 className="font-heading text-[11px] font-black uppercase tracking-[.11em] text-fuchsia-300">Coleção & Caixas</h3></div><span className="text-[7px] text-fuchsia-400">Ver todas →</span></div>
          <div className="relative mt-1.5 h-[52px] overflow-hidden rounded-lg border border-fuchsia-400/10 bg-black/15 px-2 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            <div className="flex h-full w-max items-center gap-1.5 animate-[nexaCardRail_12s_linear_infinite]">
              {[...userItems.slice(0,4),...userItems.slice(0,4)].map((item,i)=><div key={`${item.id}-${i}`} className="relative h-[44px] w-[34px] shrink-0 overflow-hidden rounded border border-fuchsia-300/25 bg-black/40 shadow-[0_0_8px_rgba(217,70,239,.12)]"><CardImage asset={item} src={item.image} alt={item.name} className="h-full w-full object-cover"/></div>)}
            </div>
            {userItems.length===0&&<span className="absolute inset-0 flex items-center justify-center text-[7px] text-slate-400">Sua coleção aparecerá aqui</span>}
          </div>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            <div className="flex items-center gap-1.5 rounded-md border border-fuchsia-400/10 bg-fuchsia-400/[.04] px-1.5 py-1"><Layers className="h-3 w-3 shrink-0 text-fuchsia-300"/><span className="truncate text-[7px] text-slate-300">{userCards.length} cartas</span></div>
            <div className="flex items-center gap-1.5 rounded-md border border-violet-400/10 bg-violet-400/[.04] px-1.5 py-1"><Trophy className="h-3 w-3 shrink-0 text-violet-300"/><span className="truncate text-[7px] text-slate-300">{distinctGuardiansCards}/4 guardiões</span></div>
            <div className="flex items-center gap-1.5 rounded-md border border-amber-400/10 bg-amber-400/[.04] px-1.5 py-1"><PackageOpen className="h-3 w-3 shrink-0 text-amber-300"/><span className="truncate text-[7px] text-slate-300">{myBoxes.length} caixas</span></div>
          </div>
          <div onClick={(e)=>{e.stopPropagation();onNavigate('boxes')}} className="mt-1.5 flex h-7 w-full items-center justify-center gap-2 rounded-md border border-fuchsia-400/35 bg-gradient-to-r from-fuchsia-500/[.12] to-violet-500/[.12] font-heading text-[8px] font-black uppercase tracking-[.08em] text-fuchsia-200 shadow-[0_0_14px_rgba(217,70,239,.10)] transition hover:from-fuchsia-500/[.20] hover:to-violet-500/[.20]"><PackageOpen className="h-3 w-3"/> Explorar caixas <ChevronRight className="h-3 w-3"/></div>
        </button>

        <div role="button" tabIndex={0} onClick={()=>onNavigate('history')} onKeyDown={(e)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onNavigate('history')}}} className="group h-[172px] cursor-pointer rounded-[14px] border border-sky-400/25 bg-[#070e17] p-3.5 shadow-[0_0_24px_rgba(56,189,248,.06)] transition hover:border-sky-300/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50">
          <div className="flex h-7 items-center justify-between"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-sky-300"/><h3 className="font-heading text-[11px] font-black uppercase tracking-[.11em] text-sky-300">Atividade recente</h3></div><span className="text-[7px] text-slate-400 transition group-hover:text-sky-300">Ver todas →</span></div>
          <div className="mt-1.5 space-y-1">
            {transactions.slice(0,3).map((tx,i)=><div key={tx.id} className="grid grid-cols-[22px_1fr_auto] items-center gap-2 border-b border-white/[.05] pb-1"><span className={`flex h-5 w-5 items-center justify-center rounded border ${i===0?'border-cyan-400/20 bg-cyan-400/[.07] text-cyan-300':i===1?'border-fuchsia-400/20 bg-fuchsia-400/[.07] text-fuchsia-300':'border-amber-400/20 bg-amber-400/[.07] text-amber-300'}`}>{i===0?<ArrowLeftRight className="h-3 w-3"/>:i===1?<Sparkles className="h-3 w-3"/>:<PackageOpen className="h-3 w-3"/>}</span><div className="min-w-0"><p className="truncate text-[10px] font-bold text-slate-200">{tx.itemSnapshot.name}</p><p className="truncate text-[8px] text-slate-400">{tx.buyerName} comprou de {tx.sellerName}</p></div><span className="text-[7px] font-bold text-cyan-300">+{formatEconomicValue(tx.amount)} NXA</span></div>)}
            {transactions.length===0&&<p className="py-4 text-center text-[8px] text-slate-400">Nenhuma atividade recente.</p>}
          </div>
        </div>
      </div>

      <style>{`@keyframes nexaCardRail{from{transform:translateX(0)}to{transform:translateX(calc(-50% - .1875rem))}}`}</style>

      <footer className="flex min-h-[28px] items-center justify-between border-t border-cyan-400/10 px-2 font-mono text-[7px] font-semibold uppercase tracking-[.14em] text-slate-600">
        <span>© 2026 DESENVOLVIDO POR VINNY</span>
        <span className="flex items-center gap-2"><span>VERSÃO 0.3.1&nbsp; // &nbsp;REDE NEXUS ONLINE</span><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.9)]"/></span>
      </footer>

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
