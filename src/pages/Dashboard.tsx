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
      {/* Hero: Active Combat Hero + Quick Battle Launch */}
      <div className="relative rounded-[28px] overflow-hidden border border-cyan-500/25 bg-gradient-to-br from-[#0a0c14] via-[#0c0d18] to-[#090a10] p-5 sm:p-6 lg:p-7 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="absolute -top-40 right-10 w-[460px] h-[460px] bg-cyan-500/[0.08] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 items-center gap-6">
          {/* Left: Player status & CTAs */}
          <div className="space-y-4 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>CENTRAL DO PILOTO</span>
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-[0.95]">
              Bem-vindo, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">{user.username}</span>
            </h1>

            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              Escolha entre Rift Battle e Nexus Duel, evolua seu Piloto e fortaleça sua coleção na Rede Nexus.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1">
              <button onClick={() => onNavigate('games')} className="px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-heading font-black text-xs uppercase tracking-[0.12em] transition-all shadow-[0_0_28px_rgba(34,211,238,0.22)] flex items-center gap-2.5 hover:-translate-y-0.5"><Gamepad2 className="w-5 h-5" /><span>Escolher jogo</span></button>
              <button onClick={() => onNavigate('progression')} className="px-4 py-3 rounded-xl bg-white/[0.025] border border-white/10 text-slate-300 font-heading font-bold text-xs uppercase tracking-wider"><TrendingUp className="inline w-4 h-4 mr-2 text-purple-400" />Progressão</button>
            </div>
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-[24px] border border-cyan-500/25 bg-gradient-to-br from-[#0b1520] to-[#090b12] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-mono font-bold tracking-[.18em] text-cyan-400">JOGO 01</p><h2 className="mt-1 font-heading text-2xl font-black text-white">NEXA: RIFT BATTLE</h2></div><Swords className="w-7 h-7 text-cyan-400" /></div>
          <p className="mt-3 text-sm text-slate-400">Monte seu esquadrão e enfrente combates PvE. Suas partidas geram NEX, XP e alimentam a progressão do mesmo Piloto.</p>
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-mono"><span className="rounded-full border border-cyan-500/25 px-2.5 py-1 text-cyan-300">PvE</span><span className="rounded-full border border-white/10 px-2.5 py-1 text-slate-400">Esquadrão</span><span className="rounded-full border border-white/10 px-2.5 py-1 text-slate-400">Recompensas</span></div>
          <button onClick={() => onNavigate('play')} className="mt-5 w-full rounded-xl bg-cyan-500 px-4 py-3 font-heading text-xs font-black uppercase text-slate-950">Jogar Rift Battle</button>
        </section>
        <section className="rounded-[24px] border border-purple-500/25 bg-gradient-to-br from-[#160e22] to-[#090b12] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-mono font-bold tracking-[.18em] text-purple-400">JOGO 02</p><h2 className="mt-1 font-heading text-2xl font-black text-white">NEXA: NEXUS DUEL</h2></div><Trophy className="w-7 h-7 text-purple-400" /></div>
          <p className="mt-3 text-sm text-slate-400">Duelo estratégico 4×4 com Nexos, habilidades e blefe. Use sua coleção nos modos PvE ou PvP.</p>
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-mono"><span className="rounded-full border border-purple-500/25 px-2.5 py-1 text-purple-300">PvE + PvP</span><span className="rounded-full border border-white/10 px-2.5 py-1 text-slate-400">Deck 4×4</span><span className="rounded-full border border-white/10 px-2.5 py-1 text-slate-400">Nexos</span></div>
          <button onClick={() => onNavigate('arena')} className="mt-5 w-full rounded-xl bg-purple-600 px-4 py-3 font-heading text-xs font-black uppercase text-white">Jogar Nexus Duel</button>
        </section>
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
                  <span>ECONOMIA ONLINE V1</span>
                  <Shield className="w-4 h-4 text-purple-300" />
                </div>
                <span className="text-xs text-slate-400 font-mono block">Progressão permanente</span>
                <div className="mt-2">
                  <h4 className="font-heading font-bold text-white text-xs">
                    Nível e XP compartilhados nos jogos
                  </h4>
                  <span className="text-[10px] font-mono text-purple-300">
                    Recompensas econômicas vêm das atividades do jogo.
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-white/10 text-[10px] font-mono text-slate-400">
                Sem caixas ou moedas automáticas por level-up.
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
              {user.victories}V / {user.defeats}D na Arena
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
                onClick={() => setSelectedAsset(item)}
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
