import { formatEconomicValue } from '../utils/formatEconomicValue';
import { CardImage } from '../components/common/CardImage';
import React, { useState } from 'react';
import { useGameState } from '../contexts/GameStateContext';
import { PriceHistoryChart } from '../components/market/PriceHistoryChart';
import { RarityBadge } from '../components/common/RarityBadge';
import {
  History as HistoryIcon,
  TrendingUp,
  Coins,
  ShieldCheck,
  Search,
  Filter,
  Layers,
} from 'lucide-react';

const safeText = (value: unknown, fallback = 'Indisponível'): string => typeof value === 'string' && value.trim() ? value : fallback;
const formatNXA = (value: unknown): string => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? formatEconomicValue(value) + ' NXA' : 'Indisponível';

export const HistoryPage: React.FC = () => {
  const { transactions, marketStats } = useGameState();
  const [search, setSearch] = useState('');

  const filteredTransactions = (Array.isArray(transactions) ? transactions : []).filter((tx) => tx && typeof tx === 'object').filter((tx) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      safeText(tx.itemSnapshot?.name, '').toLowerCase().includes(q) ||
      safeText(tx.buyerName, '').toLowerCase().includes(q) ||
      safeText(tx.sellerName, '').toLowerCase().includes(q) ||
      safeText(tx.id, '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider">
          <HistoryIcon className="w-4 h-4" /> Livro-Razão & Economia Analítica
        </div>
        <h1 className="font-heading text-3xl sm:text-4xl font-black text-white mt-1">
          Histórico Econômico e Auditoria
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Monitoramento de preço médio, flutuações de mercado e livro-razão imutável de todas as transferências de ativos.
        </p>
      </div>

      {/* 30-Day SVG Price Trend Chart */}
      <PriceHistoryChart
        data={marketStats?.priceHistory}
        floorPrice={marketStats?.currentFloorPrice}
      />

      {/* Macro Economic Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0b0b12] border border-white/10">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Preço Piso (Floor)</span>
          <span className="font-heading text-2xl font-bold text-amber-400 mt-1 block">
            {formatNXA(marketStats?.currentFloorPrice)}
          </span>
          <span className="text-[10px] font-mono text-slate-400 mt-1 block">Base de entrada</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b0b12] border border-white/10">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Pico Histórico (ATH)</span>
          <span className="font-heading text-2xl font-bold text-purple-400 mt-1 block">
            {formatNXA(marketStats?.allTimeHigh)}
          </span>
          <span className="text-[10px] font-mono text-slate-400 mt-1 block">Maior venda registrada</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b0b12] border border-white/10">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Volume Transacionado</span>
          <span className="font-heading text-2xl font-bold text-cyan-300 mt-1 block">
            {formatNXA(marketStats?.totalVolumeNXA)}
          </span>
          <span className="text-[10px] font-mono text-slate-400 mt-1 block">Liquidez total do ecossistema</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0b0b12] border border-white/10">
          <span className="text-[10px] font-mono text-slate-500 uppercase block">Taxas Recolhidas</span>
          <span className="font-heading text-2xl font-bold text-emerald-400 mt-1 block">
            Indisponível
          </span>
          <span className="text-[10px] font-mono text-slate-400 mt-1 block">Total confirmado não disponível</span>
        </div>
      </div>

      {/* Transaction Ledger Table */}
      <div className="rounded-2xl bg-[#0b0b12] border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-heading font-bold text-white text-base">
              Livro-Razão de Transações P2P
            </h3>
            <span className="text-xs font-mono text-slate-500">
              Registros validados pelo motor de segurança
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ID, item ou piloto..."
              className="w-full bg-[#141422] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-white/5 text-slate-400 uppercase text-[10px] border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Hash ID</th>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Ativo Negociado</th>
                <th className="py-3 px-4">Vendedor</th>
                <th className="py-3 px-4">Comprador</th>
                <th className="py-3 px-4 text-right">Valor Bruto</th>
                <th className="py-3 px-4 text-right">Taxa (2%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTransactions.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-slate-400">Nenhuma transação disponível para esta consulta.</td></tr>}
              {filteredTransactions.map((tx, index) => (
                <tr key={index} className="hover:bg-white/5 text-slate-300 transition-colors">
                  <td className="py-3 px-4 text-[11px] text-slate-500 font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-white/5">
                      {typeof tx.id === 'string' ? tx.id.slice(0, 10) + '...' : 'Indisponível'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{safeText(tx.timestamp)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {tx.itemSnapshot && <CardImage asset={tx.itemSnapshot}
                        src={typeof tx.itemSnapshot.image === 'string' ? tx.itemSnapshot.image : undefined}
                        alt={safeText(tx.itemSnapshot?.name, 'Ativo não identificado')}
                        className="w-6 h-6 rounded object-cover"
                      />}
                      <span className="font-bold text-white truncate max-w-[150px]">
                        {safeText(tx.itemSnapshot?.name, 'Ativo não identificado')}
                      </span>
                      {['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário', 'Mítico'].includes(tx.itemSnapshot?.rarity) && <RarityBadge rarity={tx.itemSnapshot.rarity} size="sm" showDot={false} />}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">{safeText(tx.sellerName)}</td>
                  <td className="py-3 px-4 text-slate-300">{safeText(tx.buyerName)}</td>
                  <td className="py-3 px-4 text-right font-bold text-cyan-300">
                    {formatNXA(tx.amount)}
                  </td>
                  <td className="py-3 px-4 text-right text-amber-400">
                    {formatNXA(tx.fee)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
