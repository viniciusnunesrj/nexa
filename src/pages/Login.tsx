import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { soundService } from '../services/soundService';
import { supabase } from '../lib/supabase';
import {
  ArrowRight,
  User,
  Lock,
  AlertCircle,
  Loader2,
  KeyRound,
  X,
} from 'lucide-react';

interface LoginProps {
  onNavigate: (page: string) => void;
  onSuccess?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigate, onSuccess }) => {
  const { login, authError } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError('Por favor, informe seu nome de usuário ou e-mail.');
      return;
    }

    setIsLoading(true);
    soundService.playClick();

    try {
      const result = await login(identifier.trim(), password);
      if (result.success && result.user) {
        soundService.playSuccess();
        if (onSuccess) onSuccess();
        else onNavigate('dashboard');
      } else {
        soundService.playError();
        setError(result.error || 'Falha ao autenticar. Verifique suas credenciais.');
      }
    } catch {
      setError('Ocorreu um erro inesperado ao conectar ao sistema.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_70%,rgba(6,182,212,.18),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(168,85,247,.16),transparent_30%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden border-r border-white/[.07] lg:flex lg:flex-col lg:justify-between lg:p-12">
          <img src="/assets/rift-battle-card.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-60"/>
          <div className="absolute inset-0 bg-gradient-to-r from-[#02040a]/55 via-[#02040a]/68 to-[#02040a]"/>
          <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-transparent to-[#02040a]/60"/>
          <button type="button" onClick={()=>onNavigate('home')} className="relative z-10 flex w-fit items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-cyan-300 to-indigo-500 font-brand text-xl font-black text-slate-950 shadow-[0_0_30px_rgba(34,211,238,.35)]">N</span><span className="font-brand text-2xl font-black tracking-[.18em]">NEXA</span></button>
          <div className="relative z-10 max-w-lg pb-8"><span className="font-mono text-[10px] font-black uppercase tracking-[.22em] text-cyan-300">Continue sua jornada</span><h1 className="mt-4 font-heading text-5xl font-black uppercase leading-[.92]">Sua coleção.<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-fuchsia-400">Suas batalhas.</span></h1><p className="mt-5 max-w-md text-sm leading-7 text-slate-300">Entre na sua conta para voltar ao Rift Battle, Nexus Duel, coleção e progressão.</p></div>
        </section>
        <section className="flex items-center justify-center p-4 sm:p-8 lg:p-12">
          <div className="w-full max-w-md">
            <button type="button" onClick={()=>onNavigate('home')} className="mb-8 flex items-center gap-3 lg:hidden"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-cyan-300 to-indigo-500 font-brand text-lg font-black text-slate-950">N</span><span className="font-brand text-xl font-black tracking-[.16em]">NEXA</span></button>
            <div className="mb-8"><span className="font-mono text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">Acessar conta</span><h2 className="mt-2 font-heading text-3xl font-black uppercase sm:text-4xl">Bem-vindo de volta</h2><p className="mt-2 text-sm text-slate-400">Entre para continuar de onde parou.</p></div>
            {(error || authError) && <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/40 bg-red-950/40 p-3.5 text-xs text-red-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0"/><span role="alert">{error || authError}</span></div>}
            <form onSubmit={handleLogin} className="space-y-4">
              <div><label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300"><User className="h-3.5 w-3.5 text-cyan-400"/>Usuário ou e-mail</label><input type="text" value={identifier} onChange={(e)=>setIdentifier(e.target.value)} placeholder="Digite seu usuário ou e-mail" disabled={isLoading} className="w-full rounded-xl border border-white/10 bg-[#0b101a] px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/10"/></div>
              <div><div className="mb-1.5 flex items-center justify-between"><label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300"><Lock className="h-3.5 w-3.5 text-cyan-400"/>Senha</label><button type="button" onClick={()=>setShowForgotModal(true)} className="text-[11px] font-bold text-cyan-300 hover:text-cyan-200">Esqueci minha senha</button></div><input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Sua senha" disabled={isLoading} className="w-full rounded-xl border border-white/10 bg-[#0b101a] px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/10"/></div>
              <button type="submit" disabled={isLoading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-cyan-400 py-4 font-heading text-xs font-black uppercase tracking-[.12em] text-slate-950 shadow-[0_0_30px_rgba(34,211,238,.18)] transition hover:brightness-110 disabled:opacity-50">{isLoading ? <><Loader2 className="h-4 w-4 animate-spin"/>Entrando...</> : <>Entrar no NEXA <ArrowRight className="h-4 w-4"/></>}</button>
            </form>
            <div className="mt-6 border-t border-white/[.08] pt-5 text-center text-xs text-slate-400">Novo no NEXA? <button type="button" onClick={()=>onNavigate('register')} className="font-bold text-cyan-300 hover:text-cyan-200">Criar conta grátis</button></div>
          </div>
        </section>
      </div>
      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#0e0f1a] border border-cyan-500/40 rounded-2xl p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 font-heading font-bold text-lg">
                <KeyRound className="w-5 h-5" />
                <span>Recuperação de Senha</span>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              Informe o e-mail cadastrado. Você receberá um link seguro para criar uma nova senha.
            </p>
            <input
              type="email"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              placeholder="seu@email.com"
              disabled={recoveryLoading}
              className="w-full bg-[#131422] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
            {recoveryMessage && <p className="text-xs font-mono text-cyan-300">{recoveryMessage}</p>}
            <button
              disabled={recoveryLoading || !recoveryEmail.trim()}
              onClick={async () => {
                setRecoveryLoading(true);
                setRecoveryMessage(null);
                const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail.trim(), {
                  redirectTo: `${window.location.origin}/reset-password`,
                });
                setRecoveryLoading(false);
                setRecoveryMessage(error ? 'Não foi possível enviar o e-mail. Tente novamente.' : 'Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.');
              }}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-mono text-xs font-bold transition-colors"
            >
              {recoveryLoading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
            <button onClick={() => setShowForgotModal(false)} className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold transition-colors">
              Voltar ao Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
