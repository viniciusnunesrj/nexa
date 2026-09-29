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
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_20%,rgba(217,70,239,.22),transparent_28%),radial-gradient(circle_at_82%_45%,rgba(34,211,238,.16),transparent_32%),linear-gradient(180deg,#02050b_0%,#03101a_62%,#07040f_100%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-20 bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:32px_32px]" />

          <div className="relative mx-auto max-w-7xl px-4 pb-6 pt-6 sm:px-6 lg:grid lg:min-h-[680px] lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-6 lg:py-16">
            <div className="relative z-20 lg:py-8">
              <div className="relative min-h-[455px] lg:min-h-0">
                <span className="relative z-40 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-[#06121c]/80 px-3 py-1.5 text-[9px] font-mono font-black uppercase tracking-[.16em] text-cyan-300 backdrop-blur-md lg:text-[10px]">
                  <Sparkles className="h-3.5 w-3.5" /> Universo NEXA
                </span>

                <div className="absolute -right-[23%] -top-5 z-0 h-[455px] w-[76%] lg:hidden" aria-label="Cartas colecionáveis do NEXA">
                  <div className="absolute right-6 top-8 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
                  <img src="/assets/cards/dragons/card-dragon-shadow-v1.png" alt="Carta Dragão das Sombras do NEXA" className="absolute right-[18%] top-[0%] h-[62%] w-[62%] rotate-[7deg] rounded-xl object-cover object-center shadow-[0_25px_60px_rgba(0,0,0,.85),0_0_30px_rgba(217,70,239,.28)]" />
                  <img src="/assets/cards/gods/card-god-thunder-v1.png" alt="Carta Deus do Trovão do NEXA" className="absolute -left-[3%] top-[25%] z-10 h-[61%] w-[62%] -rotate-[8deg] rounded-xl object-cover object-center shadow-[0_28px_65px_rgba(0,0,0,.85),0_0_32px_rgba(34,211,238,.24)]" />
                  <img src="/assets/cards/knights/card-knight-celestial-v1.png" alt="Carta Cavaleiro Celestial do NEXA" className="absolute right-[0%] bottom-[-5%] z-20 h-[61%] w-[62%] rotate-[9deg] rounded-xl object-cover object-center shadow-[0_30px_70px_rgba(0,0,0,.9),0_0_35px_rgba(96,165,250,.28)]" />
                </div>
                <div className="pointer-events-none absolute -left-4 -top-6 bottom-0 z-10 w-[68%] bg-gradient-to-r from-[#02060c] via-[#02060c]/90 to-transparent lg:hidden" />
                <div className="pointer-events-none absolute inset-x-[-1rem] bottom-0 z-10 h-28 bg-gradient-to-t from-[#04101a] via-[#04101a]/75 to-transparent lg:hidden" />

                <h1 className="relative z-30 mt-7 w-[58%] font-heading text-[38px] font-black uppercase leading-[.88] tracking-tight min-[400px]:text-[41px] sm:text-[48px] lg:mt-5 lg:w-auto lg:text-[78px]">
                  Jogue<br className="lg:hidden"/> grátis.<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-400 to-fuchsia-400">Monte<br className="lg:hidden"/> seu deck.</span><br/>Entre na<br className="lg:hidden"/> batalha.
                </h1>

                <p className="absolute bottom-5 left-0 z-30 w-[58%] text-[12px] leading-[1.45] text-slate-300 sm:text-sm lg:static lg:mt-6 lg:w-auto lg:max-w-xl lg:text-base lg:leading-7">
                  Card game estratégico direto no navegador. Crie sua conta e receba <strong className="font-black text-cyan-300">1.000 NEX</strong>.
                  <span className="hidden lg:inline"> Escolha entre Rift Battle e Nexus Duel.</span>
                </p>
              </div>

              <div className="relative z-30 mt-1 grid grid-cols-3 divide-x divide-white/[.09] border-y border-white/[.08] py-3 text-center font-mono text-[7.5px] font-black uppercase leading-3 tracking-[.03em] text-slate-300 sm:text-[9px] lg:mt-5 lg:text-[10px]">
                <span className="flex flex-col items-center justify-center gap-1"><ShieldCheck className="h-4 w-4 text-emerald-400"/> Sem download</span>
                <span className="flex flex-col items-center justify-center gap-1"><Layers className="h-4 w-4 text-cyan-400"/> +1.000 NEX<br/> ao criar conta</span>
                <span className="flex flex-col items-center justify-center gap-1"><Swords className="h-4 w-4 text-fuchsia-400"/> Rift Battle<br/> + Nexus Duel</span>
              </div>

              <div className="relative z-30 mt-3 flex flex-col gap-2 sm:flex-row lg:mt-5">
                <button type="button" onClick={goRegister} className="inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-cyan-400 px-5 font-heading text-[11px] font-black uppercase tracking-[.11em] text-slate-950 shadow-[0_0_35px_rgba(34,211,238,.22)] transition hover:brightness-110">
                  Jogar agora — grátis <ArrowRight className="h-4 w-4"/>
                </button>
                <button type="button" onClick={() => onNavigate('login')} className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 bg-black/20 px-5 font-heading text-[10px] font-black uppercase tracking-[.1em] text-white backdrop-blur transition hover:bg-white/[.06] sm:min-h-[52px]">
                  Já tenho conta
                </button>
              </div>
            </div>

            <div className="relative hidden min-h-[560px] lg:block" aria-label="Cartas colecionáveis do NEXA">
              <div className="absolute inset-x-10 bottom-20 h-40 rounded-full bg-cyan-400/10 blur-3xl" />
              <img src="/assets/cards/dragons/card-dragon-shadow-v1.png" alt="Carta Dragão das Sombras do NEXA" className="absolute left-[0%] top-[24%] w-[34%] -rotate-[13deg] rounded-2xl shadow-[0_35px_90px_rgba(0,0,0,.8),0_0_45px_rgba(217,70,239,.24)]" />
              <img src="/assets/cards/gods/card-god-thunder-v1.png" alt="Carta Deus do Trovão do NEXA" className="absolute left-[31%] top-[5%] z-20 w-[38%] rotate-[2deg] rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,.85),0_0_55px_rgba(34,211,238,.28)]" />
              <img src="/assets/cards/knights/card-knight-celestial-v1.png" alt="Carta Cavaleiro Celestial do NEXA" className="absolute right-[0%] top-[25%] z-10 w-[34%] rotate-[13deg] rounded-2xl shadow-[0_35px_90px_rgba(0,0,0,.8),0_0_45px_rgba(96,165,250,.22)]" />
              <div className="absolute bottom-7 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full border border-cyan-300/25 bg-[#050b13]/90 px-5 py-2.5 font-mono text-[10px] font-black uppercase tracking-[.18em] text-cyan-100 backdrop-blur-md">Colecione • Monte o deck • Batalhe</div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="mb-4 text-center lg:mb-7 lg:text-left">
            <span className="font-mono text-[9px] font-black uppercase tracking-[.2em] text-cyan-300 lg:text-[10px]">Dois modos de jogo</span>
            <h2 className="mt-1 font-heading text-2xl font-black uppercase sm:text-3xl lg:mt-2 lg:text-4xl">Escolha seu estilo</h2>
          </div>

          <div className="grid grid-cols-2 gap-2.5 lg:hidden">
            <article className="relative min-h-[205px] overflow-hidden rounded-2xl border border-cyan-400/35 bg-[#06121c]">
              <img src="/assets/rift-battle-card.png" alt="Rift Battle V2" className="absolute inset-0 h-full w-full object-cover object-center"/>
              <div className="absolute inset-0 bg-gradient-to-t from-[#030913] via-[#030913]/35 to-transparent"/>
              <div className="absolute inset-x-0 bottom-0 p-3">
                <h3 className="font-heading text-lg font-black uppercase text-white">Rift Battle</h3>
                <p className="mt-1 text-[9px] leading-4 text-slate-300">Batalhas rápidas e táticas.</p>
              </div>
            </article>
            <article className="relative min-h-[205px] overflow-hidden rounded-2xl border border-fuchsia-400/35 bg-[#110918]">
              <img src="/assets/nexus-duel-card.png" alt="Nexus Duel" className="absolute inset-0 h-full w-full object-cover object-center"/>
              <div className="absolute inset-0 bg-gradient-to-t from-[#07040c] via-[#07040c]/35 to-transparent"/>
              <div className="absolute inset-x-0 bottom-0 p-3">
                <h3 className="font-heading text-lg font-black uppercase text-white">Nexus Duel</h3>
                <p className="mt-1 text-[9px] leading-4 text-slate-300">Estratégia, Nexos e blefe.</p>
              </div>
            </article>
          </div>

          <div className="hidden gap-5 lg:grid lg:grid-cols-2">
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
