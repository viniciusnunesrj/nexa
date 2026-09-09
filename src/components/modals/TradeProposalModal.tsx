import React, { useState } from 'react';
import { NexaAsset, NexaUser } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useGameState } from '../../contexts/GameStateContext';
import { X, ArrowLeftRight, Plus, Minus, AlertCircle } from 'lucide-react';
import { RarityBadge } from '../common/RarityBadge';

interface TradeProposalModalProps {
  initialItem?: NexaAsset | null;
  onClose: () => void;
}

export const TradeProposalModal: React.FC<TradeProposalModalProps> = ({
  initialItem,
  onClose,
}) => {
  const { user, allUsers } = useAuth();
  const { assets, proposeTrade } = useGameState();

  const otherUsers = allUsers.filter((u) => u.id !== user.id);
  const [selectedUserId, setSelectedUserId] = useState<string>(
    otherUsers[0]?.id || ''
  );

  const [offeredItemIds, setOfferedItemIds] = useState<string[]>(
    initialItem ? [initialItem.id] : []
  );
  const [offeredNXA, setOfferedNXA] = useState<number>(0);

  const [requestedItemIds, setRequestedItemIds] = useState<string[]>([]);
  const [requestedNXA, setRequestedNXA] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');

  const myAvailableItems = assets.filter(
    (a) => a.ownerId === user.id && (a.status === 'IDLE' || a.id === initialItem?.id)
  );

  const targetUserItems = assets.filter(
    (a) => a.ownerId === selectedUserId && (a.status === 'IDLE' || a.status === 'LISTED')
  );

  const toggleOfferItem = (id: string) => {
    setOfferedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleRequestItem = (id: string) => {
    setRequestedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError('Selecione um jogador destinatário.');
      return;
    }
    if (offeredItemIds.length === 0 && offeredNXA <= 0) {
      setError('Você deve oferecer pelo menos 1 item ou uma quantidade de NXA.');
      return;
    }
    if (requestedItemIds.length === 0 && requestedNXA <= 0) {
      setError('Você deve solicitar pelo menos 1 item ou uma quantidade de NXA.');
      return;
    }
    if (offeredNXA > user.balanceNXA) {
      setError('Você não possui saldo suficiente de NXA para esta oferta.');
      return;
    }

    proposeTrade(
      selectedUserId,
      offeredItemIds,
      offeredNXA,
      requestedItemIds,
      requestedNXA,
      note
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0b0b14] border border-purple-500/40 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-purple-950/20">
          <div className="flex items-center gap-2 text-purple-400 font-mono text-xs uppercase">
            <ArrowLeftRight className="w-5 h-5" /> Proposta de Troca Direta P2P
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-black/50 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Select Target User */}
          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase mb-2">
              Selecionar Jogador Destinatário:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {otherUsers.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => {
                    setSelectedUserId(target.id);
                    setRequestedItemIds([]);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                    selectedUserId === target.id
                      ? 'bg-purple-950/60 border-purple-500 ring-1 ring-purple-400 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <img
                    src={target.avatar}
                    alt={target.username}
                    className="w-8 h-8 rounded-full object-cover border border-purple-400/40"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold block truncate">{target.username}</span>
                    <span className="text-[10px] font-mono text-slate-500">Nv. {target.level}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Two-column barter picker */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Column 1: Sua Oferta */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 flex flex-col">
              <h4 className="font-heading text-sm font-bold text-cyan-300 mb-2 flex items-center justify-between">
                <span>Você Oferece:</span>
                <span className="text-xs font-mono text-slate-400 font-normal">
                  {offeredItemIds.length} item(ns) selecionado(s)
                </span>
              </h4>

              {/* Items list */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {myAvailableItems.length === 0 ? (
                  <p className="text-xs text-slate-500 font-mono py-4 text-center">Nenhum item disponível.</p>
                ) : (
                  myAvailableItems.map((item) => {
                    const isSelected = offeredItemIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleOfferItem(item.id)}
                        className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-cyan-950/50 border-cyan-500 text-cyan-200'
                            : 'bg-white/5 border-white/5 text-slate-300 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <img src={item.image} alt={item.name} className="w-7 h-7 rounded object-cover" />
                          <span className="truncate font-medium">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <RarityBadge rarity={item.rarity} size="sm" showDot={false} />
                          {isSelected ? <Minus className="w-4 h-4 text-cyan-400" /> : <Plus className="w-4 h-4 text-slate-500" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Extra NXA */}
              <div className="mt-3 pt-3 border-t border-white/10">
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Adicionar Tokens NXA à oferta (Saldo: {user.balanceNXA}):
                </label>
                <input
                  type="number"
                  min="0"
                  max={user.balanceNXA}
                  value={offeredNXA}
                  onChange={(e) => setOfferedNXA(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#161622] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white"
                />
              </div>
            </div>

            {/* Column 2: O Que Você Solicita */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 flex flex-col">
              <h4 className="font-heading text-sm font-bold text-purple-300 mb-2 flex items-center justify-between">
                <span>Você Solicita:</span>
                <span className="text-xs font-mono text-slate-400 font-normal">
                  {requestedItemIds.length} item(ns)
                </span>
              </h4>

              {/* Target user items */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {targetUserItems.length === 0 ? (
                  <p className="text-xs text-slate-500 font-mono py-4 text-center">Este jogador não possui itens disponíveis.</p>
                ) : (
                  targetUserItems.map((item) => {
                    const isSelected = requestedItemIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleRequestItem(item.id)}
                        className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-purple-950/50 border-purple-500 text-purple-200'
                            : 'bg-white/5 border-white/5 text-slate-300 hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <img src={item.image} alt={item.name} className="w-7 h-7 rounded object-cover" />
                          <span className="truncate font-medium">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <RarityBadge rarity={item.rarity} size="sm" showDot={false} />
                          {isSelected ? <Minus className="w-4 h-4 text-purple-400" /> : <Plus className="w-4 h-4 text-slate-500" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Requested NXA */}
              <div className="mt-3 pt-3 border-t border-white/10">
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Solicitar Tokens NXA extras:
                </label>
                <input
                  type="number"
                  min="0"
                  value={requestedNXA}
                  onChange={(e) => setRequestedNXA(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#161622] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white"
                />
              </div>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase mb-1">
              Mensagem ou Justificativa da Permuta (Opcional):
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Ofereço lâmina + tokens pela sua relíquia temporal..."
              className="w-full bg-[#161622] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-sans text-white focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-colors shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            >
              Transmitir Proposta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
