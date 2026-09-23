import React from 'react';
import { ArrowRight, CheckCircle2, Swords, Zap, Users, Layers, Trophy } from 'lucide-react';

interface GamesProps {
  onNavigate: (page: string) => void;
}

export const Games: React.FC<GamesProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-4">
      <section className="relative isolate overflow-hidden rounded-[22px] border border-cyan-400/20 bg-[#040811] px-5 py-6 shadow-[0_24px_80px_rgba(0,0,0,.38)] sm:px-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(6,182,212,.10),transparent_45%,rgba(168,85,247,.10)),radial-gradient(circle_at_50%_0%,rgba(56,189,248,.10),transparent_48%)]" />
        <div className="pointer-events-none absolute inset-x-[12%] top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/45 to-transparent" />
        <div className="relative">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/[.06] px-3 py-1 text-[9px] font-mono font-black uppercase tracking-[.18em] text-cyan-300">
                <Swords className="h-3.5 w-3.5" /> Central de Jogos
              </span>
              <h1 className="mt-3 font-heading text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
                Escolha sua <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-fuchsia-400">próxima batalha</span>
              </h1>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">
                Dois estilos de combate conectados pela mesma coleção e pela progressão permanente da sua conta NEXA.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[9px] font-mono font-bold uppercase tracking-wider">
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/[.05] px-3 py-1.5 text-cyan-200">Coleção compartilhada</span>
              <span className="rounded-full border border-violet-400/20 bg-violet-400/[.05] px-3 py-1.5 text-violet-200">Nível + XP</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <button type="button" onClick={() => onNavigate('riftbattle-v2')} className="group relative min-h-[310px] overflow-hidden rounded-[22px] border border-cyan-400/40 bg-[#06121c] p-5 text-left shadow-[0_24px_65px_rgba(0,0,0,.32)] transition duration-300 hover:-translate-y-1 hover:border-cyan-300/75 hover:shadow-[0_30px_75px_rgba(0,0,0,.42),0_0_38px_rgba(34,211,238,.09)] sm:p-6">
          <div className="pointer-events-none absolute inset-0">
            <img src="/assets/rift-battle-card.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-right opacity-100 transition duration-500 group-hover:scale-[1.02]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#06121c] from-[0%] via-[#06121c]/95 via-[48%] to-[#06121c]/18 to-[86%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#06121c]/85 via-transparent to-[#06121c]/20" />
          </div>
          <div className="relative z-10 flex min-h-[270px] max-w-[78%] flex-col justify-between sm:max-w-[65%]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] font-black uppercase tracking-[.16em] text-cyan-300">NEXA · RIFT V2</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/[.07] px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-300"><CheckCircle2 className="h-3 w-3"/> Online</span>
              </div>
              <h2 className="mt-2 font-heading text-[27px] font-black uppercase leading-none text-white">Rift Battle <span className="text-fuchsia-400">V2</span></h2>
              <p className="mt-3 text-[12px] leading-relaxed text-slate-300">Combate tático PvE em arenas 2×2, 3×3 e 4×4. Monte seu esquadrão e enfrente o Rift por NEX, NXA e XP.</p>
              <div className="mt-4 flex flex-wrap gap-1.5">{['PvE','2×2','3×3','4×4','NEX + NXA + XP'].map(x => <span key={x} className="rounded-full border border-cyan-400/20 bg-black/25 px-2.5 py-1 text-[9px] font-bold text-slate-200">{x}</span>)}</div>
            </div>
            <span className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 font-heading text-[10px] font-black uppercase tracking-[.09em] text-slate-950 transition group-hover:bg-cyan-200 sm:w-[82%]">Jogar Rift Battle <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/></span>
          </div>
        </button>

        <button type="button" onClick={() => onNavigate('arena')} className="group relative min-h-[310px] overflow-hidden rounded-[22px] border border-fuchsia-400/35 bg-[#110918] p-5 text-left shadow-[0_24px_65px_rgba(0,0,0,.32)] transition duration-300 hover:-translate-y-1 hover:border-fuchsia-300/70 hover:shadow-[0_30px_75px_rgba(0,0,0,.42),0_0_38px_rgba(217,70,239,.09)] sm:p-6">
          <div className="pointer-events-none absolute inset-0">
            <img src="/assets/nexus-duel-card.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-right opacity-100 transition duration-500 group-hover:scale-[1.02]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#110918] from-[0%] via-[#110918]/96 via-[48%] to-[#110918]/16 to-[86%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#110918]/88 via-transparent to-[#110918]/18" />
          </div>
          <div className="relative z-10 flex min-h-[270px] max-w-[78%] flex-col justify-between sm:max-w-[65%]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] font-black uppercase tracking-[.16em] text-fuchsia-300">NEXA · DUEL</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/[.07] px-2 py-0.5 text-[9px] font-bold uppercase text-emerald-300"><CheckCircle2 className="h-3 w-3"/> Online</span>
              </div>
              <h2 className="mt-2 font-heading text-[27px] font-black uppercase leading-none text-white">Nexus Duel</h2>
              <p className="mt-3 text-[12px] leading-relaxed text-slate-300">Duelo estratégico 4×4 de cartas, Nexos e blefe. Monte seu deck e escolha entre PvE contra CPU ou PvP online.</p>
              <div className="mt-4 flex flex-wrap gap-1.5"><span className="rounded-full border border-fuchsia-400/20 bg-black/25 px-2.5 py-1 text-[9px] font-bold text-slate-200">PvE</span><span className="rounded-full border border-fuchsia-400/20 bg-black/25 px-2.5 py-1 text-[9px] font-bold text-slate-200">PvP</span><span className="rounded-full border border-fuchsia-400/20 bg-black/25 px-2.5 py-1 text-[9px] font-bold text-slate-200">4×4</span><span className="rounded-full border border-fuchsia-400/20 bg-black/25 px-2.5 py-1 text-[9px] font-bold text-slate-200">Deck + Nexos</span></div>
            </div>
            <span className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-fuchsia-400/45 bg-fuchsia-500/[.13] px-4 font-heading text-[10px] font-black uppercase tracking-[.09em] text-fuchsia-100 transition group-hover:bg-fuchsia-500/[.22] sm:w-[82%]">Jogar Nexus Duel <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1"/></span>
          </div>
        </button>
      </div>

      <section className="overflow-hidden rounded-[18px] border border-white/[.08] bg-[#070e17]">
        <div className="grid divide-y divide-white/[.07] md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="flex items-center gap-3 px-4 py-3.5"><Layers className="h-4 w-4 text-cyan-300"/><div><p className="text-[10px] font-bold uppercase text-slate-200">Uma coleção</p><p className="mt-0.5 text-[10px] text-slate-400">Suas cartas conectam os modos.</p></div></div>
          <div className="flex items-center gap-3 px-4 py-3.5"><Trophy className="h-4 w-4 text-amber-300"/><div><p className="text-[10px] font-bold uppercase text-slate-200">Progressão permanente</p><p className="mt-0.5 text-[10px] text-slate-400">Nível e XP acompanham sua conta.</p></div></div>
          <div className="flex items-center gap-3 px-4 py-3.5"><Users className="h-4 w-4 text-fuchsia-300"/><div><p className="text-[10px] font-bold uppercase text-slate-200">Experiências diferentes</p><p className="mt-0.5 text-[10px] text-slate-400">Tática de equipe ou duelo e blefe.</p></div></div>
        </div>
      </section>
    </div>
  );
};
