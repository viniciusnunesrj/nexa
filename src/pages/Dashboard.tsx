import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import { Character, NexaAsset } from '../types';
import { RARITY_CONFIG } from '../config/designTokens';
import { RarityBadge } from '../components/common/RarityBadge';
import { AssetModal } from '../components/modals/AssetModal';
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
} from 'lucide-react';
import { ProgressionService } from '../services/progressionService';
import { LEVEL_REWARDS, getXpRequiredForLevel, MAX_GAME_LEVEL } from '../config/levelConfig';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { user, isFirstAccess, dismissFirstAccess } = useAuth();
  const {
    assets,
    transactions,
    marketStats,
    equipCharacter,
    listAsset,
    boxes,
    userPity,
  } = useGameState();

  const [selectedAsset, setSelectedAsset] = useState<NexaAsset | null>(null);
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

  const equippedChar =
    userCharacters.find((c) => c.isEquipped) ||
    userCharacters[0] ||
    null;

  const userItems = assets.filter((a) => a.ownerId === user.id);
  const myBoxes = boxes.filter((b) => b.ownerId === user.id);
  const hasUnopenedRecruitBox = myBoxes.some((b) => b.boxType === 'RECRUIT');
  const distinctGuardiansCards = new Set(
    assets
      .filter((a) => a.ownerId === user.id && a.type === 'Card' && (a as any).collectionId === 'guardians')
      .map((c) => c.name)
  ).size;
  const completedCollections = distinctGuardiansCards >= 4 ? 1 : 0;
  const totalCollections = 1;
  const pityCount = userPity?.premiumBoxPity || 0;
  const pityRemaining = Math.max(0, 5 - pityCount);

  const totalPower = userItems.reduce((acc, curr) => acc + ('power' in curr ? curr.power : 0), 0);
  const rareCount = userItems.filter((a) => ['Épico', 'Lendário', 'Mítico'].includes(a.rarity)).length;
  const winRate = user.victories + user.defeats > 0
    ? Math.round((user.victories / (user.victories + user.defeats)) * 100)
    : 0;

  // Level Progression & Next Rewards Calculation
  const currentLevel = user.level || 1;
  const currentExp = user.experience || 0;
  const maxExp = user.maxExperience || getXpRequiredForLevel(currentLevel);
  const xpPercent = Math.min(100, Math.round((currentExp / maxExp) * 100));

  const nextLevel = currentLevel + 1;
  const nextReward = LEVEL_REWARDS[nextLevel];
  const nextMilestone = [10, 20, 25, 30, 40, 50].find((lvl) => lvl > currentLevel) || 10;
  const milestoneReward = LEVEL_REWARDS[nextMilestone];

  return (
    <div className="space-y-8">
      {/* Hero: Active Combat Hero + Quick Battle Launch */}
      <div className="relative rounded-3xl overflow-hidden border border-cyan-500/30 bg-gradient-to-r from-[#0c0c16] via-[#10101f] to-[#0a0a12] p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Left: Player status & CTAs */}
          <div className="flex-1 space-y-4 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>PILOTO ATIVO DA ORDEM NEXA</span>
            </div>

            <h1 className="font-heading text-3xl sm:text-5xl font-black text-white tracking-tight leading-none">
              Bem-vindo, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">{user.username}</span>
            </h1>

            <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
              Jogue na Arena, evolua seu arsenal através da fusão quântica e negocie itens digitais exclusivos no marketplace P2P.
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                onClick={() => onNavigate('play')}
                className="px-6 py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center gap-2.5 hover:scale-105"
              >
                <Swords className="w-5 h-5" />
                <span>Batalhar na Arena</span>
              </button>

              <button
                onClick={() => onNavigate('boxes')}
                className="px-6 py-3.5 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-heading font-bold text-sm uppercase tracking-wider transition-all flex items-center gap-2"
              >
                <PackageOpen className="w-4 h-4 text-cyan-400" />
                <span>Caixas</span>
              </button>

              <button
                onClick={() => onNavigate('collections')}
                className="px-6 py-3.5 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/40 text-purple-300 font-heading font-bold text-sm uppercase tracking-wider transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Coleções</span>
              </button>

              <button
                onClick={() => onNavigate('marketplace')}
                className="px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-heading font-bold text-sm uppercase tracking-wider transition-all flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>Explorar Mercado</span>
              </button>
            </div>
          </div>

          {/* Right: Hero Character Showcase Card */}
          {equippedChar ? (
            <div
              onClick={() => setSelectedAsset(equippedChar)}
              className="w-full sm:w-80 rounded-2xl border border-cyan-500/50 bg-[#07070b]/90 p-4 backdrop-blur-xl shadow-[0_0_30px_rgba(6,182,212,0.2)] cursor-pointer hover:border-cyan-400 transition-all group"
            >
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3 bg-slate-950">
                <img
                  src={equippedChar.image}
                  alt={equippedChar.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2 left-2">
                  <RarityBadge rarity={equippedChar.rarity} size="sm" />
                </div>
                <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300">
                  Herói Equipado
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-heading font-bold text-white text-base truncate">
                    {equippedChar.name}
                  </h4>
                  <span className="text-xs font-mono text-slate-400">
                    Classe: {equippedChar.class}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-slate-500 block">PODER</span>
                  <span className="font-heading font-bold text-cyan-400 text-lg">
                    {equippedChar.power}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full sm:w-80 p-6 rounded-2xl border border-dashed border-white/20 text-center">
              <p className="text-xs text-slate-400 font-mono">Nenhum personagem equipado.</p>
              <button
                onClick={() => onNavigate('inventory')}
                className="mt-3 text-xs font-mono text-cyan-400 underline"
              >
                Abrir inventário e equipar
              </button>
            </div>
          )}
        </div>
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
                Você tem uma recompensa esperando!
              </h4>
              <p className="text-xs text-slate-300 font-mono">
                Sua Caixa de Recruta de Boas-Vindas está disponível. Abra para receber seu herói inicial, itens e NEX.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('boxes')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-heading font-black text-xs uppercase tracking-wider shadow-lg transition-all shrink-0 flex items-center gap-2 hover:scale-[1.02]"
          >
            <PackageOpen className="w-4 h-4" />
            <span>ABRIR RECOMPENSA</span>
          </button>
        </div>
      )}

      {/* Requirement 4: PROGRESSÃO & PRÓXIMO NÍVEL NO DASHBOARD */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-[#121028] via-[#0e0b1c] to-[#080812] border border-cyan-500/35 shadow-[0_0_35px_rgba(34,211,238,0.12)] relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Level & XP Progress Bar */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-mono font-bold uppercase tracking-wider">
                <Award className="w-3.5 h-3.5" />
                <span>PROGRESSÃO CENTRAL DO PILOTO</span>
              </div>
              <button
                onClick={() => onNavigate('progression')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                <span>Ver Trilha de Níveis Completa</span>
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

          {/* Right: Próximo Nível e Marco Épico (Level 10) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:w-[480px] shrink-0">
            {/* Próximo Nível Card */}
            <div className="p-4 rounded-2xl bg-[#0a0914] border border-cyan-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono uppercase text-cyan-400 font-bold mb-1">
                  <span>PRÓXIMO NÍVEL</span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40">Nv. {nextLevel}</span>
                </div>
                <span className="text-xs text-slate-400 font-mono block">Recompensa:</span>
                {nextReward ? (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xl">{nextReward.icon}</span>
                    <div className="min-w-0">
                      <h4 className="font-heading font-bold text-white text-xs truncate">
                        {nextReward.name}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400 line-clamp-1">
                        {nextReward.badge}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-mono text-emerald-400 mt-1">Nível máximo!</p>
                )}
              </div>
              <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>{nextReward?.description || 'Prestígio'}</span>
              </div>
            </div>

            {/* Marco Especial Nível 10 */}
            <div className="p-4 rounded-2xl bg-[#0d091a] border border-purple-500/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono uppercase text-purple-300 font-bold mb-1">
                  <span>MARCO ÉPICO</span>
                  <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-500/40">Nv. {nextMilestone}</span>
                </div>
                <span className="text-xs text-slate-400 font-mono block">Desbloqueio:</span>
                {milestoneReward ? (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xl">{milestoneReward.icon}</span>
                    <div className="min-w-0">
                      <h4 className="font-heading font-bold text-white text-xs truncate">
                        {milestoneReward.name}
                      </h4>
                      <span className="text-[10px] font-mono text-purple-300 line-clamp-1">
                        {milestoneReward.badge}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-mono text-emerald-400 mt-1">Concluído!</p>
                )}
              </div>
              <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-purple-300">
                <span>{currentLevel >= nextMilestone ? '✓ Conquistado' : `Faltam ${nextMilestone - currentLevel} níveis`}</span>
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
                <span>🎁 CAIXAS</span>
              </div>
              <h3 className="font-heading text-xl sm:text-2xl font-black text-white mt-2">
                Você possui {myBoxes.length} {myBoxes.length === 1 ? 'caixa' : 'caixas'}
              </h3>
              <p className="text-xs font-mono text-slate-400">
                {pityRemaining === 1
                  ? 'Garantia Pity ativa: Épico+ na próxima abertura!'
                  : `Sistema Pity: ${pityRemaining} caixas restantes para Épico+`}
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
                <span>🏆 COLEÇÕES</span>
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
              Recompensa: Caixa Especial + 1.500 NEX
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0b0b12] border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Poder Total da Frota</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-3">
            <span className="font-heading text-3xl font-black text-cyan-300">
              {totalPower.toLocaleString()}
            </span>
            <span className="text-[11px] font-mono text-slate-500 block mt-0.5">
              Distribuído em {userItems.length} ativos
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0b0b12] border border-white/10 flex flex-col justify-between">
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

        <div className="p-5 rounded-2xl bg-[#0b0b12] border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Ativos Raros+</span>
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

        <div className="p-5 rounded-2xl bg-[#0b0b12] border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-mono uppercase">Volume do Mercado</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <span className="font-heading text-3xl font-black text-amber-400">
              {marketStats.totalVolumeNXA.toLocaleString()}
            </span>
            <span className="text-[11px] font-mono text-slate-500 block mt-0.5">
              Tokens NXA transacionados
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
                Seu Arsenal Recente
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Seus itens e personagens ativos para combate e negociação
              </p>
            </div>
            <button
              onClick={() => onNavigate('inventory')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>Ver Todos ({userItems.length})</span>
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
                  <img
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
                    <span className="text-cyan-400 font-bold">{item.power} PWR</span>
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
                <span>Atividade de Mercado</span>
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
                      +{tx.amount} NXA
                    </span>
                    <span className="text-[9px] text-slate-500">
                      Taxa: {tx.fee} NXA
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
            Abrir Marketplace P2P
          </button>
        </div>
      </div>

      {/* Asset Inspection Modal */}
      <AssetModal
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        isOwner={selectedAsset?.ownerId === user.id}
        onEquip={(id) => equipCharacter(id)}
        onSell={(asset) => setSellingAsset(asset)}
        onTrade={(asset) => setTradingAsset(asset)}
      />

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
