import React, { useState } from 'react';
import { CheckCircle2, Lock, ShoppingBag, Tag, X } from 'lucide-react';
import { CardFragment, FragmentListing } from '../../types';
import { getTemplateById } from '../../config/collectionsData';
import { RarityBadge } from '../common/RarityBadge';
import { formatEconomicValue } from '../../utils/formatEconomicValue';
import { CARD_FRAGMENT_IMAGE } from '../../config/fragmentVisual';

interface FragmentDetailsModalProps {
  fragment: CardFragment | null;
  activeListing?: FragmentListing;
  busy: boolean;
  onClose: () => void;
  onList: (templateId: string, quantity: number, price: number) => Promise<boolean>;
  onCraft: (templateId: string) => Promise<void>;
  onOpenMarketplace: () => void;
}

export const FragmentDetailsModal: React.FC<FragmentDetailsModalProps> = ({
  fragment, activeListing, busy, onClose, onList, onCraft, onOpenMarketplace,
}) => {
  const [saleOpen, setSaleOpen] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  if (!fragment) return null;

  const template = getTemplateById(fragment.templateId);
  const reserved = activeListing?.quantity ?? 0;
  const available = Math.max(0, fragment.amount - reserved);
  const canCraft = available >= 100;
  const progress = Math.min(100, Math.round((available / 100) * 100));

  const submitListing = async () => {
    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(price.replace(',', '.'));
    if (await onList(fragment.templateId, parsedQuantity, parsedPrice)) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" onClick={onClose}>
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[#0a0b10] border border-cyan-500/30 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 z-10 p-2 rounded-lg bg-black/60 border border-white/10 text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>

        <div className="grid md:grid-cols-[240px_1fr]">
          <div className="relative min-h-64 bg-slate-950 overflow-hidden">
            <img src={CARD_FRAGMENT_IMAGE} alt={`Fragmentos de ${fragment.cardName}`} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b10] via-transparent to-black/20" />
            <div className="absolute left-4 top-4"><RarityBadge rarity={fragment.cardRarity} size="sm" /></div>
            <div className="absolute inset-x-4 bottom-4 rounded-xl bg-black/75 border border-cyan-500/25 p-3 text-center">
              <span className="block text-[10px] font-mono uppercase text-slate-500">Fragmentos totais</span>
              <strong className="font-heading text-2xl text-cyan-300">{fragment.amount}</strong>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-500">Fragmento de Carta</span>
              <h2 className="font-heading text-2xl font-black text-white mt-1">{fragment.cardName}</h2>
              <p className="text-xs font-mono text-slate-400 mt-2 leading-relaxed">
                {template?.description || 'Fragmentos quânticos usados para forjar esta carta.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="rounded-xl bg-white/[0.035] border border-white/[0.07] p-3"><span className="block text-slate-500 text-[10px] uppercase">Coleção</span><strong className="text-slate-200">{template?.collectionId || fragment.collectionId || 'NEXA'}</strong></div>
              <div className="rounded-xl bg-white/[0.035] border border-white/[0.07] p-3"><span className="block text-slate-500 text-[10px] uppercase">Elemento</span><strong className="text-slate-200">{template?.element || '—'}</strong></div>
              <div className="rounded-xl bg-white/[0.035] border border-white/[0.07] p-3"><span className="block text-slate-500 text-[10px] uppercase">Reservados</span><strong className={reserved ? 'text-amber-300' : 'text-slate-200'}>{reserved}</strong></div>
              <div className="rounded-xl bg-white/[0.035] border border-white/[0.07] p-3"><span className="block text-slate-500 text-[10px] uppercase">Disponíveis</span><strong className="text-cyan-300">{available}</strong></div>
            </div>

            <div className="rounded-xl bg-black/35 border border-white/[0.07] p-3 space-y-2">
              <div className="flex justify-between text-xs font-mono"><span className="text-slate-400">Progresso para forjar</span><strong className={canCraft ? 'text-emerald-400' : 'text-amber-400'}>{available} / 100</strong></div>
              <div className="h-2 rounded-full bg-slate-900 border border-white/10 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${progress}%`, background: canCraft ? 'linear-gradient(90deg,#10b981,#06b6d4)' : 'linear-gradient(90deg,#f59e0b,#ef4444)' }} /></div>
            </div>

            {activeListing ? (
              <div className="rounded-xl bg-amber-950/30 border border-amber-500/25 p-3 text-xs font-mono">
                <strong className="text-amber-300 block">Lote ativo no Marketplace</strong>
                <span className="text-slate-400">{activeListing.quantity} fragmentos por {formatEconomicValue(activeListing.price)} NXA</span>
                <button onClick={onOpenMarketplace} className="mt-3 w-full py-2 rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-200 font-bold flex items-center justify-center gap-2"><ShoppingBag className="w-4 h-4" /> Abrir Marketplace</button>
              </div>
            ) : saleOpen ? (
              <div className="rounded-xl bg-cyan-950/20 border border-cyan-500/25 p-3 space-y-3">
                <div><label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Quantidade do lote</label><input type="number" min="1" max={available} step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="w-full rounded-lg bg-black/35 border border-white/10 px-3 py-2 text-sm text-white" /></div>
                <div><label className="block text-[10px] uppercase font-mono text-slate-400 mb-1">Preço total (NXA)</label><input type="number" min="0.01" max="1000000" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="w-full rounded-lg bg-black/35 border border-white/10 px-3 py-2 text-sm text-white" /></div>
                <p className="text-[10px] font-mono text-slate-500">Venda do lote completo. Você recebe 98% do preço.</p>
                <div className="flex gap-2"><button disabled={busy} onClick={() => setSaleOpen(false)} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs">Voltar</button><button disabled={busy} onClick={submitListing} className="flex-1 py-2 rounded-lg bg-cyan-500/15 border border-cyan-400/35 text-cyan-200 text-xs font-bold disabled:opacity-50">{busy ? 'Confirmando…' : 'Criar anúncio'}</button></div>
              </div>
            ) : (
              <button disabled={busy || available === 0} onClick={() => setSaleOpen(true)} className="w-full py-3 rounded-xl bg-amber-500/15 border border-amber-400/35 text-amber-200 font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-40"><Tag className="w-4 h-4" /> Anunciar Fragmentos</button>
            )}

            <button disabled={busy || !canCraft} onClick={() => onCraft(fragment.templateId)} className={`w-full py-3 rounded-xl font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 ${canCraft ? 'bg-emerald-500 text-slate-950' : 'bg-white/5 border border-white/10 text-slate-500'}`}>
              {canCraft ? <><CheckCircle2 className="w-4 h-4" /> Forjar Carta</> : <><Lock className="w-4 h-4" /> Faltam {100 - available} disponíveis</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
