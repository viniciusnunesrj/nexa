import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { soundService } from '../services/soundService';
import {
  Shield,
  Sparkles,
  ArrowRight,
  User,
  Lock,
  AlertCircle,
  Loader2,
  KeyRound,
  CheckCircle2,
  X,
} from 'lucide-react';

interface LoginProps {
  onNavigate: (page: string) => void;
  onSuccess?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onNavigate, onSuccess }) => {
  const { login, loginAsDemo, allUsers, switchUser } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

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
      if (result.success) {
        soundService.playSuccess();
        if (onSuccess) onSuccess();
        onNavigate('dashboard');
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

  const handleDemoLogin = async () => {
    setError(null);
    setIsDemoLoading(true);
    soundService.playClick();

    try {
      const result = await loginAsDemo();
      if (result.success) {
        soundService.playSuccess();
        if (onSuccess) onSuccess();
        onNavigate('dashboard');
      } else {
        setError(result.error || 'Não foi possível carregar o usuário demo.');
      }
    } catch {
      setError('Erro ao iniciar sessão demo.');
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleQuickAccountSelect = (userId: string) => {
    soundService.playClick();
    switchUser(userId);
    if (onSuccess) onSuccess();
    onNavigate('dashboard');
  };

  return (
    <div className="min-h-screen bg-[#070709] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md rounded-3xl bg-[#0b0c14]/95 border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        {/* Logo & Brand Header */}
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

        {/* Demo Fast Access Button (Mandatory Requirement) */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isDemoLoading || isLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:via-cyan-500/30 hover:to-indigo-500/30 border border-cyan-500/40 hover:border-cyan-400 text-white font-heading font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 shadow-[0_0_15px_rgba(6,182,212,0.2)] group"
          >
            {isDemoLoading ? (
              <>
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>Carregando Piloto Demo...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
                <span>ENTRAR COMO DEMO (12.450 NEX / 850 NXA)</span>
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex py-2 items-center mb-6">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink mx-3 text-[11px] font-mono text-slate-500 uppercase">
            ou acesse sua conta
          </span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        {/* Error Feedback Message */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-mono flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Username ou E-mail</span>
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Digite seu username ou e-mail"
              disabled={isLoading || isDemoLoading}
              className="w-full bg-[#131422] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-mono text-slate-300 uppercase flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Senha</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={isLoading || isDemoLoading}
              className="w-full bg-[#131422] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || isDemoLoading}
            className="w-full mt-2 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-heading font-black text-sm uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>ENTRAR</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Link to Register */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <p className="text-xs font-mono text-slate-400">
            Não tem uma conta de piloto?{' '}
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="text-cyan-400 hover:text-cyan-300 font-bold underline transition-colors"
            >
              Criar conta
            </button>
          </p>
        </div>

        {/* Development Mode Notice */}
        <div className="mt-5 text-center text-[10px] font-mono text-slate-500">
          Autenticação local para desenvolvimento (MVP). Sem blockchain/cripto.
        </div>
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
              No ambiente local de desenvolvimento (MVP), você pode:
            </p>

            <ul className="text-xs font-mono text-slate-400 space-y-2 bg-white/5 p-3 rounded-xl border border-white/5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Entrar como Demo: <strong>demo / demo123</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>Ou criar uma nova conta na tela de cadastro.</span>
              </li>
            </ul>

            <p className="text-[11px] text-slate-500 font-mono">
              Em produção, esta ação enviará um link de redefinição com chave criptográfica via Firebase Authentication.
            </p>

            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs font-bold transition-colors"
            >
              Voltar ao Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
