import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import { Listing, NexaAsset, Rarity, AssetType } from '../types';
import { RARITY_CONFIG } from '../config/designTokens';
import { RarityBadge } from '../components/common/RarityBadge';
import { CurrencyBadge } from '../components/common/CurrencyBadge';
import { AssetModal } from '../components/modals/AssetModal';
import { SellModal } from '../components/modals/SellModal';
import {
  ShoppingBag,
  Search,
  Filter,
  ArrowUpDown,
  Tag,
  Zap,
  TrendingUp,
  Coins,
  Check,
  AlertCircle,
} from 'lucide-react';

interface MarketplaceProps {
  onNavigate: (page: string) => void;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { listings, assets, marketStats, buyListing, cancelListing, listAsset } = useGameState();

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedRarity, setSelectedRarity] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'power_desc' | 'recent'>('recent');

  // Modals state
  const [inspectedAsset, setInspectedAsset] = useState<NexaAsset | null>(null);
  const [sellingAsset, setSellingAsset] = useState<NexaAsset | null>(null);
  const [sellPickerOpen, setSellPickerOpen] = useState(false);
  const [buyingListing, setBuyingListing] = useState<Listing | null>(null);

  // User available items to list
  const userIdleAssets = assets.filter(
    (a) => a.ownerId === user.id && a.status === 'IDLE'
  );

  // Filter listings
  const filteredListings = listings.filter((l) => {
    if (l.status !== 'ACTIVE') return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = l.itemSnapshot.name.toLowerCase().includes(q);
      const matchSeller = l.sellerName.toLowerCase().includes(q);
      const matchDesc = l.itemSnapshot.description.toLowerCase().includes(q);
      if (!matchName && !matchSeller && !matchDesc) return false;
    }

    // Type filter
    if (selectedType !== 'ALL' && l.itemSnapshot.type !== selectedType) {
      return false;
    }

    // Rarity filter
    if (selectedRarity !== 'ALL' && l.itemSnapshot.rarity !== selectedRarity) {
      return false;
    }

    return true;
  });

  // Sort listings
  filteredListings.sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'power_desc') return b.itemSnapshot.power - a.itemSnapshot.power;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleConfirmBuy = (listing: Listing) => {
    buyListing(listing.id);
    setBuyingListing(null);
  };

  return (
    <div className="space-y-8">
      {/* Top Header & Market Metrics */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider">
            <ShoppingBag className="w-4 h-4" /> Mercado P2P Descentralizado
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white mt-1">
            Marketplace NEXA
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Compre e venda personagens e itens diretamente entre jogadores. Taxa de corretagem de 2% para manutenção do ecossistema.
          </p>
        </div>

        {/* Action Button: List My Item */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSellPickerOpen(true)}
            className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.35)] flex items-center gap-2 hover:scale-105"
          >
            <Tag className="w-4 h-4" />
            <span>Anunciar Item Meu</span>
          </button>
        </div>
      </div>

      {/* Market Statistics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-[#090910] border border-white/10 font-mono text-xs">
        <div className="p-2 border-r border-white/5">
          <span className="text-slate-500 uppercase text-[10px] block">Piso do Mercado</span>
          <span className="font-bold text-base text-amber-400">
            {marketStats.currentFloorPrice.toLocaleString()} NXA
          </span>
        </div>
        <div className="p-2 sm:border-r border-white/5">
          <span className="text-slate-500 uppercase text-[10px] block">Última Venda</span>
          <span className="font-bold text-base text-cyan-400">
            {marketStats.lastSalePrice.toLocaleString()} NXA
          </span>
        </div>
        <div className="p-2 border-r border-white/5">
          <span className="text-slate-500 uppercase text-[10px] block">Volume Global</span>
          <span className="font-bold text-base text-purple-400">
            {marketStats.totalVolumeNXA.toLocaleString()} NXA
          </span>
        </div>
        <div className="p-2">
          <span className="text-slate-500 uppercase text-[10px] block">Anúncios Ativos</span>
          <span className="font-bold text-base text-slate-200">
            {filteredListings.length} disponíveis
          </span>
        </div>
      </div>

      {/* Search & Filters Controls */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome do item, descrição ou vendedor..."
              className="w-full bg-[#0d0d15] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#0d0d15] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-400"
            >
              <option value="recent">Mais Recentes</option>
              <option value="price_asc">Menor Preço</option>
              <option value="price_desc">Maior Preço</option>
              <option value="power_desc">Maior Poder (PWR)</option>
            </select>
          </div>
        </div>

        {/* Category and Rarity Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Type filters */}
          <div className="flex flex-wrap gap-1.5">
            {['ALL', 'Character', 'Weapon', 'Armor', 'Artifact', 'Skin'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                  selectedType === type
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                {type === 'ALL' ? 'Todas Categorias' : type}
              </button>
            ))}
          </div>

          {/* Rarity filters */}
          <div className="flex flex-wrap gap-1.5">
            {['ALL', 'Comum', 'Incomum', 'Raro', 'Épico', 'Lendário', 'Mítico'].map((rarity) => (
              <button
                key={rarity}
                onClick={() => setSelectedRarity(rarity)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                  selectedRarity === rarity
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                {rarity === 'ALL' ? 'Todas Raridades' : rarity}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Listings Grid */}
      {filteredListings.length === 0 ? (
        <div className="py-20 text-center rounded-3xl bg-[#0a0a10] border border-dashed border-white/10 p-8">
          <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="font-heading text-lg font-bold text-white">Nenhum item encontrado</h4>
          <p className="text-xs text-slate-400 font-mono mt-1 max-w-sm mx-auto">
            Tente redefinir os filtros de pesquisa ou anuncie seu próprio item para iniciar as negociações.
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedType('ALL');
              setSelectedRarity('ALL');
            }}
            className="mt-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-cyan-400 hover:bg-white/10 transition-colors"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredListings.map((listing) => {
            const asset = listing.itemSnapshot;
            const rarity = RARITY_CONFIG[asset.rarity] || RARITY_CONFIG.Comum;
            const isMine = listing.sellerId === user.id;

            return (
              <div
                key={listing.id}
                className={`flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 backdrop-blur-md bg-[#0c0c14] ${
                  rarity.border
                } ${rarity.borderHover} hover:scale-[1.015] shadow-lg`}
              >
                {/* Visual Image */}
                <div
                  onClick={() => setInspectedAsset(asset)}
                  className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950 cursor-pointer group"
                >
                  <img
                    src={asset.image}
                    alt={asset.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c14] via-transparent to-black/30" />

                  <div className="absolute top-2.5 left-2.5">
                    <RarityBadge rarity={asset.rarity} size="sm" />
                  </div>

                  <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="bg-black/70 px-2 py-0.5 rounded border border-white/10 uppercase">
                      {asset.type}
                    </span>
                    <span className="text-cyan-400 font-bold">{asset.power} PWR</span>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <h4
                      onClick={() => setInspectedAsset(asset)}
                      className="font-heading text-base font-bold text-white hover:text-cyan-300 transition-colors cursor-pointer truncate"
                    >
                      {asset.name}
                    </h4>

                    {/* Seller row */}
                    <div className="flex items-center gap-2 mt-2 text-xs font-mono text-slate-400">
                      <img
                        src={listing.sellerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                        alt={listing.sellerName}
                        className="w-5 h-5 rounded-full object-cover border border-white/20"
                      />
                      <span className="truncate">{listing.sellerName}</span>
                      {isMine && (
                        <span className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded">
                          (Você)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price & Action Button */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Preço</span>
                      <span className="font-heading text-lg font-black text-cyan-300">
                        {listing.price.toLocaleString()} <span className="text-xs font-mono">NXA</span>
                      </span>
                    </div>

                    {isMine ? (
                      <button
                        onClick={() => cancelListing(listing.id)}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-300 font-mono text-xs transition-colors"
                      >
                        Cancelar
                      </button>
                    ) : (
                      <button
                        onClick={() => setBuyingListing(listing)}
                        className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-black text-xs uppercase tracking-wider transition-colors shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                      >
                        Comprar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Buy Confirmation Modal */}
      {buyingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-[#0d0d16] border border-cyan-500/40 p-6 shadow-2xl">
            <h3 className="font-heading text-xl font-bold text-white mb-1">
              Confirmar Aquisição P2P
            </h3>
            <p className="text-xs text-slate-400 font-mono mb-4">
              A transação é validada e executada de forma atômica no livro-razão.
            </p>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3 mb-4">
              <img
                src={buyingListing.itemSnapshot.image}
                alt={buyingListing.itemSnapshot.name}
                className="w-14 h-14 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <h4 className="font-heading font-bold text-sm text-white truncate">
                  {buyingListing.itemSnapshot.name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <RarityBadge rarity={buyingListing.itemSnapshot.rarity} size="sm" />
                  <span className="text-xs font-mono text-cyan-400">{buyingListing.itemSnapshot.power} PWR</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 p-3.5 rounded-xl bg-slate-950 border border-white/5 text-xs font-mono mb-5">
              <div className="flex justify-between text-slate-400">
                <span>Vendedor:</span>
                <span className="text-slate-200">{buyingListing.sellerName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Preço do Item:</span>
                <span className="text-white font-bold">{buyingListing.price.toLocaleString()} NXA</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Taxa da Plataforma (2% já inclusa):</span>
                <span className="text-slate-400">{(buyingListing.price * 0.02).toFixed(1)} NXA</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between font-bold">
                <span>Seu Saldo Restante:</span>
                <span className={user.balanceNXA >= buyingListing.price ? 'text-emerald-400' : 'text-rose-400'}>
                  {(user.balanceNXA - buyingListing.price).toLocaleString()} NXA
                </span>
              </div>
            </div>

            {user.balanceNXA < buyingListing.price ? (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Saldo insuficiente! Você possui apenas {user.balanceNXA} NXA.</span>
              </div>
            ) : null}

            <div className="flex gap-2.5">
              <button
                onClick={() => setBuyingListing(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={() => handleConfirmBuy(buyingListing)}
                disabled={user.balanceNXA < buyingListing.price}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-mono text-xs font-bold transition-colors shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                Confirmar Compra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select Item To Sell Modal */}
      {sellPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[#0c0c16] border border-amber-500/40 p-6 shadow-2xl">
            <h3 className="font-heading text-xl font-bold text-white mb-1">
              Escolha um Ativo para Anunciar
            </h3>
            <p className="text-xs text-slate-400 font-mono mb-4">
              Apenas ativos livres (IDLE) que você possui podem ser listados no mercado.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4">
              {userIdleAssets.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-mono text-xs">
                  Você não possui ativos disponíveis para venda no momento.
                </div>
              ) : (
                userIdleAssets.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSellingAsset(item);
                      setSellPickerOpen(false);
                    }}
                    className="p-3 rounded-xl bg-white/5 hover:bg-amber-950/30 border border-white/5 hover:border-amber-500/40 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                      <div>
                        <h4 className="font-heading font-bold text-sm text-white">{item.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <RarityBadge rarity={item.rarity} size="sm" />
                          <span className="text-[11px] font-mono text-slate-400">{item.type}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-amber-400 font-bold px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      Anunciar →
                    </span>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setSellPickerOpen(false)}
              className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Asset Inspection Modal */}
      <AssetModal
        asset={inspectedAsset}
        onClose={() => setInspectedAsset(null)}
        isOwner={inspectedAsset?.ownerId === user.id}
      />

      {/* Sell Modal */}
      <SellModal
        asset={sellingAsset}
        onClose={() => setSellingAsset(null)}
        onConfirmList={(id, price) => listAsset(id, price)}
      />
    </div>
  );
};
