import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import { BoxType, BoxRewardSummary, PlayerBox } from '../types';
import { BOX_DEFINITIONS, BOX_CONFIG, PITY_CONFIG } from '../config/boxRates';
import { RarityBadge } from '../components/common/RarityBadge';
import { BoxOpeningModal } from '../components/boxes/BoxOpeningModal';
import { BoxRewardsModal } from '../components/boxes/BoxRewardsModal';
import { BoxSystemTestRunner, SystemTestSuiteReport } from '../services/boxSystemTests';
import {
  PackageOpen,
  Sparkles,
  ShieldAlert,
  Coins,
  History,
  Info,
  Layers,
  Flame,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  FlaskConical,
  X,
  Play,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface BoxesPageProps {
  onNavigate: (page: string) => void;
}

type CategoryFilter = 'ALL' | 'GENERAL' | 'COLLECTIONS';

export const Boxes: React.FC<BoxesPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const {
    boxes,
    boxCounts,
    userPity,
    boxHistory,
    isPurchasing,
    openBox,
    purchaseBox,
  } = useGameState();

  const [activeOpeningSummary, setActiveOpeningSummary] = useState<BoxRewardSummary | null>(null);
  const [openingBoxType, setOpeningBoxType] = useState<BoxType | null>(null);
  const [rewardModalBoxType, setRewardModalBoxType] = useState<BoxType | null>(null);
  const [selectedTab, setSelectedTab] = useState<'BOXES' | 'HISTORY'>('BOXES');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');

  // Test Suite Modal State
  const [testModalOpen, setTestModalOpen] = useState<boolean>(false);
  const [testReport, setTestReport] = useState<SystemTestSuiteReport | null>(null);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);

  const myBoxes = boxes.filter((b) => b.ownerId === user.id);
  const totalBoxes = myBoxes.length;

  // Handles clicking "ABRIR"
  const handleOpenBox = (boxType: BoxType) => {
    const availableBox = myBoxes.find((b) => b.boxType === boxType);
    if (!availableBox) return;

    try {
      setOpeningBoxType(boxType);
      const summary = openBox(availableBox.id);
      setActiveOpeningSummary(summary);
    } catch {
      // Handled in context toast
    }
  };

  // Handles purchasing with NEX
  const handleBuyBox = (boxType: BoxType) => {
    purchaseBox(boxType);
  };

  // Run Test Suite
  const handleRunTests = async () => {
    setIsRunningTests(true);
    try {
      const report = await BoxSystemTestRunner.runAllTests();
      setTestReport(report);
    } catch (err) {
      console.error('Test run failed', err);
    } finally {
      setIsRunningTests(false);
    }
  };

  // Pity metrics
  const pityCount = userPity?.premiumBoxPity || 0;
  const pityMax = PITY_CONFIG.PREMIUM_BOX_PITY_THRESHOLD;
  const isPityReady = pityCount >= pityMax - 1;

  // Full order of boxes
  const allBoxTypes: BoxType[] = [
    // General boxes
    'RECRUIT',
    'BASIC',
    'ADVANCED',
    'EPIC',
    'LEGENDARY',
    // Collection boxes
    'GUARDIANS',
    'COLLECTION_DRAGONS',
    'COLLECTION_KNIGHTS',
    'COLLECTION_ABYSS',
    'COLLECTION_MAGES',
    'COLLECTION_GODS',
    'COLLECTION_COSMIC',
    'COLLECTION_HUNTERS',
  ];

  const filteredBoxTypes = allBoxTypes.filter((type) => {
    const isCol = type.startsWith('COLLECTION_') || type === 'GUARDIANS';
    if (categoryFilter === 'GENERAL') return !isCol;
    if (categoryFilter === 'COLLECTIONS') return isCol;
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-cyan-500/30 bg-gradient-to-r from-[#0b0c16] via-[#101024] to-[#0a0a14] p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider">
              <PackageOpen className="w-3.5 h-3.5" />
              <span>SISTEMA DE CAIXAS & RECOMPENSAS NEXA</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl font-black text-white tracking-tight">
              Caixas de Suprimento
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Adquira pacotes táticos e caixas temáticas de coleções. Economia interna atômica 
              alimentada puramente por NEX obtido em batalhas, síntese e missões.
            </p>
          </div>

          {/* Quick Counter Badges & Test Suite Button */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-3 rounded-2xl bg-black/60 border border-white/10 font-mono text-center">
              <span className="text-[10px] text-slate-400 block uppercase">Caixas Disponíveis</span>
              <span className="font-heading text-2xl font-black text-cyan-400">
                {totalBoxes}
              </span>
            </div>

            <div className="px-4 py-3 rounded-2xl bg-black/60 border border-amber-500/30 font-mono text-center shadow-lg shadow-amber-500/10">
              <span className="text-[10px] text-slate-400 block uppercase">Seu Saldo NEX</span>
              <span className="font-heading text-2xl font-black text-amber-400 flex items-center justify-center gap-1">
                <Coins className="w-5 h-5 text-amber-400" />
                {user.balanceNEX.toLocaleString()}
              </span>
            </div>

            <button
              onClick={() => {
                setTestModalOpen(true);
                if (!testReport) handleRunTests();
              }}
              className="px-4 py-3 rounded-2xl bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 font-mono text-center transition-all flex flex-col items-center justify-center gap-1 group"
              title="Executar bateria automatizada de testes do sistema"
            >
              <span className="text-[10px] text-purple-300 uppercase font-bold flex items-center gap-1">
                <FlaskConical className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                Validação
              </span>
              <span className="font-heading text-xs font-bold text-white">
                8 Testes do Sistema
              </span>
            </button>
          </div>
        </div>

        {/* Pity Tracker Bar */}
        <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/30 text-purple-300">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading text-sm font-bold text-white">
                  Sistema de Pity (Caixas de Alta Raridade)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 border border-purple-500/40 text-purple-300">
                  {pityCount} / {pityMax}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                {isPityReady ? (
                  <strong className="text-purple-300">
                    Próxima abertura de caixa alta: Épico ou superior 100% GARANTIDO!
                  </strong>
                ) : (
                  `Épico+ garantido em ${pityMax - pityCount} caixa${pityMax - pityCount === 1 ? '' : 's'}.`
                )}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-64">
            <div className="h-2.5 rounded-full bg-slate-900 border border-white/10 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(pityCount / pityMax) * 100}%`,
                  background: isPityReady
                    ? 'linear-gradient(90deg, #a855f7, #ec4899)'
                    : 'linear-gradient(90deg, #06b6d4, #a855f7)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedTab('BOXES')}
            className={`px-4 py-2 rounded-xl font-heading text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
              selectedTab === 'BOXES'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            <PackageOpen className="w-4 h-4" />
            <span>Caixas Disponíveis ({totalBoxes})</span>
          </button>

          <button
            onClick={() => setSelectedTab('HISTORY')}
            className={`px-4 py-2 rounded-xl font-heading text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
              selectedTab === 'HISTORY'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico de Aberturas ({boxHistory.length})</span>
          </button>
        </div>

        {selectedTab === 'BOXES' && (
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-mono">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                categoryFilter === 'ALL'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas ({allBoxTypes.length})
            </button>
            <button
              onClick={() => setCategoryFilter('GENERAL')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                categoryFilter === 'GENERAL'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Gerais (5)
            </button>
            <button
              onClick={() => setCategoryFilter('COLLECTIONS')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                categoryFilter === 'COLLECTIONS'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Coleções (8)
            </button>
          </div>
        )}
      </div>

      {/* TAB CONTENT 1: AVAILABLE BOXES */}
      {selectedTab === 'BOXES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBoxTypes.map((type) => {
            const def = BOX_DEFINITIONS[type];
            if (!def) return null;
            const count = boxCounts[type] || 0;
            const hasBox = count > 0;
            const isRecruit = type === 'RECRUIT';
            const canAfford = user.balanceNEX >= def.priceNEX;

            return (
              <div
                key={type}
                className="rounded-3xl bg-[#0e0e1a] border border-white/10 hover:border-cyan-500/40 transition-all flex flex-col justify-between overflow-hidden shadow-xl group"
              >
                {/* Visual Header */}
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
                  <img
                    src={def.image}
                    alt={def.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e1a] via-[#0e0e1a]/40 to-transparent" />

                  {/* Badge */}
                  <div className="absolute top-3 left-3">
                    <span
                      className="px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border shadow-md"
                      style={{
                        backgroundColor: `${def.accentColor}25`,
                        borderColor: `${def.accentColor}60`,
                        color: def.accentColor,
                      }}
                    >
                      {def.badge}
                    </span>
                  </div>

                  {/* Count Pill */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-mono font-bold border shadow-md ${
                        hasBox
                          ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                          : 'bg-black/70 border-white/10 text-slate-400'
                      }`}
                    >
                      Possui: {count}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                  <div>
                    <h3 className="font-heading text-xl font-black text-white">
                      {def.name}
                    </h3>
                    <p className="text-[11px] font-mono text-cyan-400 mt-0.5">
                      {def.tagline}
                    </p>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      {def.description}
                    </p>
                  </div>

                  {/* Guarantees Box */}
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-white/10 space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 uppercase font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Garantias da Caixa</span>
                    </div>
                    <p className="text-xs font-mono text-slate-200">
                      {def.guarantees}
                    </p>
                  </div>

                  {/* Price & Currency Tag */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/5 font-mono text-xs">
                    <span className="text-slate-400">Preço:</span>
                    {def.purchasableWithNEX ? (
                      <span className="inline-flex items-center gap-1.5 font-bold text-amber-400 text-sm">
                        <Coins className="w-4 h-4" />
                        {def.priceNEX.toLocaleString()} NEX
                      </span>
                    ) : (
                      <span className="text-cyan-400 font-bold">
                        {isRecruit ? 'Inicial de Recruta (Grátis)' : 'Conquista / Evento'}
                      </span>
                    )}
                  </div>

                  {/* Probabilities Breakdown */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Raridades Possíveis
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {def.possibleRarities.map((r) => (
                        <RarityBadge key={r} rarity={r} size="xs" />
                      ))}
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    {hasBox && (
                      <button
                        onClick={() => handleOpenBox(type)}
                        className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 hover:scale-[1.01]"
                      >
                        <PackageOpen className="w-4 h-4" />
                        <span>ABRIR CAIXA ({count})</span>
                      </button>
                    )}

                    {/* Purchase with NEX button */}
                    {def.purchasableWithNEX && (
                      <button
                        onClick={() => handleBuyBox(type)}
                        disabled={isPurchasing || !canAfford}
                        className={`w-full py-3 rounded-xl border text-xs font-heading font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                          canAfford && !isPurchasing
                            ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-500/10'
                            : 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <Coins className="w-4 h-4 text-emerald-400" />
                        <span>
                          {isPurchasing
                            ? 'Processando...'
                            : canAfford
                            ? `COMPRAR POR ${def.priceNEX.toLocaleString()} NEX`
                            : `SALDO INSUFICIENTE (${def.priceNEX.toLocaleString()} NEX)`}
                        </span>
                      </button>
                    )}

                    {/* VER RECOMPENSAS BUTTON */}
                    <button
                      onClick={() => setRewardModalBoxType(type)}
                      className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Ver Recompensas & Probabilidades</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB CONTENT 2: HISTORY */}
      {selectedTab === 'HISTORY' && (
        <div className="rounded-3xl bg-[#0e0e1a] border border-white/10 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-400" />
              <span>Registro de Aberturas de Caixas</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {boxHistory.length} registros computados
            </span>
          </div>

          {boxHistory.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-white/10 text-center">
              <PackageOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-mono">
                Nenhuma caixa foi aberta ainda nesta conta.
              </p>
              <button
                onClick={() => setSelectedTab('BOXES')}
                className="mt-3 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-xs font-mono"
              >
                Explorar caixas disponíveis
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {boxHistory.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-white/15 transition-all font-mono"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                      <PackageOpen className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {rec.boxName}
                        </span>
                        <RarityBadge rarity={rec.highestRarity} size="xs" />
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {rec.rewardAssetNames.join(', ')}
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-400">
                    <span className="block font-mono">
                      {new Date(rec.openedAt).toLocaleString('pt-BR')}
                    </span>
                    <span className="text-[10px] text-cyan-400">
                      ID: {rec.id.substring(0, 12)}...
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ROULETTE OPENING MODAL */}
      {activeOpeningSummary && (
        <BoxOpeningModal
          summary={activeOpeningSummary}
          onClose={() => {
            setActiveOpeningSummary(null);
            setOpeningBoxType(null);
          }}
          onOpenAnother={() => {
            if (openingBoxType) {
              setActiveOpeningSummary(null);
              setTimeout(() => handleOpenBox(openingBoxType), 250);
            }
          }}
          hasMoreBoxes={openingBoxType ? (boxCounts[openingBoxType] || 0) > 0 : false}
        />
      )}

      {/* REWARDS & PROBABILITIES MODAL */}
      {rewardModalBoxType && (
        <BoxRewardsModal
          boxType={rewardModalBoxType}
          isOpen={!!rewardModalBoxType}
          onClose={() => setRewardModalBoxType(null)}
        />
      )}

      {/* TEST SUITE RUNNER MODAL (8 TESTS) */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-[#0e0e1a] border border-purple-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-950/80 border border-purple-500/40 text-purple-300">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading text-xl font-black text-white">
                    Bateria de Testes do Sistema (8 Testes)
                  </h3>
                  <p className="text-xs font-mono text-slate-400">
                    Validação em tempo real de saldo atômico, limites, caixas e integridade.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTestModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/10 text-xs font-mono">
              <div>
                <span className="text-slate-400">Status geral: </span>
                {isRunningTests ? (
                  <span className="text-cyan-400 font-bold animate-pulse">Executando asserções...</span>
                ) : testReport ? (
                  <span className="text-emerald-400 font-bold">
                    {testReport.passed}/{testReport.total} Testes Aprovados ({Math.round((testReport.passed / testReport.total) * 100)}%)
                  </span>
                ) : (
                  <span className="text-slate-400">Pronto para iniciar</span>
                )}
              </div>
              <button
                onClick={handleRunTests}
                disabled={isRunningTests}
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all disabled:opacity-50"
              >
                {isRunningTests ? 'Testando...' : 'Reexecutar Testes'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {testReport?.results.map((r) => (
                <div
                  key={r.id}
                  className={`p-3.5 rounded-2xl border transition-all text-xs font-mono ${
                    r.passed
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                      : 'bg-red-950/20 border-red-500/30 text-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white">{r.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        r.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {r.passed ? 'APROVADO' : 'FALHOU'}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] space-y-0.5 text-slate-300">
                    <div>
                      <span className="text-slate-500">Esperado: </span>
                      {r.expected}
                    </div>
                    <div>
                      <span className="text-slate-500">Resultado: </span>
                      {r.actual}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setTestModalOpen(false)}
                className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
