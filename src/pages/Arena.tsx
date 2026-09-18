import React from 'react';
import { ArrowLeft, Clock, Shield } from 'lucide-react';

interface ArenaProps {
  onNavigate: (page: string) => void;
}

export const Arena: React.FC<ArenaProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <section className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-purple-500/25 bg-gradient-to-br from-[#110c18] via-[#100d19] to-[#090a10] p-7 sm:p-10 text-center shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-purple-500/[0.1] blur-3xl pointer-events-none" />
        <div className="relative space-y-5">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300 flex items-center justify-center">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold tracking-[0.2em] text-purple-400">
              NEXA
            </p>
            <h1 className="mt-1 font-heading text-3xl sm:text-4xl font-black text-white">
              NEXA ARENA
            </h1>
          </div>
          <p className="text-slate-300 text-sm sm:text-base">
            Batalhas estratégicas de cartas estão chegando à Rede Nexus.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-mono font-bold uppercase">
            <Clock className="w-3.5 h-3.5" />
            Em desenvolvimento
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('games')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.04] hover:bg-purple-500/10 border border-white/10 hover:border-purple-400/50 text-slate-200 hover:text-purple-200 font-heading font-black text-xs uppercase tracking-[0.12em] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Jogos
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
