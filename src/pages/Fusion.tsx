import { formatEconomicValue } from '../utils/formatEconomicValue';
import { CardImage } from '../components/common/CardImage';
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import { NexaAsset, Rarity } from '../types';
import { FUSION_RULES, NEXT_RARITY_MAP } from '../config/fusionRules';
import { RARITY_CONFIG } from '../config/designTokens';
import { RarityBadge } from '../components/common/RarityBadge';
import { soundService } from '../services/soundService';
import confetti from 'canvas-confetti';
import {
  Flame,
  Plus,
  X,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

export const Fusion: React.FC = () => {
  const { user } = useAuth();
  const { assets, executeFusion } = useGameState();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [fusionResult, setFusionResult] = useState<{
    success: boolean;
    outputAsset?: NexaAsset;
    message: string;
    costNEX: number;
  } | null>(null);

  // Available items for fusion (user-owned, IDLE)
  const availableItems = assets.filter(
    (a) => a.ownerId === user.id && a.status === 'IDLE'
  );

  const selectedItems = assets.filter((a) => selectedIds.includes(a.id));
  const baseRarity: Rarity | null = selectedItems.length > 0 ? selectedItems[0].rarity : null;
  const targetRarity = baseRarity ? NEXT_RARITY_MAP[baseRarity] : null;
  const rule = baseRarity ? FUSION_RULES[baseRarity] : null;

  // Toggle item selection
  const toggleItem = (asset: NexaAsset) => {
    if (selectedIds.includes(asset.id)) {
      setSelectedIds((prev) => prev.filter((id) => id !== asset.id));
      return;
    }

    if (selectedIds.length >= 3) return;

    if (selectedIds.length > 0 && asset.rarity !== baseRarity) {
      // Must be same rarity
      return;
    }

    soundService.playClick();
    setSelectedIds((prev) => [...prev, asset.id]);
  };

  const handleStartFusion = () => {
    if (selectedIds.length !== 3 || !rule) return;

    setIsSynthesizing(true);
    setFusionResult(null);
    soundService.playFusionCharge();

    setTimeout(() => {
      try {
        const result = executeFusion(selectedIds);
        setIsSynthesizing(false);
        setFusionResult({
          success: result.success,
          outputAsset: result.outputAsset,
          message: result.message,
          costNEX: result.costNEX,
        });
        setSelectedIds([]);

        if (result.success) {
          try {
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.5 },
              colors: ['#a855f7', '#06b6d4', '#f59e0b', '#ec4899'],
            });
          } catch {
            // Ignore
          }
        }
      } catch (err: any) {
        setIsSynthesizing(false);
      }
    }, 2200);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Reactor Header */}
      <section className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-[#0d0b15] via-[#090a10] to-[#07080c] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-purple-500/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-52 w-52 rounded-full bg-cyan-500/[0.04] blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-purple-400 uppercase tracking-[0.2em]">
            <Flame className="w-4 h-4" /> Reator // Síntese
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white mt-2 tracking-tight">
            Câmara de Fusão
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1.5 max-w-2xl leading-relaxed">
            Combine 3 ativos compatíveis da mesma raridade para tentar sintetizar um ativo do escalão seguinte.
          </p>
        </div>
      </section>

      {/* Fusion Chamber Reactor Stage */}
      <div className="relative rounded-2xl bg-gradient-to-b from-[#0d0b14] via-[#090a0f] to-[#07080b] border border-purple-500/20 p-5 sm:p-7 overflow-hidden text-center">
        {/* Glowing background reactor aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-purple-600/[0.08] rounded-full blur-3xl pointer-events-none" />

        {/* 3 Input Slots */}
        <div className="relative z-10 max-w-2xl mx-auto">
          <span className="text-[11px] font-mono text-purple-300 uppercase tracking-wider block mb-4 font-bold">
            Matriz de Entrada // 3 Ativos Compatíveis
          </span>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-6">
            {[0, 1, 2].map((slotIndex) => {
              const item = selectedItems[slotIndex];
              return (
                <div
                  key={slotIndex}
                  className={`aspect-[4/3] sm:aspect-[5/4] rounded-xl border flex flex-col items-center justify-center p-3 relative transition-all duration-300 ${
                    item
                      ? 'bg-purple-950/40 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                      : 'bg-white/5 border-dashed border-white/20 hover:border-purple-400/50'
                  } ${isSynthesizing ? 'animate-pulse scale-95' : ''}`}
                >
                  {item ? (
                    <>
                      <button
                        onClick={() => toggleItem(item)}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/70 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <CardImage asset={item}
                        src={item.image}
                        alt={item.name}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover mb-2 border border-white/10"
                      />
                      <h5 className="font-heading font-bold text-xs text-white truncate w-full">
                        {item.name}
                      </h5>
                      <span className="text-[10px] font-mono text-purple-300 mt-0.5">
                        {item.power} PWR
                      </span>
                    </>
                  ) : (
                    <div className="text-slate-500 font-mono text-xs flex flex-col items-center gap-1">
                      <Plus className="w-6 h-6 text-slate-500" />
                      <span className="text-[10px] uppercase">Slot {slotIndex + 1}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Central Reactor Core Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 rounded-xl bg-black/30 border border-white/[0.07] text-xs font-mono mb-6 overflow-hidden">
            <div className="text-left p-3.5 sm:border-r sm:border-white/[0.06]">
              <span className="text-slate-500 block text-[9px] uppercase tracking-[0.14em]">Raridade Alvo</span>
              <div className="flex items-center gap-2 mt-1">
                {targetRarity ? (
                  <RarityBadge rarity={targetRarity} size="md" />
                ) : (
                  <span className="text-slate-500">Selecione 3 itens compatíveis</span>
                )}
              </div>
            </div>

            <div className="text-left sm:text-center p-3.5 border-t sm:border-t-0 sm:border-r border-white/[0.06]">
              <span className="text-slate-500 block text-[9px] uppercase tracking-[0.14em]">Custo da Síntese</span>
              <span className="font-bold text-amber-400 text-sm">
                {rule ? `${formatEconomicValue(rule.costNEX)} NEX` : '—'}
              </span>
            </div>

            <div className="text-left sm:text-right p-3.5 border-t sm:border-t-0 border-white/[0.06]">
              <span className="text-slate-500 block text-[9px] uppercase tracking-[0.14em]">Taxa de Estabilidade</span>
              <span className="font-bold text-emerald-400 text-sm">
                {rule ? `${Math.round(rule.successRate * 100)}%` : '—'}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleStartFusion}
            disabled={selectedIds.length !== 3 || isSynthesizing || (rule && user.balanceNEX < rule.costNEX)}
            className={`px-10 py-3.5 rounded-xl border font-heading font-black text-xs uppercase tracking-[0.14em] transition-all flex items-center justify-center gap-3 w-full sm:w-auto mx-auto ${
              selectedIds.length === 3 && rule && user.balanceNEX >= rule.costNEX && !isSynthesizing
                ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:scale-105'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
            }`}
          >
            <Flame className={`w-5 h-5 ${isSynthesizing ? 'animate-spin' : ''}`} />
            <span>
              {isSynthesizing
                ? 'Estabilizando Plasma no Reator...'
                : selectedIds.length < 3
                ? `Selecione mais ${3 - selectedIds.length} item(ns)`
                : user.balanceNEX < (rule?.costNEX || 0)
                ? 'Saldo de NEX Insuficiente'
                : 'Iniciar Fusão Quântica'}
            </span>
          </button>
        </div>
      </div>

      {/* Inventory Selector Drawer */}
      <div className="rounded-2xl bg-[#090a0f] border border-white/[0.08] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h3 className="font-heading text-xl font-bold text-white">
            Seus Itens Disponíveis para Fusão
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {baseRarity
              ? `Mostrando itens da raridade [${baseRarity}]`
              : 'Clique em 3 itens da mesma raridade para preencher os slots'}
          </span>
        </div>

        {availableItems.length === 0 ? (
          <div className="py-10 text-center text-slate-500 font-mono text-xs">
            Você não possui itens livres para fusão no momento.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {availableItems.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const isDisabled =
                selectedIds.length > 0 &&
                !selectedIds.includes(item.id) &&
                item.rarity !== baseRarity;

              return (
                <div
                  key={item.id}
                  onClick={() => !isDisabled && toggleItem(item)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-400'
                      : isDisabled
                      ? 'opacity-40 cursor-not-allowed bg-white/5 border-white/5'
                      : 'bg-white/5 border-white/5 hover:border-purple-400/50'
                  }`}
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-slate-950 relative">
                    <CardImage asset={item}
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1.5 left-1.5">
                      <RarityBadge rarity={item.rarity} size="sm" showDot={false} />
                    </div>
                  </div>

                  <div>
                    <h5 className="font-heading font-bold text-xs text-white truncate">
                      {item.name}
                    </h5>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
                      <span>{item.type}</span>
                      <span className="text-purple-400 font-bold">{item.power} PWR</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fusion Result Modal */}
      {fusionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-[#0b0a10] border border-purple-500/35 p-6 sm:p-8 text-center shadow-[0_0_40px_rgba(168,85,247,0.18)]">
            <div
              className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl border mb-4 ${
                fusionResult.success
                  ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                  : 'bg-amber-500/20 border-amber-400 text-amber-300'
              }`}
            >
              {fusionResult.success ? (
                <Sparkles className="w-8 h-8 animate-spin" />
              ) : (
                <AlertTriangle className="w-8 h-8" />
              )}
            </div>

            <h3 className="font-heading text-2xl font-black text-white">
              {fusionResult.success ? 'Síntese Quântica Concluída!' : 'Falha na Estabilização'}
            </h3>

            <p className="text-xs text-slate-300 font-mono mt-2 leading-relaxed">
              {fusionResult.message}
            </p>

            {fusionResult.outputAsset && (
              <div className="my-6 p-4 rounded-2xl bg-white/5 border border-purple-500/40 text-left flex items-center gap-3">
                <CardImage asset={fusionResult.outputAsset}
                  src={fusionResult.outputAsset.image}
                  alt={fusionResult.outputAsset.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <h4 className="font-heading font-bold text-sm text-white truncate">
                    {fusionResult.outputAsset.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <RarityBadge rarity={fusionResult.outputAsset.rarity} size="sm" />
                    <span className="text-xs font-mono text-purple-300 font-bold">
                      {fusionResult.outputAsset.power} PWR
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setFusionResult(null)}
              className="w-full py-3 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-400/35 text-purple-100 font-mono text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Fechar e Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
