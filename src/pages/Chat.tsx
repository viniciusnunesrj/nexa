import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, RefreshCw, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  GlobalChatService,
  type GlobalChatMessage,
} from '../services/globalChatService';

export const Chat: React.FC = () => {
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
    void loadMessages();

    const interval = window.setInterval(() => {
      void loadMessages(true);
    }, 5000);

    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
    };
  }, [loadMessages]);

  useEffect(() => {
    if (loading) return;

    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      bottomRef.current?.scrollIntoView();
      return;
    }

    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();

    const cleanMessage = text.trim();

    if (!cleanMessage || sending) return;

    if (cleanMessage.length > 300) {
      setError('A mensagem deve ter no máximo 300 caracteres.');
      return;
    }

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

  const formatTime = (createdAt: string) => {
    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-cyan-400" />
            </div>

            <div>
              <h1 className="font-brand font-black text-2xl text-white tracking-wide">
                Chat Global
              </h1>

              <p className="text-sm text-slate-400">
                Comunicação entre pilotos conectados ao NEXA.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadMessages()}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-mono text-slate-300 hover:text-cyan-300 hover:border-cyan-500/30 disabled:opacity-50 transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
          />
          Atualizar
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#09090f]/90 overflow-hidden shadow-2xl">
        <div className="px-4 sm:px-5 py-3 border-b border-white/10 bg-black/30 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-cyan-400">
              Canal Público
            </span>

            <p className="text-[11px] text-slate-500 mt-0.5">
              Últimas 100 mensagens
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ONLINE
          </div>
        </div>

        <div className="h-[55vh] min-h-[360px] max-h-[650px] overflow-y-auto p-3 sm:p-5 space-y-3">
          {loading && messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Carregando transmissões...
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <MessageCircle className="w-10 h-10 text-slate-700 mb-3" />

              <p className="font-heading font-bold text-slate-300">
                O canal está silencioso
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Seja o primeiro piloto a enviar uma mensagem.
              </p>
            </div>
          ) : (
            messages.map((chatMessage) => {
              const isMine = chatMessage.userId === user.id;

              return (
                <div
                  key={chatMessage.id}
                  className={`flex gap-3 ${
                    isMine ? 'flex-row-reverse' : ''
                  }`}
                >
                  <img
                    src={
                      chatMessage.avatar ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                        chatMessage.username
                      )}`
                    }
                    alt={chatMessage.username}
                    className="w-9 h-9 rounded-xl object-cover border border-white/10 shrink-0 bg-slate-900"
                  />

                  <div
                    className={`max-w-[82%] sm:max-w-[72%] ${
                      isMine ? 'text-right' : ''
                    }`}
                  >
                    <div
                      className={`flex items-center gap-2 mb-1 ${
                        isMine ? 'justify-end' : ''
                      }`}
                    >
                      <span
                        className={`text-xs font-heading font-bold ${
                          isMine ? 'text-cyan-300' : 'text-purple-300'
                        }`}
                      >
                        {chatMessage.username}
                      </span>

                      <span className="text-[10px] font-mono text-slate-600">
                        {formatTime(chatMessage.createdAt)}
                      </span>
                    </div>

                    <div
                      className={`px-3.5 py-2.5 rounded-2xl border text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isMine
                          ? 'bg-cyan-500/10 border-cyan-500/25 text-slate-100 rounded-tr-sm'
                          : 'bg-white/5 border-white/10 text-slate-200 rounded-tl-sm'
                      }`}
                    >
                      {chatMessage.message}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <div ref={bottomRef} />
        </div>

        <div className="border-t border-white/10 bg-black/30 p-3 sm:p-4">
          {error && (
            <div className="mb-3 px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSend}
            className="flex items-end gap-2 sm:gap-3"
          >
            <div className="flex-1">
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value.slice(0, 300))}
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
                placeholder="Transmitir mensagem para todos os pilotos..."
                disabled={sending}
                className="w-full resize-none rounded-xl bg-slate-950/80 border border-white/10 px-3.5 py-3 text-sm text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 disabled:opacity-60"
              />

              <div className="mt-1 text-right text-[10px] font-mono text-slate-600">
                {text.length}/300
              </div>
            </div>

            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="h-[46px] px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-black text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />

              <span className="hidden sm:inline">
                {sending ? 'Enviando...' : 'Enviar'}
              </span>
            </button>
          </form>

          <p className="mt-2 text-[10px] text-slate-600">
            Enter envia • Shift + Enter quebra a linha • limite de 300 caracteres
          </p>
        </div>
      </div>
    </div>
  );
};