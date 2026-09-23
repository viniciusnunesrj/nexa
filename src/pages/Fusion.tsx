import { formatEconomicValue } from '../utils/formatEconomicValue';
import { CardImage } from '../components/common/CardImage';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import { NexaAsset, Rarity } from '../types';
import { FUSION_RULES, NEXT_RARITY_MAP } from '../config/fusionRules';
import { RARITY_CONFIG } from '../config/designTokens';
import { RarityBadge } from '../components/common/RarityBadge';
import { soundService } from '../services/soundService';
import { FusionService } from '../services/fusionService';
import { StarUpgradeService, StarUpgradeRejected } from '../services/starUpgradeService';
import { isStarEligible, starRequirement } from '../features/star-system/rules';
import confetti from 'canvas-confetti';
import {
  Flame,
  Plus,
  X,
  Sparkles,
  AlertTriangle,
  Star,
} from 'lucide-react';


interface FusionInventoryCardProps {
  item: NexaAsset;
  selected: boolean;
  disabled: boolean;
  onToggle: (item: NexaAsset) => void;
}

const FusionInventoryCard = memo<FusionInventoryCardProps>(
  ({ item, selected, disabled, onToggle }) => {
    const handleClick = useCallback(() => {
      if (!disabled) onToggle(item);
    }, [disabled, item, onToggle]);

    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between gap-2 text-left ${
          selected
            ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-400'
            : disabled
            ? 'opacity-40 cursor-not-allowed bg-white/5 border-white/5'
            : 'bg-white/5 border-white/5 hover:border-purple-400/50'
        }`}
      >
        <div className="aspect-square rounded-lg overflow-hidden bg-slate-950 relative pointer-events-none">
          <CardImage
            asset={item}
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-1.5 left-1.5">
            <RarityBadge rarity={item.rarity} size="sm" showDot={false} />
          </div>
        </div>

        <div className="pointer-events-none">
          <h5 className="font-heading font-bold text-xs text-white truncate">
            {item.name}
          </h5>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
            <span>{item.type}</span>
            <span className="text-purple-400 font-bold">{item.power} PWR</span>
          </div>
        </div>
      </button>
    );
  },
  (prev, next) =>
    prev.item === next.item &&
    prev.selected === next.selected &&
    prev.disabled === next.disabled &&
    prev.onToggle === next.onToggle
);

FusionInventoryCard.displayName = 'FusionInventoryCard';

export const Fusion: React.FC = () => {
  const { user } = useAuth();
  const { assets, cardFragments, fragmentListings, executeFusion, executeStarUpgrade } = useGameState();

  const [mode, setMode] = useState<'FUSION' | 'ASCENSION'>('FUSION');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [ascensionMainId, setAscensionMainId] = useState<string | null>(null);
  const [starBusy, setStarBusy] = useState(false);
  const [starMessage, setStarMessage] = useState('');
  const starInFlight = useRef(false);
  const starRequest = useRef<{ requestId: string; mainId: string } | null>(null);
  const [starRetry, setStarRetry] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const pendingRequestId = useRef<string | null>(null);
  const [fusionResult, setFusionResult] = useState<{
    success: boolean;
    outputAsset?: NexaAsset;
    message: string;
    costNEX: number;
  } | null>(null);

  // Apenas cartas físicas reais e livres podem entrar na Fusão V2.
  // Isso exclui personagens, equipamentos e outros assets locais/legados
  // que também possam possuir status IDLE.
  const availableItems = useMemo(
    () =>
      assets.filter(
        (a) =>
          a.ownerId === user.id &&
          (a.type === 'Card' || (a as any).type === 'card') &&
          (a as any).state === 'FREE' &&
          (a as any).isStarter !== true
      ),
    [assets, user.id]
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // A seleção também é resolvida exclusivamente dentro da lista validada.
  const selectedItems = useMemo(
    () => availableItems.filter((a) => selectedSet.has(a.id)),
    [availableItems, selectedSet]
  );
  const baseRarity: Rarity | null = selectedItems.length > 0 ? selectedItems[0].rarity : null;
  const targetRarity = baseRarity ? NEXT_RARITY_MAP[baseRarity] : null;
  const rule = baseRarity ? FUSION_RULES[baseRarity] : null;
  const ascensionItems = useMemo(() => assets.filter(a => isStarEligible(a, user.id)), [assets, user.id]);
  const ascensionMain = useMemo(
    () => ascensionItems.find((item) => item.id === ascensionMainId) || null,
    [ascensionItems, ascensionMainId]
  );
  const currentStars = ascensionMain?.type === 'Card'
    ? Math.min(5, Math.max(1, Number(ascensionMain.starLevel ?? 1)))
    : 1;
  const nextStars = Math.min(5, currentStars + 1);
  const ascensionRequirement = starRequirement(currentStars);
  const availableFragments = ascensionMain?.type === 'Card'
    ? Math.max(0, (cardFragments.find(f => f.ownerId === user.id && f.templateId === ascensionMain.templateId)?.amount ?? 0)
      - fragmentListings.filter(l => l.sellerId === user.id && l.templateId === ascensionMain.templateId && l.status === 'ACTIVE')
        .reduce((sum, l) => sum + l.quantity, 0))
    : 0;
  const canAscend = !!ascensionMain && !!ascensionRequirement && user.balanceNEX >= ascensionRequirement.nex
    && availableFragments >= ascensionRequirement.fragments;

  const handleStarUpgrade = async () => {
    if (starInFlight.current || (!starRequest.current && !canAscend)) return;
    starInFlight.current = true;
    setStarBusy(true);
    setStarMessage('');
    try {
      starRequest.current ??= { requestId: StarUpgradeService.createRequestId(), mainId: ascensionMain!.id };
      const intent = starRequest.current;
      const result = await executeStarUpgrade(intent.mainId, intent.requestId);
      setStarMessage(`Ascensão confirmada: ★${result.card.starLevel}. Custo: ${result.costNEX} NEX.${result.refreshPending ? ' Atualização pendente; consulte novamente.' : ''}`);
      if (!result.refreshPending) {
        starRequest.current = null;
        setStarRetry(false);
      } else setStarRetry(true);
    } catch (error) {
      setStarMessage(error instanceof Error ? error.message : 'Não foi possível confirmar a Ascensão.');
      if (error instanceof StarUpgradeRejected) {
        starRequest.current = null;
        setStarRetry(false);
      } else setStarRetry(true);
    } finally {
      starInFlight.current = false;
      setStarBusy(false);
    }
  };


  // Seleção isolada: usa apenas o estado anterior e mantém o handler estável.
  const toggleItem = useCallback(
    (asset: NexaAsset) => {
      if (isSynthesizing) return;

      setSelectedIds((prev) => {
        if (prev.includes(asset.id)) {
          pendingRequestId.current = null;
          return prev.filter((id) => id !== asset.id);
        }

        if (prev.length >= 3) return prev;

        const firstSelected = availableItems.find((item) => item.id === prev[0]);
        if (firstSelected && firstSelected.rarity !== asset.rarity) return prev;

        pendingRequestId.current = null;
        return [...prev, asset.id];
      });
    },
    [availableItems, isSynthesizing]
  );

  const handleStartFusion = async () => {
    if (selectedIds.length !== 3 || !rule || isSynthesizing) return;

    setIsSynthesizing(true);
    setFusionResult(null);
    soundService.playFusionCharge();

    // Mantém a animação de carga, mas o resultado econômico
    // vem exclusivamente da RPC server-authoritative.
    await new Promise((resolve) => setTimeout(resolve, 2200));

    try {
      if (!pendingRequestId.current) {
        pendingRequestId.current = FusionService.createRequestId();
      }

      const result = await executeFusion(selectedIds, pendingRequestId.current);

      setFusionResult({
        success: result.success,
        outputAsset: result.outputAsset,
        message: result.message,
        costNEX: result.costNEX,
      });

      setSelectedIds([]);
      pendingRequestId.current = null;

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
    } catch {
      // Mantém o mesmo requestId para uma eventual repetição da mesma operação.
      // O GameStateContext já exibe a mensagem de erro.
    } finally {
      setIsSynthesizing(false);
    }
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

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/[0.08] bg-[#090a0f] p-1.5">
        <button
          type="button"
          onClick={() => setMode('FUSION')}
          className={`rounded-xl px-4 py-3 font-heading text-xs font-black uppercase tracking-[0.14em] transition-all ${
            mode === 'FUSION'
              ? 'border border-purple-400/35 bg-purple-500/15 text-purple-200'
              : 'border border-transparent text-slate-500 hover:bg-white/[0.035] hover:text-slate-200'
          }`}
        >
          Síntese
        </button>
        <button
          type="button"
          onClick={() => setMode('ASCENSION')}
          className={`rounded-xl px-4 py-3 font-heading text-xs font-black uppercase tracking-[0.14em] transition-all ${
            mode === 'ASCENSION'
              ? 'border border-amber-300/35 bg-amber-400/[0.08] text-amber-200'
              : 'border border-transparent text-slate-500 hover:bg-white/[0.035] hover:text-slate-200'
          }`}
        >
          Ascensão ★
        </button>
      </div>

      {mode === 'FUSION' ? (
        <>

      {/* Fusion Chamber Reactor Stage */}
      <div className="relative rounded-2xl bg-gradient-to-b from-[#0d0b14] via-[#090a0f] to-[#07080b] border border-purple-500/20 p-5 sm:p-7 overflow-hidden text-center">
        {/* Glowing background reactor aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-purple-600/[0.08] rounded-full blur-3xl pointer-events-none" />

        {/* 3 Input Slots */}
<div className="relative z-10 max-w-2xl mx-auto">
  <span className="text-[11px] font-mono text-purple-300 uppercase tracking-wider block mb-4 font-bold">
    Matriz de Entrada // 3 Ativos Compatíveis
  </span>

  <div className="grid grid-cols-3 gap-3 mb-6">
    {[0, 1, 2].map((slotIndex) => {
      const item = selectedItems[slotIndex];

      return (
        <button
          type="button"
          key={slotIndex}
          onClick={() => {
            if (item) toggleItem(item);
          }}
          className="h-24 rounded-xl border border-white/10 bg-slate-950"
        >
          <span className="text-xs text-white font-mono">
            {item?.name || `Slot ${slotIndex + 1}`}
          </span>
        </button>
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
              const isSelected = selectedSet.has(item.id);
              const isDisabled =
                selectedIds.length > 0 &&
                !isSelected &&
                item.rarity !== baseRarity;

              return (
                <FusionInventoryCard
                  key={item.id}
                  item={item}
                  selected={isSelected}
                  disabled={isDisabled}
                  onToggle={toggleItem}
                />
              );
            })}
          </div>
        )}
      </div>

        </>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-2xl border border-amber-300/15 bg-gradient-to-b from-[#100d0a] via-[#0a0a0f] to-[#07080b] p-5 sm:p-7">
            <div className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-300/[0.045] blur-3xl" />
            <div className="relative mx-auto max-w-3xl">
              <div className="mb-6 text-center">
                <div className="mb-2 flex items-center justify-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-amber-300">
                  <Star className="h-4 w-4" /> Núcleo de Ascensão
                </div>
                <h2 className="font-heading text-2xl font-black text-white">Evolução de Instância</h2>
                <p className="mx-auto mt-2 max-w-xl text-xs font-mono leading-relaxed text-slate-400">
                  A carta principal permanece a mesma instância. Use fragmentos da mesma carta e NEX para elevar seu nível de estrelas.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
                <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
                  <span className="block text-[9px] font-mono font-bold uppercase tracking-[0.16em] text-slate-500">Carta principal</span>
                  {ascensionMain ? (
                    <div className="mt-3 flex items-center gap-3">
                      <CardImage asset={ascensionMain} src={ascensionMain.image} alt={ascensionMain.name} className="h-20 w-20 rounded-xl object-cover" />
                      <div className="min-w-0">
                        <RarityBadge rarity={ascensionMain.rarity} size="sm" />
                        <h3 className="mt-1 truncate font-heading text-sm font-black text-white">{ascensionMain.name}</h3>
                        <div className="mt-1 font-mono text-sm tracking-wider text-amber-200">
                          {'★'.repeat(currentStars)}<span className="text-slate-700">{'★'.repeat(5-currentStars)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex h-20 items-center justify-center rounded-xl border border-dashed border-white/10 text-xs font-mono text-slate-600">
                      Selecione uma carta abaixo
                    </div>
                  )}
                </div>

                <div className="hidden text-2xl text-amber-300/70 md:block">→</div>

                <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.025] p-4">
                  <span className="block text-[9px] font-mono font-bold uppercase tracking-[0.16em] text-slate-500">Próxima evolução</span>
                  <div className="mt-3 flex h-20 flex-col justify-center">
                    {ascensionMain ? (
                      <>
                        <div className="font-heading text-lg font-black text-white">
                          {currentStars >= 5 ? 'Ascensão máxima' : `★${currentStars} → ★${nextStars}`}
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-slate-400">
                          {currentStars >= 5 ? 'Esta instância já atingiu o limite.' : 'A raridade original da carta não muda.'}
                        </div>
                      </>
                    ) : <span className="font-mono text-xs text-slate-600">Aguardando carta principal</span>}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/[0.07] bg-black/25 p-3">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">Fragmentos necessários</span>
                  <strong className="mt-1 block font-mono text-sm text-white">{ascensionRequirement?.fragments ?? '—'}</strong>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-black/25 p-3">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">Fragmentos disponíveis</span>
                  <strong className="mt-1 block font-mono text-sm text-cyan-300">{ascensionMain ? availableFragments : '—'}</strong>
                </div>
                <div className="rounded-xl border border-white/[0.07] bg-black/25 p-3">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-slate-500">Custo NEX</span>
                  <strong className="mt-1 block font-mono text-sm text-amber-300">{ascensionRequirement ? `${ascensionRequirement.nex} NEX` : '—'}</strong>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-300">Saldo: {formatEconomicValue(user.balanceNEX)} NEX</p>
              <button type="button" onClick={handleStarUpgrade} disabled={starBusy || (!starRetry && !canAscend)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/30 bg-amber-300/10 px-5 py-3.5 font-heading text-xs font-black uppercase tracking-[0.14em] text-amber-200 disabled:cursor-not-allowed disabled:opacity-40">
                <Star className="h-4 w-4" />
                {starBusy ? 'Confirmando Ascensão...' : starRetry ? 'Consultar / repetir a mesma operação' : currentStars >= 5 ? 'Nível máximo ★5' : 'Confirmar Ascensão'}
              </button>
              {starMessage && <p role="status" className="mt-3 text-sm text-amber-100">{starMessage}</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#090a0f] p-5">
            <div className="mb-4">
              <h3 className="font-heading text-xl font-bold text-white">Escolha a carta principal</h3>
              <p className="mt-1 text-xs font-mono text-slate-500">Somente cartas livres disponíveis no Reator. A Ascensão utiliza somente fragmentos da mesma carta.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {ascensionItems.map((item) => {
                const stars = item.type === 'Card' ? Math.min(5, Math.max(1, Number(item.starLevel ?? 1))) : 1;
                const active = ascensionMainId === item.id;
                return (
                  <button key={item.id} type="button" disabled={starBusy || starRetry} onClick={() => {
                    setAscensionMainId(active ? null : item.id); setStarMessage('');
                  }}
                    className={`rounded-xl border p-3 text-left transition-all ${active ? 'border-amber-300/60 bg-amber-300/[0.08] ring-1 ring-amber-300/30' : 'border-white/[0.07] bg-white/[0.025] hover:border-amber-300/25'}`}>
                    <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-950">
                      <CardImage asset={item} src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      <div className="absolute left-2 top-2"><RarityBadge rarity={item.rarity} size="sm" showDot={false} /></div>
                    </div>
                    <h4 className="mt-2 truncate font-heading text-xs font-bold text-white">{item.name}</h4>
                    <div className="mt-1 font-mono text-[10px] tracking-wider text-amber-200">
                      {'★'.repeat(stars)}<span className="text-slate-700">{'★'.repeat(5-stars)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

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
