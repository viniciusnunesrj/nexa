import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Sparkles, PackageOpen, Coins, CheckCircle, Shield, Lock } from 'lucide-react';

interface FirstAccessModalProps {
  onNavigate: (page: string) => void;
  onDismiss: () => void;
}

export const FirstAccessModal: React.FC<FirstAccessModalProps> = ({
  onNavigate,
  onDismiss,
}) => {
  const { user, dismissFirstAccess } = useAuth();

  const handleAction = (page?: string) => {
    dismissFirstAccess();
    onDismiss();
    if (page) {
      onNavigate(page);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0f111a] via-[#0a0c14] to-[#07080d] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(6,182,212,0.25)] text-white space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>NOVO PILOTO AUTORIZADO NO SISTEMA</span>
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-indigo-300">
            Bem-vindo ao NEXA!
          </h2>

          <p className="text-slate-300 text-sm max-w-md mx-auto">
            Olá, <span className="text-cyan-400 font-bold">{user.username}</span>! Seu kit de boas-vindas foi desbloqueado com sucesso.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-cyan-500/30 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <PackageOpen className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold block">CAIXA RECRUTA GRÁTIS</span>
              <h4 className="font-heading font-bold text-white text-sm">4 Cartas Iniciais</h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">4 diferentes • ★1 • vinculadas à conta</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.04] border border-cyan-500/20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Coins className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400 font-bold block">
                NEX RECEBIDO
              </span>
              <div className="font-heading font-black text-cyan-300 text-xl">
                +1.000 NEX
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Saldo livre para caixas e progressão
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.04] border border-purple-500/20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400 font-bold block">
                PATENTE & EXPERIÊNCIA
              </span>
              <div className="font-heading font-black text-purple-300 text-xl">
                Nível 1 <span className="text-xs font-mono font-normal text-slate-400">• 0 XP</span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Suba de nível vencendo combates
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-center gap-3 text-xs font-mono text-slate-300">
          <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong>Próximo passo:</strong> abra sua Caixa Recruta grátis. Ela entrega 4 cartas diferentes e forma seu primeiro esquadrão para os jogos.
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => handleAction('boxes')}
            className="flex-1 py-3.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
          >
            <PackageOpen className="w-4 h-4" />
            <span>Abrir Caixa Recruta</span>
          </button>

          <button
            onClick={() => handleAction()}
            className="sm:w-auto py-3.5 px-4 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white font-mono text-xs uppercase tracking-wider transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
