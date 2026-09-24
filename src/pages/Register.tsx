import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { soundService } from '../services/soundService';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface RegisterProps {
  onNavigate: (page: string) => void;
  onSuccess?: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onNavigate, onSuccess }) => {
  const { register, authError } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    // Client-side quick validations before calling service
    if (!username.trim()) {
      setError('O nome de usuário (username) é obrigatório.');
      return;
    }
    if (username.trim().length < 3) {
      setError('O nome de usuário deve conter no mínimo 3 caracteres.');
      return;
    }
    if (!email.trim()) {
      setError('O e-mail é obrigatório.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Por favor, informe um endereço de e-mail válido.');
      return;
    }
    if (!password) {
      setError('A senha é obrigatória.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    setIsLoading(true);
    soundService.playClick();

    try {
      const result = await register({
        username: username.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      });

      if (result.success && result.requiresEmailConfirmation) {
        setPassword('');
        setConfirmPassword('');
        setMessage(result.message || 'Confirme seu e-mail e faça login para continuar.');
      } else if (result.success && result.user) {
        soundService.playSuccess();
        if (onSuccess) onSuccess();
        onNavigate('dashboard');
      } else {
        soundService.playError();
        setError(result.error || 'Erro ao registrar nova conta.');
      }
    } catch {
      setError('Erro inesperado ao registrar usuário.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-white relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(217,70,239,.18),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(6,182,212,.16),transparent_34%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden overflow-hidden border-r border-white/[.07] lg:flex lg:flex-col lg:justify-between lg:p-12">
          <img src="/assets/nexus-duel-card.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#02040a]/60 via-[#02040a]/70 to-[#02040a]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#02040a] via-transparent to-[#02040a]/60" />
          <button type="button" onClick={() => onNavigate('home')} className="relative z-10 flex w-fit items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-cyan-300 to-indigo-500 font-brand text-xl font-black text-slate-950 shadow-[0_0_30px_rgba(34,211,238,.35)]">N</span>
            <span className="font-brand text-2xl font-black tracking-[.18em]">NEXA</span>
          </button>
          <div className="relative z-10 max-w-lg pb-8">
            <span className="font-mono text-[10px] font-black uppercase tracking-[.22em] text-fuchsia-300">Sua jornada começa aqui</span>
            <h1 className="mt-4 font-heading text-5xl font-black uppercase leading-[.92]">Entre no<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-fuchsia-400">universo NEXA.</span></h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-300">Batalhe, construa sua coleção e avance em experiências conectadas pela mesma conta.</p>
            <div className="mt-7 inline-flex rounded-xl border border-cyan-400/25 bg-black/35 px-4 py-3 backdrop-blur-md">
              <div><span className="block font-heading text-lg font-black text-cyan-300">1.000 NEX</span><span className="text-[10px] uppercase tracking-wider text-slate-400">saldo inicial da nova conta</span></div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-4 sm:p-8 lg:p-12">
          <div className="w-full max-w-lg">
            <button type="button" onClick={() => onNavigate('home')} className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-cyan-300 to-indigo-500 font-brand text-lg font-black text-slate-950">N</span>
              <span className="font-brand text-xl font-black tracking-[.16em]">NEXA</span>
            </button>
            <div className="mb-7">
              <span className="font-mono text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">Criar conta</span>
              <h2 className="mt-2 font-heading text-3xl font-black uppercase sm:text-4xl">Comece a jogar</h2>
              <p className="mt-2 text-sm text-slate-400">Crie sua conta gratuita e receba 1.000 NEX para começar.</p>
            </div>

            {(error || authError) && <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/40 bg-red-950/40 p-3.5 text-xs text-red-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0"/><span role="alert">{error || authError}</span></div>}
            {message && <div role="status" className="mb-5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 p-3.5 text-sm text-cyan-200">{message}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300"><User className="h-3.5 w-3.5 text-cyan-400"/>Nome de usuário</label><input type="text" value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="Como você quer ser chamado no NEXA" disabled={isLoading} className="w-full rounded-xl border border-white/10 bg-[#0b101a] px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/10"/></div>
              <div><label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300"><Mail className="h-3.5 w-3.5 text-cyan-400"/>E-mail</label><input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="seu@email.com" disabled={isLoading} className="w-full rounded-xl border border-white/10 bg-[#0b101a] px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/10"/></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300"><Lock className="h-3.5 w-3.5 text-cyan-400"/>Senha</label><input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" disabled={isLoading} className="w-full rounded-xl border border-white/10 bg-[#0b101a] px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/10"/></div>
                <div><label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300"><Lock className="h-3.5 w-3.5 text-cyan-400"/>Confirmar senha</label><input type="password" value={confirmPassword} onChange={(e)=>setConfirmPassword(e.target.value)} placeholder="Repita sua senha" disabled={isLoading} className="w-full rounded-xl border border-white/10 bg-[#0b101a] px-4 py-3.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/10"/></div>
              </div>
              <button type="submit" disabled={isLoading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-cyan-400 py-4 font-heading text-xs font-black uppercase tracking-[.12em] text-slate-950 shadow-[0_0_30px_rgba(34,211,238,.18)] transition hover:brightness-110 disabled:opacity-50">{isLoading ? <><Loader2 className="h-4 w-4 animate-spin"/>Criando conta...</> : <>Criar minha conta <ArrowRight className="h-4 w-4"/></>}</button>
            </form>
            <div className="mt-6 border-t border-white/[.08] pt-5 text-center text-xs text-slate-400">Já tem uma conta? <button type="button" onClick={()=>onNavigate('login')} className="font-bold text-cyan-300 hover:text-cyan-200">Entrar no NEXA</button></div>
          </div>
        </section>
      </div>
    </div>
  );
};
