import { isSupabaseConfigured } from '../lib/supabase';
import { canSellOnlineCard } from '../services/marketplaceOnlineService';
import { getCardPower } from '../utils/cardPower';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import { NexaAsset, Character, Rarity, BoxRewardSummary, BoxType, CardFragment } from '../types';
import { RARITY_CONFIG } from '../config/designTokens';
import { BOX_DEFINITIONS } from '../config/boxRates';
import { CARD_FRAGMENT_IMAGE } from '../config/fragmentVisual';
import { AssetCard } from '../components/common/AssetCard';
import { AssetModal } from '../components/modals/AssetModal';
import { SellModal } from '../components/modals/SellModal';
import { TradeProposalModal } from '../components/modals/TradeProposalModal';
import { BoxOpeningModal } from '../components/boxes/BoxOpeningModal';
import { RarityBadge } from '../components/common/RarityBadge';
import { FragmentDetailsModal } from '../components/modals/FragmentDetailsModal';
import {
  Package,
  Trash2,
  PackageOpen,
  Search,
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
cardFragments,
openBox,
craftCardWithFragments,
fragmentListings,
listFragments,
marketplaceBusy,
refreshFragmentMarketplace,
  } = useGameState();

  useEffect(() => {
    if (isSupabaseConfigured()) void refreshFragmentMarketplace();
  }, [user.id]);

  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [selectedRarity, setSelectedRarity] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<'power_desc' | 'power_asc' | 'rarity' | 'recent'>('power_desc');

  // Modals
  const [inspectedAsset, setInspectedAsset] = useState<NexaAsset | null>(null);
  const [sellingAsset, setSellingAsset] = useState<NexaAsset | null>(null);
  const [tradingAsset, setTradingAsset] = useState<NexaAsset | null>(null);
  const [activeOpeningSummary, setActiveOpeningSummary] = useState<BoxRewardSummary | null>(null);
  const [inspectedFragment, setInspectedFragment] = useState<CardFragment | null>(null);

  const myAssets = assets.filter((a) => a.ownerId === user.id && a.type !== 'Character');
  const isEquipment = (asset: NexaAsset) => ['Weapon', 'Armor', 'Artifact', 'Skin'].includes(asset.type);
  const displayPower = (asset: NexaAsset) => asset.type === 'Card' ? getCardPower(asset) : asset.power;
  const myBoxes = boxes.filter((b) => b.ownerId === user.id);
  const myFragments = cardFragments.filter((f) => f.ownerId === user.id);

  // Tab categories
  const tabs = [
    { id: 'ALL', label: 'Todos os Ativos', count: myAssets.length },
    { id: 'Card', label: 'Cartas', count: myAssets.filter(a => a.type === 'Card').length },
    { id: 'BOXES', label: 'Caixas', count: myBoxes.length },
    { id: 'FRAGMENTS', label: 'Fragmentos', count: myFragments.length },
    { id: 'EQUIPMENT', label: 'Equipamentos', count: myAssets.filter(isEquipment).length },
  ];

  const rarityRank: Record<Rarity, number> = {
    Comum: 1,
    Incomum: 2,
    Raro: 3,
    Épico: 4,
    Lendário: 5,
    Mítico: 6,
  };

  const filteredFragments = myFragments.filter((fragment) => {
    if (selectedRarity !== 'ALL' && fragment.cardRarity !== selectedRarity) return false;
    const term = search.trim().toLowerCase();
    return !term || fragment.cardName.toLowerCase().includes(term);
  }).sort((a, b) => {
    if (sortBy === 'power_desc') return b.amount - a.amount;
    if (sortBy === 'power_asc') return a.amount - b.amount;
    if (sortBy === 'rarity') return rarityRank[b.cardRarity] - rarityRank[a.cardRarity];
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const filteredAssets = myAssets.filter((asset) => {
    if (activeTab === 'EQUIPMENT') {
      if (!isEquipment(asset)) return false;
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
    if (sortBy === 'power_desc' || sortBy === 'power_asc') {
      const powerA = displayPower(a);
      const powerB = displayPower(b);
      if (powerA == null && powerB == null) return 0;
      if (powerA == null) return 1;
      if (powerB == null) return -1;
      return sortBy === 'power_desc' ? powerB - powerA : powerA - powerB;
    }
    if (sortBy === 'rarity') return (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const cardPowers = myAssets.filter(a => a.type === 'Card').map(getCardPower);
  const totalPower = cardPowers.some(power => power === null) ? null : cardPowers.reduce<number>((sum, power) => sum + power!, 0);

  return (
    <div className="space-y-6">
      {/* Arsenal Command Header */}
      <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0b1018] via-[#090b11] to-[#07080c] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-cyan-500/[0.07] blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400 uppercase tracking-[0.2em]">
            <Package className="w-4 h-4" /> Arsenal // Inventário
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white mt-2 tracking-tight">
            Cofre de Ativos
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1.5 max-w-2xl">
            Consulte, organize e gerencie os ativos vinculados ao seu piloto.
          </p>
        </div>

        {/* Quick arsenal telemetry */}
        <div className="grid grid-cols-2 gap-2 sm:min-w-[330px]">
          <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/[0.04] px-4 py-3">
            <span className="block text-[9px] font-mono uppercase tracking-[0.16em] text-slate-500">Potência registrada</span>
            <span className="mt-1 block font-mono text-lg font-black text-cyan-300">
              {totalPower === null ? '—' : totalPower.toLocaleString('pt-BR')}
            </span>
            <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-700">PWR em cartas</span>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3">
            <span className="block text-[9px] font-mono uppercase tracking-[0.16em] text-slate-500">Ativos registrados</span>
            <span className="mt-1 block font-mono text-lg font-black text-white">{myAssets.length}</span>
            <span className="text-[9px] font-mono uppercase tracking-wider text-slate-600">no cofre</span>
          </div>
        </div>
        </div>
      </section>

      {/* Asset navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-white/[0.07] bg-[#090b10] p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-3.5 py-2 font-heading font-bold text-xs tracking-wide transition-all whitespace-nowrap flex items-center gap-2 border ${
              activeTab === tab.id
                ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 shadow-[inset_0_0_18px_rgba(6,182,212,0.04)]'
                : 'border-transparent text-slate-500 hover:bg-white/[0.035] hover:text-slate-200'
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

      {/* Arsenal controls */}
      <div className="flex flex-col sm:flex-row gap-2 rounded-xl border border-white/[0.07] bg-[#090b10]/80 p-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou descrição..."
            className="w-full bg-[#07090d] border border-white/[0.08] rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/10"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Rarity filter */}
          <select
            value={selectedRarity}
            onChange={(e) => setSelectedRarity(e.target.value)}
            className="bg-[#07090d] border border-white/[0.08] rounded-lg px-3 py-2.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500/60"
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
            className="bg-[#07090d] border border-white/[0.08] rounded-lg px-3 py-2.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500/60"
          >
            <option value="power_desc">{activeTab === 'FRAGMENTS' ? 'Maior Quantidade' : 'Maior Poder'}</option>
            <option value="power_asc">{activeTab === 'FRAGMENTS' ? 'Menor Quantidade' : 'Menor Poder'}</option>
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
                Consulte e abra as caixas atualmente registradas no seu inventário.
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
                Seu inventário não possui caixas disponíveis no momento. Consulte a Central de Caixas para ver as opções atuais.
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
                      onClick={async () => {
                        try {
                          const summary = await openBox(sampleBox.id);
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
                <span>Fragmentos de Carta</span>
              </h3>
              <p className="text-xs font-mono text-slate-400">
                Acompanhe os fragmentos registrados e o progresso necessário para cada síntese disponível.
              </p>
            </div>
          </div>

          {filteredFragments.length === 0 ? (
            <div className="py-16 text-center rounded-3xl bg-[#0a0a10] border border-dashed border-white/10 p-8">
              <Repeat className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h4 className="font-heading text-lg font-bold text-white">Nenhum fragmento encontrado</h4>
              <p className="text-xs text-slate-400 font-mono mt-1 max-w-sm mx-auto">
                {myFragments.length === 0 ? 'Nenhum fragmento está registrado para este piloto no momento.' : 'Nenhum fragmento corresponde aos filtros selecionados.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredFragments.map((frag) => {
                const required = 100;
                const activeListing = fragmentListings.find((listing) =>
                  listing.status === 'ACTIVE' && listing.sellerId === user.id && listing.templateId === frag.templateId);
                const reserved = activeListing?.quantity ?? 0;
                const available = Math.max(0, frag.amount - reserved);
                const canUnlock = available >= required;
                const pct = Math.min(100, Math.round((available / required) * 100));

                return (
                  <div
                    key={frag.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setInspectedFragment(frag)}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setInspectedFragment(frag); }}
                    className="rounded-2xl bg-[#0e0e1a] border border-white/10 hover:border-cyan-500/35 p-5 flex flex-col justify-between space-y-4 shadow-lg cursor-pointer transition-all hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0"
                        style={{ borderColor: RARITY_CONFIG[frag.cardRarity]?.color || '#06b6d4' }}
                      >
                        <img src={CARD_FRAGMENT_IMAGE} alt={`Fragmentos de ${frag.cardName}`} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <RarityBadge rarity={frag.cardRarity} size="sm" />
                        <h4 className="font-heading text-base font-black text-white truncate mt-1">
                          {frag.cardName}
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
                            {available}
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
                      {reserved > 0 && <div className="flex justify-between text-[10px] font-mono text-amber-400"><span>Reservados no Marketplace</span><strong>{reserved}</strong></div>}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={(event) => { event.stopPropagation(); setInspectedFragment(frag); }} className="py-3 rounded-xl bg-cyan-500/10 border border-cyan-400/25 text-cyan-300 font-heading font-black text-xs uppercase">Detalhes / Vender</button>
                      <button
                        onClick={(event) => { event.stopPropagation(); void craftCardWithFragments(frag.templateId); }}
                        disabled={!canUnlock || marketplaceBusy}
                        className={`py-3 rounded-xl font-heading font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${canUnlock ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'}`}
                      >
                        {canUnlock ? <><CheckCircle2 className="w-4 h-4" /><span>Forjar</span></> : <><Lock className="w-4 h-4" /><span>Faltam {required - available}</span></>}
                      </button>
                    </div>
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
                Nenhum ativo corresponde à categoria ou aos filtros selecionados.
              </p>
              <button
                onClick={() => onNavigate('play')}
                className="mt-4 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-black text-xs uppercase tracking-wider transition-colors"
              >
                Ir para a Arena
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 xl:gap-4">
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
                          {asset.type === 'Card' && asset.isStarter ? (
                            <>
                              <span className="flex-1 py-1.5 rounded-lg bg-slate-900/80 text-slate-400 border border-slate-700/60 text-[10px] font-mono font-bold text-center">
                                <Lock className="inline w-3 h-3 mr-1" /> Carta Inicial
                              </span>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const cardsLeft = myAssets.filter(a => a.type === 'Card').length - 1;
                                  const warning = cardsLeft < 4
                                    ? '\n\nATENÇÃO: você ficará com menos de 4 cartas e poderá ficar sem esquadrão suficiente para jogar.'
                                    : '';
                                  if (window.confirm('Destruir esta Carta Inicial permanentemente? Ela não poderá ser recuperada.' + warning)) {
                                    await destroyStarterCard(asset.id);
                                  }
                                }}
                                className="py-1.5 px-2.5 rounded-lg bg-red-950/60 hover:bg-red-500 hover:text-white text-red-300 border border-red-500/30 text-[11px] font-mono font-bold transition-colors"
                                title="Destruir Carta Inicial"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                          <>
                          {(!isSupabaseConfigured() || canSellOnlineCard(asset)) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSellingAsset(asset);
                            }}
                            className="flex-1 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/30 text-[11px] font-mono font-bold transition-colors"
                          >
                            Vender
                          </button>
                          )}
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

      <FragmentDetailsModal
        fragment={inspectedFragment}
        activeListing={inspectedFragment ? fragmentListings.find((listing) => listing.status === 'ACTIVE' && listing.sellerId === user.id && listing.templateId === inspectedFragment.templateId) : undefined}
        busy={marketplaceBusy}
        onClose={() => setInspectedFragment(null)}
        onList={listFragments}
        onCraft={async (templateId) => { await craftCardWithFragments(templateId); setInspectedFragment(null); }}
        onOpenMarketplace={() => {
          sessionStorage.setItem('nexa_marketplace_tab', 'fragments');
          setInspectedFragment(null);
          onNavigate('marketplace');
        }}
      />

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
