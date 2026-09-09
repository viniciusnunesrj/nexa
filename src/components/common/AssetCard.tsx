import React from 'react';
import { NexaAsset, Character } from '../../types';
import { RARITY_CONFIG } from '../../config/designTokens';
import { RarityBadge } from './RarityBadge';
import { Shield, Zap, Sparkles, CheckCircle2, Lock, Tag } from 'lucide-react';

interface AssetCardProps {
  asset: NexaAsset;
  onClick?: () => void;
  selected?: boolean;
  actionButton?: React.ReactNode;
  showOwner?: boolean;
}

export const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  onClick,
  selected = false,
  actionButton,
  showOwner = false,
}) => {
  const rarity = RARITY_CONFIG[asset.rarity] || RARITY_CONFIG.Comum;
  const isCharacter = asset.type === 'Character';
  const char = isCharacter ? (asset as Character) : null;

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col rounded-xl overflow-hidden border transition-all duration-300 backdrop-blur-md cursor-pointer ${
        rarity.border
      } ${rarity.borderHover} ${
        selected ? 'ring-2 ring-cyan-400 scale-[1.02] shadow-[0_0_24px_rgba(34,211,238,0.35)]' : 'hover:scale-[1.015]'
      } bg-gradient-to-b from-[#12121a]/90 via-[#0d0d14]/95 to-[#08080c]`}
      style={{
        boxShadow: selected ? `0 0 25px ${rarity.bgGlow}` : undefined,
      }}
    >
      {/* Top Media Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
        <img
          src={asset.image}
          alt={asset.name}
          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080c] via-transparent to-black/30" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
          <RarityBadge rarity={asset.rarity} size="sm" />

          {/* Status Indicator */}
          {asset.type === 'Card' && (asset as any).state === 'ACTIVE' && (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono px-2 py-0.5 font-bold animate-pulse">
              <Zap className="w-3 h-3 text-emerald-400" /> SÍNTESE
            </span>
          )}
          {asset.type === 'Card' && (asset as any).state === 'EXHAUSTED' && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-950/90 text-amber-300 border border-amber-500/40 text-[10px] font-mono px-2 py-0.5 font-bold">
              <Sparkles className="w-3 h-3 text-amber-400" /> ESGOTADA
            </span>
          )}
          {asset.isEquipped && (
            <span className="inline-flex items-center gap-1 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono px-2 py-0.5 font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]">
              <CheckCircle2 className="w-3 h-3 text-cyan-400" /> EQUIPADO
            </span>
          )}
          {asset.status === 'LISTED' && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-950/90 text-amber-300 border border-amber-500/40 text-[10px] font-mono px-2 py-0.5 font-bold">
              <Tag className="w-3 h-3 text-amber-400" /> ANUNCIADO
            </span>
          )}
          {asset.status === 'TRADING' && (
            <span className="inline-flex items-center gap-1 rounded bg-purple-950/90 text-purple-300 border border-purple-500/40 text-[10px] font-mono px-2 py-0.5 font-bold">
              <Lock className="w-3 h-3 text-purple-400" /> EM TROCA
            </span>
          )}
        </div>

        {/* Type & Edition Overlay */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="bg-black/60 px-2 py-0.5 rounded border border-white/10 uppercase tracking-wide">
            {asset.type} {char ? `• ${char.class}` : ''}
          </span>
          <span className="text-slate-400 truncate max-w-[120px]">{asset.edition}</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
        <div>
          <h4 className="font-heading text-lg font-bold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-1">
            {asset.name}
          </h4>
          <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
            {asset.description}
          </p>
        </div>

        {/* Stats Strip */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-cyan-400" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-mono text-slate-500 font-semibold">Poder</span>
              <span className="text-sm font-mono font-bold text-cyan-300">{asset.power}</span>
            </div>
          </div>

          {char ? (
            <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
              <span title="Força" className="flex items-center gap-0.5 text-red-400">
                <Sparkles className="w-3 h-3" /> {char.stats.strength}
              </span>
              <span title="Defesa" className="flex items-center gap-0.5 text-amber-400">
                <Shield className="w-3 h-3" /> {char.stats.defense}
              </span>
            </div>
          ) : (
            <div className="text-[11px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
              Nv. {asset.level || 1}
            </div>
          )}
        </div>

        {showOwner && (
          <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
            <span className="text-slate-500">Proprietário:</span>
            <span className="text-cyan-400 font-medium truncate max-w-[140px]">{asset.ownerName}</span>
          </div>
        )}

        {actionButton && <div className="mt-1">{actionButton}</div>}
      </div>
    </div>
  );
};
