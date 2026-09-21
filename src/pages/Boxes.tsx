import { formatEconomicValue } from '../utils/formatEconomicValue';
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import { BoxType, BoxRewardSummary } from '../types';
import { BOX_DEFINITIONS } from '../config/boxRates';
import { RarityBadge } from '../components/common/RarityBadge';
import { BoxOpeningModal } from '../components/boxes/BoxOpeningModal';
import { BoxRewardsModal } from '../components/boxes/BoxRewardsModal';
import { BoxSystemTestRunner, SystemTestSuiteReport } from '../services/boxSystemTests';
import {
  PackageOpen,
  Sparkles,
  Coins,
  History,
  ShieldCheck,
  FlaskConical,
  X,
} from 'lucide-react';

interface BoxesPageProps {
  onNavigate: (page: string) => void;
}

type CategoryFilter = 'GENERAL' | 'COLLECTIONS';

const getBoxOriginLabel = (source?: string) => {
  if (!source) return null;
  if (source === 'NEW_ACCOUNT_RECRUIT' || source === 'STARTER_KIT') return 'Boas-vindas';
  if (source === 'SHOP_PURCHASE') return 'Compra';
  if (source.startsWith('RIFT_VICTORY_DROP:')) return 'Drop · Rift Battle';
  if (source.startsWith('NEXUS_DUEL_PVE_VICTORY_DROP:')) return 'Drop · Nexus Duel PvE';
  if (source.startsWith('NEXUS_DUEL_PVP_VICTORY_DROP:')) return 'Drop · Nexus Duel PvP';
  if (source === 'SEASON_REWARD') return 'Temporada';
  if (source === 'EVENT') return 'Evento';
  return 'Drop de gameplay';
};

export const Boxes: React.FC<BoxesPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  const {
    boxes,
    boxCounts,
    boxHistory,
    isPurchasing,
    openBox,
    purchaseBox,
  } = useGameState();

  const [activeOpeningSummary, setActiveOpeningSummary] =
    useState<BoxRewardSummary | null>(null);

  const [openingBoxType, setOpeningBoxType] =
    useState<BoxType | null>(null);

  const [rewardModalBoxType, setRewardModalBoxType] =
    useState<BoxType | null>(null);

  const [selectedTab, setSelectedTab] =
    useState<'BOXES' | 'HISTORY'>('BOXES');

  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>('GENERAL');

  const [testModalOpen, setTestModalOpen] = useState<boolean>(false);

  const [testReport, setTestReport] =
    useState<SystemTestSuiteReport | null>(null);

  const [isRunningTests, setIsRunningTests] =
    useState<boolean>(false);

  const myBoxes = boxes.filter((b) => b.ownerId === user.id);
  const totalBoxes = myBoxes.length;
  const latestOwnedBox = [...myBoxes].sort(
    (a, b) => new Date(b.acquiredAt).getTime() - new Date(a.acquiredAt).getTime()
  )[0];

  const handleOpenBox = async (boxType: BoxType) => {
    const availableBox = myBoxes.find(
      (b) => b.boxType === boxType
    );

    if (!availableBox) return;

    try {
      setOpeningBoxType(boxType);

      const summary = await openBox(availableBox.id);

      setActiveOpeningSummary(summary);
    } catch {
      // Erros são tratados pelo toast do contexto.
    }
  };

  const handleBuyBox = (boxType: BoxType) => {
    purchaseBox(boxType);
  };

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

  const allBoxTypes: BoxType[] = [
    'RECRUIT',
    'BASIC',
    'ADVANCED',
    'EPIC',
    'LEGENDARY',
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
    const isCollection =
      type.startsWith('COLLECTION_') ||
      type === 'GUARDIANS';

    if (categoryFilter === 'GENERAL') {
      return !isCollection;
    }

    return isCollection;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <section className="relative rounded-2xl overflow-hidden border border-cyan-500/15 bg-gradient-to-br from-[#0b1018] via-[#090b11] to-[#07080c] p-5 sm:p-6">
        <div className="absolute -top-24 right-0 w-80 h-80 bg-cyan-500/[0.07] rounded-full blur-3xl pointer-events-none" />

        <div className="absolute -bottom-28 left-1/3 w-72 h-72 bg-purple-500/[0.06] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-cyan-400">
              <PackageOpen className="w-3.5 h-3.5" />

              <span>
                Central de Suprimentos // Nexus
              </span>
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl font-black text-white tracking-tight mt-2">
              Caixas de Suprimento
            </h1>

            <p className="text-slate-400 text-xs sm:text-sm max-w-2xl leading-relaxed mt-1.5">
              Adquira e abra suprimentos disponíveis,
              consulte probabilidades e acompanhe o
              histórico de operações.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-3 rounded-xl bg-black/35 border border-white/[0.07] font-mono text-center">
              <span className="text-[10px] text-slate-400 block uppercase">
                Caixas Disponíveis
              </span>

              <span className="font-heading text-2xl font-black text-cyan-400">
                {totalBoxes}
              </span>
            </div>

            <div className="px-4 py-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/20 font-mono text-center">
              <span className="text-[10px] text-slate-400 block uppercase">
                Seu Saldo NEX
              </span>

              <span className="font-heading text-2xl font-black text-amber-400 flex items-center justify-center gap-1">
                <Coins className="w-5 h-5 text-amber-400" />

                {formatEconomicValue(user.balanceNEX)}
              </span>
            </div>

            <button
              onClick={() => {
                setTestModalOpen(true);

                if (!testReport) {
                  handleRunTests();
                }
              }}
              className="px-3 py-2.5 rounded-xl bg-white/[0.025] hover:bg-purple-500/[0.07] border border-white/[0.07] hover:border-purple-500/25 font-mono text-center transition-all flex flex-col items-center justify-center gap-0.5 group opacity-70 hover:opacity-100"
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

        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2.5">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500">Rift Battle</span>
            <p className="text-xs text-slate-300 mt-1"><strong className="text-cyan-300">8%</strong> de chance de Caixa Básica por vitória.</p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2.5">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500">Nexus Duel PvE</span>
            <p className="text-xs text-slate-300 mt-1"><strong className="text-cyan-300">15%</strong> de chance de Caixa Básica por vitória.</p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2.5">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-500">Nexus Duel PvP</span>
            <p className="text-xs text-slate-300 mt-1"><strong className="text-cyan-300">18%</strong> por vitória elegível a recompensa.</p>
          </div>
        </div>

        {latestOwnedBox && getBoxOriginLabel(latestOwnedBox.source) && (
          <div className="mt-2 text-[10px] font-mono text-slate-500">
            Caixa mais recente: <span className="text-slate-300">{latestOwnedBox.name}</span> · {getBoxOriginLabel(latestOwnedBox.source)}
          </div>
        )}

        {/* INTEGRIDADE ONLINE */}
        <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 text-emerald-300">
            <ShieldCheck className="w-5 h-5" />
          </div>

          <div>
            <span className="font-heading text-sm font-bold text-white block">
              Abertura protegida pelo servidor
            </span>

            <p className="text-xs font-mono text-slate-400 mt-0.5">
              Compras, abertura, raridade sorteada e
              fragmentos são processados de forma
              autoritativa no sistema online.
            </p>
          </div>
        </div>
      </section>

      {/* TABS E FILTROS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-[#090b10] p-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedTab('BOXES')}
            className={`px-4 py-2 rounded-lg border font-heading text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
              selectedTab === 'BOXES'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            <PackageOpen className="w-4 h-4" />

            <span>
              Caixas Disponíveis ({totalBoxes})
            </span>
          </button>

          <button
            onClick={() => setSelectedTab('HISTORY')}
            className={`px-4 py-2 rounded-lg border font-heading text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
              selectedTab === 'HISTORY'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            <History className="w-4 h-4" />

            <span>
              Histórico de Aberturas ({boxHistory.length})
            </span>
          </button>
        </div>

        {selectedTab === 'BOXES' && (
          <div className="flex items-center gap-1 bg-black/25 p-1 rounded-lg border border-white/[0.06] text-xs font-mono">
            <button
              onClick={() =>
                setCategoryFilter('GENERAL')
              }
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                categoryFilter === 'GENERAL'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Essenciais (5)
            </button>

            <button
              onClick={() =>
                setCategoryFilter('COLLECTIONS')
              }
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                categoryFilter === 'COLLECTIONS'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Temáticas (8)
            </button>
          </div>
        )}
      </div>

      {/* CAIXAS */}
      {selectedTab === 'BOXES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-cyan-300">
                {categoryFilter === 'GENERAL' ? 'Progressão de suprimentos' : 'Caixas de coleção'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {categoryFilter === 'GENERAL'
                  ? 'Comece pelas caixas essenciais e avance conforme seu saldo e objetivo de raridade.'
                  : 'Escolha uma temática quando quiser concentrar suas chances em uma coleção específica.'}
              </p>
            </div>
            <span className="text-[10px] font-mono text-slate-500 uppercase">{filteredBoxTypes.length} opções</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredBoxTypes.map((type) => {
            const def = BOX_DEFINITIONS[type];

            if (!def) {
              return null;
            }

            const count = boxCounts[type] || 0;
            const hasBox = count > 0;
            const isRecruit = type === 'RECRUIT';

            const canAfford =
              user.balanceNEX >= def.priceNEX;
            const ownedOrigins = Array.from(
              new Set(
                myBoxes
                  .filter((box) => box.boxType === type)
                  .map((box) => getBoxOriginLabel(box.source))
                  .filter(Boolean)
              )
            );

            return (
              <div
                key={type}
                className="rounded-2xl bg-[#090a0f] border border-white/[0.08] hover:border-cyan-500/30 transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* IMAGEM */}
                <div className="relative aspect-[16/8] overflow-hidden bg-slate-950">
                  <img
                    src={def.image}
                    alt={def.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-[#090a0f]/35 to-black/10" />

                  <div
                    className="absolute inset-x-0 bottom-0 h-20 opacity-35 pointer-events-none"
                    style={{
                      background: `linear-gradient(to top, ${def.accentColor}35, transparent)`,
                    }}
                  />

                  <div className="absolute top-3 left-3">
                    <span
                      className="px-2.5 py-1 rounded-md text-[9px] font-mono font-bold tracking-wider uppercase border backdrop-blur-md"
                      style={{
                        backgroundColor: `${def.accentColor}25`,
                        borderColor: `${def.accentColor}60`,
                        color: def.accentColor,
                      }}
                    >
                      {def.badge}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border backdrop-blur-md ${
                        hasBox
                          ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                          : 'bg-black/70 border-white/10 text-slate-400'
                      }`}
                    >
                      Possui: {count}
                    </span>
                  </div>
                </div>

                {/* CONTEÚDO */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div
                      className="mb-3 h-px w-full opacity-60"
                      style={{
                        background: `linear-gradient(90deg, ${def.accentColor}, transparent)`,
                      }}
                    />

                    <h3 className="font-heading text-lg font-black text-white">
                      {def.name}
                    </h3>

                    <p className="text-[11px] font-mono text-cyan-400 mt-0.5">
                      {def.tagline}
                    </p>

                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      {def.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="line-clamp-2">{def.guarantees}</span>
                  </div>

                  {ownedOrigins.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {ownedOrigins.map((origin) => (
                        <span key={origin} className="px-2 py-1 rounded-md bg-cyan-500/[0.07] border border-cyan-500/15 text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-300">
                          {origin}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* PREÇO */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/[0.06] font-mono text-xs">
                    <span className="text-slate-400">
                      Preço:
                    </span>

                    {def.purchasableWithNEX ? (
                      <span className="inline-flex items-center gap-1.5 font-bold text-amber-400 text-sm">
                        <Coins className="w-4 h-4" />

                        {formatEconomicValue(
                          def.priceNEX
                        )}{' '}
                        NEX
                      </span>
                    ) : (
                      <span className="text-cyan-400 font-bold">
                        {isRecruit
                          ? 'Inicial de Recruta (Grátis)'
                          : 'Conquista / Evento'}
                      </span>
                    )}
                  </div>

                  {/* RARIDADES */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Raridades Possíveis
                    </span>

                    <div className="flex flex-wrap gap-1">
                      {def.possibleRarities.map(
                        (rarity) => (
                          <RarityBadge
                            key={rarity}
                            rarity={rarity}
                            size="xs"
                          />
                        )
                      )}
                    </div>
                  </div>

                  {/* AÇÕES */}
                  <div className="pt-2 border-t border-white/[0.06] space-y-2">
                    {hasBox && (
                      <button
                        onClick={() =>
                          handleOpenBox(type)
                        }
                        className="w-full py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 hover:scale-[1.01]"
                      >
                        <PackageOpen className="w-4 h-4" />

                        <span>
                          ABRIR CAIXA ({count})
                        </span>
                      </button>
                    )}

                    {def.purchasableWithNEX && (
                      <button
                        onClick={() =>
                          handleBuyBox(type)
                        }
                        disabled={
                          isPurchasing ||
                          !canAfford
                        }
                        className={`w-full py-3 rounded-xl border text-xs font-heading font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                          canAfford &&
                          !isPurchasing
                            ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-500/10'
                            : 'bg-white/5 border-white/10 text-slate-500 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <Coins className="w-4 h-4 text-emerald-400" />

                        <span>
                          {isPurchasing
                            ? 'Processando...'
                            : canAfford
                            ? `COMPRAR POR ${formatEconomicValue(
                                def.priceNEX
                              )} NEX`
                            : `SALDO INSUFICIENTE (${formatEconomicValue(
                                def.priceNEX
                              )} NEX)`}
                        </span>
                      </button>
                    )}

                    <button
                      onClick={() =>
                        setRewardModalBoxType(type)
                      }
                      className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />

                      <span>
                        Ver Recompensas & Probabilidades
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* HISTÓRICO */}
      {selectedTab === 'HISTORY' && (
        <div className="rounded-2xl bg-[#090a0f] border border-white/[0.08] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-cyan-400" />

              <span>
                Registro de Aberturas de Caixas
              </span>
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
                onClick={() =>
                  setSelectedTab('BOXES')
                }
                className="mt-3 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-xs font-mono"
              >
                Explorar caixas disponíveis
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {boxHistory.map((record) => (
                <div
                  key={record.id}
                  className="p-4 rounded-xl bg-black/25 border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-white/15 transition-all font-mono"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                      <PackageOpen className="w-4 h-4 text-cyan-400" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {record.boxName}
                        </span>

                        <RarityBadge
                          rarity={
                            record.highestRarity
                          }
                          size="xs"
                        />
                      </div>

                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {record.rewardAssetNames.join(
                          ', '
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-xs text-slate-400">
                    <span className="block font-mono">
                      {new Date(
                        record.openedAt
                      ).toLocaleString('pt-BR')}
                    </span>

                    <span className="text-[10px] text-cyan-400">
                      ID:{' '}
                      {record.id.substring(0, 12)}
                      ...
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE ABERTURA */}
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

              setTimeout(
                () =>
                  handleOpenBox(
                    openingBoxType
                  ),
                250
              );
            }
          }}
          hasMoreBoxes={
            openingBoxType
              ? (boxCounts[openingBoxType] ||
                  0) > 0
              : false
          }
        />
      )}

      {/* MODAL DE RECOMPENSAS */}
      {rewardModalBoxType && (
        <BoxRewardsModal
          boxType={rewardModalBoxType}
          isOpen={!!rewardModalBoxType}
          onClose={() =>
            setRewardModalBoxType(null)
          }
        />
      )}

      {/* TESTES */}
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
                    Bateria de Testes do Sistema
                    (8 Testes)
                  </h3>

                  <p className="text-xs font-mono text-slate-400">
                    Validação em tempo real de saldo
                    atômico, limites, caixas e
                    integridade.
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  setTestModalOpen(false)
                }
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/10 text-xs font-mono">
              <div>
                <span className="text-slate-400">
                  Status geral:{' '}
                </span>

                {isRunningTests ? (
                  <span className="text-cyan-400 font-bold animate-pulse">
                    Executando asserções...
                  </span>
                ) : testReport ? (
                  <span className="text-emerald-400 font-bold">
                    {testReport.passed}/
                    {testReport.total} Testes
                    Aprovados (
                    {Math.round(
                      (testReport.passed /
                        testReport.total) *
                        100
                    )}
                    %)
                  </span>
                ) : (
                  <span className="text-slate-400">
                    Pronto para iniciar
                  </span>
                )}
              </div>

              <button
                onClick={handleRunTests}
                disabled={isRunningTests}
                className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all disabled:opacity-50"
              >
                {isRunningTests
                  ? 'Testando...'
                  : 'Reexecutar Testes'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {testReport?.results.map(
                (result) => (
                  <div
                    key={result.id}
                    className={`p-3.5 rounded-2xl border transition-all text-xs font-mono ${
                      result.passed
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                        : 'bg-red-950/20 border-red-500/30 text-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white">
                        {result.title}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          result.passed
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {result.passed
                          ? 'APROVADO'
                          : 'FALHOU'}
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] space-y-0.5 text-slate-300">
                      <div>
                        <span className="text-slate-500">
                          Esperado:{' '}
                        </span>

                        {result.expected}
                      </div>

                      <div>
                        <span className="text-slate-500">
                          Resultado:{' '}
                        </span>

                        {result.actual}
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() =>
                  setTestModalOpen(false)
                }
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
