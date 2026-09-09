import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { soundService } from '../services/soundService';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Coins,
  Shield,
  Gift,
} from 'lucide-react';

interface RegisterProps {
  onNavigate: (page: string) => void;
  onSuccess?: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onNavigate, onSuccess }) => {
  const { register } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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

      if (result.success) {
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
    <div className="min-h-screen bg-[#070709] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-lg rounded-3xl bg-[#0b0c14]/95 border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        {/* Logo & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 via-cyan-400 to-indigo-600 text-slate-950 font-brand font-black text-2xl shadow-[0_0_25px_rgba(6,182,212,0.4)] mb-3">
            N
          </div>
          <h1 className="font-brand text-3xl font-black tracking-wider text-white">
            NEXA
          </h1>
          <p className="text-sm font-heading font-medium text-cyan-400 tracking-wide mt-1">
            Jogue. Evolua. Negocie.
          </p>
        </div>

        {/* Starter Pack Incentive Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-purple-950/40 border border-cyan-500/30">
          <div className="flex items-center gap-2 text-cyan-300 text-xs font-mono font-bold mb-2">
            <Gift className="w-4 h-4 text-cyan-400" />
            <span>KIT INICIAL DE BOAS-VINDAS GARANTIDO</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono text-slate-300">
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <span className="block text-cyan-400 font-bold">+1.000 NEX</span>
              <span className="text-[10px] text-slate-400">Moeda de Jogo</span>
            </div>
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <span className="block text-amber-400 font-bold">+100 NXA</span>
              <span className="text-[10px] text-slate-400">Tokens Mercado</span>
            </div>
            <div className="p-2 rounded-xl bg-white/5 border border-white/5">
              <span className="block text-emerald-400 font-bold">1 Herói</span>
              <span className="text-[10px] text-slate-400">Recruta Inicial</span>
            </div>
          </div>
        </div>

        {/* Error Feedback Message */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-mono flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Username</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: Piloto_Kaelen (mínimo 3 caracteres)"
              disabled={isLoading}
              className="w-full bg-[#131422] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <span>E-mail</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@exemplo.com"
              disabled={isLoading}
              className="w-full bg-[#131422] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Senha</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={isLoading}
                className="w-full bg-[#131422] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Confirmar Senha</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita sua senha"
                disabled={isLoading}
                className="w-full bg-[#131422] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-3 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-heading font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Criando sua Conta...</span>
              </>
            ) : (
              <>
                <span>CADASTRAR E RECEBER KIT</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Link back to Login */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <p className="text-xs font-mono text-slate-400">
            Já possui uma credencial de piloto?{' '}
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="text-cyan-400 hover:text-cyan-300 font-bold underline transition-colors"
            >
              Fazer login
            </button>
          </p>
        </div>

        {/* Development Mode Notice */}
        <div className="mt-4 text-center text-[10px] font-mono text-slate-500">
          Armazenamento local seguro (MVP). Suas credenciais serão preservadas neste navegador.
        </div>
      </div>
    </div>
  );
};
