import React, { useEffect } from 'react';
import { ArrowRight, LogIn, Swords, Layers, Trophy, Sparkles, ShieldCheck } from 'lucide-react';
import { trackFunnelEvent } from '../lib/funnelAnalytics';

interface HomeProps {
  onNavigate: (page: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  useEffect(() => {
    void trackFunnelEvent('landing_view');
  }, []);

  const goRegister = () => {
    void trackFunnelEvent('register_open', { origin: 'home_cta' });
    onNavigate('register');
  };

  return (
    <div className="min-h-screen bg-[#02040a] text-white overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b border-white/[.07] bg-[#03060b]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <button type="button" onClick={() => onNavigate('home')} className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-cyan-300 to-indigo-500 font-brand text-lg font-black text-slate-950 shadow-[0_0_24px_rgba(34,211,238,.25)]">N</span>
            <span className="font-brand text-xl font-black tracking-[.16em]">NEXA</span>
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onNavigate('login')} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-3.5 text-xs font-bold text-slate-200 transition hover:border-cyan-400/35 hover:text-white">
              <LogIn className="h-4 w-4" /> <span className="hidden sm:inline">Entrar</span>
            </button>
            <button type="button" onClick={goRegister} className="h-10 rounded-xl bg-cyan-300 px-4 text-xs font-black uppercase tracking-wide text-slate-950 transition hover:bg-cyan-200">
              Jogar grátis
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative isolate overflow-hidden border-b border-white/[.06] lg:min-h-[680px]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_22%,rgba(217,70,239,.24),transparent_28%),radial-gradient(circle_at_76%_48%,rgba(34,211,238,.16),transparent_32%),linear-gradient(180deg,#02050b_0%,#03101a_62%,#07040f_100%)]" />

          {/* Mobile: compact, stable first-screen composition */}
          <div className="relative mx-auto max-w-[430px] px-4 pb-4 pt-3 lg:hidden">
            <div className="relative h-[300px] overflow-hidden">
              <span className="relative z-40 inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-[#06121c]/85 px-2.5 py-1 text-[7px] font-mono font-black uppercase tracking-[.14em] text-cyan-300 backdrop-blur">
                <Sparkles className="h-3 w-3" /> Universo NEXA
              </span>
              <div className="absolute -right-[13%] -top-2 z-0 h-[300px] w-[71%]">
                <div className="absolute right-5 top-8 h-44 w-44 rounded-full bg-fuchsia-500/20 blur-3xl"/>
                <img src="/assets/cards/dragons/card-dragon-shadow-v1.png" alt="Carta Dragão das Sombras do NEXA" className="absolute right-[7%] top-0 h-[54%] w-[62%] rotate-[7deg] rounded-lg object-cover shadow-[0_18px_45px_rgba(0,0,0,.85)]"/>
                <img src="/assets/cards/gods/card-god-thunder-v1.png" alt="Carta Deus do Trovão do NEXA" className="absolute -left-[2%] top-[25%] z-10 h-[56%] w-[64%] -rotate-[7deg] rounded-lg object-cover shadow-[0_20px_50px_rgba(0,0,0,.9)]"/>
                <img src="/assets/cards/knights/card-knight-celestial-v1.png" alt="Carta Cavaleiro Celestial do NEXA" className="absolute right-0 bottom-0 z-20 h-[56%] w-[64%] rotate-[8deg] rounded-lg object-cover shadow-[0_20px_50px_rgba(0,0,0,.9)]"/>
              </div>
              <div className="pointer-events-none absolute -left-4 inset-y-0 z-10 w-[64%] bg-gradient-to-r from-[#02060c] via-[#02060c]/94 to-transparent"/>
              <div className="pointer-events-none absolute inset-x-[-1rem] bottom-0 z-10 h-16 bg-gradient-to-t from-[#03101a] to-transparent"/>
              <h1 className="relative z-30 mt-4 w-[57%] font-heading text-[clamp(27px,7.4vw,31px)] font-black uppercase leading-[.88] tracking-tight">
                Jogue<br/>grátis.<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400">Monte<br/>seu deck.</span><br/>Entre na<br/>batalha.
              </h1>
              <p className="absolute bottom-3 left-0 z-30 w-[48%] text-[8.5px] leading-[1.3] text-slate-300">
                Card game estratégico no navegador. Crie sua conta e receba <strong className="font-black text-cyan-300">1.000 NEX</strong>.
              </p>
            </div>

            <div className="grid grid-cols-3 divide-x divide-white/10 border-y border-white/10 py-1.5 font-mono text-[6px] font-black uppercase leading-[1.25] text-slate-300">
              <span className="flex flex-col items-center gap-1 text-center"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400"/>Sem download</span>
              <span className="flex flex-col items-center gap-1 text-center"><Layers className="h-3.5 w-3.5 text-cyan-400"/>+1.000 NEX<br/>ao criar conta</span>
              <span className="flex flex-col items-center gap-1 text-center"><Swords className="h-3.5 w-3.5 text-fuchsia-400"/>Rift Battle<br/>+ Nexus Duel</span>
            </div>

            <button type="button" onClick={goRegister} className="mt-1.5 inline-flex h-[40px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-cyan-400 px-4 font-heading text-[9px] font-black uppercase tracking-[.1em] text-slate-950 shadow-[0_0_30px_rgba(34,211,238,.2)]">
              Jogar agora — grátis <ArrowRight className="h-3.5 w-3.5"/>
            </button>
            <button type="button" onClick={() => onNavigate('login')} className="mt-1 inline-flex h-[30px] w-full items-center justify-center rounded-xl border border-white/15 bg-black/20 px-4 font-heading text-[8px] font-black uppercase tracking-[.09em] text-white">
              Já tenho conta
            </button>

            <div className="mt-2 text-center">
              <span className="font-mono text-[6.5px] font-black uppercase tracking-[.16em] text-cyan-300">Dois modos de jogo</span>
              <h2 className="mt-0.5 font-heading text-[15px] font-black uppercase leading-tight">Escolha seu estilo</h2>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <article className="relative h-[76px] overflow-hidden rounded-xl border border-cyan-400/35 bg-[#06121c]">
                <img src="/assets/rift-battle-card.png" alt="Rift Battle" className="absolute inset-0 h-full w-full object-cover"/>
                <div className="absolute inset-0 bg-gradient-to-t from-[#030913] via-transparent to-transparent"/>
                <div className="absolute inset-x-0 bottom-0 p-2"><h3 className="font-heading text-[10px] font-black uppercase">Rift Battle</h3><p className="text-[6px] text-slate-300">Batalhas rápidas e táticas.</p></div>
              </article>
              <article className="relative h-[76px] overflow-hidden rounded-xl border border-fuchsia-400/35 bg-[#110918]">
                <img src="/assets/nexus-duel-card.png" alt="Nexus Duel" className="absolute inset-0 h-full w-full object-cover"/>
                <div className="absolute inset-0 bg-gradient-to-t from-[#07040c] via-transparent to-transparent"/>
                <div className="absolute inset-x-0 bottom-0 p-2"><h3 className="font-heading text-[10px] font-black uppercase">Nexus Duel</h3><p className="text-[6px] text-slate-300">Estratégia, Nexos e blefe.</p></div>
              </article>
            </div>
          </div>

          {/* Desktop keeps the richer presentation */}
          <div className="relative mx-auto hidden max-w-7xl grid-cols-[.9fr_1.1fr] items-center gap-6 px-6 py-16 lg:grid">
            <div className="relative z-20 py-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-[#06121c]/75 px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-[.18em] text-cyan-300"><Sparkles className="h-3.5 w-3.5"/> Universo NEXA</span>
              <h1 className="mt-5 font-heading text-[78px] font-black uppercase leading-[.88] tracking-tight">Jogue grátis.<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400">Monte seu deck.</span><br/>Entre na batalha.</h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-300">Card game estratégico direto no navegador. Crie sua conta em segundos, receba <strong className="font-black text-cyan-300">1.000 NEX</strong> e escolha entre Rift Battle e Nexus Duel.</p>
              <div className="mt-5 grid grid-cols-3 divide-x divide-white/10 border-y border-white/10 py-4 text-center font-mono text-[10px] font-black uppercase text-slate-300"><span>Sem download</span><span>+1.000 NEX</span><span>2 modos</span></div>
              <div className="mt-5 flex gap-3"><button type="button" onClick={goRegister} className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-cyan-400 px-6 font-heading text-xs font-black uppercase tracking-[.12em] text-slate-950">Jogar agora — grátis <ArrowRight className="h-4 w-4"/></button><button type="button" onClick={() => onNavigate('login')} className="rounded-xl border border-white/15 px-6 font-heading text-[11px] font-black uppercase">Já tenho conta</button></div>
            </div>
            <div className="relative min-h-[560px]">
              <img src="/assets/cards/dragons/card-dragon-shadow-v1.png" alt="" className="absolute left-0 top-[24%] w-[34%] -rotate-[13deg] rounded-2xl"/>
              <img src="/assets/cards/gods/card-god-thunder-v1.png" alt="" className="absolute left-[31%] top-[5%] z-20 w-[38%] rotate-[2deg] rounded-2xl"/>
              <img src="/assets/cards/knights/card-knight-celestial-v1.png" alt="" className="absolute right-0 top-[25%] z-10 w-[34%] rotate-[13deg] rounded-2xl"/>
            </div>
          </div>
        </section>

        <section className="mx-auto hidden max-w-7xl px-4 py-12 sm:px-6 lg:block">
          <div className="mb-7"><span className="font-mono text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">Dois modos de jogo</span><h2 className="mt-2 font-heading text-4xl font-black uppercase">Escolha seu estilo</h2></div>
          <div className="grid grid-cols-2 gap-5">
            <article className="relative min-h-[330px] overflow-hidden rounded-[24px] border border-cyan-400/30 bg-[#06121c] p-6"><img src="/assets/rift-battle-card.png" alt="" className="absolute inset-0 h-full w-full object-cover object-right"/><div className="absolute inset-0 bg-gradient-to-r from-[#06121c] via-[#06121c]/95 to-[#06121c]/20"/><div className="relative max-w-[70%]"><h3 className="font-heading text-3xl font-black uppercase">Rift Battle V2</h3><p className="mt-3 text-xs leading-6 text-slate-300">Combate tático PvE. Monte seu esquadrão e enfrente o Rift.</p></div></article>
            <article className="relative min-h-[330px] overflow-hidden rounded-[24px] border border-fuchsia-400/30 bg-[#110918] p-6"><img src="/assets/nexus-duel-card.png" alt="" className="absolute inset-0 h-full w-full object-cover object-right"/><div className="absolute inset-0 bg-gradient-to-r from-[#110918] via-[#110918]/95 to-[#110918]/20"/><div className="relative max-w-[70%]"><h3 className="font-heading text-3xl font-black uppercase">Nexus Duel</h3><p className="mt-3 text-xs leading-6 text-slate-300">Duelo estratégico 4×4 de cartas, Nexos e blefe.</p></div></article>
          </div>
        </section>

        <section className="hidden border-y border-white/[.07] bg-white/[.015] lg:block">
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
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400">Conta grátis, sem download. Receba 1.000 NEX e entre na sua primeira batalha.</p>
          <button type="button" onClick={goRegister} className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-cyan-300 px-7 font-heading text-xs font-black uppercase tracking-wider text-slate-950 transition hover:bg-cyan-200">Criar conta grátis <ArrowRight className="h-4 w-4"/></button>
        </section>
      </main>
      <footer className="border-t border-white/[.07] py-6 text-center text-[10px] font-mono uppercase tracking-wider text-slate-500">NEXA Universe</footer>
    </div>
  );
};
