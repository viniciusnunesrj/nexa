import React, { useState } from 'react';
import { NexaAsset, MARKETPLACE_FEE } from '../../types';
import { X, Tag, AlertCircle } from 'lucide-react';
import { RarityBadge } from '../common/RarityBadge';

interface SellModalProps {
  asset: NexaAsset | null;
  onClose: () => void;
  onConfirmList: (assetId: string, price: number) => void;
}

export const SellModal: React.FC<SellModalProps> = ({ asset, onClose, onConfirmList }) => {
  const [price, setPrice] = useState<string>('250');
  const [error, setError] = useState<string>('');

  if (!asset) return null;

  const numPrice = parseFloat(price) || 0;
  const fee = Math.round(numPrice * MARKETPLACE_FEE * 100) / 100;
  const netEarnings = Math.max(0, Math.round((numPrice - fee) * 100) / 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numPrice <= 0) {
      setError('O valor de venda deve ser maior que zero NXA.');
      return;
    }
    setError('');
    onConfirmList(asset.id, numPrice);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#0d0d14] border border-amber-500/40 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-black/50 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase mb-1">
          <Tag className="w-4 h-4" /> Anunciar no Marketplace
        </div>
        <h3 className="font-heading text-xl font-bold text-white">
          Defina o Preço de Venda
        </h3>

        {/* Item Preview Card */}
        <div className="my-4 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
          <img
            src={asset.image}
            alt={asset.name}
            className="w-14 h-14 rounded-lg object-cover bg-slate-900 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h4 className="font-heading font-bold text-slate-100 text-sm truncate">
              {asset.name}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <RarityBadge rarity={asset.rarity} size="sm" />
              <span className="text-[11px] font-mono text-slate-400">{asset.type}</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
              Preço Solicitado (NXA)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setError('');
                }}
                className="w-full bg-[#161622] border border-white/20 rounded-xl px-4 py-2.5 text-white font-mono text-lg focus:outline-none focus:border-amber-400"
                placeholder="Ex: 500"
              />
              <span className="absolute right-3.5 top-3 font-mono text-xs text-amber-400 font-bold">
                NXA
              </span>
            </div>
            {error && (
              <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
          </div>

          {/* Fee Breakdown */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Preço Bruto:</span>
              <span className="text-slate-200">{numPrice.toLocaleString()} NXA</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Taxa da Plataforma (2%):</span>
              <span className="text-amber-400">-{fee.toLocaleString()} NXA</span>
            </div>
            <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-sm">
              <span className="text-slate-300">Você Receberá:</span>
              <span className="text-cyan-300">{netEarnings.toLocaleString()} NXA</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold transition-colors shadow-[0_0_15px_rgba(245,158,11,0.35)]"
            >
              Confirmar Anúncio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
