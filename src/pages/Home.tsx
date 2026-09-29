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
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
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
        <section className="relative isolate overflow-hidden border-b border-white/[.06]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_86%_24%,rgba(34,211,238,.20),transparent_27%),radial-gradient(circle_at_82%_48%,rgba(217,70,239,.18),transparent_30%),linear-gradient(180deg,#02050b_0%,#04101a_62%,#07040f_100%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-25 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:32px_32px]" />

          <div className="relative mx-auto max-w-7xl px-4 pb-7 pt-7 sm:px-6 sm:pb-10 sm:pt-10 lg:grid lg:min-h-[680px] lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-6 lg:py-16">
            <div className="relative z-20 lg:py-8">
              <div className="relative h-[455px] overflow-hidden rounded-[24px] border border-white/[.06] bg-[#030912]/70 shadow-[0_30px_90px_rgba(0,0,0,.35)] sm:h-[510px] lg:h-auto lg:overflow-visible lg:border-0 lg:bg-transparent lg:shadow-none">
                <span className="absolute left-4 top-4 z-40 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-[#06121c]/85 px-3 py-1.5 text-[9px] font-mono font-black uppercase tracking-[.16em] text-cyan-300 backdrop-blur-md sm:left-6 sm:top-6 lg:static lg:text-[10px]">
                  <Sparkles className="h-3.5 w-3.5" /> Universo NEXA
                </span>

                <div className="absolute inset-y-0 right-0 z-0 w-[64%] lg:hidden" aria-label="Cartas colecionáveis do NEXA">
                  <div className="absolute -right-10 top-10 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
                  <div className="absolute right-5 top-28 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />
                  <img src="/assets/cards/dragons/card-dragon-shadow-v1.png" alt="Carta Dragão das Sombras do NEXA" className="absolute -right-[6%] top-[4%] w-[72%] rotate-[9deg] rounded-xl opacity-90 shadow-[0_25px_55px_rgba(0,0,0,.8),0_0_30px_rgba(217,70,239,.25)]" />
                  <img src="/assets/cards/knights/card-knight-celestial-v1.png" alt="Carta Cavaleiro Celestial do NEXA" className="absolute -right-[10%] bottom-[0%] z-20 w-[75%] rotate-[10deg] rounded-xl shadow-[0_30px_70px_rgba(0,0,0,.85),0_0_35px_rgba(96,165,250,.28)]" />
                  <img src="/assets/cards/gods/card-god-thunder-v1.png" alt="Carta Deus do Trovão do NEXA" className="absolute right-[26%] top-[23%] z-10 w-[70%] -rotate-[7deg] rounded-xl shadow-[0_30px_70px_rgba(0,0,0,.85),0_0_38px_rgba(34,211,238,.28)]" />
                </div>

                <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(90deg,rgba(3,9,18,.98)_0%,rgba(3,9,18,.92)_36%,rgba(3,9,18,.42)_57%,rgba(3,9,18,.04)_78%)] lg:hidden" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-[#030912] via-[#030912]/70 to-transparent lg:hidden" />

                <h1 className="absolute left-4 top-[82px] z-30 w-[58%] font-heading text-[39px] font-black uppercase leading-[.88] tracking-tight min-[400px]:text-[42px] sm:left-6 sm:top-[100px] sm:text-[52px] lg:static lg:mt-5 lg:w-auto lg:max-w-none lg:text-[78px]">
                  Jogue<br className="lg:hidden"/> grátis.<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400">Monte seu<br className="lg:hidden"/> deck.</span><br/>Entre na<br className="lg:hidden"/> batalha.
                </h1>

                <div className="absolute bottom-4 left-4 z-40 rounded-full border border-cyan-300/20 bg-[#030912]/80 px-3 py-1.5 font-mono text-[8px] font-black uppercase tracking-[.12em] text-cyan-100 backdrop-blur sm:left-6 lg:hidden">
                  Colecione • Monte • Batalhe
                </div>
              </div>

              <p className="relative z-20 mt-4 max-w-xl text-[13px] leading-5 text-slate-300 sm:text-sm lg:mt-6 lg:text-base lg:leading-7">
                Card game estratégico direto no navegador. Crie sua conta em segundos e receba <strong className="font-black text-cyan-300">1.000 NEX</strong>.
                <span className="hidden lg:inline"> Escolha entre Rift Battle e Nexus Duel.</span>
              </p>

              <div className="relative z-20 mt-4 grid grid-cols-3 divide-x divide-white/[.09] border-y border-white/[.08] py-3 text-center font-mono text-[8px] font-black uppercase leading-3 tracking-[.04em] text-slate-300 sm:text-[9px] lg:mt-5 lg:text-[10px]">
                <span className="flex flex-col items-center justify-center gap-1"><ShieldCheck className="h-4 w-4 text-emerald-400"/> Sem download</span>
                <span className="flex flex-col items-center justify-center gap-1"><Layers className="h-4 w-4 text-cyan-400"/> +1.000 NEX<br className="lg:hidden"/> ao criar conta</span>
                <span className="flex flex-col items-center justify-center gap-1"><Swords className="h-4 w-4 text-fuchsia-400"/> Rift +<br className="lg:hidden"/> Nexus</span>
              </div>

              <div className="relative z-20 mt-4 flex flex-col gap-2.5 sm:flex-row lg:mt-5">
                <button type="button" onClick={goRegister} className="inline-flex h-13 min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-cyan-400 px-5 font-heading text-[11px] font-black uppercase tracking-[.11em] text-slate-950 shadow-[0_0_35px_rgba(34,211,238,.22)] transition hover:brightness-110">
                  Jogar agora — grátis <ArrowRight className="h-4 w-4"/>
                </button>
                <button type="button" onClick={() => onNavigate('login')} className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-black/20 px-5 font-heading text-[10px] font-black uppercase tracking-[.1em] text-white backdrop-blur transition hover:bg-white/[.06] sm:min-h-[52px]">
                  Já tenho conta
                </button>
              </div>
            </div>

            <div className="relative hidden min-h-[560px] lg:block" aria-label="Cartas colecionáveis do NEXA">
              <div className="absolute inset-x-10 bottom-20 h-40 rounded-full bg-cyan-400/10 blur-3xl" />
              <img src="/assets/cards/dragons/card-dragon-shadow-v1.png" alt="Carta Dragão das Sombras do NEXA" className="absolute left-[0%] top-[24%] w-[34%] -rotate-[13deg] rounded-2xl shadow-[0_35px_90px_rgba(0,0,0,.8),0_0_45px_rgba(217,70,239,.24)]" />
              <img src="/assets/cards/gods/card-god-thunder-v1.png" alt="Carta Deus do Trovão do NEXA" className="absolute left-[31%] top-[5%] z-20 w-[38%] rotate-[2deg] rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,.85),0_0_55px_rgba(34,211,238,.28)]" />
              <img src="/assets/cards/knights/card-knight-celestial-v1.png" alt="Carta Cavaleiro Celestial do NEXA" className="absolute right-[0%] top-[25%] z-10 w-[34%] rotate-[13deg] rounded-2xl shadow-[0_35px_90px_rgba(0,0,0,.8),0_0_45px_rgba(96,165,250,.22)]" />
              <div className="absolute bottom-7 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border border-cyan-300/25 bg-[#050b13]/90 px-5 py-2.5 font-mono text-[10px] font-black uppercase tracking-[.18em] text-cyan-100 backdrop-blur-md">
                Colecione • Monte o deck • Batalhe
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
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
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400">Conta grátis, sem download. Receba 1.000 NEX e entre na sua primeira batalha.</p>
          <button type="button" onClick={goRegister} className="mt-7 inline-flex h-12 items-center gap-2 rounded-xl bg-cyan-300 px-7 font-heading text-xs font-black uppercase tracking-wider text-slate-950 transition hover:bg-cyan-200">Criar conta grátis <ArrowRight className="h-4 w-4"/></button>
        </section>
      </main>
      <footer className="border-t border-white/[.07] py-6 text-center text-[10px] font-mono uppercase tracking-wider text-slate-500">NEXA Universe</footer>
    </div>
  );
};
