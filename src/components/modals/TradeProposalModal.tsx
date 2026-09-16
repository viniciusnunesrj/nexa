import { formatEconomicValue } from '../../utils/formatEconomicValue';
import { CardImage } from '../common/CardImage';
import React, { useState, useEffect, useRef } from 'react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { TradeOnlineService } from '../../services/tradeOnlineService';
import { NexaAsset } from '../../types';
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
  const { user, currentUser, isAuthenticated, publicUsers, publicUsersLoading, publicUsersError, publicUsersHasMore, loadMorePublicUsers } = useAuth();
  const { assets, proposeTrade } = useGameState();
  const online = isSupabaseConfigured();

  const otherUsers = publicUsers.filter((u) => u.id !== user.id);
  const [selectedUserId, setSelectedUserId] = useState<string>(
    otherUsers[0]?.id || ''
  );

  const [offeredItemIds, setOfferedItemIds] = useState<string[]>(
    initialItem && (!online || initialItem.type === 'Card') ? [initialItem.id] : []
  );
  const [offeredNXA, setOfferedNXA] = useState<number>(0);

  const [requestedItemIds, setRequestedItemIds] = useState<string[]>([]);
  const [requestedNXA, setRequestedNXA] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [remoteMine, setRemoteMine] = useState<NexaAsset[]>([]);
  const [remoteTarget, setRemoteTarget] = useState<NexaAsset[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [mineHasMore, setMineHasMore] = useState(false);
  const [targetHasMore, setTargetHasMore] = useState(false);
  const candidatesVersion = useRef(0);

  useEffect(() => {
    if (!online) return;
    const version = ++candidatesVersion.current;
    setRemoteMine([]); setRemoteTarget([]);
    setMineHasMore(false); setTargetHasMore(false);
    setRequestedItemIds([]);
    if (!isAuthenticated || !currentUser || !selectedUserId) return;
    setCardsLoading(true);
    setError('');
    Promise.all([
      TradeOnlineService.fetchCandidates(currentUser.id, currentUser.id),
      TradeOnlineService.fetchCandidates(currentUser.id, selectedUserId),
    ]).then(([mine, target]) => {
      if (version !== candidatesVersion.current) return;
      setRemoteMine(mine); setRemoteTarget(target);
      setMineHasMore(mine.length === 100); setTargetHasMore(target.length === 100);
    }).catch(e => {
      if (version === candidatesVersion.current) setError(e instanceof Error ? e.message : 'Falha ao carregar cartas.');
    }).finally(() => {
      if (version === candidatesVersion.current) setCardsLoading(false);
    });
    return () => { ++candidatesVersion.current; };
  }, [online, isAuthenticated, currentUser?.id, selectedUserId]);

  const loadMoreCards = async (mine: boolean) => {
    if (!currentUser || !isAuthenticated || cardsLoading) return;
    const version = candidatesVersion.current;
    setCardsLoading(true);
    try {
      const page = await TradeOnlineService.fetchCandidates(currentUser.id,
        mine ? currentUser.id : selectedUserId, mine ? remoteMine.length : remoteTarget.length);
      if (version !== candidatesVersion.current) return;
      const merge = (prev: NexaAsset[]) => [...new Map([...prev, ...page].map(c => [c.id, c])).values()];
      if (mine) { setRemoteMine(merge); setMineHasMore(page.length === 100); }
      else { setRemoteTarget(merge); setTargetHasMore(page.length === 100); }
    } catch (e) {
      if (version === candidatesVersion.current) setError(e instanceof Error ? e.message : 'Falha ao carregar cartas.');
    } finally {
      if (version === candidatesVersion.current) setCardsLoading(false);
    }
  };

  useEffect(() => {
    if (!otherUsers.some(profile => profile.id === selectedUserId)) {
      setSelectedUserId(otherUsers[0]?.id || '');
      setRequestedItemIds([]);
    }
  }, [publicUsers, user.id, selectedUserId]);

  const myAvailableItems = online ? remoteMine : assets.filter(
    (a) => a.ownerId === user.id && (a.status === 'IDLE' || a.id === initialItem?.id)
  );

  const targetUserItems = online ? remoteTarget : assets.filter(
    (a) => a.ownerId === selectedUserId && (a.status === 'IDLE' || a.status === 'LISTED')
  );

  const toggleOfferItem = (id: string) => {
    if (online && !offeredItemIds.includes(id) && offeredItemIds.length >= 10) {
      setError('Selecione até 10 cartas por lado.'); return;
    }
    setOfferedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleRequestItem = (id: string) => {
    if (online && !requestedItemIds.includes(id) && requestedItemIds.length >= 10) {
      setError('Selecione até 10 cartas por lado.'); return;
    }
    setRequestedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current || cardsLoading) return;
    if (online && (!isAuthenticated || !currentUser)) { setError('Entre na sua conta para negociar.'); return; }
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

    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      const confirmed = await proposeTrade(
      selectedUserId,
      offeredItemIds,
      offeredNXA,
      requestedItemIds,
      requestedNXA,
      note
      );
      if (confirmed) onClose();
      else setError('A operação não foi confirmada na tela. Confira a mensagem de erro e tente novamente com o mesmo pedido.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao enviar proposta.');
    } finally { savingRef.current = false; setSaving(false); }
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
            disabled={saving}
            onClick={onClose}
            className="p-1 rounded-lg bg-black/50 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          <fieldset disabled={saving} className="contents">
          {online && <p className="text-xs text-slate-400">Trocas online: Cards e NXA. Até 10 cartas por lado. Propostas duram 48 horas e não reservam cartas ou saldo; a disponibilidade será verificada no aceite.</p>}
          {cardsLoading && <p className="text-xs text-cyan-300">Carregando cartas disponíveis...</p>}
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
                    src={target.avatar || undefined}
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

          {publicUsersError && <p role="alert" className="text-xs text-rose-300">{publicUsersError}</p>}
          {publicUsersHasMore && <button type="button" disabled={publicUsersLoading} onClick={() => void loadMorePublicUsers()} className="text-xs text-cyan-300 disabled:opacity-60">{publicUsersLoading ? 'Carregando...' : publicUsersError ? 'Tentar novamente' : 'Mais jogadores'}</button>}

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
                          <CardImage asset={item} src={item.image} alt={item.name} className="w-7 h-7 rounded object-cover" />
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
              {mineHasMore && <button type="button" disabled={cardsLoading} onClick={() => void loadMoreCards(true)} className="text-xs text-cyan-300 mt-2">Mais cartas</button>}
              <div className="mt-3 pt-3 border-t border-white/10">
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Adicionar Tokens NXA à oferta (Saldo: {formatEconomicValue(user.balanceNXA)}):
                </label>
                <input
                  type="number"
                  min="0"
                  max={online ? Math.min(user.balanceNXA, 1000000) : user.balanceNXA}
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
                          <CardImage asset={item} src={item.image} alt={item.name} className="w-7 h-7 rounded object-cover" />
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
              {targetHasMore && <button type="button" disabled={cardsLoading} onClick={() => void loadMoreCards(false)} className="text-xs text-purple-300 mt-2">Mais cartas</button>}
              <div className="mt-3 pt-3 border-t border-white/10">
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Solicitar Tokens NXA extras:
                </label>
                <input
                  type="number"
                  min="0"
                  value={requestedNXA}
                  max={online ? 1000000 : undefined}
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
              maxLength={online ? 500 : undefined}
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
              disabled={saving || cardsLoading}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-colors shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            >
              {saving ? 'Confirmando...' : 'Transmitir Proposta'}
            </button>
          </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
};
