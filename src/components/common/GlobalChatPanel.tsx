import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  MessageCircle,
  RefreshCw,
  Send,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  GlobalChatService,
  type GlobalChatMessage,
} from '../../services/globalChatService';

interface GlobalChatPanelProps {
  open: boolean;
  onClose: () => void;
  onOpenProfile: (userId: string) => void;
}

export const GlobalChatPanel: React.FC<GlobalChatPanelProps> = ({
  open,
  onClose,
  onOpenProfile,
}) => {
  const { user } = useAuth();

  const [messages, setMessages] = useState<GlobalChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);
  const firstLoadRef = useRef(true);

  const loadMessages = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const remoteMessages = await GlobalChatService.fetchMessages(100);

      if (!mountedRef.current) return;

      setMessages(remoteMessages);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar o Chat Global.'
      );
    } finally {
      if (mountedRef.current && !silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (open) {
      void loadMessages();

      const interval = window.setInterval(() => {
        void loadMessages(true);
      }, 5000);

      return () => {
        window.clearInterval(interval);
      };
    }
  }, [open, loadMessages]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open || loading) return;

    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      bottomRef.current?.scrollIntoView();
      return;
    }

    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();

    const cleanMessage = text.trim();

    if (!cleanMessage || sending) return;

    try {
      setSending(true);
      setError(null);

      const confirmed = await GlobalChatService.sendMessage(cleanMessage);

      if (!mountedRef.current) return;

      setMessages((previous) => {
        if (previous.some((item) => item.id === confirmed.id)) {
          return previous;
        }

        return [...previous, confirmed].slice(-100);
      });

      setText('');
    } catch (err) {
      if (!mountedRef.current) return;

      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível enviar a mensagem.'
      );
    } finally {
      if (mountedRef.current) {
        setSending(false);
      }
    }
  };

  const handleProfile = (userId: string) => {
    onOpenProfile(userId);
    onClose();
  };

  const formatTime = (createdAt: string) => {
    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <>
      {/* Fundo escurecido somente no mobile */}
      {open && (
        <button
          type="button"
          aria-label="Fechar Chat Global"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/65 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        className={`
          fixed z-50
          top-0 right-0 bottom-0
          w-[92vw] max-w-[390px]
          lg:top-16 lg:bottom-0 lg:w-[360px]
          bg-[#07090d]/[0.985]
          border-l border-cyan-500/10
          shadow-[-18px_0_50px_rgba(0,0,0,0.42)]
          flex flex-col
          transition-transform duration-300 ease-out
          ${
            open
              ? 'translate-x-0'
              : 'translate-x-full pointer-events-none'
          }
        `}
      >
        {/* Cabeçalho */}
        <div className="relative overflow-hidden border-b border-white/[0.07] bg-[#090c12]">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/[0.07] via-transparent to-transparent pointer-events-none" />

          <div className="relative h-16 px-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 shrink-0 rounded-xl border border-cyan-400/20 bg-cyan-500/[0.07] flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-cyan-300" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-black text-sm text-white uppercase tracking-wide">
                    Rede Global
                  </h2>

                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                </div>

                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                  Canal público // Nexus
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => void loadMessages()}
                disabled={loading}
                title="Atualizar mensagens"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-cyan-300 hover:bg-white/5 transition-colors disabled:opacity-40"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                />
              </button>

              <button
                type="button"
                onClick={onClose}
                title="Fechar chat"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4 lg:hidden" />
                <ChevronRight className="w-4 h-4 hidden lg:block" />
              </button>
            </div>
          </div>
        </div>

        {/* Canal */}
        <div className="h-10 px-4 border-b border-white/[0.05] bg-black/25 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-cyan-400 font-mono font-bold uppercase tracking-widest">
              # Global
            </span>

            <span className="text-[9px] text-slate-600">
              buffer 100
            </span>
          </div>

          <span className="text-[9px] font-mono text-emerald-400/80 uppercase">
            online
          </span>
        </div>

        {/* Mensagens */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-0.5">
          {loading && messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Sincronizando canal...
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <div className="w-12 h-12 rounded-2xl border border-white/10 bg-white/[0.03] flex items-center justify-center mb-3">
                <MessageCircle className="w-5 h-5 text-slate-600" />
              </div>

              <p className="text-sm font-heading font-bold text-slate-300">
                Canal silencioso
              </p>

              <p className="text-[11px] text-slate-600 mt-1">
                Inicie uma transmissão para os outros pilotos.
              </p>
            </div>
          ) : (
            messages.map((chatMessage) => {
              const isMine = chatMessage.userId === user.id;

              return (
                <div
                  key={chatMessage.id}
                  className={`group flex gap-2.5 px-2 py-2.5 rounded-xl border transition-colors ${
                    isMine
                      ? 'bg-cyan-500/[0.025] border-cyan-500/[0.06]'
                      : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/[0.04]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleProfile(chatMessage.userId)}
                    title={`Abrir perfil de ${chatMessage.username}`}
                    className="shrink-0 self-start"
                  >
                    {chatMessage.avatar ? (
                      <img
                        src={chatMessage.avatar}
                        alt={chatMessage.username}
                        className="w-8 h-8 rounded-lg object-cover border border-white/[0.08] bg-slate-900 hover:border-cyan-400/40 transition-colors"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg border border-white/10 bg-gradient-to-br from-cyan-500/15 to-purple-500/15 flex items-center justify-center text-xs font-black text-cyan-300 hover:border-cyan-400/50 transition-colors">
                        {chatMessage.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleProfile(chatMessage.userId)}
                        className={`truncate text-[11px] font-heading font-bold hover:underline ${
                          isMine ? 'text-cyan-300' : 'text-purple-300'
                        }`}
                      >
                        {chatMessage.username}
                      </button>

                      {isMine && (
                        <span className="text-[8px] font-mono uppercase tracking-wider text-cyan-500/60">
                          piloto local
                        </span>
                      )}

                      <span className="ml-auto shrink-0 text-[9px] font-mono text-slate-700">
                        {formatTime(chatMessage.createdAt)}
                      </span>
                    </div>

                    <p className="mt-0.5 text-[13px] leading-[1.4rem] text-slate-300 whitespace-pre-wrap break-words">
                      {chatMessage.message}
                    </p>
                  </div>
                </div>
              );
            })
          )}

          <div ref={bottomRef} />
        </div>

        {/* Compositor */}
        <div className="shrink-0 border-t border-white/[0.07] bg-[#07080c] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {error && (
            <div className="mb-2 px-3 py-2 rounded-lg border border-rose-500/20 bg-rose-500/10 text-[10px] text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSend}>
            <div className="rounded-xl border border-white/[0.08] bg-[#0a0d13] focus-within:border-cyan-500/35 focus-within:bg-[#0b1017] transition-colors overflow-hidden">
              <textarea
                value={text}
                onChange={(event) =>
                  setText(event.target.value.slice(0, 300))
                }
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();

                    if (text.trim() && !sending) {
                      event.currentTarget.form?.requestSubmit();
                    }
                  }
                }}
                maxLength={300}
                rows={2}
                disabled={sending}
                placeholder="Transmitir mensagem em #global..."
                className="block w-full resize-none bg-transparent px-3 pt-3 pb-1 text-sm text-white placeholder:text-slate-600 outline-none disabled:opacity-60"
              />

              <div className="h-9 px-2 flex items-center justify-between">
                <span
                  className={`text-[9px] font-mono ${
                    text.length >= 280
                      ? 'text-amber-400'
                      : 'text-slate-700'
                  }`}
                >
                  {text.length}/300
                </span>

                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  className="h-7 px-3 rounded-lg bg-cyan-500/15 border border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide"
                >
                  <Send className="w-3 h-3" />
                  {sending ? 'Enviando' : 'Enviar'}
                </button>
              </div>
            </div>
          </form>

          <p className="mt-2 text-center text-[9px] text-slate-700">
            Enter transmite • Shift + Enter quebra a linha
          </p>
        </div>
      </aside>
    </>
  );
};