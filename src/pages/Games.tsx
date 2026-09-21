import React from 'react';
import { ArrowRight, CheckCircle2, Clock, Swords } from 'lucide-react';

interface GamesProps {
  onNavigate: (page: string) => void;
}

export const Games: React.FC<GamesProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold">
          <Swords className="w-3.5 h-3.5" />
          CENTRAL DE JOGOS
        </span>
        <h1 className="font-heading text-3xl sm:text-4xl font-black text-white tracking-tight">
          Jogos
        </h1>
        <p className="text-slate-400 text-sm max-w-2xl">
          Escolha seu próximo desafio na Rede Nexus.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="relative overflow-hidden rounded-[24px] border border-cyan-500/25 bg-gradient-to-br from-[#0a0c14] via-[#0c0d18] to-[#090a10] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
          <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-cyan-500/[0.08] blur-3xl pointer-events-none" />
          <div className="relative space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono font-bold tracking-[0.16em] text-cyan-400">
                  NEXA
                </p>
                <h2 className="mt-1 font-heading text-2xl font-black text-white">RIFT BATTLE</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[10px] font-mono font-bold uppercase">
                <CheckCircle2 className="w-3 h-3" />
                Disponível
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Monte seu esquadrão de cartas e enfrente combates para avançar pelas rupturas da Rede Nexus.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('play')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-heading font-black text-xs uppercase tracking-[0.12em] transition-all"
            >
              Jogar
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[24px] border border-purple-500/25 bg-gradient-to-br from-[#110c18] via-[#100d19] to-[#090a10] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
          <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-purple-500/[0.08] blur-3xl pointer-events-none" />
          <div className="relative space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono font-bold tracking-[0.16em] text-purple-400">
                  NEXA
                </p>
                <h2 className="mt-1 font-heading text-2xl font-black text-white">NEXUS DUEL</h2>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-mono font-bold uppercase">
                <Clock className="w-3 h-3" />
                Em desenvolvimento
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Duelo estratégico 4×4 de cartas, Nexos e blefe, com modos PvE e PvP.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('arena')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.04] hover:bg-purple-500/10 border border-purple-500/30 hover:border-purple-400/50 text-purple-200 font-heading font-black text-xs uppercase tracking-[0.12em] transition-all"
            >
              Entrar no Nexus Duel
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
