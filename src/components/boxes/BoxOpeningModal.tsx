import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { BoxRewardSummary, Rarity, NexaAsset } from '../../types';
import { BOX_DEFINITIONS } from '../../config/boxRates';
import { GUARDIANS_TEMPLATES } from '../../config/collectionsData';
import { RARITY_CONFIG } from '../../config/designTokens';
import { RarityBadge } from '../common/RarityBadge';
import { soundService } from '../../services/soundService';
import {
  Sparkles,
  PackageOpen,
  CheckCircle2,
  ChevronRight,
  Flame,
  Zap,
  Coins,
  Shield,
  Layers,
  Repeat,
  ArrowDown,
  ArrowUp,
  Award,
} from 'lucide-react';

interface BoxOpeningModalProps {
  summary: BoxRewardSummary;
  onClose: () => void;
  onOpenAnother?: () => void;
  hasMoreBoxes?: boolean;
}

interface RouletteItem {
  id: string;
  name: string;
  rarity: Rarity;
  image: string;
  elementIcon?: string;
  isWinner?: boolean;
}

type Stage = 'SPINNING' | 'WINNER_HIGHLIGHT' | 'REVEALED';

const TARGET_INDEX = 30; // The predetermined winner will be at this exact position
const CARD_WIDTH = 130; // Width of each roulette card in px
const CARD_GAP = 12; // Gap between cards in px
const STEP = CARD_WIDTH + CARD_GAP; // 142px per item

export const BoxOpeningModal: React.FC<BoxOpeningModalProps> = ({
  summary,
  onClose,
  onOpenAnother,
  hasMoreBoxes = false,
}) => {
  const [stage, setStage] = useState<Stage>('SPINNING');
  const [translateX, setTranslateX] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const def = BOX_DEFINITIONS[summary.boxType];

  // Determine the primary winning asset
  const winningAsset: NexaAsset = useMemo(() => {
    if (summary.cards && summary.cards.length > 0) return summary.cards[0];
    if (summary.characters && summary.characters.length > 0) return summary.characters[0];
    if (summary.assets && summary.assets.length > 0) return summary.assets[0];
    if (summary.items && summary.items.length > 0) return summary.items[0];
    return {
      id: 'fallback',
      name: 'Ativo Quântico',
      rarity: summary.highestRarity,
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      description: 'Recompensa especial do sistema NEXA.',
      tradeable: true,
      ownerId: 'user',
      ownerName: 'Piloto',
      marketValue: 100,
      type: 'Item',
    };
  }, [summary]);

  const winningRarity = winningAsset.rarity || summary.highestRarity || 'Comum';
  const rarityColor = RARITY_CONFIG[winningRarity]?.color || '#06b6d4';
  const rarityGlow = RARITY_CONFIG[winningRarity]?.bgGlow || 'rgba(6,182,212,0.4)';

  // Build the 45-card roulette tape with predetermined winning card at TARGET_INDEX
  const rouletteTape = useMemo<RouletteItem[]>(() => {
    const dummyPool: RouletteItem[] = [
      {
        id: 'd-flame',
        name: 'Guardião da Chama',
        rarity: 'Incomum',
        image: GUARDIANS_TEMPLATES[0].image,
        elementIcon: '🔥',
      },
      {
        id: 'd-ice',
        name: 'Guardião do Gelo',
        rarity: 'Raro',
        image: GUARDIANS_TEMPLATES[1].image,
        elementIcon: '❄️',
      },
      {
        id: 'd-storm',
        name: 'Guardião da Tempestade',
        rarity: 'Épico',
        image: GUARDIANS_TEMPLATES[2].image,
        elementIcon: '⚡',
      },
      {
        id: 'd-abyss',
        name: 'Guardião do Abismo',
        rarity: 'Lendário',
        image: GUARDIANS_TEMPLATES[3].image,
        elementIcon: '🌑',
      },
      {
        id: 'd-cyber',
        name: 'Blade Quântica',
        rarity: 'Raro',
        image: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&auto=format&fit=crop&q=80',
      },
      {
        id: 'd-core',
        name: 'Reator de Fusão',
        rarity: 'Épico',
        image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=80',
      },
      {
        id: 'd-shield',
        name: 'Matriz de Escudo',
        rarity: 'Comum',
        image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80',
      },
    ];

    const items: RouletteItem[] = [];
    for (let i = 0; i < 45; i++) {
      if (i === TARGET_INDEX) {
        // EXACT Predetermined Winner
        items.push({
          id: winningAsset.id,
          name: winningAsset.name,
          rarity: winningRarity,
          image: winningAsset.image,
          elementIcon: (winningAsset as any).elementIcon || undefined,
          isWinner: true,
        });
      } else {
        const dummy = dummyPool[i % dummyPool.length];
        items.push({
          ...dummy,
          id: `dummy-${i}`,
        });
      }
    }
    return items;
  }, [winningAsset, winningRarity]);

  // Launch the roulette animation
  useEffect(() => {
    soundService.playBoxSuspense();

    // Small delay to ensure DOM is measured
    const startTimer = setTimeout(() => {
      const containerWidth = containerRef.current?.offsetWidth || 640;
      // Calculate exact center position
      const centerTarget = TARGET_INDEX * STEP + CARD_WIDTH / 2;
      // Slight natural random jitter within the center card (-15px to +15px)
      const jitter = (Math.random() - 0.5) * 26;
      const finalOffset = centerTarget - containerWidth / 2 + jitter;

      setTranslateX(finalOffset);

      // Play ticking audio as items scroll past needle
      let tickCount = 0;
      const maxTicks = 28;
      const scheduleTick = (delay: number) => {
        if (tickCount >= maxTicks) return;
        setTimeout(() => {
          soundService.playClick();
          tickCount++;
          // Progressive deceleration curve for ticks
          const nextDelay = 80 + Math.pow(tickCount / maxTicks, 2.5) * 350;
          scheduleTick(nextDelay);
        }, delay);
      };
      scheduleTick(100);
    }, 150);

    // After spin deceleration completes (4.4s) -> Winner highlight
    const highlightTimer = setTimeout(() => {
      setStage('WINNER_HIGHLIGHT');
      soundService.playLaser();
    }, 4500);

    // After highlight (5.3s) -> Reveal screen & Confetti
    const revealTimer = setTimeout(() => {
      setStage('REVEALED');
      soundService.playBoxReveal(winningRarity);

      // Trigger Confetti based on rarity tier
      try {
        if (winningRarity === 'Mítico') {
          confetti({
            particleCount: 180,
            spread: 100,
            origin: { y: 0.5 },
            colors: ['#ef4444', '#f59e0b', '#ec4899', '#ffffff'],
          });
        } else if (winningRarity === 'Lendário') {
          confetti({
            particleCount: 140,
            spread: 80,
            origin: { y: 0.5 },
            colors: ['#f59e0b', '#fbbf24', '#fef08a'],
          });
        } else if (winningRarity === 'Épico') {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.5 },
            colors: ['#a855f7', '#c084fc', '#e9d5ff'],
          });
        } else {
          confetti({
            particleCount: 45,
            spread: 50,
            origin: { y: 0.5 },
            colors: ['#06b6d4', '#38bdf8', '#ffffff'],
          });
        }
      } catch {
        // Confetti fallback
      }
    }, 5400);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(highlightTimer);
      clearTimeout(revealTimer);
    };
  }, [summary, winningRarity]);

  // Check if duplicate conversion took place
  const duplicateConversion =
    summary.duplicateCardsConverted && summary.duplicateCardsConverted.length > 0
      ? summary.duplicateCardsConverted[0]
      : summary.duplicateCharactersConverted && summary.duplicateCharactersConverted.length > 0
      ? summary.duplicateCharactersConverted[0]
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl overflow-y-auto">
      {/* Ambient background glow matching winning rarity */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{
          background:
            stage === 'REVEALED'
              ? `radial-gradient(circle at 50% 50%, ${rarityGlow} 0%, rgba(0,0,0,0.9) 70%)`
              : 'radial-gradient(circle at 50% 50%, rgba(6,182,212,0.15) 0%, rgba(0,0,0,0.9) 70%)',
        }}
      />

      <AnimatePresence mode="wait">
        {stage !== 'REVEALED' ? (
          /* ========================================================================= */
          /* ROULETTE SPINNER VIEW (Sections 8 & 9)                                    */
          /* ========================================================================= */
          <motion.div
            key="roulette-view"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(8px)' }}
            className="relative w-full max-w-4xl bg-[#0b0c16]/95 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center z-10 overflow-hidden"
          >
            {/* Box Opening Title */}
            <div className="text-center space-y-2 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-widest uppercase bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                {stage === 'WINNER_HIGHLIGHT' ? 'SORTEIO CONCLUÍDO!' : 'DESCRIPTOGRAFANDO RECOMPENSAS...'}
              </span>
              <h2 className="font-heading text-2xl sm:text-3xl font-black text-white">
                {def.name}
              </h2>
              <p className="text-xs font-mono text-slate-400">
                {stage === 'WINNER_HIGHLIGHT'
                  ? 'Ativo selecionado com sucesso pela Ordem NEXA.'
                  : 'A roleta quântica está desacelerando no ativo sorteado...'}
              </p>
            </div>

            {/* ROULETTE TRACK CONTAINER */}
            <div className="relative w-full max-w-3xl my-6">
              {/* TOP NEEDLE / INDICATOR */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
                <div
                  className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[14px] drop-shadow-[0_0_8px_rgba(6,182,212,0.9)]"
                  style={{ borderTopColor: stage === 'WINNER_HIGHLIGHT' ? rarityColor : '#06b6d4' }}
                />
                <div
                  className="w-0.5 h-48 opacity-40 pointer-events-none"
                  style={{ backgroundColor: stage === 'WINNER_HIGHLIGHT' ? rarityColor : '#06b6d4' }}
                />
              </div>

              {/* BOTTOM NEEDLE / INDICATOR */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
                <div
                  className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[14px] drop-shadow-[0_0_8px_rgba(6,182,212,0.9)]"
                  style={{ borderBottomColor: stage === 'WINNER_HIGHLIGHT' ? rarityColor : '#06b6d4' }}
                />
              </div>

              {/* LATERAL FADE MASKS */}
              <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#0b0c16] via-[#0b0c16]/80 to-transparent z-20 pointer-events-none" />
              <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#0b0c16] via-[#0b0c16]/80 to-transparent z-20 pointer-events-none" />

              {/* HORIZONTAL CARDS TRACK */}
              <div
                ref={containerRef}
                className="w-full h-52 bg-black/60 border border-white/10 rounded-2xl overflow-hidden relative shadow-inner flex items-center"
              >
                <div
                  className="flex items-center"
                  style={{
                    transform: `translateX(-${translateX}px)`,
                    transition: 'transform 4.2s cubic-bezier(0.12, 0.8, 0.22, 1)',
                    paddingLeft: '0px',
                  }}
                >
                  {rouletteTape.map((item, index) => {
                    const isWinningCard = index === TARGET_INDEX;
                    const itemRarityStyle = RARITY_CONFIG[item.rarity];

                    return (
                      <div
                        key={item.id}
                        className={`shrink-0 rounded-2xl overflow-hidden border p-2 flex flex-col items-center text-center transition-all ${
                          isWinningCard && stage === 'WINNER_HIGHLIGHT'
                            ? 'scale-105 z-10'
                            : 'opacity-85'
                        }`}
                        style={{
                          width: `${CARD_WIDTH}px`,
                          height: '180px',
                          marginRight: `${CARD_GAP}px`,
                          borderColor:
                            isWinningCard && stage === 'WINNER_HIGHLIGHT'
                              ? rarityColor
                              : itemRarityStyle?.color
                              ? `${itemRarityStyle.color}40`
                              : 'rgba(255,255,255,0.1)',
                          backgroundColor: '#111222',
                          boxShadow:
                            isWinningCard && stage === 'WINNER_HIGHLIGHT'
                              ? `0 0 30px ${rarityGlow}`
                              : 'none',
                        }}
                      >
                        {/* Image */}
                        <div className="relative w-full h-24 rounded-xl overflow-hidden border border-white/10 mb-2">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                          {item.elementIcon && (
                            <span className="absolute top-1 left-1 text-sm bg-black/60 px-1 rounded-md">
                              {item.elementIcon}
                            </span>
                          )}
                        </div>

                        {/* Name & Rarity */}
                        <span className="text-xs font-bold text-white line-clamp-1 leading-tight mb-1">
                          {item.name}
                        </span>
                        <div className="mt-auto">
                          <RarityBadge rarity={item.rarity} size="xs" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer status text */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>Sorteio criptográfico validado pelo BoxService</span>
            </div>
          </motion.div>
        ) : (
          /* ========================================================================= */
          /* REVEAL SCREEN (🎉 VOCÊ RECEBEU)                                            */
          /* ========================================================================= */
          <motion.div
            key="reveal-screen"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative w-full max-w-2xl rounded-3xl bg-[#0d0d17]/95 border p-6 sm:p-8 shadow-2xl z-10 my-4"
            style={{
              borderColor: rarityColor,
              boxShadow: `0 0 60px ${rarityGlow}`,
            }}
          >
            {/* Header */}
            <div className="text-center space-y-2 mb-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-black uppercase tracking-wider bg-white/10 border border-white/20 text-cyan-300">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                🎉 VOCÊ RECEBEU!
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-black text-white">
                Recompensa Desbloqueada
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Caixa aberta: <span className="text-white font-bold">{def.name}</span>
              </p>
            </div>

            {/* Primary Reward Showcase Card */}
            <div className="relative rounded-2xl bg-[#141424] border border-white/10 p-5 sm:p-6 mb-6 overflow-hidden">
              <div
                className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-3xl pointer-events-none"
                style={{ backgroundColor: rarityGlow }}
              />

              <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
                {/* Visual Card Image */}
                <div
                  className="relative w-40 h-52 sm:w-48 sm:h-64 rounded-2xl overflow-hidden border-2 shadow-2xl shrink-0"
                  style={{ borderColor: rarityColor }}
                >
                  <img
                    src={winningAsset.image}
                    alt={winningAsset.name}
                    className="w-full h-full object-cover"
                  />
                  {(winningAsset as any).elementIcon && (
                    <span className="absolute top-2 left-2 text-2xl bg-black/60 px-2 py-0.5 rounded-xl backdrop-blur-sm">
                      {(winningAsset as any).elementIcon}
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-3 text-center">
                    <RarityBadge rarity={winningRarity} size="sm" />
                  </div>
                </div>

                {/* Info & Stats */}
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono text-cyan-400 font-bold uppercase">
                      {winningAsset.type === 'Card' ? 'Carta de Coleção' : winningAsset.type}
                    </span>
                    {(winningAsset as any).collectionId && (
                      <span className="px-2.5 py-0.5 rounded-md bg-purple-950/60 border border-purple-500/30 text-[11px] font-mono text-purple-300 font-bold uppercase">
                        Coleção: Os Quatro Guardiões
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white font-heading">
                    {winningAsset.name}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                    {winningAsset.description}
                  </p>

                  {/* Synthesis Metrics if Card */}
                  {winningAsset.type === 'Card' && (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 text-center">
                        <span className="text-[10px] text-slate-400 font-mono block uppercase">Taxa de Síntese</span>
                        <span className="text-sm font-black font-mono text-cyan-400">
                          +{(winningAsset as any).synthesisRate || 8} NEX/h
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 text-center">
                        <span className="text-[10px] text-slate-400 font-mono block uppercase">Teto Máximo</span>
                        <span className="text-sm font-black font-mono text-emerald-400">
                          {((winningAsset as any).synthesisCap || 8000).toLocaleString('pt-BR')} NEX
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Duplicate Conversion Notice (Section 6) */}
                  {duplicateConversion && (
                    <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-center gap-3 text-left">
                      <Repeat className="w-5 h-5 text-amber-400 shrink-0" />
                      <div className="text-xs">
                        <span className="font-bold text-amber-200 block uppercase font-mono">
                          Carta Duplicata Convertida!
                        </span>
                        <span className="text-slate-300">
                          +{duplicateConversion.fragmentsAwarded} Fragmentos adicionados! Você agora possui{' '}
                          <span className="text-white font-bold">{duplicateConversion.totalFragmentsNow} / 100</span>.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Loot (NEX + other items if Recruit/Basic box) */}
            {(summary.nexGained > 0 || (summary.items && summary.items.length > 0)) && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-black/40 border border-white/10 mb-6 font-mono text-xs">
                <span className="text-slate-400 uppercase">Recompensas Adicionais:</span>
                <div className="flex items-center gap-3">
                  {summary.nexGained > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 font-bold">
                      <Coins className="w-3.5 h-3.5" />
                      +{summary.nexGained} NEX
                    </span>
                  )}
                  {summary.items && summary.items.length > 0 && (
                    <span className="text-slate-300">
                      +{summary.items.length} itens táticos entregues
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              {hasMoreBoxes && onOpenAnother && (
                <button
                  onClick={() => {
                    soundService.playClick();
                    onOpenAnother();
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  <PackageOpen className="w-4 h-4 text-cyan-400" />
                  Abrir Outra Caixa
                </button>
              )}

              <button
                onClick={() => {
                  soundService.playClick();
                  onClose();
                }}
                className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-sm uppercase tracking-wider hover:brightness-110 shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Adicionar ao Inventário
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
