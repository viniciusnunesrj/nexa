import { formatEconomicValue } from '../utils/formatEconomicValue';
import { CardImage } from '../components/common/CardImage';
import React, { useState } from 'react';
import { useGameState } from '../contexts/GameStateContext';
import { PriceHistoryChart } from '../components/market/PriceHistoryChart';
import { RarityBadge } from '../components/common/RarityBadge';
import {
  History as HistoryIcon,
  Search,
  BarChart3,
  Landmark,
} from 'lucide-react';

const safeText = (value: unknown, fallback = 'Indisponível'): string =>
  typeof value === 'string' && value.trim() ? value : fallback;

const formatNXA = (value: unknown): string =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? formatEconomicValue(value) + ' NXA'
    : 'Indisponível';

export const HistoryPage: React.FC = () => {
  const { transactions, marketStats } = useGameState();
  const [search, setSearch] = useState('');

  const filteredTransactions = (Array.isArray(transactions) ? transactions : [])
    .filter((tx) => tx && typeof tx === 'object')
    .filter((tx) => {
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
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Intelligence Header */}
      <section className="relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-[#071015] via-[#090a0f] to-[#07080c] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-cyan-500/[0.07] blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-[0.2em]">
              <HistoryIcon className="w-4 h-4" /> Inteligência // Histórico
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl font-black text-white mt-2 tracking-tight">
              Histórico & Análise
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1.5 max-w-2xl leading-relaxed">
              Acompanhe indicadores econômicos e consulte o histórico de transações registradas no mercado.
            </p>
          </div>

          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/25 border border-white/[0.07]">
            <div className="w-9 h-9 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.06] flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-cyan-300" />
            </div>
            <div className="font-mono">
              <span className="block text-[9px] uppercase tracking-wider text-slate-600">Registros exibidos</span>
              <span className="text-sm font-bold text-cyan-300">{filteredTransactions.length} transações</span>
            </div>
          </div>
        </div>
      </section>

      {/* Economic Telemetry */}
      <section className="grid grid-cols-2 lg:grid-cols-4 rounded-2xl bg-[#090a0f] border border-white/[0.08] overflow-hidden">
        <div className="p-4 border-r border-b lg:border-b-0 border-white/[0.06]">
          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider block">Preço Piso</span>
          <span className="font-heading text-xl font-black text-amber-400 mt-1 block">
            {formatNXA(marketStats?.currentFloorPrice)}
          </span>
          <span className="text-[9px] font-mono text-slate-500 mt-1 block">Referência de entrada</span>
        </div>

        <div className="p-4 border-b lg:border-b-0 lg:border-r border-white/[0.06]">
          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider block">Pico Histórico</span>
          <span className="font-heading text-xl font-black text-purple-400 mt-1 block">
            {formatNXA(marketStats?.allTimeHigh)}
          </span>
          <span className="text-[9px] font-mono text-slate-500 mt-1 block">Maior venda registrada</span>
        </div>

        <div className="p-4 border-r border-white/[0.06]">
          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider block">Volume Transacionado</span>
          <span className="font-heading text-xl font-black text-cyan-300 mt-1 block">
            {formatNXA(marketStats?.totalVolumeNXA)}
          </span>
          <span className="text-[9px] font-mono text-slate-500 mt-1 block">Volume acumulado</span>
        </div>

        <div className="p-4">
          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider block">Taxas Recolhidas</span>
          <span className="font-heading text-xl font-black text-slate-400 mt-1 block">
            Indisponível
          </span>
          <span className="text-[9px] font-mono text-slate-500 mt-1 block">Dado agregado não disponível</span>
        </div>
      </section>

      {/* Price Intelligence */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-cyan-400">
              <BarChart3 className="w-3.5 h-3.5" /> Tendência de Mercado
            </div>
            <p className="text-[10px] font-mono text-slate-600 mt-1">
              Histórico econômico dos últimos 30 dias
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[9px] font-mono uppercase tracking-wider text-slate-600">
            <Landmark className="w-3.5 h-3.5" />
            Telemetria NXA
          </div>
        </div>

        <PriceHistoryChart
          data={marketStats?.priceHistory}
          floorPrice={marketStats?.currentFloorPrice}
        />
      </section>

      {/* Transaction Ledger */}
      <section className="rounded-2xl bg-[#090a0f] border border-white/[0.08] overflow-hidden">
        <div className="p-4 border-b border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.015]">
          <div>
            <div className="flex items-center gap-2">
              <HistoryIcon className="w-4 h-4 text-cyan-400" />
              <h3 className="font-heading font-bold text-white text-base">
                Registro de Transações
              </h3>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-1 block">
              Histórico disponível de negociações P2P
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-600 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar ID, ativo ou piloto..."
              className="w-full bg-black/30 border border-white/[0.07] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-cyan-500/35"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-white/[0.025] text-slate-500 uppercase text-[9px] border-b border-white/[0.07] tracking-[0.12em]">
              <tr>
                <th className="py-3 px-4">Registro</th>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Ativo</th>
                <th className="py-3 px-4">Vendedor</th>
                <th className="py-3 px-4">Comprador</th>
                <th className="py-3 px-4 text-right">Valor</th>
                <th className="py-3 px-4 text-right">Taxa</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.05]">
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center">
                    <HistoryIcon className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                    <p className="font-heading font-bold text-slate-300">
                      Nenhuma transação encontrada
                    </p>
                    <p className="text-[10px] text-slate-600 mt-1">
                      Não existem registros correspondentes à consulta atual.
                    </p>
                  </td>
                </tr>
              )}

              {filteredTransactions.map((tx, index) => (
                <tr
                  key={index}
                  className="hover:bg-white/[0.025] text-slate-300 transition-colors"
                >
                  <td className="py-3 px-4 text-[10px] text-slate-600">
                    <span className="px-2 py-1 rounded-lg bg-white/[0.025] border border-white/[0.04]">
                      {typeof tx.id === 'string'
                        ? tx.id.slice(0, 10) + '...'
                        : 'Indisponível'}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-slate-500">
                    {safeText(tx.timestamp)}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 min-w-[190px]">
                      {tx.itemSnapshot && (
                        <CardImage
                          asset={tx.itemSnapshot}
                          src={
                            typeof tx.itemSnapshot.image === 'string'
                              ? tx.itemSnapshot.image
                              : undefined
                          }
                          alt={safeText(
                            tx.itemSnapshot?.name,
                            'Ativo não identificado'
                          )}
                          className="w-7 h-7 rounded-lg object-cover border border-white/[0.07]"
                        />
                      )}

                      <span className="font-bold text-white truncate max-w-[150px]">
                        {safeText(
                          tx.itemSnapshot?.name,
                          'Ativo não identificado'
                        )}
                      </span>

                      {[
                        'Comum',
                        'Incomum',
                        'Raro',
                        'Épico',
                        'Lendário',
                        'Mítico',
                      ].includes(tx.itemSnapshot?.rarity) && (
                        <RarityBadge
                          rarity={tx.itemSnapshot.rarity}
                          size="sm"
                          showDot={false}
                        />
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-slate-400">
                    {safeText(tx.sellerName)}
                  </td>

                  <td className="py-3 px-4 text-slate-400">
                    {safeText(tx.buyerName)}
                  </td>

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
      </section>
    </div>
  );
};
