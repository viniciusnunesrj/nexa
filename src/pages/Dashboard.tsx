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
    <div className="space-y-5 sm:space-y-6">
      {/* Portal hero + primary games */}
      <section className="relative overflow-hidden rounded-[30px] border border-cyan-400/20 bg-[#070b12] shadow-[0_30px_100px_rgba(0,0,0,.38)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(34,211,238,.14),transparent_32%),radial-gradient(circle_at_18%_85%,rgba(139,92,246,.12),transparent_34%)]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.08fr_.92fr] lg:p-10">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/[.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.2em] text-cyan-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,.9)]" />
              Rede Nexus online
            </div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[.24em] text-slate-500">Central do Piloto · Nível {currentLevel}</p>
            <h1 className="mt-2 max-w-2xl font-heading text-4xl font-black leading-[.94] tracking-[-.035em] text-white sm:text-5xl lg:text-6xl">
              PRONTO PARA A <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-violet-400">PRÓXIMA BATALHA?</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
              Bem-vindo, <strong className="text-white">{user.username}</strong>. Sua coleção, seu nível e suas recompensas avançam com você. Escolha seu próximo desafio na Rede Nexus.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => onNavigate('riftbattle-v2')} className="group inline-flex items-center gap-3 rounded-xl bg-cyan-300 px-5 py-3.5 font-heading text-xs font-black uppercase tracking-[.12em] text-[#031017] shadow-[0_0_35px_rgba(34,211,238,.2)] transition hover:-translate-y-0.5 hover:bg-cyan-200">
                <Swords className="h-4 w-4" /> Jogar Rift Battle <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button onClick={() => onNavigate('arena')} className="inline-flex items-center gap-3 rounded-xl border border-violet-400/30 bg-violet-400/[.07] px-5 py-3.5 font-heading text-xs font-black uppercase tracking-[.12em] text-violet-200 transition hover:-translate-y-0.5 hover:bg-violet-400/[.13]">
                <Zap className="h-4 w-4" /> Nexus Duel
              </button>
            </div>
            <div className="mt-7 grid max-w-xl grid-cols-3 gap-2 border-t border-white/[.07] pt-5">
              <div><p className="font-heading text-xl font-black text-white">{userCards.length}</p><p className="text-[9px] uppercase tracking-[.14em] text-slate-500">Cartas no inventário</p></div>
              <div><p className="font-heading text-xl font-black text-cyan-300">{currentLevel}</p><p className="text-[9px] uppercase tracking-[.14em] text-slate-500">Nível do piloto</p></div>
              <div><p className="font-heading text-xl font-black text-violet-300">{Math.max(0, maxExp - currentExp)}</p><p className="text-[9px] uppercase tracking-[.14em] text-slate-500">XP até o próximo nível</p></div>
            </div>
          </div>

          <div className="relative min-h-[310px] overflow-hidden rounded-[26px] border border-cyan-400/20 bg-gradient-to-br from-cyan-400/[.08] via-[#09111c] to-violet-500/[.08] p-5">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full border border-cyan-300/10" />
            <div className="absolute -right-5 -top-5 h-36 w-36 rounded-full border border-cyan-300/10" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[.07] px-3 py-1 text-[9px] font-black uppercase tracking-[.16em] text-emerald-300">Disponível</span>
                <span className="font-mono text-[9px] uppercase tracking-[.2em] text-cyan-400">Rift Battle V2</span>
              </div>
              <div className="py-7">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/[.08] shadow-[0_0_40px_rgba(34,211,238,.12)]"><Swords className="h-8 w-8 text-cyan-300" /></div>
                <h2 className="font-heading text-3xl font-black uppercase text-white">Rift Battle</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">Seu modo principal de combate PvE. Escolha entre arenas 2×2, 3×3 e 4×4 e avance com recompensas ligadas à sua conta.</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['2×2 · 3×3 · 4×4', 'NEX + NXA', 'XP compartilhado'].map((label) => <div key={label} className="rounded-xl border border-white/[.07] bg-black/20 px-2 py-2.5 text-center text-[9px] font-bold uppercase tracking-wide text-slate-300">{label}</div>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <button onClick={() => onNavigate('riftbattle-v2')} className="group relative overflow-hidden rounded-[24px] border border-cyan-400/20 bg-[#09121b] p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/40 sm:p-6">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-cyan-400/[.07] to-transparent" />
          <div className="relative flex items-start justify-between gap-5"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-cyan-400">Jogo principal</p><h3 className="mt-2 font-heading text-2xl font-black text-white">RIFT BATTLE V2</h3><p className="mt-2 max-w-xl text-xs leading-5 text-slate-400">Escolha a arena, forme seu esquadrão e avance por batalhas com recompensas autoritativas.</p></div><div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[.07] p-3 text-cyan-300"><Swords className="h-6 w-6" /></div></div>
          <div className="relative mt-5 flex items-center justify-between border-t border-white/[.07] pt-4"><span className="text-[10px] font-mono uppercase text-slate-500">2×2 · 3×3 · 4×4</span><span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-cyan-300">Entrar no Rift <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></div>
        </button>
        <button onClick={() => onNavigate('arena')} className="group relative overflow-hidden rounded-[24px] border border-violet-400/20 bg-[#100c18] p-5 text-left transition hover:-translate-y-0.5 hover:border-violet-300/40 sm:p-6">
          <div className="relative flex items-start justify-between gap-5"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-violet-400">Duelo estratégico</p><h3 className="mt-2 font-heading text-2xl font-black text-white">NEXUS DUEL</h3><p className="mt-2 text-xs leading-5 text-slate-400">Deck 4×4, Nexos, habilidades e blefe em PvE ou PvP.</p></div><Trophy className="h-7 w-7 text-violet-300" /></div>
          <div className="relative mt-5 flex items-center justify-between border-t border-white/[.07] pt-4"><span className="text-[10px] font-mono uppercase text-slate-500">PvE · PvP · 4×4</span><span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-violet-300">Entrar no duelo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></div>
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
      <div className="p-5 sm:p-6 rounded-[26px] bg-gradient-to-br from-[#0d0e1b] via-[#0b0b15] to-[#08090f] border border-cyan-500/20 shadow-[0_20px_60px_rgba(0,0,0,0.22)] relative overflow-hidden">
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
              <h2 className="font-heading text-3xl sm:text-4xl font-black text-white tracking-tight">
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

      {/* Requirement 20: Cards for CAIXAS and COLEÇÕES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 🎁 CAIXAS */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#121024] to-[#0d0d1a] border border-cyan-500/30 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                <PackageOpen className="w-3.5 h-3.5" />
                <span>CAIXAS</span>
              </div>
              <h3 className="font-heading text-xl sm:text-2xl font-black text-white mt-2">
                Você possui {myBoxes.length} {myBoxes.length === 1 ? 'caixa' : 'caixas'}
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Adquira e abra caixas para expandir seu arsenal de cartas.
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <PackageOpen className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">
              {myBoxes.filter((b) => b.boxType === 'RECRUIT').length > 0 ? 'Recruta disponível' : 'Básica, Guardiões ou Premium'}
            </span>
            <button
              onClick={() => onNavigate('boxes')}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-2 hover:scale-[1.02]"
            >
              <span>ABRIR CAIXAS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 🏆 COLEÇÕES */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1b102b] to-[#0f0d1a] border border-purple-500/30 flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 text-[10px] font-mono font-bold uppercase tracking-wider">
                <Trophy className="w-3.5 h-3.5" />
                <span>COLEÇÕES</span>
              </div>
              <h3 className="font-heading text-xl sm:text-2xl font-black text-white mt-2">
                {completedCollections}/{totalCollections} coleções completas
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Os Quatro Guardiões: {distinctGuardiansCards}/4 cartas desbloqueadas
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">
              Complete coleções e acompanhe seu progresso no álbum
            </span>
            <button
              onClick={() => onNavigate('collections')}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] flex items-center gap-2 hover:scale-[1.02]"
            >
              <span>VER COLEÇÕES</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-[#0a0b10] border border-white/[0.07] flex flex-col justify-between hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Poder do Arsenal</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <span className="font-heading text-3xl font-black text-cyan-300">
              {totalPower === null ? 'Indisponível' : totalPower.toLocaleString('pt-BR')}
            </span>
            <span className="text-[11px] font-mono text-slate-500 block mt-0.5">
              {cardPowers.length} cartas no inventário
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0a0b10] border border-white/[0.07] flex flex-col justify-between hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Taxa de Vitória</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <span className="font-heading text-3xl font-black text-emerald-400">
              {winRate}%
            </span>
            <span className="text-[11px] font-mono text-slate-500 block mt-0.5">
              {user.victories}V / {user.defeats}D no Rift Battle
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0a0b10] border border-white/[0.07] flex flex-col justify-between hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Raridade Alta</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3">
            <span className="font-heading text-3xl font-black text-purple-400">
              {rareCount}
            </span>
            <span className="text-[11px] font-mono text-slate-500 block mt-0.5">
              Épicos, Lendários e Míticos
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0a0b10] border border-white/[0.07] flex flex-col justify-between hover:border-white/10 transition-colors">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Volume do Mercado</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <span className="font-heading text-3xl font-black text-amber-400">
              {formatEconomicValue(marketStats.totalVolumeNXA)}
            </span>
            <span className="text-[11px] font-mono text-slate-500 block mt-0.5">
              NXA movimentados no mercado
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Arsenal Quick Access & Recent Economic Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: My Quick Arsenal */}
        <div className="lg:col-span-2 rounded-2xl bg-[#0b0b12] border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading text-xl font-bold text-white">
                Arsenal Recente
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Acesso rápido aos seus ativos mais recentes
              </p>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>Ver inventário ({userItems.length})</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {userItems.slice(0, 6).map((item) => (
              <div
                key={item.id}
                onClick={() => onNavigate('inventory')}
                className="group p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/40 transition-all cursor-pointer flex flex-col justify-between gap-2"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-slate-950 relative">
                  <CardImage asset={item}
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-1.5 left-1.5">
                    <RarityBadge rarity={item.rarity} size="sm" showDot={false} />
                  </div>
                </div>
                <div>
                  <h5 className="font-heading font-bold text-xs text-slate-100 truncate group-hover:text-cyan-300">
                    {item.name}
                  </h5>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
                    <span>{item.type}</span>
                    <span className="text-cyan-400 font-bold">{item.type === 'Card' ? getCardPower(item)?.toLocaleString('pt-BR') ?? 'Indisponível' : item.power} PWR</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Live Market Activity */}
        <div className="rounded-2xl bg-[#0b0b12] border border-white/10 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                <span>Pulso do Mercado</span>
              </h3>
              <button
                onClick={() => onNavigate('history')}
                className="text-xs font-mono text-slate-400 hover:text-white"
              >
                Histórico
              </button>
            </div>

            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-3 text-xs font-mono"
                >
                  <div className="min-w-0">
                    <span className="text-slate-200 font-bold block truncate">
                      {tx.itemSnapshot.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {tx.buyerName} comprou de {tx.sellerName}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-cyan-400 block">
                      +{formatEconomicValue(tx.amount)} NXA
                    </span>
                    <span className="text-[9px] text-slate-500">
                      Taxa: {formatEconomicValue(tx.fee)} NXA
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => onNavigate('marketplace')}
            className="w-full mt-4 py-2.5 rounded-xl bg-white/5 hover:bg-cyan-950/40 border border-white/10 hover:border-cyan-500/30 text-xs font-mono font-bold text-cyan-300 transition-colors text-center"
          >
            Acessar Mercado
          </button>
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
