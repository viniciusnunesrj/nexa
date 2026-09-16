import React from 'react';
import {
  CheckCircle2,
  Gauge,
  Lock,
  Shield,
  Sparkles,
  Tag,
  Zap,
} from 'lucide-react';

import { NexaAsset, Character } from '../../types';
import { RARITY_CONFIG } from '../../config/designTokens';
import { getCardPower } from '../../utils/cardPower';
import { CardImage } from './CardImage';
import { RarityBadge } from './RarityBadge';

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

  const power =
    asset.type === 'Card'
      ? getCardPower(asset)
      : asset.power;

  const cardState =
    asset.type === 'Card'
      ? asset.state || asset.cardStatus
      : undefined;

  const isCharacter = asset.type === 'Character';
  const char = isCharacter ? (asset as Character) : null;

  const isLegendary = asset.rarity === 'Lendário';
  const isMythic = asset.rarity === 'Mítico';
  const isPremium = isLegendary || isMythic;

  const formattedPower =
    Number.isFinite(power) && power !== null
      ? Number(power).toLocaleString('pt-BR')
      : 'Indisponível';

  return (
    <div
      onClick={onClick}
      className={`
        group relative isolate flex h-full flex-col overflow-hidden
        rounded-2xl border cursor-pointer
        bg-[#0a0a0f]
        transition-all duration-300 ease-out
        ${rarity.border}
        ${rarity.borderHover}
        ${rarity.shadow}
        ${
          selected
            ? 'ring-2 ring-cyan-400/90 scale-[1.02]'
            : 'hover:-translate-y-1 hover:scale-[1.01]'
        }
      `}
      style={{
        boxShadow: selected
          ? `0 0 0 1px rgba(34,211,238,0.22), 0 0 32px ${rarity.bgGlow}`
          : undefined,
      }}
    >
      {/* Rarity atmosphere */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 z-0 h-44 w-[85%] -translate-x-1/2 rounded-full blur-[55px] opacity-40 transition-opacity duration-300 group-hover:opacity-65"
        style={{ backgroundColor: rarity.color }}
      />

      {/* Premium top accent */}
      {isPremium && (
        <div
          className="pointer-events-none absolute left-0 right-0 top-0 z-30 h-[2px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${rarity.color}, transparent)`,
            boxShadow: `0 0 16px ${rarity.color}`,
          }}
        />
      )}

      {/* Media */}
      <div className="relative z-10 aspect-[4/3] w-full overflow-hidden bg-[#050508]">
        <CardImage
          asset={asset}
          src={asset.image}
          alt={asset.name}
          className={`
            h-full w-full object-cover object-center
            transition-all duration-700 ease-out
            group-hover:scale-[1.055]
            ${asset.rarity === 'Comum' ? 'saturate-[0.82]' : ''}
          `}
          loading="lazy"
        />

        {/* Image treatment */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#08080d]" />

        <div
          className="absolute inset-x-0 bottom-0 h-24 opacity-45"
          style={{
            background: `linear-gradient(to top, ${rarity.bgGlow}, transparent)`,
          }}
        />

        {/* Subtle scan line */}
        <div className="pointer-events-none absolute inset-x-0 top-[58%] h-px bg-white/[0.06]" />

        {/* Top badges */}
        <div className="absolute left-2.5 right-2.5 top-2.5 flex items-start justify-between gap-2">
          <RarityBadge rarity={asset.rarity} size="sm" />

          <div className="flex flex-col items-end gap-1.5">
            {asset.type === 'Card' &&
              (cardState === 'ACTIVE' || cardState === 'SYNTHESIZING') && (
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-950/90 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-md">
                  <Zap className="h-3 w-3" />
                  Em síntese
                </span>
              )}

            {asset.type === 'Card' && cardState === 'EXHAUSTED' && (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-950/90 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur-md">
                <Sparkles className="h-3 w-3" />
                Esgotada
              </span>
            )}

            {asset.isEquipped && (
              <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-950/90 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-cyan-300 backdrop-blur-md">
                <CheckCircle2 className="h-3 w-3" />
                Equipado
              </span>
            )}

            {asset.status === 'LISTED' && (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-950/90 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur-md">
                <Tag className="h-3 w-3" />
                Anunciado
              </span>
            )}

            {asset.status === 'TRADING' && (
              <span className="inline-flex items-center gap-1 rounded-md border border-purple-500/40 bg-purple-950/90 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-purple-300 backdrop-blur-md">
                <Lock className="h-3 w-3" />
                Em troca
              </span>
            )}
          </div>
        </div>

        {/* Identity footer over image */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2">
          <span className="rounded-md border border-white/10 bg-black/65 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-300 backdrop-blur-md">
            {isCharacter ? char?.class : asset.type}
          </span>

          {asset.edition && (
            <span className="max-w-[52%] truncate font-mono text-[9px] uppercase tracking-wider text-slate-400 drop-shadow-md">
              {asset.edition}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="relative z-10 flex flex-1 flex-col p-4">
        {/* Thin rarity line */}
        <div className="mb-3 flex items-center gap-2">
          <div
            className="h-px flex-1 opacity-70"
            style={{
              background: `linear-gradient(90deg, ${rarity.color}, transparent)`,
            }}
          />

          <span
            className="font-mono text-[9px] font-bold uppercase tracking-[0.18em]"
            style={{ color: rarity.color }}
          >
            {rarity.label}
          </span>
        </div>

        {/* Identity */}
        <div className="min-h-[72px]">
          <h4
            className="line-clamp-1 font-heading text-[17px] font-bold tracking-tight text-slate-100 transition-colors duration-300"
            style={{
              textShadow: isPremium
                ? `0 0 18px ${rarity.bgGlow}`
                : undefined,
            }}
          >
            {asset.name}
          </h4>

          <p className="mt-1.5 line-clamp-2 text-[11px] leading-[1.55] text-slate-500 transition-colors group-hover:text-slate-400">
            {asset.description}
          </p>
        </div>

        {/* Main power module */}
        <div className="mt-3 overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.025]">
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg border"
                style={{
                  color: rarity.color,
                  borderColor: `${rarity.color}55`,
                  backgroundColor: `${rarity.color}12`,
                  boxShadow: isPremium
                    ? `0 0 14px ${rarity.bgGlow}`
                    : undefined,
                }}
              >
                <Zap className="h-4 w-4" />
              </div>

              <div>
                <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  Poder
                </div>

                <div
                  className="font-mono text-base font-black leading-none"
                  style={{ color: rarity.color }}
                >
                  {formattedPower}
                </div>
              </div>
            </div>

            {char ? (
              <div className="flex items-center gap-3">
                <div
                  className="text-right"
                  title="Força"
                >
                  <div className="font-mono text-[8px] uppercase tracking-wider text-slate-600">
                    For
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs font-bold text-rose-400">
                    <Sparkles className="h-3 w-3" />
                    {char.stats.strength}
                  </div>
                </div>

                <div
                  className="text-right"
                  title="Defesa"
                >
                  <div className="font-mono text-[8px] uppercase tracking-wider text-slate-600">
                    Def
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs font-bold text-amber-400">
                    <Shield className="h-3 w-3" />
                    {char.stats.defense}
                  </div>
                </div>

                <div
                  className="text-right"
                  title="Velocidade"
                >
                  <div className="font-mono text-[8px] uppercase tracking-wider text-slate-600">
                    Vel
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs font-bold text-cyan-400">
                    <Gauge className="h-3 w-3" />
                    {char.stats.speed}
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-[48%] rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-1.5 text-right">
                <div className="font-mono text-[8px] uppercase tracking-wider text-slate-600">
                  {asset.type === 'Card' ? 'Coleção' : 'Nível'}
                </div>

                <div className="truncate font-mono text-[10px] font-semibold text-slate-300">
                  {asset.type === 'Card'
                    ? asset.collectionName || 'NEXA'
                    : `Nv. ${asset.level || 1}`}
                </div>
              </div>
            )}
          </div>

          {/* Bottom rarity energy line */}
          <div
            className="h-[2px] w-full opacity-65 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background: `linear-gradient(90deg, transparent, ${rarity.color}, transparent)`,
            }}
          />
        </div>

        {/* Owner */}
        {showOwner && (
          <div className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-3 font-mono text-[10px]">
            <span className="uppercase tracking-wider text-slate-600">
              Proprietário
            </span>

            <span className="max-w-[140px] truncate font-semibold text-cyan-400">
              {asset.ownerName}
            </span>
          </div>
        )}

        {/* Action */}
        {actionButton && (
          <div
            className="mt-3"
            onClick={(event) => event.stopPropagation()}
          >
            {actionButton}
          </div>
        )}
      </div>

      {/* Mythic / legendary corner detail */}
      {isPremium && (
        <>
          <div
            className="pointer-events-none absolute left-0 top-0 z-30 h-10 w-px opacity-80"
            style={{
              background: `linear-gradient(to bottom, ${rarity.color}, transparent)`,
            }}
          />

          <div
            className="pointer-events-none absolute right-0 top-0 z-30 h-10 w-px opacity-80"
            style={{
              background: `linear-gradient(to bottom, ${rarity.color}, transparent)`,
            }}
          />
        </>
      )}
    </div>
  );
};