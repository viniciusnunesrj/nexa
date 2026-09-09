import React, { useState } from 'react';
import { PricePoint } from '../../types';

interface PriceHistoryChartProps {
  data: PricePoint[];
  floorPrice: number;
}

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({ data, floorPrice }) => {
  const [hoveredPoint, setHoveredPoint] = useState<PricePoint | null>(null);

  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-slate-500 font-mono text-sm">Sem dados históricos suficientes.</div>;
  }

  const prices = data.map((d) => d.price);
  const minPrice = Math.max(0, Math.min(...prices) * 0.85);
  const maxPrice = Math.max(...prices) * 1.15;
  const priceRange = maxPrice - minPrice || 1;

  const width = 800;
  const height = 260;
  const padding = { top: 25, right: 30, bottom: 40, left: 60 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Compute SVG Points
  const points = data.map((d, index) => {
    const x = padding.left + (index / (data.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.price - minPrice) / priceRange) * chartHeight;
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    // Smooth bezier curve
    const prev = points[idx - 1];
    const cpX1 = prev.x + (curr.x - prev.x) / 2;
    const cpX2 = cpX1;
    return `${acc} C ${cpX1} ${prev.y}, ${cpX2} ${curr.y}, ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  // Floor line Y
  const floorY = padding.top + chartHeight - ((floorPrice - minPrice) / priceRange) * chartHeight;

  return (
    <div className="relative w-full rounded-2xl bg-[#09090f] border border-white/10 p-5 shadow-2xl overflow-hidden">
      {/* Header with quick stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-white/5">
        <div>
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Histórico Econômico (30D)</span>
          <div className="flex items-baseline gap-3 mt-1">
            <span className="font-heading text-2xl font-bold text-cyan-300">
              {data[data.length - 1].price.toLocaleString()} NXA
            </span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
              +18.4% este mês
            </span>
          </div>
        </div>

        {hoveredPoint ? (
          <div className="bg-slate-900/90 border border-cyan-500/40 px-3.5 py-1.5 rounded-lg flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[10px]">Data</span>
              <span className="text-slate-200 font-bold">{hoveredPoint.date}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Preço Médio</span>
              <span className="text-cyan-300 font-bold">{hoveredPoint.price} NXA</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Volume</span>
              <span className="text-amber-400 font-bold">{hoveredPoint.volume.toLocaleString()} NXA</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" /> Preço de Venda
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-amber-400/80" /> Piso Mercado ({floorPrice} NXA)
            </span>
          </div>
        )}
      </div>

      {/* SVG Container */}
      <div className="w-full aspect-[21/8] min-h-[220px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + chartHeight * ratio;
            const priceVal = Math.round(maxPrice - ratio * priceRange);
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="11"
                  fontFamily="monospace"
                >
                  {priceVal}
                </text>
              </g>
            );
          })}

          {/* Floor Price Line */}
          {floorY >= padding.top && floorY <= padding.top + chartHeight && (
            <line
              x1={padding.left}
              y1={floorY}
              x2={width - padding.right}
              y2={floorY}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.6"
            />
          )}

          {/* Area Fill */}
          <path d={areaD} fill="url(#chartGradient)" />

          {/* Main Price Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="3"
            filter="url(#neonGlow)"
          />

          {/* Interactive Data Points */}
          {points.map((p, idx) => (
            <g
              key={idx}
              onMouseEnter={() => setHoveredPoint(p.data)}
              onMouseLeave={() => setHoveredPoint(null)}
              className="cursor-pointer"
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredPoint === p.data ? 7 : 4}
                fill="#08080c"
                stroke="#22d3ee"
                strokeWidth={hoveredPoint === p.data ? 3 : 2}
                className="transition-all duration-150"
              />
              {/* Invisible larger hit target */}
              <circle cx={p.x} cy={p.y} r="14" fill="transparent" />
            </g>
          ))}

          {/* X Axis Labels */}
          {points.map((p, idx) => (
            <text
              key={idx}
              x={p.x}
              y={height - 12}
              textAnchor="middle"
              fill="#64748b"
              fontSize="11"
              fontFamily="monospace"
            >
              {p.data.date}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
};
