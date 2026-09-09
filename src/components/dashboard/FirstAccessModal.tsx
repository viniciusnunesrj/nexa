import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Sparkles, Swords, Package, Zap, Coins, CheckCircle, Shield } from 'lucide-react';

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
        {/* Glow Header */}
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

        {/* Rewards & Starter Kit Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Starter Character */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-cyan-500/30 flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-cyan-400/40">
              <img
                src="https://images.unsplash.com/photo-1511512578047-dfb367046420?w=200&auto=format&fit=crop&q=80"
                alt="Recruta da Vanguarda"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] font-mono text-center text-cyan-300 py-0.5">
                COMUM
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold block">
                PERSONAGEM INICIAL
              </span>
              <h4 className="font-heading font-bold text-white text-sm">
                Recruta da Vanguarda
              </h4>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Classe: Guerreiro • 450 PWR
              </p>
            </div>
          </div>

          {/* Currency NEX */}
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
                Moeda do jogo para batalhas e fusão
              </p>
            </div>
          </div>

          {/* Tokens NXA */}
          <div className="p-4 rounded-2xl bg-white/[0.04] border border-amber-500/20 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-slate-400 font-bold block">
                NXA RECEBIDO
              </span>
              <div className="font-heading font-black text-amber-400 text-xl">
                +100 NXA
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Tokens para negociações no Marketplace
              </p>
            </div>
          </div>

          {/* Level & XP */}
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

        {/* Starter Kit Summary */}
        <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-center gap-3 text-xs font-mono text-slate-300">
          <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong>Inventário inicial ativo:</strong> 1x Recruta da Vanguarda (Equipado) + 1x Lâmina Cinética de Treino prontos para ação.
          </span>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => handleAction('play')}
            className="flex-1 py-3.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
          >
            <Swords className="w-4 h-4" />
            <span>Ir para a Arena e Batalhar</span>
          </button>

          <button
            onClick={() => handleAction('inventory')}
            className="flex-1 py-3.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-heading font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2"
          >
            <Package className="w-4 h-4 text-cyan-300" />
            <span>Ver Meu Inventário</span>
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
