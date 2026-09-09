import React from 'react';
import { NexaAsset, Character } from '../../types';
import { RARITY_CONFIG } from '../../config/designTokens';
import { RarityBadge } from '../common/RarityBadge';
import { X, Zap, Shield, Sparkles, Activity, Tag, ArrowLeftRight, CheckCircle2 } from 'lucide-react';

interface AssetModalProps {
  asset: NexaAsset | null;
  onClose: () => void;
  onEquip?: (assetId: string) => void;
  onSell?: (asset: NexaAsset) => void;
  onTrade?: (asset: NexaAsset) => void;
  isOwner?: boolean;
}

export const AssetModal: React.FC<AssetModalProps> = ({
  asset,
  onClose,
  onEquip,
  onSell,
  onTrade,
  isOwner = false,
}) => {
  if (!asset) return null;

  const rarity = RARITY_CONFIG[asset.rarity] || RARITY_CONFIG.Comum;
  const isChar = asset.type === 'Character';
  const char = isChar ? (asset as Character) : null;
  const isCard = asset.type === 'Card';
  const cardLocked = isCard && (((asset as any).state && (asset as any).state !== 'FREE') || (asset as any).cardStatus === 'ACTIVE' || (asset as any).cardStatus === 'EXHAUSTED' || !(asset as any).tradeable);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-[#0b0b12] border overflow-hidden shadow-2xl flex flex-col md:flex-row"
        style={{ borderColor: rarity.color, boxShadow: `0 0 40px ${rarity.bgGlow}` }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-black/60 text-slate-400 hover:text-white hover:bg-black/90 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left: Media & Hologram Visual */}
        <div className="md:w-5/12 relative aspect-[3/4] md:aspect-auto overflow-hidden bg-slate-950 flex items-center justify-center">
          <img
            src={asset.image}
            alt={asset.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b12] via-transparent to-black/40" />

          <div className="absolute bottom-4 left-4 right-4">
            <RarityBadge rarity={asset.rarity} size="md" />
            <div className="mt-2 text-xs font-mono text-slate-300 bg-black/60 px-2.5 py-1 rounded inline-block">
              {asset.edition}
            </div>
          </div>
        </div>

        {/* Right: Details & Stats */}
        <div className="md:w-7/12 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider">
              <span>{asset.type}</span>
              {char && <span>• Classe {char.class}</span>}
            </div>

            <h3 className="font-heading text-2xl font-bold text-white mt-1">
              {asset.name}
            </h3>

            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {asset.description}
            </p>

            {/* Core Power Highlight */}
            <div className="my-4 p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                <span className="text-xs font-mono text-slate-400 uppercase font-semibold">Classificação de Poder</span>
              </div>
              <span className="font-heading text-xl font-bold text-cyan-300">
                {asset.power} <span className="text-xs text-slate-500 font-mono">PWR</span>
              </span>
            </div>

            {/* Detailed Stats */}
            {char && (
              <div className="space-y-2 mb-4">
                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                    <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-red-400" /> Força / Dano</span>
                    <span className="text-red-300 font-bold">{char.stats.strength} / 100</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${char.stats.strength}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                    <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-amber-400" /> Defesa / Blindagem</span>
                    <span className="text-amber-300 font-bold">{char.stats.defense} / 100</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${char.stats.defense}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                    <span className="flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-emerald-400" /> Agilidade / Velocidade</span>
                    <span className="text-emerald-300 font-bold">{char.stats.speed} / 100</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${char.stats.speed}%` }} />
                  </div>
                </div>
              </div>
            )}

            {'bonusStats' in asset && asset.bonusStats && (
              <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-xs font-mono text-cyan-300 flex items-center justify-between mb-4">
                <span>Atributo Passivo:</span>
                <span className="font-bold uppercase">+{asset.bonusStats.value} {asset.bonusStats.stat}</span>
              </div>
            )}

            {/* Ownership Meta */}
            <div className="text-[11px] font-mono text-slate-400 border-t border-white/10 pt-3 flex items-center justify-between">
              <span>Proprietário: <strong className="text-slate-200">{asset.ownerName}</strong></span>
              <span>Criado em: {asset.createdAt}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 pt-3 border-t border-white/10 flex flex-wrap gap-2 justify-end">
            {isOwner && isChar && onEquip && (
              <button
                onClick={() => {
                  onEquip(asset.id);
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold font-mono text-xs transition-colors shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                <CheckCircle2 className="w-4 h-4" />
                {asset.isEquipped ? 'Já Equipado' : 'Equipar na Arena'}
              </button>
            )}

            {isOwner && isCard && cardLocked && (
              <span className="text-[11px] font-mono text-amber-400 bg-amber-950/40 border border-amber-500/30 px-3 py-1.5 rounded-lg">
                ⚡ Carta vinculada à síntese de NEX (Intransferível)
              </span>
            )}

            {isOwner && asset.status === 'IDLE' && !cardLocked && onSell && (
              <button
                onClick={() => {
                  onSell(asset);
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold font-mono text-xs transition-colors shadow-[0_0_15px_rgba(245,158,11,0.3)]"
              >
                <Tag className="w-4 h-4" /> Anunciar no Mercado
              </button>
            )}

            {isOwner && asset.status === 'IDLE' && !cardLocked && onTrade && (
              <button
                onClick={() => {
                  onTrade(asset);
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold font-mono text-xs transition-colors shadow-[0_0_15px_rgba(168,85,247,0.3)]"
              >
                <ArrowLeftRight className="w-4 h-4" /> Propor Troca
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
