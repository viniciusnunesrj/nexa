import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import { TradeProposal, NexaAsset } from '../types';
import { RARITY_CONFIG } from '../config/designTokens';
import { RarityBadge } from '../components/common/RarityBadge';
import { TradeProposalModal } from '../components/modals/TradeProposalModal';
import {
  ArrowLeftRight,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';

export const Trades: React.FC = () => {
  const { user } = useAuth();
  const { trades, acceptTrade, rejectTrade, cancelTrade } = useGameState();

  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'history'>('received');
  const [newTradeModalOpen, setNewTradeModalOpen] = useState(false);

  const receivedTrades = trades.filter(
    (t) => t.receiverId === user.id && t.status === 'PENDING'
  );
  const sentTrades = trades.filter(
    (t) => t.senderId === user.id && t.status === 'PENDING'
  );
  const historyTrades = trades.filter(
    (t) =>
      (t.senderId === user.id || t.receiverId === user.id) &&
      t.status !== 'PENDING'
  );

  const renderTradeCard = (trade: TradeProposal, isReceived: boolean, isSent: boolean) => {
    return (
      <div
        key={trade.id}
        className="p-6 rounded-2xl bg-[#0c0c16] border border-white/10 hover:border-purple-500/40 transition-all space-y-4"
      >
        {/* Header with players and timestamp */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img
                src={trade.senderAvatar}
                alt={trade.senderName}
                className="w-7 h-7 rounded-lg object-cover"
              />
              <span className="font-heading font-bold text-xs text-white">
                {trade.senderName} {trade.senderId === user.id && '(Você)'}
              </span>
            </div>

            <ArrowRight className="w-4 h-4 text-purple-400" />

            <div className="flex items-center gap-2">
              <img
                src={trade.receiverAvatar}
                alt={trade.receiverName}
                className="w-7 h-7 rounded-lg object-cover"
              />
              <span className="font-heading font-bold text-xs text-white">
                {trade.receiverName} {trade.receiverId === user.id && '(Você)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase ${
                trade.status === 'PENDING'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : trade.status === 'ACCEPTED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : trade.status === 'REJECTED'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {trade.status === 'PENDING'
                ? 'Aguardando Resposta'
                : trade.status === 'ACCEPTED'
                ? 'Permuta Concluída'
                : trade.status === 'REJECTED'
                ? 'Recusada'
                : 'Cancelada'}
            </span>
            <span className="text-[10px] font-mono text-slate-500">{trade.createdAt}</span>
          </div>
        </div>

        {/* Trade exchange comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sender Offer */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
            <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold block">
              Oferta ({trade.senderName}):
            </span>
            <div className="space-y-1.5">
              {trade.offeredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white/5 text-xs font-mono"
                >
                  <div className="flex items-center gap-2 truncate">
                    <img src={item.image} alt={item.name} className="w-6 h-6 rounded object-cover" />
                    <span className="text-slate-200 truncate">{item.name}</span>
                  </div>
                  <RarityBadge rarity={item.rarity} size="sm" showDot={false} />
                </div>
              ))}
              {trade.offeredNXA > 0 && (
                <div className="p-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-xs font-mono text-cyan-300 font-bold flex items-center justify-between">
                  <span>Tokens NXA:</span>
                  <span>+{trade.offeredNXA} NXA</span>
                </div>
              )}
            </div>
          </div>

          {/* Receiver Expected */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 space-y-2">
            <span className="text-[10px] font-mono uppercase text-purple-400 font-bold block">
              Contrapartida ({trade.receiverName}):
            </span>
            <div className="space-y-1.5">
              {trade.requestedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white/5 text-xs font-mono"
                >
                  <div className="flex items-center gap-2 truncate">
                    <img src={item.image} alt={item.name} className="w-6 h-6 rounded object-cover" />
                    <span className="text-slate-200 truncate">{item.name}</span>
                  </div>
                  <RarityBadge rarity={item.rarity} size="sm" showDot={false} />
                </div>
              ))}
              {trade.requestedNXA > 0 && (
                <div className="p-1.5 rounded-lg bg-purple-950/40 border border-purple-500/20 text-xs font-mono text-purple-300 font-bold flex items-center justify-between">
                  <span>Tokens NXA:</span>
                  <span>+{trade.requestedNXA} NXA</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Note if any */}
        {trade.note && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white/5 text-xs font-mono text-slate-300">
            <MessageSquare className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="italic">"{trade.note}"</p>
          </div>
        )}

        {/* Action buttons if Pending */}
        {trade.status === 'PENDING' && (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
            {isReceived && (
              <>
                <button
                  onClick={() => rejectTrade(trade.id)}
                  className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" /> Recusar
                </button>
                <button
                  onClick={() => acceptTrade(trade.id)}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Aceitar Permuta
                </button>
              </>
            )}

            {isSent && (
              <button
                onClick={() => cancelTrade(trade.id)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold transition-colors"
              >
                Cancelar Proposta
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-purple-400 uppercase tracking-wider">
            <ArrowLeftRight className="w-4 h-4" /> Trocas Diretas P2P
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white mt-1">
            Central de Negociações (Trades)
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Permute itens, personagens e pacotes de NXA diretamente com outros jogadores com validação criptográfica do livro-razão.
          </p>
        </div>

        <button
          onClick={() => setNewTradeModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] flex items-center gap-2 hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Proposta de Troca</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 flex items-center gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('received')}
          className={`pb-3 px-4 font-heading font-bold text-sm tracking-wide transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'received'
              ? 'border-purple-400 text-purple-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Propostas Recebidas</span>
          {receivedTrades.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-600 text-white">
              {receivedTrades.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('sent')}
          className={`pb-3 px-4 font-heading font-bold text-sm tracking-wide transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'sent'
              ? 'border-purple-400 text-purple-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Propostas Enviadas</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-500">
            {sentTrades.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 font-heading font-bold text-sm tracking-wide transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-purple-400 text-purple-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Histórico de Permutas</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-500">
            {historyTrades.length}
          </span>
        </button>
      </div>

      {/* Tab Content List */}
      <div className="space-y-4">
        {activeTab === 'received' && (
          <>
            {receivedTrades.length === 0 ? (
              <div className="py-20 text-center rounded-3xl bg-[#0a0a10] border border-dashed border-white/10 p-8">
                <ArrowLeftRight className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="font-heading text-lg font-bold text-white">Nenhuma proposta pendente</h4>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Quando outro piloto fizer uma oferta por seus itens, ela aparecerá aqui para aprovação.
                </p>
              </div>
            ) : (
              receivedTrades.map((t) => renderTradeCard(t, true, false))
            )}
          </>
        )}

        {activeTab === 'sent' && (
          <>
            {sentTrades.length === 0 ? (
              <div className="py-20 text-center rounded-3xl bg-[#0a0a10] border border-dashed border-white/10 p-8">
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="font-heading text-lg font-bold text-white">Você não tem propostas ativas enviadas</h4>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Inicie uma permuta direta com qualquer outro jogador da comunidade.
                </p>
                <button
                  onClick={() => setNewTradeModalOpen(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold"
                >
                  Propor Nova Troca
                </button>
              </div>
            ) : (
              sentTrades.map((t) => renderTradeCard(t, false, true))
            )}
          </>
        )}

        {activeTab === 'history' && (
          <>
            {historyTrades.length === 0 ? (
              <div className="py-20 text-center rounded-3xl bg-[#0a0a10] border border-dashed border-white/10 p-8">
                <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="font-heading text-lg font-bold text-white">Nenhum registro histórico de trocas</h4>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  As permutas finalizadas ou rejeitadas ficam permanentemente registradas aqui.
                </p>
              </div>
            ) : (
              historyTrades.map((t) =>
                renderTradeCard(t, t.receiverId === user.id, t.senderId === user.id)
              )
            )}
          </>
        )}
      </div>

      {/* Trade Proposal Modal */}
      {newTradeModalOpen && (
        <TradeProposalModal onClose={() => setNewTradeModalOpen(false)} />
      )}
    </div>
  );
};
