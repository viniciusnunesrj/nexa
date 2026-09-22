import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowUpDown, Puzzle, Search, Tag } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useGameState } from '../../contexts/GameStateContext';
import { FragmentListing, CardFragment } from '../../types';
import { RARITY_CONFIG } from '../../config/designTokens';
import { RarityBadge } from '../common/RarityBadge';
import { formatEconomicValue } from '../../utils/formatEconomicValue';
import { CARD_FRAGMENT_IMAGE } from '../../config/fragmentVisual';

export const FragmentMarketplacePanel: React.FC = () => {
  const { user } = useAuth();
  const {
    cardFragments, fragmentListings, marketplaceBusy,
    listFragments, cancelFragmentListing, buyFragmentListing,
  } = useGameState();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'price_asc' | 'price_desc' | 'quantity_desc'>('recent');
  const [selling, setSelling] = useState<CardFragment | null>(null);
  const [buying, setBuying] = useState<FragmentListing | null>(null);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeListings = useMemo(() => fragmentListings.filter((listing) => {
    if (listing.status !== 'ACTIVE') return false;
    const term = search.trim().toLowerCase();
    return !term || listing.cardName.toLowerCase().includes(term)
      || listing.sellerName.toLowerCase().includes(term);
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'quantity_desc') return b.quantity - a.quantity;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }), [fragmentListings, search, sortBy]);

  const ownActiveTemplates = new Set(
    fragmentListings.filter((listing) => listing.status === 'ACTIVE' && listing.sellerId === user.id)
      .map((listing) => listing.templateId),
  );
  const sellableFragments = cardFragments.filter((fragment) =>
    fragment.ownerId === user.id && fragment.amount > 0 && !ownActiveTemplates.has(fragment.templateId));

  const confirmSale = async () => {
    if (!selling) return;
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(price.replace(',', '.'));
    if (await listFragments(selling.templateId, parsedQuantity, parsedPrice)) {
      setSelling(null);
      setQuantity('');
      setPrice('');
    }
  };

  const confirmBuy = async () => {
    if (buying && await buyFragmentListing(buying.id)) setBuying(null);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-cyan-500/15 bg-[#090a0f] p-3 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar fragmento ou vendedor..."
            className="w-full bg-black/25 border border-white/[0.07] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-cyan-400/40" />
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
            className="bg-black/25 border border-white/[0.07] rounded-xl px-3 py-2.5 text-xs text-slate-300 font-mono">
            <option value="recent">Mais Recentes</option>
            <option value="price_asc">Menor Preço</option>
            <option value="price_desc">Maior Preço</option>
            <option value="quantity_desc">Maior Lote</option>
          </select>
        </div>
        <button onClick={() => setPickerOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-400/35 text-cyan-200 font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2">
          <Tag className="w-4 h-4" /> Vender Fragmentos
        </button>
      </div>

      <div className="rounded-xl border border-cyan-500/15 bg-cyan-950/10 px-4 py-3 text-xs font-mono text-slate-400">
        Os fragmentos são vendidos em lotes completos por NXA. A taxa de 2% é descontada do vendedor. Cada carta requer 100 fragmentos para ser forjada.
      </div>

      {activeListings.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-[#090a0f] border border-dashed border-white/[0.09]">
          <Puzzle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h4 className="font-heading text-lg font-bold text-white">Nenhum lote encontrado</h4>
          <p className="text-xs text-slate-400 font-mono mt-1">Seja o primeiro jogador a anunciar fragmentos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeListings.map((listing) => {
            const rarity = RARITY_CONFIG[listing.cardRarity] || RARITY_CONFIG.Comum;
            const isMine = listing.sellerId === user.id;
            return (
              <div key={listing.id} className={`rounded-2xl overflow-hidden border bg-[#090a0f] ${rarity.border}`}>
                <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
                  <img src={CARD_FRAGMENT_IMAGE} alt={`Fragmentos de ${listing.cardName}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-transparent to-black/20" />
                  <div className="absolute top-2.5 left-2.5"><RarityBadge rarity={listing.cardRarity} size="sm" /></div>
                  <div className="absolute bottom-2 left-3 rounded-lg bg-black/75 border border-cyan-400/25 px-2 py-1 text-xs font-mono font-bold text-cyan-300">
                    {listing.quantity} fragmentos
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <h4 className="font-heading font-bold text-white truncate">{listing.cardName}</h4>
                    <p className="text-xs font-mono text-slate-400 mt-1 truncate">{listing.sellerName}{isMine ? ' (Você)' : ''}</p>
                  </div>
                  <div className="pt-3 border-t border-white/[0.06] flex items-end justify-between gap-2">
                    <div>
                      <span className="block text-[10px] uppercase font-mono text-slate-500">Preço do lote</span>
                      <span className="font-heading text-lg font-black text-amber-300">{formatEconomicValue(listing.price)} <small>NXA</small></span>
                    </div>
                    {isMine ? (
                      <button disabled={marketplaceBusy} onClick={() => cancelFragmentListing(listing.id)}
                        className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs disabled:opacity-50">Cancelar</button>
                    ) : (
                      <button disabled={marketplaceBusy} onClick={() => setBuying(listing)}
                        className="px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-400/35 text-amber-200 font-heading font-black text-xs uppercase disabled:opacity-50">Comprar</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[#0a0b10] border border-cyan-500/30 p-6">
            <h3 className="font-heading text-xl font-bold text-white">Selecionar Fragmentos</h3>
            <p className="text-xs text-slate-400 font-mono mt-1 mb-4">Só é permitido um lote ativo por carta.</p>
            <div className="flex-1 overflow-y-auto space-y-2">
              {sellableFragments.length === 0 ? <p className="py-10 text-center text-xs font-mono text-slate-500">Nenhum fragmento disponível para venda.</p> :
                sellableFragments.map((fragment) => (
                  <button key={fragment.id} onClick={() => { setSelling(fragment); setQuantity(''); setPrice(''); setPickerOpen(false); }}
                    className="w-full p-3 rounded-xl bg-white/[0.025] border border-white/[0.06] hover:border-cyan-500/30 flex items-center gap-3 text-left">
                    <img src={CARD_FRAGMENT_IMAGE} alt={`Fragmentos de ${fragment.cardName}`} className="w-12 h-12 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0"><strong className="text-sm text-white block truncate">{fragment.cardName}</strong><span className="text-xs font-mono text-cyan-300">{fragment.amount} disponíveis</span></div>
                    <span className="text-xs text-cyan-300">Anunciar →</span>
                  </button>
                ))}
            </div>
            <button onClick={() => setPickerOpen(false)} className="mt-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono">Fechar</button>
          </div>
        </div>
      )}

      {selling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-[#0a0b10] border border-cyan-500/30 p-6">
            <h3 className="font-heading text-xl font-bold text-white">Anunciar Fragmentos</h3>
            <p className="text-xs font-mono text-slate-400 mt-1 mb-4">{selling.cardName} · {selling.amount} disponíveis</p>
            <label className="block text-xs font-mono text-slate-400 mb-1">Quantidade do lote</label>
            <input type="number" min="1" max={selling.amount} step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white mb-3" />
            <label className="block text-xs font-mono text-slate-400 mb-1">Preço total do lote (NXA)</label>
            <input type="number" min="0.01" max="1000000" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white" />
            <p className="text-[11px] font-mono text-slate-500 mt-2">Você receberá 98% do preço após a venda.</p>
            <div className="flex gap-2 mt-5">
              <button disabled={marketplaceBusy} onClick={() => setSelling(null)} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono">Voltar</button>
              <button disabled={marketplaceBusy} onClick={confirmSale} className="flex-1 py-2.5 rounded-xl bg-cyan-500/15 border border-cyan-400/35 text-cyan-200 text-xs font-bold disabled:opacity-50">{marketplaceBusy ? 'Confirmando…' : 'Criar Anúncio'}</button>
            </div>
          </div>
        </div>
      )}

      {buying && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-[#0a0b10] border border-amber-500/30 p-6">
            <h3 className="font-heading text-xl font-bold text-white">Comprar lote</h3>
            <p className="text-xs font-mono text-slate-400 mt-1 mb-4">{buying.quantity} fragmentos de {buying.cardName}</p>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400"><span>Preço:</span><strong className="text-amber-300">{formatEconomicValue(buying.price)} NXA</strong></div>
              <div className="flex justify-between text-slate-400"><span>Saldo após compra:</span><strong className={user.balanceNXA >= buying.price ? 'text-emerald-400' : 'text-rose-400'}>{formatEconomicValue(user.balanceNXA - buying.price)} NXA</strong></div>
            </div>
            {user.balanceNXA < buying.price && <div className="mt-3 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex gap-2"><AlertCircle className="w-4 h-4" />Saldo insuficiente.</div>}
            <div className="flex gap-2 mt-5">
              <button disabled={marketplaceBusy} onClick={() => setBuying(null)} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono">Voltar</button>
              <button disabled={marketplaceBusy || user.balanceNXA < buying.price} onClick={confirmBuy} className="flex-1 py-2.5 rounded-xl bg-amber-500/15 border border-amber-400/35 text-amber-200 text-xs font-bold disabled:opacity-50">{marketplaceBusy ? 'Confirmando…' : 'Confirmar Compra'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
