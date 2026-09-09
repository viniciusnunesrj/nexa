import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import { NexaAsset, Character, Rarity, BoxRewardSummary, BoxType } from '../types';
import { RARITY_CONFIG } from '../config/designTokens';
import { BOX_DEFINITIONS } from '../config/boxRates';
import { AssetCard } from '../components/common/AssetCard';
import { AssetModal } from '../components/modals/AssetModal';
import { SellModal } from '../components/modals/SellModal';
import { TradeProposalModal } from '../components/modals/TradeProposalModal';
import { BoxOpeningModal } from '../components/boxes/BoxOpeningModal';
import { RarityBadge } from '../components/common/RarityBadge';
import {
  Package,
  PackageOpen,
  Search,
  Filter,
  ArrowUpDown,
  Sparkles,
  Zap,
  Shield,
  Layers,
  Repeat,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface InventoryProps {
  onNavigate: (page: string) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const {
    assets,
    equipCharacter,
    listAsset,
    boxes,
    fragments,
    openBox,
    unlockCharacterWithFragments,
  } = useGameState();

  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [selectedRarity, setSelectedRarity] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<'power_desc' | 'power_asc' | 'rarity' | 'recent'>('power_desc');

  // Modals
  const [inspectedAsset, setInspectedAsset] = useState<NexaAsset | null>(null);
  const [sellingAsset, setSellingAsset] = useState<NexaAsset | null>(null);
  const [tradingAsset, setTradingAsset] = useState<NexaAsset | null>(null);
  const [activeOpeningSummary, setActiveOpeningSummary] = useState<BoxRewardSummary | null>(null);

  const myAssets = assets.filter((a) => a.ownerId === user.id);
  const myBoxes = boxes.filter((b) => b.ownerId === user.id);
  const myFragments = fragments.filter((f) => f.userId === user.id);

  // Tab categories
  const tabs = [
    { id: 'ALL', label: 'Todos os Ativos', count: myAssets.length },
    {
      id: 'BOXES',
      label: 'Caixas',
      count: myBoxes.length,
    },
    {
      id: 'Card',
      label: 'Cartas',
      count: myAssets.filter((a) => a.type === 'Card').length,
    },
    {
      id: 'FRAGMENTS',
      label: 'Fragmentos',
      count: myFragments.length,
    },
    {
      id: 'Character',
      label: 'Personagens',
      count: myAssets.filter((a) => a.type === 'Character').length,
    },
    {
      id: 'Weapon',
      label: 'Armas',
      count: myAssets.filter((a) => a.type === 'Weapon').length,
    },
    {
      id: 'Armor',
      label: 'Armaduras',
      count: myAssets.filter((a) => a.type === 'Armor').length,
    },
    {
      id: 'Artifact',
      label: 'Artefatos & Skins',
      count: myAssets.filter((a) => a.type === 'Artifact' || a.type === 'Skin').length,
    },
  ];

  const rarityRank: Record<Rarity, number> = {
    Comum: 1,
    Incomum: 2,
    Raro: 3,
    Épico: 4,
    Lendário: 5,
    Mítico: 6,
  };

  const filteredAssets = myAssets.filter((asset) => {
    if (activeTab === 'Artifact') {
      if (asset.type !== 'Artifact' && asset.type !== 'Skin') return false;
    } else if (activeTab !== 'ALL' && asset.type !== activeTab) {
      return false;
    }

    if (selectedRarity !== 'ALL' && asset.rarity !== selectedRarity) {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = asset.name.toLowerCase().includes(q);
      const matchDesc = asset.description.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }

    return true;
  });

  filteredAssets.sort((a, b) => {
    if (sortBy === 'power_desc') return b.power - a.power;
    if (sortBy === 'power_asc') return a.power - b.power;
    if (sortBy === 'rarity') return (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const totalPower = myAssets.reduce((acc, curr) => acc + ('power' in curr ? curr.power : 0), 0);

  return (
    <div className="space-y-8">
      {/* Top Header & Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider">
            <Package className="w-4 h-4" /> Gestão de Ativos Digitais
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white mt-1">
            Meu Inventário & Arsenal
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Gerencie seus personagens, armamentos e relíquias. Equipe heróis para a arena ou queime matérias no reator de fusão.
          </p>
        </div>

        {/* Quick Power summary */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 font-mono text-xs flex items-center gap-3">
            <div>
              <span className="text-slate-500 uppercase text-[10px] block">Poder Agregado</span>
              <span className="font-bold text-base text-cyan-300">{totalPower.toLocaleString()} PWR</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div>
              <span className="text-slate-500 uppercase text-[10px] block">Coleção</span>
              <span className="font-bold text-base text-white">{myAssets.length} Ativos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 flex items-center gap-2 overflow-x-auto pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-3.5 font-heading font-bold text-sm tracking-wide transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'bg-white/5 text-slate-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter and Search bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar seu arsenal por nome ou atributo..."
            className="w-full bg-[#0d0d15] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Rarity filter */}
          <select
            value={selectedRarity}
            onChange={(e) => setSelectedRarity(e.target.value)}
            className="bg-[#0d0d15] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">Todas Raridades</option>
            <option value="Comum">Comum</option>
            <option value="Incomum">Incomum</option>
            <option value="Raro">Raro</option>
            <option value="Épico">Épico</option>
            <option value="Lendário">Lendário</option>
            <option value="Mítico">Mítico</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#0d0d15] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-400"
          >
            <option value="power_desc">Maior Poder</option>
            <option value="power_asc">Menor Poder</option>
            <option value="rarity">Maior Raridade</option>
            <option value="recent">Mais Recentes</option>
          </select>
        </div>
      </div>

      {/* Filter and Content Area */}
      {activeTab === 'BOXES' ? (
        /* BOXES INVENTORY VIEW */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <PackageOpen className="w-5 h-5 text-cyan-400" />
                <span>Minhas Caixas de Suprimento</span>
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Abra suas caixas conquistadas em combate ou adquiridas com NEX.
              </p>
            </div>
            <button
              onClick={() => onNavigate('boxes')}
              className="px-4 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/30 text-xs font-mono font-bold transition-all"
            >
              Loja de Caixas
            </button>
          </div>

          {myBoxes.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-[#0a0a10] border border-dashed border-white/10 p-8">
              <PackageOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h4 className="font-heading text-lg font-bold text-white">Nenhuma caixa no inventário</h4>
              <p className="text-xs text-slate-400 font-mono mt-1 max-w-sm mx-auto">
                Vença batalhas na Arena para receber drops de Caixas Básicas ou visite a central de caixas.
              </p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={() => onNavigate('play')}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-black text-xs uppercase tracking-wider transition-colors"
                >
                  Batalhar na Arena
                </button>
                <button
                  onClick={() => onNavigate('boxes')}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-heading font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Ver Central de Caixas
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(Array.from(new Set(myBoxes.map((b) => b.boxType))) as BoxType[]).map((type) => {
                const boxesOfType = myBoxes.filter((b) => b.boxType === type);
                if (boxesOfType.length === 0) return null;
                const sampleBox = boxesOfType[0];
                const def = BOX_DEFINITIONS[type] || {
                  name: sampleBox.name,
                  image: sampleBox.image || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80',
                  accentColor: '#06b6d4',
                  badge: 'Caixa de Suprimento',
                  guarantees: 'Recompensas exclusivas do sistema NEXA',
                };

                return (
                  <div
                    key={type}
                    className="rounded-2xl bg-[#0e0e1a] border border-white/10 p-5 flex flex-col justify-between space-y-4 relative overflow-hidden shadow-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/20 shrink-0">
                        <img src={def.image} alt={def.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span
                          className="px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider font-bold border"
                          style={{
                            color: def.accentColor,
                            borderColor: `${def.accentColor}50`,
                            backgroundColor: `${def.accentColor}15`,
                          }}
                        >
                          {def.badge}
                        </span>
                        <h4 className="font-heading text-base font-black text-white truncate mt-1">
                          {def.name}
                        </h4>
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          {boxesOfType.length} unidade{boxesOfType.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Garantias & Raridades Possíveis
                      </span>
                      <p className="text-xs font-mono text-slate-300">
                        {def.guarantees}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        try {
                          const summary = openBox(sampleBox.id);
                          setActiveOpeningSummary(summary);
                        } catch {
                          // Toast handled in context
                        }
                      }}
                      className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2"
                    >
                      <PackageOpen className="w-4 h-4" />
                      <span>ABRIR CAIXA</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'FRAGMENTS' ? (
        /* FRAGMENTS INVENTORY VIEW (Requirement 11) */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <Repeat className="w-5 h-5 text-amber-400" />
                <span>Fragmentos de Personagem</span>
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Personagens repetidos em caixas são convertidos em fragmentos. Reúna 100 para desbloquear ou sintetizar o herói.
              </p>
            </div>
          </div>

          {myFragments.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-[#0a0a10] border border-dashed border-white/10 p-8">
              <Repeat className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h4 className="font-heading text-lg font-bold text-white">Nenhum fragmento acumulado</h4>
              <p className="text-xs text-slate-400 font-mono mt-1 max-w-sm mx-auto">
                Quando você obtém um personagem que já possui ao abrir caixas de suprimento, ele é automaticamente convertido em fragmentos!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {myFragments.map((frag) => {
                const required = 100;
                const canUnlock = frag.amount >= required;
                const pct = Math.min(100, Math.round((frag.amount / required) * 100));

                return (
                  <div
                    key={frag.id}
                    className="rounded-2xl bg-[#0e0e1a] border border-white/10 p-5 flex flex-col justify-between space-y-4 shadow-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0"
                        style={{ borderColor: RARITY_CONFIG[frag.characterRarity]?.color || '#06b6d4' }}
                      >
                        <img src={frag.characterImage} alt={frag.characterName} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <RarityBadge rarity={frag.characterRarity} size="sm" />
                        <h4 className="font-heading text-base font-black text-white truncate mt-1">
                          {frag.characterName}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 block">
                          Sintetização Quântica
                        </span>
                      </div>
                    </div>

                    {/* Progress indicator (e.g., 72 / 100) */}
                    <div className="space-y-1.5 p-3 rounded-xl bg-black/40 border border-white/5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Progresso</span>
                        <span className="font-bold text-white">
                          <strong className={canUnlock ? 'text-emerald-400' : 'text-amber-400'}>
                            {frag.amount}
                          </strong>{' '}
                          / {required}
                        </span>
                      </div>

                      <div className="h-2 rounded-full bg-slate-900 border border-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${pct}%`,
                            background: canUnlock
                              ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                              : 'linear-gradient(90deg, #f59e0b, #ef4444)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Button [ DESBLOQUEAR ] - disabled if < 100 */}
                    <button
                      onClick={() => unlockCharacterWithFragments(frag.id)}
                      disabled={!canUnlock}
                      className={`w-full py-3 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                        canUnlock
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer'
                          : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {canUnlock ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>DESBLOQUEAR HERÓI</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>DESBLOQUEAR (Faltam {required - frag.amount})</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* STANDARD ASSETS VIEW */
        <>
          {filteredAssets.length === 0 ? (
            <div className="py-20 text-center rounded-3xl bg-[#0a0a10] border border-dashed border-white/10 p-8">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h4 className="font-heading text-lg font-bold text-white">Nenhum ativo nesta categoria</h4>
              <p className="text-xs text-slate-400 font-mono mt-1 max-w-sm mx-auto">
                Vença batalhas na Arena para conquistar novas relíquias ou adquira itens no Marketplace.
              </p>
              <button
                onClick={() => onNavigate('play')}
                className="mt-4 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-black text-xs uppercase tracking-wider transition-colors"
              >
                Ir para a Arena
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onClick={() => setInspectedAsset(asset)}
                  actionButton={
                    <div className="flex items-center gap-1.5 pt-1">
                      {asset.type === 'Character' && !asset.isEquipped && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            equipCharacter(asset.id);
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 border border-cyan-500/30 text-[11px] font-mono font-bold transition-colors"
                        >
                          Equipar
                        </button>
                      )}

                      {asset.status === 'IDLE' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSellingAsset(asset);
                            }}
                            className="flex-1 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold transition-colors"
                          >
                            Vender
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTradingAsset(asset);
                            }}
                            className="flex-1 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-500 hover:text-white text-purple-300 border border-purple-500/30 text-[11px] font-mono font-bold transition-colors"
                          >
                            Trocar
                          </button>
                        </>
                      )}
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Box Opening Modal */}
      {activeOpeningSummary && (
        <BoxOpeningModal
          summary={activeOpeningSummary}
          onClose={() => setActiveOpeningSummary(null)}
        />
      )}

      {/* Detailed Modal */}
      <AssetModal
        asset={inspectedAsset}
        onClose={() => setInspectedAsset(null)}
        isOwner={true}
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
    </div>
  );
};
