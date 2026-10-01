import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Backpack, Pause, Play, Swords, Users, Zap } from 'lucide-react';

// Local prototype only. No Supabase writes, wallet changes or real rewards.
type Mob = { id: number; name: string; hp: number; maxHp: number; x: number; y: number; reward: number };
type Drop = { id: number; x: number; y: number; label: string };
const MAX_PARTY = 4;
const XP_FOR = (level: number) => 45 + level * 25;
const ENEMIES = ['Drone Corrompido', 'Rastejante Rift', 'Sentinela Neon'];
const spawn = (id: number): Mob => {
  const maxHp = 24 + (id % 4) * 10;
  return { id, name: ENEMIES[id % ENEMIES.length], hp: maxHp, maxHp, x: 20 + (id * 23) % 64, y: 26 + (id * 17) % 53, reward: 8 + (id % 4) * 3 };
};

export const Expedition: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const [running, setRunning] = useState(true);
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [credits, setCredits] = useState(0);
  const [kills, setKills] = useState(0);
  const [mobs, setMobs] = useState<Mob[]>(() => [spawn(1), spawn(2), spawn(3)]);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [log, setLog] = useState<string[]>(['Expedição iniciada. Farm automático ativado.']);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [materials, setMaterials] = useState(0);
  const nextId = useRef(4);
  const [party] = useState(['Você']); // Party-ready UI; multiplayer will be server-authoritative later.

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setMobs(current => {
        if (!current.length) return [spawn(nextId.current++)];
        const [target, ...others] = current;
        const damage = 8 + level * 2;
        if (target.hp > damage) return [{ ...target, hp: target.hp - damage }, ...others];
        setKills(v => v + 1);
        setCredits(v => v + target.reward);
        setXp(v => v + target.reward);
        if (target.id % 3 === 0) {
          setMaterials(v => v + 1);
          setDrops(v => [...v.slice(-5), { id: target.id, x: target.x, y: target.y, label: '+1 Fragmento' }]);
        }
        setLog(v => [target.name + ' derrotado · +' + target.reward + ' XP', ...v].slice(0, 4));
        return [...others, spawn(nextId.current++)];
      });
    }, 950);
    return () => window.clearInterval(timer);
  }, [running, level]);

  useEffect(() => {
    if (xp < XP_FOR(level)) return;
    setXp(v => v - XP_FOR(level));
    setLevel(v => v + 1);
    setLog(v => ['LEVEL UP! Poder aumentado.', ...v].slice(0, 4));
  }, [xp, level]);

  const primary = mobs[0];
  return (
    <div className="mx-auto max-w-6xl space-y-3 pb-8 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-400/20 bg-[#07131d] p-3">
        <button type="button" onClick={() => onNavigate('games')} className="flex items-center gap-2 text-xs font-bold text-cyan-200"><ArrowLeft size={16}/> Jogos</button>
        <div><h1 className="text-lg font-black uppercase tracking-widest text-cyan-200">NEXA Expedition <span className="text-[10px] text-amber-300">PROTÓTIPO LOCAL</span></h1><p className="text-[10px] text-slate-400">Setor Neon · Zona 01 · Farm automático</p></div>
        <button type="button" onClick={() => setRunning(v => !v)} className="flex items-center gap-2 rounded-lg border border-cyan-400/30 px-3 py-2 text-xs font-bold">{running ? <Pause size={14}/> : <Play size={14}/>} {running ? 'Pausar' : 'Continuar'}</button>
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_240px]">
        <div className="space-y-3">
          <div className="relative isolate h-[410px] overflow-hidden rounded-xl border border-cyan-400/25 bg-[#061019] sm:h-[480px]" style={{backgroundImage:'radial-gradient(ellipse at 50% 25%, #16425b 0%, transparent 55%), repeating-linear-gradient(0deg, transparent 0 38px, #12324766 39px 40px), repeating-linear-gradient(90deg, transparent 0 38px, #12324766 39px 40px)'}}>
            <div className="absolute inset-x-0 top-0 z-10 flex justify-between bg-gradient-to-b from-[#030a13] to-transparent p-3 text-[11px]"><span className="rounded bg-black/60 px-2 py-1 text-cyan-200">⚡ SETOR NEON / 01</span><span className="rounded bg-black/60 px-2 py-1">Inimigos {mobs.length} · Abates {kills}</span></div>
            <div className="absolute bottom-[16%] left-1/2 z-20 -translate-x-1/2 text-center"><div className="mx-auto grid h-14 w-11 place-items-center rounded-t-2xl border-2 border-cyan-300 bg-gradient-to-b from-cyan-300 via-blue-700 to-indigo-950 text-2xl shadow-[0_0_25px_#22d3ee88]">♜</div><div className="mt-1 rounded bg-black/75 px-2 py-0.5 text-[10px] font-bold text-cyan-200">AGENTE · NV {level}</div></div>
            {mobs.map((mob, i) => <div key={mob.id} className="absolute z-10 flex w-28 flex-col items-center gap-1 transition-all duration-500" style={{left: mob.x+'%',top:mob.y+'%',transform:'translate(-50%,-50%)'}}><div className="h-1.5 w-20 overflow-hidden rounded-full bg-red-950"><div className="h-full bg-red-400 transition-all" style={{width:(mob.hp/mob.maxHp*100)+'%'}}/></div><div className="text-2xl drop-shadow-[0_0_8px_#f0abfc]">{i === 0 ? '👾' : i === 1 ? '◈' : '◆'}</div><span className="rounded bg-black/70 px-1 text-[9px] text-rose-200">{mob.name}</span></div>)}
            <div className="absolute bottom-3 left-3 right-3 z-20 grid grid-cols-4 gap-2">{['Vanguarda','Artilheiro','Suporte','Guardião'].map((name,i)=><div key={name} className="rounded-lg border border-violet-400/35 bg-[#110d25]/90 p-2 text-center"><div className="text-lg">{['⚔','✦','✧','⬡'][i]}</div><div className="text-[9px] font-bold text-violet-200">{name}</div><div className="text-[8px] text-slate-400">Slot {i+1} · demo</div></div>)}</div>
            {drops.slice(-2).map(d=><div key={d.id} className="absolute z-10 animate-pulse text-[10px] font-black text-amber-300" style={{left:d.x+'%',top:d.y+'%'}}>{d.label}</div>)}
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-[#07131d] p-3 text-center"><div><p className="text-[10px] text-slate-400">NÍVEL</p><p className="font-black text-cyan-300">{level}</p></div><div><p className="text-[10px] text-slate-400">XP</p><p className="font-black">{xp}/{XP_FOR(level)}</p></div><div><p className="text-[10px] text-slate-400">CRÉDITOS DEMO</p><p className="font-black text-amber-300">{credits}</p></div><div className="col-span-3 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-cyan-400 transition-all" style={{width:Math.min(100,xp/XP_FOR(level)*100)+'%'}}/></div></div>
        </div>
        <div className="space-y-3">
          <section className="rounded-xl border border-violet-400/20 bg-[#0b1121] p-3"><h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-violet-200"><Users size={15}/> Squad · {party.length}/{MAX_PARTY}</h2>{party.map(name=><div key={name} className="mb-2 rounded-lg bg-violet-400/10 px-3 py-2 text-xs">{name} <span className="float-right text-emerald-300">Online</span></div>)}<p className="text-[10px] text-slate-400">Multiplayer reservado para fase posterior. Nenhum jogador fictício conectado.</p></section>
          <section className="rounded-xl border border-cyan-400/20 bg-[#07131d] p-3"><h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase text-cyan-200"><Swords size={15}/> Alvo atual</h2><p className="text-sm font-bold">{primary?.name ?? 'Procurando inimigo...'}</p><p className="mt-2 text-[11px] text-slate-400">Dano automático: {8+level*2} / golpe</p><p className="mt-1 flex items-center gap-1 text-[10px] text-amber-300"><Zap size={12}/> 1 ataque a cada 0,95 s</p></section>
          <section className="rounded-xl border border-white/10 bg-[#07131d] p-3"><button type="button" onClick={()=>setInventoryOpen(v=>!v)} className="flex w-full items-center justify-between text-xs font-black uppercase"><span className="flex items-center gap-2"><Backpack size={15}/> Mochila</span><span>{inventoryOpen?'Fechar':'Abrir'}</span></button>{inventoryOpen&&<div className="mt-3 rounded bg-white/5 p-3 text-xs">Fragmentos demo: <strong className="text-amber-300">{materials}</strong><p className="mt-2 text-[10px] text-slate-400">Não são adicionados ao inventário real.</p></div>}</section>
          <section className="rounded-xl border border-white/10 bg-[#07131d] p-3"><h2 className="mb-2 text-xs font-black uppercase text-slate-300">Registro de combate</h2>{log.map((entry,i)=><p key={i} className="border-b border-white/5 py-1 text-[10px] text-slate-400">{entry}</p>)}</section>
        </div>
      </div>
      <p className="text-center text-[10px] text-slate-500">Protótipo em memória: reiniciar a página zera o progresso. Sem economia real, multiplayer ou persistência.</p>
    </div>
  );
};
