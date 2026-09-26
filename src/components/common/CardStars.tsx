import React from 'react';

export function CardStars({ level = 1, showEmpty = false }: { level?: number; showEmpty?: boolean }) {
  const stars = Number.isFinite(level) ? Math.min(5, Math.max(1, Math.trunc(level))) : 1;
  return <span className={`font-mono text-[10px] font-black tracking-[0.08em] whitespace-nowrap ${stars === 5 ? 'text-amber-200' : 'text-slate-400'}`}
    title={`Ascensão ${stars} de 5`} aria-label={`Ascensão ${stars} de 5 estrelas`}>
    {'★'.repeat(stars)}{showEmpty && <span className="text-slate-700">{'★'.repeat(5 - stars)}</span>}
  </span>;
}
