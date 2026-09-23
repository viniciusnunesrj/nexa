import React from 'react';
// Vercel production sync: Nexus portal
import { ArrowRight, CheckCircle2, Swords, Zap, Users } from 'lucide-react';

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
          Dois jogos, uma coleção e uma progressão compartilhada. Escolha seu próximo desafio na Rede Nexus.
        </p>
        <div className="flex flex-wrap gap-2 pt-1 text-[10px] font-mono font-bold uppercase tracking-wider">
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-1.5 text-cyan-200">Mesma coleção</span>
          <span className="rounded-full border border-purple-400/20 bg-purple-400/[0.06] px-3 py-1.5 text-purple-200">Mesmo nível e XP</span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-slate-300">Históricos separados</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="relative overflow-hidden rounded-[24px] border border-cyan-400/25 bg-gradient-to-br from-[#07151d] via-[#0a1019] to-[#090a10] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-400/[0.09] blur-3xl pointer-events-none" />
          <div className="relative space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-mono font-bold tracking-[0.16em] text-cyan-400">NEXA · RIFT V2</p><h2 className="mt-1 font-heading text-2xl font-black text-white">RIFT BATTLE</h2></div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-mono font-bold uppercase text-emerald-300"><CheckCircle2 className="h-3 w-3" />Disponível</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">Combate tático PvE em arenas 2×2, 3×3 e 4×4. Monte seu esquadrão e conquiste NEX, NXA e XP.</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><Swords className="mb-2 h-4 w-4 text-cyan-300" /><span className="block text-[10px] font-mono font-bold text-white">PvE</span><span className="text-[9px] text-slate-500">Tático</span></div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><Zap className="mb-2 h-4 w-4 text-cyan-300" /><span className="block text-[10px] font-mono font-bold text-white">NEX + NXA</span><span className="text-[9px] text-slate-500">Recompensas</span></div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><span className="mb-2 block text-sm font-black text-cyan-300">4×4</span><span className="block text-[10px] font-mono font-bold text-white">Arenas</span><span className="text-[9px] text-slate-500">Até 4×4</span></div>
            </div>
            <button type="button" onClick={() => onNavigate('riftbattle-v2')} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 font-heading text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition-all hover:bg-cyan-200">Jogar Rift Battle <ArrowRight className="h-4 w-4" /></button>
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
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[10px] font-mono font-bold uppercase">
                <CheckCircle2 className="w-3 h-3" />
                Disponível
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Duelo estratégico 4×4 de cartas, Nexos e blefe. Monte seu deck e escolha entre PvE ou PvP.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><Swords className="mb-2 h-4 w-4 text-purple-300" /><span className="block text-[10px] font-mono font-bold text-white">PvE</span><span className="text-[9px] text-slate-500">Contra CPU</span></div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><Users className="mb-2 h-4 w-4 text-purple-300" /><span className="block text-[10px] font-mono font-bold text-white">PvP</span><span className="text-[9px] text-slate-500">Duelo online</span></div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><Zap className="mb-2 h-4 w-4 text-purple-300" /><span className="block text-[10px] font-mono font-bold text-white">4×4</span><span className="text-[9px] text-slate-500">Deck + Nexos</span></div>
            </div>
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

      <section className="rounded-[24px] border border-white/10 bg-white/[0.025] p-5 sm:p-6">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-cyan-300">Rift Battle</p>
            <p className="mt-1 text-xs text-slate-400">Combate PvE por esquadrão, com recompensas e progressão da conta.</p>
          </div>
          <div className="hidden md:flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/20 text-[10px] font-black text-slate-300">NEXA</div>
          <div className="md:text-right">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-purple-300">Nexus Duel</p>
            <p className="mt-1 text-xs text-slate-400">Duelo 4×4 estratégico em PvE ou PvP usando cartas da sua coleção.</p>
          </div>
        </div>
        <div className="mt-4 border-t border-white/10 pt-4 text-center text-[11px] font-mono text-slate-500">
          Jogar qualquer um dos modos contribui para a progressão permanente do seu Piloto.
        </div>
      </section>
    </div>
  );
};
