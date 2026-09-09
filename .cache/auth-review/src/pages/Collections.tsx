import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import { Card, CardTemplate, Rarity } from '../types';
import { CollectionService, CollectionProgress } from '../services/collectionService';
import { EconomyService } from '../services/economyService';
import { CardFragmentService } from '../services/cardFragmentService';
import { COLLECTIONS_DATA } from '../config/collectionsData';
import { RARITY_CONFIG } from '../config/designTokens';
import { RarityBadge } from '../components/common/RarityBadge';
import { soundService } from '../services/soundService';
import {
  Layers,
  Lock,
  Sparkles,
  Flame,
  Zap,
  Coins,
  PackageOpen,
  Award,
  ArrowRight,
  Hammer,
  Play,
  Pause,
  Clock,
  Tag,
  CheckCircle2,
  TrendingUp,
  X,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

interface CollectionsPageProps {
  onNavigate: (page: string) => void;
}

export const Collections: React.FC<CollectionsPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const {
    cards,
    cardFragments,
    isClaimingSynthesis,
    synthesizeCard,
    claimCardSynthesis,
    stopCardSynthesis,
    advanceCardTime,
    claimCollectionReward,
    craftCardWithFragments,
    listAsset,
    unlockedSlots,
    activeSynthesizingCardsCount,
  } = useGameState();

  // Selected collection ID (default: "guardians")
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('guardians');
  // Sell Modal State
  const [sellingCard, setSellingCard] = useState<Card | null>(null);
  const [sellPrice, setSellPrice] = useState<number>(500);
  const [sellError, setSellError] = useState<string | null>(null);

  // Claim (Withdrawal & Destruction) Modal State
  const [claimModalCard, setClaimModalCard] = useState<Card | null>(null);

  // Auto-refresh timer to update real-time NEX synthesis accumulation
  const [, setTick] = useState<number>(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Compute progress for the active collection
  const activeProgress: CollectionProgress = CollectionService.getCollectionProgress(
    user.id,
    selectedCollectionId,
    cards
  );

  // Global metrics across all collections
  const totalCardsInGame = COLLECTIONS_DATA.reduce((acc, c) => acc + c.cardTemplates.length, 0);
  const totalUniqueCardsOwned = COLLECTIONS_DATA.reduce((acc, col) => {
    const p = CollectionService.getCollectionProgress(user.id, col.id, cards);
    return acc + p.ownedCount;
  }, 0);

  const isRewardClaimed = activeProgress.rewardClaimed;
  const isComplete = activeProgress.isComplete;

  // Handle marketplace listing
  const handleConfirmListing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellingCard) return;

    if (sellPrice <= 0 || isNaN(sellPrice)) {
      setSellError('O preço deve ser superior a 0.');
      return;
    }

    try {
      listAsset(sellingCard.id, sellPrice);
      soundService.playSuccess();
      setSellingCard(null);
    } catch (err: any) {
      setSellError(err.message || 'Erro ao listar carta no marketplace.');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. BANNER / HEADER DA COLEÇÃO ATIVA                                      */}
      {/* ========================================================================= */}
      <div className="relative rounded-3xl overflow-hidden border border-purple-500/30 bg-gradient-to-r from-[#0d091a] via-[#140f28] to-[#0a0714] p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-mono font-bold uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              <span>SISTEMA DE ÁLBUNS & COLEÇÕES NEXA</span>
            </div>

            <h1 className="font-heading text-3xl sm:text-5xl font-black text-white tracking-tight flex items-center gap-3">
              <span>{activeProgress.collection.name}</span>
            </h1>

            <p className="text-slate-300 text-sm leading-relaxed">
              {activeProgress.collection.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 font-mono text-xs">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-slate-300">
                <span className="text-slate-500">Progresso da Coleção:</span>
                <span className="font-bold text-cyan-400">
                  {activeProgress.ownedCount} / {activeProgress.totalCards} ({activeProgress.percentage}%)
                </span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-slate-300">
                <span className="text-slate-500">Álbum Geral:</span>
                <span className="font-bold text-purple-300">
                  {totalUniqueCardsOwned} / {totalCardsInGame} Cartas Desbloqueadas
                </span>
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-cyan-500/30 text-slate-300">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-500">Slots de Síntese:</span>
                <span className="font-bold text-cyan-300">
                  {activeSynthesizingCardsCount} / {unlockedSlots} Ativos
                </span>
              </div>
            </div>
          </div>

          {/* REWARD CARD FOR 100% COMPLETION */}
          <div className="w-full lg:w-80 rounded-2xl bg-black/60 border border-purple-500/40 p-5 space-y-4 shadow-xl shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase font-bold text-purple-300 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                Recompensa 100%
              </span>
              {isRewardClaimed && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold">
                  RESGATADA
                </span>
              )}
            </div>

            <div className="space-y-1">
              <h4 className="font-heading text-lg font-black text-white">
                {activeProgress.collection.rewardBoxName}
              </h4>
              <p className="text-xs text-slate-400">
                {activeProgress.collection.rewardDetails}
              </p>
            </div>

            {/* Progress bar in reward box */}
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-slate-900 overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${activeProgress.percentage}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>{activeProgress.ownedCount} de {activeProgress.totalCards} cartas</span>
                <span>{activeProgress.percentage}%</span>
              </div>
            </div>

            <button
              onClick={() => claimCollectionReward(activeProgress.collection.id)}
              disabled={!isComplete || isRewardClaimed}
              className={`w-full py-2.5 rounded-xl font-heading text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                isRewardClaimed
                  ? 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
                  : isComplete
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/25 animate-pulse'
                  : 'bg-white/5 border border-white/10 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isRewardClaimed ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Recompensa Resgatada</span>
                </>
              ) : isComplete ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Resgatar Recompensa</span>
                </>
              ) : (
                <span>Complete 100% para Resgatar</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SELETOR DE TODAS AS 8 COLEÇÕES                                        */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span>Coleções da Temporada (8 Álbuns)</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            {COLLECTIONS_DATA.length} Coleções • 60 Cartas
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {COLLECTIONS_DATA.map((col) => {
            const p = CollectionService.getCollectionProgress(user.id, col.id, cards);
            const isSelected = col.id === selectedCollectionId;

            return (
              <button
                key={col.id}
                onClick={() => setSelectedCollectionId(col.id)}
                className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-purple-950/40 border-purple-400/80 shadow-lg shadow-purple-500/20 scale-[1.02]'
                    : 'bg-[#0e0e1a] border-white/10 hover:border-white/20 hover:bg-[#141424]'
                }`}
              >
                <div>
                  <span className="text-xl block mb-1">{col.themeIcon}</span>
                  <h4 className="font-heading text-xs font-bold text-white truncate">
                    {col.name}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                    {p.ownedCount}/{p.totalCards} cartas
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-white/5 w-full">
                  <div className="h-1.5 rounded-full bg-black/60 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        p.isComplete ? 'bg-emerald-400' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${p.percentage}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. GRID DO ÁLBUM DE CARTAS DA COLEÇÃO ATIVA                               */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-xl font-bold text-white">
              Álbum: {activeProgress.collection.name} ({activeProgress.ownedCount}/{activeProgress.totalCards})
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Todas as cartas geram NEX ativamente quando em estado sintetizado.
            </p>
          </div>

          <button
            onClick={() => onNavigate('boxes')}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-500/30 px-3.5 py-2 rounded-xl transition-all"
          >
            <PackageOpen className="w-4 h-4" />
            <span>Adquirir Caixas de Coleção</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {activeProgress.templatesStatus.map(({ template, isOwned, ownedCard }) => {
            const rarityStyle = RARITY_CONFIG[template.rarity];
            const fragCount = CardFragmentService.getFragmentCount(user.id, template.templateId);
            const canCraft = fragCount >= 100 && !isOwned;

            // Normalized card synthesis state
            const card = ownedCard ? EconomyService.normalizeCardSynthesis(ownedCard) : null;
            const cardState = card ? (card.state || card.cardStatus || 'FREE') : 'FREE';
            const isSynthesizing = cardState === 'ACTIVE';
            const isExhausted = cardState === 'EXHAUSTED';

            const prod = card
              ? EconomyService.getInstantSynthesisProduction(card)
              : { accumulatedNex: 0, isExhausted: false, state: 'FREE' as const };
            const accumulatedNEX = prod.accumulatedNex;
            const effectiveExhausted = isExhausted || prod.isExhausted;
            const rate = card ? card.synthesisRate : (template.synthesisRate || 8);
            const cap = card ? card.synthesisCap : (template.synthesisCap || 1000);
            const progressPercent = Math.min(100, (accumulatedNEX / (cap || 1)) * 100);

            return (
              <div
                key={template.templateId}
                className={`rounded-3xl border overflow-hidden transition-all flex flex-col justify-between ${
                  isOwned
                    ? 'bg-[#0f1022] border-white/15 hover:border-cyan-500/50 shadow-xl'
                    : 'bg-[#0a0a14] border-white/5 opacity-80'
                }`}
              >
                {/* Visual Card Image */}
                <div className="relative aspect-[3/4] overflow-hidden bg-slate-950 group">
                  <img
                    src={template.image}
                    alt={template.name}
                    className={`w-full h-full object-cover transition-transform duration-500 ${
                      isOwned ? 'group-hover:scale-105' : 'grayscale contrast-125 brightness-50'
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f1022] via-transparent to-transparent" />

                  {/* Element & Rarity Header */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-xs font-mono font-bold flex items-center gap-1.5 text-white">
                      <span>{template.elementIcon}</span>
                      <span className="text-[10px] uppercase text-slate-300">{template.element}</span>
                    </span>
                    <RarityBadge rarity={template.rarity} size="xs" />
                  </div>

                  {/* Lock Overlay if unowned */}
                  {!isOwned && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 text-center space-y-2">
                      <div className="p-3 rounded-2xl bg-black/80 border border-white/10 text-slate-400">
                        <Lock className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                        Não Adquirida
                      </span>
                      <span className="text-[11px] font-mono text-cyan-400">
                        {fragCount} / 100 Fragmentos
                      </span>
                    </div>
                  )}

                  {/* Synthesis Badge Overlays */}
                  {isOwned && card && (
                    <>
                      {effectiveExhausted ? (
                        <div className="absolute bottom-3 left-3 right-3 p-2 rounded-xl bg-amber-950/90 border border-amber-500/50 backdrop-blur-md flex items-center justify-between text-xs font-mono">
                          <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                            Produção Esgotada
                          </span>
                          <span className="text-amber-200 font-bold">
                            {accumulatedNEX.toFixed(2)} NEX
                          </span>
                        </div>
                      ) : isSynthesizing ? (
                        <div className="absolute bottom-3 left-3 right-3 p-2 rounded-xl bg-emerald-950/90 border border-emerald-500/50 backdrop-blur-md flex items-center justify-between text-xs font-mono">
                          <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
                            <Zap className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                            Sintetizando
                          </span>
                          <span className="text-amber-300 font-bold">
                            +{accumulatedNEX.toFixed(2)} NEX
                          </span>
                        </div>
                      ) : (
                        <div className="absolute bottom-3 left-3 right-3 p-1.5 rounded-xl bg-black/70 border border-white/10 backdrop-blur-md flex items-center justify-between text-[11px] font-mono">
                          <span className="flex items-center gap-1.5 text-slate-300">
                            <span className="w-2 h-2 rounded-full bg-cyan-400" />
                            Carta Livre
                          </span>
                          <span className="text-cyan-400 font-bold">Pronta</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Card Information & Controls */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-heading text-lg font-black text-white truncate">
                      {template.name}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {template.description}
                    </p>
                  </div>

                  {/* Production Stats */}
                  <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Taxa de Geração:</span>
                      <span className="font-bold text-cyan-400">+{rate} NEX/h</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>NEX Acumulado:</span>
                      <span className={`font-bold ${accumulatedNEX > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                        {accumulatedNEX.toFixed(2)} NEX
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Capacidade Máxima:</span>
                      <span className="font-bold text-slate-200">{cap.toLocaleString()} NEX</span>
                    </div>

                    {/* Progress to Cap */}
                    <div className="pt-1">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>Progresso do Teto:</span>
                        <span>{progressPercent.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            effectiveExhausted
                              ? 'bg-amber-400'
                              : isSynthesizing
                              ? 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                              : 'bg-cyan-500/50'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                      <span className="text-slate-500">Estado:</span>
                      {cardState === 'FREE' ? (
                        <span className="font-bold text-cyan-400">Livre</span>
                      ) : effectiveExhausted ? (
                        <span className="font-bold text-amber-400">Esgotada (Teto)</span>
                      ) : (
                        <span className="font-bold text-emerald-400 animate-pulse">Sintetizando</span>
                      )}
                    </div>
                  </div>

                  {/* Interactive Action Area */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    {isOwned && card ? (
                      <>
                        {effectiveExhausted || isSynthesizing ? (
                          <div className="space-y-2">
                            <button
                              onClick={() => setClaimModalCard(card)}
                              disabled={accumulatedNEX <= 0 || isClaimingSynthesis}
                              className={`w-full py-2.5 rounded-xl font-heading text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                                accumulatedNEX > 0 && !isClaimingSynthesis
                                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/25'
                                  : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              <Coins className="w-3.5 h-3.5" />
                              <span>Sacar {accumulatedNEX.toFixed(2)} NEX</span>
                            </button>

                            <p className="text-[10px] font-mono text-center text-red-400 font-bold">
                              ⚠️ Sacar DESTRÓI a carta permanentemente
                            </p>

                            {/* Testing Advance Time Buttons */}
                            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-white/5">
                              <span className="text-[10px] font-mono text-slate-500">Avanço rápido:</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => advanceCardTime(card.id, 1)}
                                  title="Simular avanço de 1 hora"
                                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-slate-300 hover:text-cyan-300 transition-colors"
                                >
                                  +1h
                                </button>
                                <button
                                  type="button"
                                  onClick={() => advanceCardTime(card.id, 6)}
                                  title="Simular avanço de 6 horas"
                                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-slate-300 hover:text-cyan-300 transition-colors"
                                >
                                  +6h
                                </button>
                                <button
                                  type="button"
                                  onClick={() => advanceCardTime(card.id, 24)}
                                  title="Simular avanço de 24 horas"
                                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-slate-300 hover:text-cyan-300 transition-colors"
                                >
                                  +24h
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <button
                              onClick={() => synthesizeCard(card.id)}
                              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20"
                            >
                              <Zap className="w-3.5 h-3.5 fill-current" />
                              <span>Sintetizar Carta</span>
                            </button>

                            {cardState === 'FREE' && (
                              <button
                                onClick={() => setSellingCard(card)}
                                className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-[11px] font-mono transition-colors flex items-center justify-center gap-1.5"
                              >
                                <Tag className="w-3 h-3 text-cyan-400" />
                                <span>Vender no Marketplace</span>
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        {canCraft ? (
                          <button
                            onClick={() => craftCardWithFragments(template.templateId)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-heading text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-purple-500/20"
                          >
                            <Hammer className="w-3.5 h-3.5" />
                            <span>Forjar Carta (100 Frag.)</span>
                          </button>
                        ) : (
                          <div className="text-center p-2 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-slate-500">
                            Obtível em Caixas de Coleção
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL DE VENDA NO MARKETPLACE                                          */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {sellingCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#0f1020] border border-cyan-500/30 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-heading text-lg font-black text-white">
                    Vender Carta no Marketplace
                  </h3>
                </div>
                <button
                  onClick={() => setSellingCard(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-2xl bg-black/40 border border-white/10">
                <img
                  src={sellingCard.image}
                  alt={sellingCard.name}
                  className="w-16 h-20 rounded-xl object-cover border border-white/10"
                />
                <div>
                  <h4 className="font-heading font-black text-white text-base">
                    {sellingCard.name}
                  </h4>
                  <RarityBadge rarity={sellingCard.rarity} size="xs" />
                  <p className="text-[11px] font-mono text-cyan-400 mt-1">
                    +{sellingCard.synthesisRate || 8} NEX/h de taxa base
                  </p>
                </div>
              </div>

              {sellError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{sellError}</span>
                </div>
              )}

              <form onSubmit={handleConfirmListing} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-300 block">
                    Preço de Venda:
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white font-mono font-bold text-sm focus:outline-none focus:border-cyan-400 pr-16"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-amber-400">
                      NEX
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 block">
                    O ativo será anunciado publicamente no Marketplace NEXA.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSellingCard(null)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/25 transition-all"
                  >
                    Confirmar Anúncio
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 5. MODAL DE CONFIRMAÇÃO DE SAQUE & DESTRUIÇÃO                             */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {claimModalCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#0f1020] border border-red-500/40 rounded-3xl p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-red-400" />
                  <h3 className="font-heading text-lg font-black text-white">
                    Confirmar Saque & Destruição
                  </h3>
                </div>
                <button
                  onClick={() => setClaimModalCard(null)}
                  disabled={isClaimingSynthesis}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* High-visibility Warning Notice */}
              <div className="p-4 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Atenção: Ação Permanente</span>
                </div>
                <p className="leading-relaxed">
                  Ao confirmar o saque, o montante acumulado será creditado diretamente no seu saldo e <strong className="text-white">a carta será DESTRUÍDA permanentemente</strong> do seu inventário. Esta operação não pode ser desfeita.
                </p>
              </div>

              {/* Card & Reward Details */}
              <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-black/50 border border-white/10">
                <img
                  src={claimModalCard.image}
                  alt={claimModalCard.name}
                  className="w-16 h-20 rounded-xl object-cover border border-white/10 shrink-0"
                />
                <div className="space-y-1 overflow-hidden">
                  <h4 className="font-heading font-black text-white text-base truncate">
                    {claimModalCard.name}
                  </h4>
                  <RarityBadge rarity={claimModalCard.rarity} size="xs" />
                  <div className="text-sm font-mono text-amber-300 font-bold flex items-center gap-1.5 pt-1">
                    <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      +
                      {EconomyService.calculateAccumulatedNEX(claimModalCard).toFixed(2)}{' '}
                      NEX
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isClaimingSynthesis}
                  onClick={() => setClaimModalCard(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isClaimingSynthesis}
                  onClick={() => {
                    if (!claimModalCard) return;
                    claimCardSynthesis(claimModalCard.id);
                    setClaimModalCard(null);
                  }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 transition-all flex items-center gap-1.5"
                >
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  <span>{isClaimingSynthesis ? 'Processando...' : 'Confirmar e Destruir'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
