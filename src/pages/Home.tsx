import React from 'react';
import { ArrowRight, LogIn, Swords, Layers, Trophy, Sparkles, ShieldCheck } from 'lucide-react';

interface HomeProps {
  onNavigate: (page: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#02040a] text-white overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b border-white/[.07] bg-[#03060b]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <button type="button" onClick={() => onNavigate('home')} className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-cyan-300 to-indigo-500 font-brand text-lg font-black text-slate-950 shadow-[0_0_24px_rgba(34,211,238,.25)]">N</span>
            <span className="font-brand text-xl font-black tracking-[.16em]">NEXA</span>
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onNavigate('login')} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3.5 text-xs font-bold text-slate-200 transition hover:border-cyan-400/35 hover:text-white">
              <LogIn className="h-4 w-4" /> <span className="hidden sm:inline">Entrar</span>
            </button>
            <button type="button" onClick={() => onNavigate('register')} className="h-10 rounded-xl bg-cyan-300 px-4 text-xs font-black uppercase tracking-wide text-slate-950 transition hover:bg-cyan-200">
              Jogar grátis
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_22%,rgba(6,182,212,.25),transparent_34%),radial-gradient(circle_at_35%_55%,rgba(217,70,239,.18),transparent_35%),linear-gradient(180deg,transparent,rgba(3,7,18,.65))]" />
          <div className="mx-auto grid min-h-[650px] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:py-20">
            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/[.06] px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-[.18em] text-cyan-300">
                <Sparkles className="h-3.5 w-3.5" /> Universo NEXA
              </span>
              <h1 className="mt-5 font-heading text-5xl font-black uppercase leading-[.9] tracking-tight sm:text-7xl lg:text-[82px]">
                Jogue.<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400">Colecione.</span><br/>Evolua.
              </h1>
              <p className="mt-6 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
                Entre no universo NEXA, dispute batalhas, construa sua coleção de cartas e evolua sua conta em experiências conectadas.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => onNavigate('register')} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-6 font-heading text-xs font-black uppercase tracking-[.1em] text-slate-950 shadow-[0_0_30px_rgba(34,211,238,.2)] transition hover:bg-cyan-200">
                  Criar conta grátis <ArrowRight className="h-4 w-4"/>
                </button>
                <button type="button" onClick={() => onNavigate('login')} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.03] px-6 font-heading text-xs font-black uppercase tracking-[.1em] text-white transition hover:bg-white/[.07]">
                  Já tenho conta
                </button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-mono uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400"/> Conta gratuita</span>
                <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-cyan-400"/> Coleção compartilhada</span>
                <span className="flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-amber-400"/> Progressão</span>
              </div>
            </div>

            <div className="relative min-h-[420px] lg:min-h-[520px]">
              <div className="absolute left-0 top-0 w-[88%] overflow-hidden rounded-[24px] border border-cyan-400/30 bg-[#06121c] shadow-[0_35px_100px_rgba(0,0,0,.65),0_0_65px_rgba(34,211,238,.18)]">
                <img src="/assets/rift-battle-card.png" alt="Rift Battle V2" className="aspect-[16/9] w-full object-cover"/>
                <div className="absolute inset-0 bg-gradient-to-t from-[#03060b]/80 via-transparent to-transparent"/>
              </div>
              <div className="absolute bottom-0 right-0 w-[82%] overflow-hidden rounded-[24px] border border-fuchsia-400/30 bg-[#110918] shadow-[0_35px_100px_rgba(0,0,0,.7),0_0_65px_rgba(217,70,239,.18)]">
                <img src="/assets/nexus-duel-card.png" alt="Nexus Duel" className="aspect-[16/9] w-full object-cover"/>
                <div className="absolute inset-0 bg-gradient-to-t from-[#03060b]/80 via-transparent to-transparent"/>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="mb-7">
            <span className="font-mono text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">Escolha sua batalha</span>
            <h2 className="mt-2 font-heading text-3xl font-black uppercase sm:text-4xl">Dois jogos. Um universo.</h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="group relative min-h-[330px] overflow-hidden rounded-[24px] border border-cyan-400/30 bg-[#06121c] p-6">
              <img src="/assets/rift-battle-card.png" alt="" className="absolute inset-0 h-full w-full object-cover object-right transition duration-500 group-hover:scale-[1.02]"/>
              <div className="absolute inset-0 bg-gradient-to-r from-[#06121c] via-[#06121c]/95 to-[#06121c]/20"/>
              <div className="relative flex h-full max-w-[70%] flex-col justify-between">
                <div><span className="text-[10px] font-mono font-black uppercase tracking-widest text-cyan-300">RIFT V2</span><h3 className="mt-2 font-heading text-3xl font-black uppercase">Rift Battle V2</h3><p className="mt-3 text-xs leading-6 text-slate-300">Combate tático PvE em arenas 2×2, 3×3 e 4×4. Monte seu esquadrão e enfrente o Rift.</p></div>
                <div className="mt-8 inline-flex items-center gap-2 text-xs font-black uppercase text-cyan-300"><Swords className="h-4 w-4"/> Combate tático</div>
              </div>
            </article>
            <article className="group relative min-h-[330px] overflow-hidden rounded-[24px] border border-fuchsia-400/30 bg-[#110918] p-6">
              <img src="/assets/nexus-duel-card.png" alt="" className="absolute inset-0 h-full w-full object-cover object-right transition duration-500 group-hover:scale-[1.02]"/>
              <div className="absolute inset-0 bg-gradient-to-r from-[#110918] via-[#110918]/95 to-[#110918]/20"/>
              <div className="relative flex h-full max-w-[70%] flex-col justify-between">
                <div><span className="text-[10px] font-mono font-black uppercase tracking-widest text-fuchsia-300">NEXA · DUEL</span><h3 className="mt-2 font-heading text-3xl font-black uppercase">Nexus Duel</h3><p className="mt-3 text-xs leading-6 text-slate-300">Duelo estratégico 4×4 de cartas, Nexos e blefe. Jogue contra a CPU ou desafie outros jogadores.</p></div>
                <div className="mt-8 inline-flex items-center gap-2 text-xs font-black uppercase text-fuchsia-300"><Layers className="h-4 w-4"/> Estratégia e blefe</div>
              </div>
            </article>
          </div>
        </section>

        <section className="border-y border-white/[.07] bg-white/[.015]">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-3">
            {[['01','Jogue','Escolha seu modo e entre em batalha.'],['02','Colecione','Abra caixas e aumente sua coleção de cartas.'],['03','Evolua','Ganhe experiência e avance sua conta NEXA.']].map(([n,t,d]) => (
              <div key={n} className="rounded-2xl border border-white/[.08] bg-[#070b12] p-5">
                <span className="font-mono text-xs font-black text-cyan-400">{n}</span><h3 className="mt-3 font-heading text-xl font-black uppercase">{t}</h3><p className="mt-2 text-xs leading-6 text-slate-400">{d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <h2 className="font-heading text-3xl font-black uppercase sm:text-5xl">Pronto para entrar no <span className="text-cyan-300">NEXA?</span></h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400">Crie sua conta e comece sua coleção.</p>
          <button type="button" onClick={() => onNavigate('register')} className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-cyan-300 px-7 font-heading text-xs font-black uppercase tracking-wider text-slate-950 transition hover:bg-cyan-200">Jogar grátis <ArrowRight className="h-4 w-4"/></button>
        </section>
      </main>
      <footer className="border-t border-white/[.07] py-6 text-center text-[10px] font-mono uppercase tracking-wider text-slate-500">NEXA Universe</footer>
    </div>
  );
};
