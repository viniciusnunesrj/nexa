import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Swords, Users, Layers, Trophy, Pause, Play, RotateCcw } from 'lucide-react';

interface GamesProps {
  onNavigate: (page: string) => void;
}


const ExpeditionPrototype: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const enemies = [
    { name: 'Drone Corrompido', max: 36, xp: 10, icon: '◈' },
    { name: 'Sentinela Rift', max: 58, xp: 16, icon: '⬡' },
    { name: 'Predador Neon', max: 82, xp: 25, icon: '✦' },
  ];
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [kills, setKills] = useState(0);
  const [drops, setDrops] = useState(0);
  const [enemyIndex, setEnemyIndex] = useState(0);
  const [enemyHp, setEnemyHp] = useState(enemies[0].max);
  const [running, setRunning] = useState(true);
  const [zone, setZone] = useState(1);
  type ProtoGear = { id:string; name:string; power:number; slot:string; rarity:string };
  const [gear, setGear] = useState<ProtoGear[]>([]);
  const [equipped, setEquipped] = useState<Record<string,ProtoGear | null>>({ arma:null, armadura:null, nucleo:null, visor:null });
  const [power, setPower] = useState(12);
  const [bossHp, setBossHp] = useState<number | null>(null);
  const [bossDefeated, setBossDefeated] = useState(false);
  const [areaNotice, setAreaNotice] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [potions, setPotions] = useState(1);
  const [hp, setHp] = useState(100);
  const [cardCharge, setCardCharge] = useState([0,0,0,0]);
  const [cardPulse, setCardPulse] = useState<number | null>(null);
  const [event, setEvent] = useState<{title:string;body:string;kind:string} | null>(null);
  const [eventMeter, setEventMeter] = useState(0);
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [streakDay, setStreakDay] = useState(3);
  const [missionClaims, setMissionClaims] = useState<Record<string,boolean>>({});
  const [milestoneClaims, setMilestoneClaims] = useState<Record<string,boolean>>({});
  const [renown, setRenown] = useState(0);
  const [research, setResearch] = useState(0);
  const [upgrades, setUpgrades] = useState<Record<string,number>>({damage:0, salvage:0, recovery:0});
  const [talents, setTalents] = useState<Record<string,number>>({combat:0,survival:0,exploration:0});
  const [eliteKills, setEliteKills] = useState(0);
  const [elite, setElite] = useState<{name:string;hp:number;max:number;trait:string} | null>(null);
  const [mapNode, setMapNode] = useState(0);
  const [worldBoss, setWorldBoss] = useState<{name:string;hp:number;max:number} | null>(null);
  const [raidSignal, setRaidSignal] = useState(false);
  const [codex, setCodex] = useState<Record<string,number>>({});
  const [bounties, setBounties] = useState<Record<string,boolean>>({});
  const [cores, setCores] = useState(0);
  const [forgeLevel, setForgeLevel] = useState(0);
  const [salvaged, setSalvaged] = useState(0);
  const [zoneMastery, setZoneMastery] = useState<Record<number,number>>({});
  const [tutorialStep, setTutorialStep] = useState(0);
  const [guards, setGuards] = useState<{id:string;name:string;rarity:string;skill:string;power:number}[]>([]);
  const [activeGuard, setActiveGuard] = useState<string | null>(null);
  const [guardChance, setGuardChance] = useState<{name:string;rarity:string;skill:string;power:number;capture:number} | null>(null);
  const [seals, setSeals] = useState(2);
  const [merchantOpen, setMerchantOpen] = useState(false);
  const [marketListings, setMarketListings] = useState<{id:string;item:ProtoGear;price:number;seller:string}[]>([]);
  const [marketOpen, setMarketOpen] = useState(false);
  const [dailyNexClaimed, setDailyNexClaimed] = useState(false);
  const [eventsInteracted, setEventsInteracted] = useState(0);
  const [expChat, setExpChat] = useState<{id:string;author:string;text:string;channel:string;replyTo?:{author:string;text:string}}[]>([
    {id:'c1',author:'Sistema',text:'Bem-vindo à Expedição. Use @ ou Responder para manter a conversa organizada.',channel:'Sistema'},
    {id:'c2',author:'VigiaRift',text:'Alguém encontrou Eco raro no Distrito Rift?',channel:'Global'},
    {id:'c3',author:'Missões',text:'Jornada diária iniciada. Suas atividades de hoje serão registradas aqui.',channel:'Missões'}
  ]);
  const [chatText, setChatText] = useState('');
  const [chatChannel, setChatChannel] = useState('Global');
  const [chatReply, setChatReply] = useState<{author:string;text:string}|null>(null);
  const [guardiansDefeated, setGuardiansDefeated] = useState(0);
  const [quickPanel, setQuickPanel] = useState<string | null>(null);
  const [hitFlash, setHitFlash] = useState(false);
  const [lootFlash, setLootFlash] = useState<string | null>(null);
  const rarityRoll = (seed:number) => seed % 20 === 0 ? {name:'Lendário', mult:2.2} : seed % 8 === 0 ? {name:'Épico', mult:1.7} : seed % 3 === 0 ? {name:'Raro', mult:1.35} : {name:'Comum', mult:1};
  const gearPool = useMemo(() => [
    { name: 'Lâmina Neon', power: 3, slot: 'arma' }, { name: 'Visor Rift', power: 4, slot: 'visor' },
    { name: 'Núcleo Ciano', power: 5, slot: 'nucleo' }, { name: 'Armadura Nexus', power: 7, slot: 'armadura' }
  ], []);
  const needXp = 40 + (level - 1) * 25;
  const maxHp = 100 + (level - 1) * 6 + (talents.survival || 0) * 4;
  const effectiveHp = Math.min(hp, maxHp);
  const renownTier = renown >= 60 ? 'Vanguarda' : renown >= 30 ? 'Operador' : renown >= 10 ? 'Batedor' : 'Recruta';

  const rarityClass = (r:string) => r==='Lendário' ? 'border-amber-300/60 text-amber-200' : r==='Épico' ? 'border-fuchsia-400/50 text-fuchsia-200' : r==='Raro' ? 'border-cyan-400/50 text-cyan-200' : 'border-white/15 text-slate-300';
  const listMarketItem = (item:ProtoGear) => {
    const price=Math.max(10,item.power*8);
    setMarketListings(v=>[{id:'m-'+item.id,item,price,seller:'Você'},...v]);
    setGear(g=>g.filter(x=>x.id!==item.id));
    setEquipped(eq=>{
      if(eq[item.slot]?.id!==item.id) return eq;
      const next={...eq,[item.slot]:null};
      setPower(12+Object.values(next).reduce((sum,p)=>sum+(p?.power||0),0));
      return next;
    });
  };
  const cancelMarketListing = (id:string) => {
    const listing=marketListings.find(x=>x.id===id); if(!listing) return;
    setGear(g=>[listing.item,...g].slice(0,16));
    setMarketListings(v=>v.filter(x=>x.id!==id));
  };
  const salvageItem = (item:ProtoGear) => {
    const gain = item.rarity==='Lendário'?12:item.rarity==='Épico'?7:item.rarity==='Raro'?4:2;
    setGear(g=>g.filter(x=>x.id!==item.id)); setCredits(c=>c+gain); setSalvaged(v=>v+1);
    setEquipped(eq=>{
      if(eq[item.slot]?.id!==item.id) return eq;
      const next={...eq,[item.slot]:null};
      setPower(12+Object.values(next).reduce((sum,p)=>sum+(p?.power||0),0));
      return next;
    });
  };
  const enhanceItem = (item:ProtoGear) => {
    if (cores < 1 || credits < 30) return;
    setCores(c=>c-1); setCredits(c=>c-30);
    setGear(g=>g.map(x=>x.id===item.id?{...x,power:x.power+2+forgeLevel}:x));
    setEquipped(eq=>{
      if(eq[item.slot]?.id!==item.id) return eq;
      const next={...eq,[item.slot]:{...item,power:item.power+2+forgeLevel}};
      setPower(12+Object.values(next).reduce((sum,p)=>sum+(p?.power||0),0));
      return next;
    });
  };
  const equipItem = (item:ProtoGear) => {
    setEquipped(current => {
      const next = { ...current, [item.slot]: item };
      const total = 12 + Object.values(next).reduce((sum, piece) => sum + (piece?.power || 0), 0);
      setPower(total);
      return next;
    });
  };

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setEnemyHp(hp => {
        setHitFlash(true);
        window.setTimeout(() => setHitFlash(false), 140);
        const next = hp - (8 + level * 2 + Math.floor(power / 4) + upgrades.damage * 2 + (talents.combat || 0));
        if (next > 0) return next;
        const foe = {...enemies[enemyIndex], max: Math.round(enemies[enemyIndex].max * (1 + (zone - 1) * .28))};
        if (!elite && (kills + 1) % 9 === 0) {
          const eliteMax = 95 + zone * 45;
          setElite({name: zone>=4?'Arauto Abissal':zone>=2?'Executor Rift':'Drone Alfa',hp:eliteMax,max:eliteMax,trait:zone%2===0?'Blindagem Reativa':'Carga Instável'});
        }
        setEventMeter(m => {
          const next = m + 1;
          if (next >= 7 && !event) {
            const pick = (kills + zone) % 3;
            setEvent(pick===0 ? {title:'Fenda Instável',body:'Uma ruptura energética surgiu. Arrisque-se por sucata extra.',kind:'risk'} : pick===1 ? {title:'Cache Abandonado',body:'Um depósito NEXA foi detectado fora da rota.',kind:'loot'} : {title:'Sinal de Socorro',body:'Um eco aliado pede assistência no setor.',kind:'rescue'});
            return 0;
          }
          return next;
        });
        setCardCharge(ch => ch.map((v,i) => {
          const nv = v + (i===3 ? 8 : 6);
          if (nv >= 100) {
            setCardPulse(i); window.setTimeout(()=>setCardPulse(null),450);
            if (i===0) setEnemyHp(eh => Math.max(0, eh - (10 + level*2)));
            if (i===1) setHp(h => Math.min(maxHp, h + 18));
            if (i===2) setHp(h => Math.min(maxHp, h + 8));
            if (i===3) setCredits(c => c + 5 + zone);
            return 0;
          }
          return nv;
        }));
        setMapNode(n => {
          const next = Math.min(100,n+4+zone+(talents.exploration||0)*2);
          if(next>=75 && zone>=3) setRaidSignal(true);
          if(next>=100 && !worldBoss) {
            const max=260+zone*120;
            setWorldBoss({name:zone>=4?'Colosso do Abismo':zone>=2?'Titã Rift':'Sentinela Nexus',hp:max,max});
          }
          return next;
        });
        setCodex(c => ({...c,[foe.name]:(c[foe.name]||0)+1}));
        setZoneMastery(m => ({...m,[zone]:(m[zone]||0)+1}));
        if ((kills+1)%13===0 && !guardChance) {
          const seed=(kills+1)*17+zone*11;
          const rarity=seed%97===0?'Lendário':seed%29===0?'Épico':seed%9===0?'Raro':'Comum';
          const data=rarity==='Lendário'?{name:'Executor Eco',skill:'Ruptura Fantasma',power:13,capture:6}:rarity==='Épico'?{name:'Sentinela Eco',skill:'Pulso de Guarda',power:9,capture:12}:rarity==='Raro'?{name:'Vigia Rift',skill:'Olho do Setor',power:6,capture:25}:{name:'Soldado Nexus',skill:'Fogo de Cobertura',power:3,capture:45};
          setGuardChance({...data,rarity});
        }
        setCredits(c => c + 2 + zone + upgrades.salvage + ((talents.exploration||0)>=4 ? 1 : 0));
        setHp(h => Math.max(1, h - Math.max(1, 4 + zone - Math.floor(power/12) - upgrades.recovery - Math.floor((talents.survival||0)/2))));
        setKills(k => {
          const n = k + 1;
          if (n % 5 === 0) {
            setDrops(d => d + 1);
            const base = gearPool[(n / 5 - 1) % gearPool.length];
            const rarity = rarityRoll(n + zone);
            const item:ProtoGear = { ...base, id: n+'-'+zone, rarity: rarity.name, power: Math.max(1, Math.round((base.power + zone - 1) * rarity.mult)) };
            setGear(g => [item, ...g].slice(0, 16));
            setLootFlash(rarity.name+' · '+item.name);
            window.setTimeout(() => setLootFlash(null), 1300);
          }
          if (n % 10 === 0) setBossDefeated(false);
          return n;
        });
        setXp(current => {
          const total = current + foe.xp;
          if (total >= needXp) { setLevel(v => v + 1); return total - needXp; }
          return total;
        });
        const ni = (enemyIndex + 1) % enemies.length;
        setEnemyIndex(ni);
        return Math.round(enemies[ni].max * (1 + (zone - 1) * .28));
      });
    }, 850);
    return () => window.clearInterval(timer);
  }, [running, level, enemyIndex, needXp, power, gearPool, zone, upgrades.damage, upgrades.salvage, upgrades.recovery, talents.combat, talents.survival, talents.exploration, kills, guardChance]);

  const reset = () => { setLevel(1); setXp(0); setKills(0); setDrops(0); setEnemyIndex(0); setEnemyHp(enemies[0].max); setRunning(true); setZone(1); setGear([]); setEquipped({ arma:null, armadura:null, nucleo:null, visor:null }); setPower(12); setBossHp(null); setBossDefeated(false); setAreaNotice(null); setCredits(0); setPotions(1); setHp(100); setCardCharge([0,0,0,0]); setCardPulse(null); setEvent(null); setEventMeter(0); setDailyClaimed(false); setStreakDay(3); setMissionClaims({}); setMilestoneClaims({}); setRenown(0); setResearch(0); setUpgrades({damage:0,salvage:0,recovery:0}); setTalents({combat:0,survival:0,exploration:0}); setEliteKills(0); setElite(null); setMapNode(0); setWorldBoss(null); setRaidSignal(false); setCodex({}); setBounties({}); setCores(0); setForgeLevel(0); setSalvaged(0); setZoneMastery({}); setTutorialStep(0); setGuards([]); setActiveGuard(null); setGuardChance(null); setSeals(2); setMerchantOpen(false); setMarketListings([]); setMarketOpen(false); setDailyNexClaimed(false); setEventsInteracted(0); setExpChat(v=>v.slice(0,3)); setChatText(''); setChatReply(null); setGuardiansDefeated(0); setQuickPanel(null); };
  const talentPointsTotal = Math.floor((level - 1) / 2) + Math.floor(renown / 20);
  const talentPointsSpent = Object.values(talents).reduce((a,b)=>a+b,0);
  const talentPoints = Math.max(0,talentPointsTotal-talentPointsSpent);
  const talentDefs = [
    {id:'combat',name:'Combate',icon:'⚔',desc:'Aprimora dano e eficiência contra ameaças.',effects:['+1 dano por ponto','+2 dano em Elite / +3 em Boss por ponto','Preparação para funções de Party']},
    {id:'survival',name:'Sobrevivência',icon:'⬡',desc:'Mantém a expedição ativa por mais tempo.',effects:['+4 PV máximo por ponto','-1 desgaste a cada 2 pontos','Reduz dano de Elite e Boss']},
    {id:'exploration',name:'Exploração',icon:'✦',desc:'Acelera descobertas e coleta em campo.',effects:['+2 avanço de mapa por ponto','Nv. 4+: +1 sucata por abate','Apoia descoberta de Ecos']}
  ];
  const spendTalent = (id:string) => {
    if(talentPoints<1 || (talents[id]||0)>=5) return;
    setTalents(v=>({...v,[id]:(v[id]||0)+1}));
  };
  const quickActions = [
    {key:'c',label:'Personagem',target:'exp-status'},
    {key:'i',label:'Inventário',target:'exp-inventory'},
    {key:'m',label:'Mapa',target:'exp-map'},
    {key:'k',label:'Talentos',target:'exp-talents'},
    {key:'j',label:'Jornada',target:'exp-journey'},
    {key:'b',label:'Mercado',target:'exp-market'},
    {key:'p',label:'Party',target:'exp-party'}
  ];
  useEffect(() => {
    const onKey = (e:KeyboardEvent) => {
      const el=e.target as HTMLElement | null;
      if(el && (el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.isContentEditable)) return;
      if(e.key==='Escape'){setQuickPanel(null);return;}
      const action=quickActions.find(a=>a.key===e.key.toLowerCase());
      if(!action) return;
      e.preventDefault();
      setQuickPanel(action.key);
      document.getElementById(action.target)?.scrollIntoView({behavior:'smooth',block:'start'});
      window.setTimeout(()=>setQuickPanel(null),900);
    };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  }, []);
  const dailyActivity = [
    Math.min(25, kills / 20 * 25),
    Math.min(20, mapNode / 100 * 20),
    Math.min(15, Object.keys(codex).length / enemies.length * 15),
    Math.min(15, gear.length / 6 * 15),
    Math.min(10, eliteKills / 2 * 10),
    Math.min(10, (zone - 1) / 3 * 10),
    Math.min(5, guards.length > 0 ? 5 : 0)
  ].reduce((a,b)=>a+b,0);
  const dailyProgress = Math.min(100, Math.floor(dailyActivity));
  const dailyNexBasePool = 30;
  const veteranBonus = Math.min(20,
    Math.floor(kills / 50) * 2 +
    Math.floor(eliteKills / 3) * 2 +
    Math.floor(guardiansDefeated / 2) * 2 +
    Math.floor(eventsInteracted / 5) +
    Math.max(0, zone - 1) * 2 +
    Object.values(missionClaims).filter(Boolean).length * 2 +
    Math.floor(renown / 20)
  );
  const dailyNexPool = dailyNexBasePool + veteranBonus;
  const dailyNexReward = Math.floor(dailyNexPool * dailyProgress / 100);
  const foe = enemies[enemyIndex];

  return (
    <div className="space-y-4">
      {tutorialStep < 4 && <div className="sticky top-2 z-40 rounded-xl border border-cyan-300/30 bg-[#020812]/95 p-3 shadow-2xl"><span className="text-[8px] font-black uppercase tracking-[.2em] text-cyan-300">Treinamento NEXA · {tutorialStep+1}/4</span><b className="mt-1 block text-sm text-white">{['Bem-vindo à Expedição','Observe o auto-combate','Equipe seus drops','Explore por conta própria'][tutorialStep]}</b><p className="mt-1 text-[9px] text-slate-400">{['Vamos mostrar apenas o essencial.','Pause ou retome o farm. Combates geram XP, recursos e descobertas.','Itens vão para a Mochila: equipe os melhores e recicle o restante.','Cartas, Ecos, Codex e mapa se conectam. O resto você descobre jogando.'][tutorialStep]}</p><div className="mt-2 flex gap-3"><button onClick={()=>setTutorialStep(t=>t+1)} className="rounded border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-[8px] font-black text-cyan-200">{tutorialStep===3?'COMEÇAR':'PRÓXIMO'}</button><button onClick={()=>setTutorialStep(4)} className="text-[8px] text-slate-600">Pular</button></div></div>}
      <div className="sticky top-2 z-30 flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-[#020812]/90 p-2 shadow-xl backdrop-blur">
        {quickActions.map(a=><button key={a.key} onClick={()=>{setQuickPanel(a.key);document.getElementById(a.target)?.scrollIntoView({behavior:'smooth',block:'start'});window.setTimeout(()=>setQuickPanel(null),900)}} className={(quickPanel===a.key?'border-cyan-300 bg-cyan-400/15 text-cyan-100':'border-white/10 bg-black/20 text-slate-400')+" rounded-lg border px-2 py-1.5 text-[8px] font-black transition"}><kbd className="mr-1 rounded bg-white/10 px-1 text-[7px] uppercase">{a.key}</kbd>{a.label}</button>)}
        <span className="ml-auto text-[7px] text-slate-600">ESC fecha · atalhos pausam ao digitar</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-cyan-300">NEXA · protótipo isolado</p><h1 className="font-heading text-2xl font-black uppercase text-white">Expedition <span className="text-fuchsia-400">/ Setor Neon</span></h1></div>
        <button onClick={onClose} className="rounded-lg border border-white/20 px-3 py-2 text-xs text-slate-200">Voltar aos jogos</button>
      </div>
      <div id="exp-status" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[['Nível', level], ['XP', xp + '/' + needXp], ['Poder', power], ['Zona', zone], ['Sucata', credits], ['HP', effectiveHp+'/'+maxHp]].map(([a,b]) => <div key={a} className="rounded-xl border border-cyan-400/20 bg-[#060b16] p-3"><p className="text-[9px] uppercase text-slate-500">{a}</p><b className="text-xl text-cyan-200">{b}</b></div>)}
      </div>
      <section className="relative min-h-[390px] overflow-hidden rounded-2xl border border-cyan-400/30 bg-[#060b18] p-4">
        <div className="absolute inset-0 opacity-30" style={{backgroundImage:'linear-gradient(#22d3ee33 1px,transparent 1px),linear-gradient(90deg,#22d3ee33 1px,transparent 1px)',backgroundSize:'38px 38px'}} />
        <div className="relative flex justify-between text-[10px] uppercase"><span className="rounded-full bg-black/50 px-3 py-1 text-cyan-200">{'Zona '+zone.toString().padStart(2,'0')+' · '+zoneNames[zone-1]}</span><span className="text-emerald-300">{running ? 'Combatendo' : 'Pausado'}</span></div>
        <div className="relative mt-12">
          {areaNotice && <div className="absolute inset-x-0 top-1/3 z-30 mx-auto w-fit rounded-xl border border-cyan-300/40 bg-black/90 px-6 py-3 text-center shadow-2xl"><span className="block text-[9px] font-black uppercase tracking-[.3em] text-cyan-400">Nova área</span><b className="text-lg text-white">{areaNotice}</b></div>}
          <div className="pointer-events-none absolute left-[10%] right-[10%] top-[54%] h-px bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent" />
          {lootFlash && <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 animate-bounce rounded-full border border-amber-300/40 bg-black/80 px-3 py-1 text-[10px] font-black text-amber-200">DROP! {lootFlash}</div>}
          <div className="grid grid-cols-2 items-end gap-5 text-center">
          <div className="relative"><div className="absolute left-1/2 top-16 h-5 w-28 -translate-x-1/2 rounded-[50%] bg-cyan-400/10 blur-sm" /><div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-[40%_40%_32%_32%] border-2 border-cyan-300/50 bg-gradient-to-b from-cyan-400/20 to-slate-950 text-6xl shadow-[0_0_35px_rgba(34,211,238,.18)]">♟</div><b className="mt-3 block text-xs text-white">Agente NEXA · Nv. {level} · POD {power}</b></div>
          <div className={hitFlash ? 'relative scale-95 brightness-150 transition' : 'relative transition'}><div className="absolute left-1/2 top-16 h-5 w-28 -translate-x-1/2 rounded-[50%] bg-fuchsia-400/10 blur-sm" /><div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-[40%_40%_32%_32%] border-2 border-fuchsia-300/50 bg-gradient-to-b from-fuchsia-400/20 to-slate-950 text-6xl text-fuchsia-200 shadow-[0_0_35px_rgba(217,70,239,.18)]">{foe.icon}</div><b className="mt-3 block text-xs text-white">{foe.name}</b><div className="mx-auto mt-2 h-2 max-w-36 overflow-hidden rounded bg-slate-700"><div className="h-full bg-rose-400 transition-all" style={{width:(enemyHp/foe.max*100)+'%'}} /></div><small className="text-slate-400">{enemyHp}/{foe.max} HP</small></div>
        </div></div>
        <div className="relative mt-10 flex justify-center gap-2">{companions.map((c,i)=><div key={c.name} title={c.effect} className={(cardPulse===i?'scale-110 border-cyan-200 bg-cyan-400/25 ':'')+"group relative flex h-20 w-16 flex-col items-center justify-center overflow-hidden rounded-lg border border-violet-400/40 bg-gradient-to-b from-violet-500/20 to-black/50 text-xl text-violet-200 shadow-[0_5px_18px_rgba(139,92,246,.12)] transition"}><span className="transition group-hover:-translate-y-0.5">{c.icon}</span><small className="mt-1 text-[7px] font-bold text-slate-300">{c.name}</small><small className="text-[6px] uppercase text-slate-500">{c.role}</small><div className="absolute bottom-0 left-0 h-1 bg-cyan-400 transition-all" style={{width:cardCharge[i]+'%'}} /></div>)}</div>
      </section>
      <section className="rounded-xl border border-fuchsia-400/15 bg-black/30 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><span className="text-[8px] font-black uppercase tracking-[.2em] text-fuchsia-300">Comunicador NEXA</span><b className="mt-1 block text-sm text-white">Chat da Expedição</b></div><div className="flex gap-1">{['Global','Local','Party','Missões','Sistema','Privado'].map(c=><button key={c} onClick={()=>setChatChannel(c)} className={`rounded px-2 py-1 text-[7px] font-black ${chatChannel===c?'bg-fuchsia-400/15 text-fuchsia-200':'text-slate-500'}`}>{c}</button>)}</div></div><div className="mt-3 max-h-36 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-2">{expChat.filter(m=>m.channel===chatChannel).map(m=><div key={m.id} className="group text-[9px]"><div><b className={m.channel==='Sistema'?'text-amber-300':m.channel==='Missões'?'text-emerald-300':'text-cyan-300'}>{m.author}</b>{m.replyTo&&<span className="ml-2 rounded bg-white/5 px-1 text-[7px] text-slate-500">↪ {m.replyTo.author}: {m.replyTo.text.slice(0,28)}{m.replyTo.text.length>28?'…':''}</span>}</div><span className="text-slate-300">{m.text}</span>{m.author!=='Sistema'&&<button onClick={()=>setChatReply({author:m.author,text:m.text})} className="ml-2 text-[7px] text-fuchsia-300 opacity-70 hover:opacity-100">RESPONDER</button>}</div>)}</div>{chatReply&&<div className="mt-2 flex items-center justify-between rounded border border-fuchsia-400/15 bg-fuchsia-500/5 px-2 py-1"><span className="text-[7px] text-slate-400">Respondendo <b className="text-fuchsia-200">{chatReply.author}</b>: {chatReply.text.slice(0,45)}</span><button onClick={()=>setChatReply(null)} className="text-[8px] text-slate-500">×</button></div>}<div className="mt-2 flex gap-2"><input value={chatText} onChange={e=>setChatText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&chatText.trim()){setExpChat(v=>[...v,{id:'c'+Date.now(),author:'Você',text:chatText.trim(),channel:chatChannel,replyTo:chatReply||undefined}]);setChatText('');setChatReply(null)}}} placeholder={`Mensagem em ${chatChannel}...`} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-[9px] text-white outline-none"/><button onClick={()=>{if(!chatText.trim())return;setExpChat(v=>[...v,{id:'c'+Date.now(),author:'Você',text:chatText.trim(),channel:chatChannel,replyTo:chatReply||undefined}]);setChatText('');setChatReply(null)}} className="rounded-lg border border-fuchsia-400/25 px-3 text-[8px] font-black text-fuchsia-200">ENVIAR</button></div><p className="mt-2 text-[7px] text-slate-600">Protótipo local. Depois será ligado ao chat existente do NEXA com canais e mensagens persistentes.</p></section>
      <section className="rounded-xl border border-violet-400/15 bg-violet-500/5 p-3"><div className="flex items-center justify-between"><div><span className="text-[8px] font-black uppercase tracking-[.2em] text-violet-300">Registro de Carreira</span><b className="mt-1 block text-sm text-white">Expedicionário · REN {renown}</b><p className="text-[9px] text-slate-500">Seu histórico alimenta conquistas, Bônus de Veterano e futuras liberações.</p></div><span className="text-[8px] text-violet-200">progresso permanente*</span></div><div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4"><div className="rounded-lg border border-white/10 p-2"><b className="text-xs text-white">{kills}</b><span className="block text-[7px] text-slate-500">criaturas</span></div><div className="rounded-lg border border-white/10 p-2"><b className="text-xs text-white">{eliteKills}</b><span className="block text-[7px] text-slate-500">elites</span></div><div className="rounded-lg border border-white/10 p-2"><b className="text-xs text-white">{guardiansDefeated}</b><span className="block text-[7px] text-slate-500">guardiões</span></div><div className="rounded-lg border border-white/10 p-2"><b className="text-xs text-white">{eventsInteracted}</b><span className="block text-[7px] text-slate-500">eventos</span></div></div><p className="mt-2 text-[7px] text-slate-600">* No protótipo ainda reinicia junto com a sessão; no backend será histórico persistente.</p></section>
      <section id="exp-journey" className="rounded-xl border border-blue-400/20 bg-blue-500/5 p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><span className="text-[8px] font-black uppercase tracking-[.2em] text-blue-300">Jornada Diária NEXA</span><b className="mt-1 block text-sm text-white">{dailyProgress}% do dia concluído</b><p className="text-[9px] text-slate-500">Uma única recompensa diária mede sua atividade total. Nenhuma ação isolada entrega NEX.</p></div><div className="text-right"><b className="block text-lg text-blue-200">{dailyNexReward} / {dailyNexPool} NEX*</b><span className="text-[7px] text-slate-500">base 30 + bônus de veterano {veteranBonus}</span></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-blue-400 transition-all" style={{width:dailyProgress+'%'}} /></div><div className="mt-3 grid grid-cols-2 gap-2 text-[8px] md:grid-cols-4"><span>Combate · até 25%</span><span>Exploração · até 20%</span><span>Codex · até 15%</span><span>Equipamentos · até 15%</span><span>Elites · até 10%</span><span>Progressão · até 10%</span><span>Eco · até 5%</span></div><button disabled={dailyProgress<20||dailyNexClaimed} onClick={()=>setDailyNexClaimed(true)} className="mt-3 w-full rounded-lg border border-blue-400/30 bg-blue-400/10 px-3 py-2 text-[8px] font-black text-blue-200 disabled:opacity-30">{dailyNexClaimed?'RECOMPENSA DO DIA RESGATADA':dailyProgress<20?'LIBERA EM 20%':'ENCERRAR JORNADA · '+dailyNexReward+' NEX*'}</button><div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-2"><span className="text-[7px] font-black uppercase text-blue-300">Bônus de Veterano</span><p className="mt-1 text-[8px] text-slate-500">Quem joga mais aumenta lentamente o teto diário: marcos de monstros, Elites, regiões, missões concluídas e REN. O bônus é limitado para não transformar uma única atividade em farm infinito.</p></div><p className="mt-2 text-[7px] text-slate-600">* Protótipo: ainda não credita NEX real. Ao resgatar, o valor do dia é fechado e não pode ser resgatado novamente.</p></section>
      <section id="exp-market" className="rounded-xl border border-cyan-400/15 bg-cyan-500/5 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><span className="text-[8px] font-black uppercase tracking-[.2em] text-cyan-300">Mercado de Expedicionários</span><b className="mt-1 block text-sm text-white">Trocas entre jogadores</b><p className="text-[9px] text-slate-500">Equipamentos encontrados podem ser anunciados por jogadores. Orin continua sendo o único NPC vendedor.</p></div><button onClick={()=>setMarketOpen(v=>!v)} className="rounded border border-cyan-400/25 px-3 py-2 text-[8px] font-black text-cyan-200">{marketOpen?'FECHAR':'ABRIR MERCADO'}</button></div>{marketOpen&&<div className="mt-3 grid gap-2 md:grid-cols-2">{marketListings.length===0?<p className="text-[9px] text-slate-500">Nenhum anúncio no protótipo. Use VENDER em um item da mochila.</p>:marketListings.map(l=><div key={l.id} className="rounded-lg border border-white/10 bg-black/20 p-2"><div className="flex items-center justify-between"><div><span className="text-[7px] uppercase text-cyan-300">{l.item.rarity}</span><b className="block text-[9px] text-white">{l.item.name} · +{l.item.power} POD</b><span className="text-[7px] text-slate-500">Vendedor: {l.seller}</span></div><b className="text-[10px] text-amber-200">{l.price} NEX*</b></div>{l.seller==='Você'&&<button onClick={()=>cancelMarketListing(l.id)} className="mt-2 rounded border border-white/10 px-2 py-1 text-[7px] text-slate-400">CANCELAR ANÚNCIO</button>}</div>)}</div>}<p className="mt-2 text-[7px] text-slate-600">* Protótipo visual. Nenhuma NEX real ou transação Supabase é movimentada neste branch.</p></section>
      <section className="rounded-xl border border-amber-400/15 bg-amber-500/5 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><span className="text-[8px] font-black uppercase tracking-[.2em] text-amber-300">Mercador · NPC Único de Comércio</span><b className="mt-1 block text-sm text-white">Orin, o Vinculador</b><p className="text-[9px] text-slate-500">Único NPC vendedor planejado para a Expedição. Outros NPCs terão funções narrativas, missões ou serviços — não lojas.</p></div><button onClick={()=>setMerchantOpen(v=>!v)} className="rounded border border-amber-400/25 px-3 py-2 text-[8px] font-black text-amber-200">{merchantOpen?'FECHAR':'NEGOCIAR'}</button></div>{merchantOpen&&<div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3"><div className="flex items-center justify-between"><div><b className="text-[10px] text-white">Selo de Vinculação</b><p className="text-[8px] text-slate-500">Consumido em cada tentativa de captura de Eco.</p></div><button disabled={credits<35} onClick={()=>{setCredits(c=>c-35);setSeals(v=>v+1)}} className="rounded border border-amber-400/25 px-3 py-2 text-[8px] font-black text-amber-200 disabled:opacity-30">35 SUCATA · COMPRAR</button></div><span className="mt-2 block text-[8px] text-slate-500">Em posse: {seals} selos</span></div>}</section>
      <section className="rounded-xl border border-purple-400/15 bg-purple-500/5 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><span className="text-[8px] font-black uppercase tracking-[.2em] text-purple-300">Guardiões de Eco</span><b className="mt-1 block text-sm text-white">{activeGuard ? guards.find(g=>g.id===activeGuard)?.name : 'Nenhum invocado'}</b><p className="text-[9px] text-slate-500">Somente NPCs compatíveis podem deixar um Eco. A aparição é rara e a captura exige um Selo de Vinculação.</p></div><span className="text-[8px] text-purple-200">{guards.length} coletados</span></div>
        {guardChance && <div className="mt-3 rounded-lg border border-purple-300/30 bg-black/30 p-3"><span className="text-[7px] font-black uppercase text-purple-300">Eco capturável detectado</span><b className="block text-xs text-white">{guardChance.name} · {guardChance.rarity}</b><p className="text-[8px] text-slate-400">{guardChance.skill} · +{guardChance.power} POD · chance {guardChance.capture}%</p><div className="mt-2 flex gap-2"><button disabled={seals<=0} onClick={()=>{setSeals(v=>v-1);const attempt=((kills+zone+seals)*37)%100;if(attempt<guardChance.capture){const g={...guardChance,id:Date.now().toString()};setGuards(v=>[g,...v]);setGuardChance(null)}else{setGuardChance(null)}} className="rounded border border-purple-400/30 px-3 py-1 text-[8px] font-black text-purple-200 disabled:opacity-30">USAR SELO ({seals})</button><button onClick={()=>setGuardChance(null)} className="rounded border border-white/10 px-3 py-1 text-[8px] text-slate-500">DEIXAR</button></div></div>}
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">{guards.slice(0,4).map(g=><button key={g.id} onClick={()=>setActiveGuard(g.id)} className={(activeGuard===g.id?'border-purple-300 bg-purple-400/15 ':'border-white/10 bg-black/20 ')+"rounded-lg border p-2 text-left"}><span className="text-[7px] uppercase text-purple-300">{g.rarity}</span><b className="block text-[9px] text-white">{g.name}</b><span className="text-[7px] text-slate-500">{g.skill}</span></button>)}</div>
      </section>
      <section className="rounded-xl border border-teal-400/15 bg-teal-500/5 p-3">
        <div className="flex items-center justify-between"><div><span className="text-[8px] font-black uppercase tracking-[.2em] text-teal-300">Domínio Regional</span><b className="mt-1 block text-sm text-white">{zoneNames[zone-1]} · Nv. {Math.min(3,Math.floor((zoneMastery[zone]||0)/10))}/3</b><p className="text-[9px] text-slate-500">Caçar, explorar e derrotar ameaças torna sua equipe especialista naquela região.</p></div><span className="text-[8px] text-teal-200">{zoneMastery[zone]||0} atividade</span></div>
        <div className="mt-3 grid grid-cols-3 gap-2">{[10,20,30].map((n,i)=><div key={n} className={(zoneMastery[zone]||0)>=n?"rounded-lg border border-teal-400/30 bg-teal-400/10 p-2":"rounded-lg border border-white/10 bg-black/20 p-2"}><span className="text-[7px] uppercase text-slate-500">Domínio {i+1}</span><b className="block text-[9px] text-white">{i===0?'Rotas Seguras':i===1?'Caçador Local':'Mestre da Zona'}</b><p className="mt-1 text-[7px] text-slate-500">{i===0?'Conhecimento do terreno':i===1?'Eficiência contra criaturas':'Prestígio regional'}</p></div>)}</div>
      </section>
      <section className="rounded-xl border border-orange-400/15 bg-orange-500/5 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><span className="text-[8px] font-black uppercase tracking-[.2em] text-orange-300">Forja de Ruptura</span><b className="mt-1 block text-sm text-white">{cores} Núcleos de Elite · Forja Nv. {forgeLevel}</b><p className="text-[9px] text-slate-500">Elites e bosses alimentam a forja. Melhore drops que você decidiu manter.</p></div><button disabled={cores<3||forgeLevel>=3} onClick={()=>{setCores(c=>c-3);setForgeLevel(l=>l+1)}} className="rounded border border-orange-400/25 px-3 py-2 text-[8px] font-black text-orange-200 disabled:opacity-30">{forgeLevel>=3?'FORJA MÁXIMA':'3 NÚCLEOS · EVOLUIR FORJA'}</button></div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">{gear.slice(0,4).map(item=><div key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-2"><b className="block text-[9px] text-white">{item.name}</b><span className="text-[8px] text-emerald-300">+{item.power} POD</span><button disabled={cores<1||credits<30} onClick={()=>enhanceItem(item)} className="mt-2 w-full rounded border border-orange-400/20 px-2 py-1 text-[7px] font-black text-orange-200 disabled:opacity-30">1 NÚCLEO + 30 SUCATA</button></div>)}</div>
      </section>
            <section id="exp-talents" className="rounded-xl border border-violet-400/15 bg-gradient-to-r from-violet-500/5 to-cyan-500/5 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><span className="text-[8px] font-black uppercase tracking-[.2em] text-violet-300">Talentos do Expedicionário</span><b className="mt-1 block text-sm text-white">${talentPoints} pontos disponíveis</b><p className="text-[9px] text-slate-500">Ganhe pontos com nível e Renome. Eles especializam o mesmo personagem — sem criar outra moeda.</p></div><div className="rounded-lg border border-violet-400/20 bg-black/20 px-3 py-2 text-center"><span className="block text-[7px] uppercase text-slate-500">Investidos</span><b className="text-[10px] text-violet-200">${talentPointsSpent} / ${talentPointsTotal}</b></div></div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">{talentDefs.map(t=>{const lv=talents[t.id]||0;return <div key={t.id} className="rounded-lg border border-white/10 bg-black/25 p-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-lg">{t.icon}</span><b className="text-[10px] text-white">{t.name}</b></div><span className="text-[8px] font-black text-violet-300">Nv. {lv}/5</span></div><p className="mt-2 text-[8px] text-slate-400">{t.desc}</p><div className="mt-2 space-y-1">{t.effects.map((e,i)=><div key={e} className={(lv>i?'text-cyan-200':'text-slate-600')+" text-[7px]"}>{lv>i?'✓':'○'} {e}</div>)}</div><button disabled={talentPoints<1||lv>=5} onClick={()=>spendTalent(t.id)} className="mt-3 w-full rounded border border-violet-400/25 bg-violet-500/5 px-2 py-1.5 text-[7px] font-black text-violet-200 disabled:opacity-30">{lv>=5?'ESPECIALIZAÇÃO MÁXIMA':'INVESTIR 1 PONTO'}</button></div>})}</div>
        <p className="mt-2 text-[7px] text-slate-600">Protótipo: os bônus serão conectados gradualmente ao combate, mapa, Ecos, chefes e Party para evitar progressões soltas.</p>
      </section>
<section className="rounded-xl border border-sky-400/15 bg-sky-500/5 p-3">
        <div className="flex items-center justify-between"><div><span className="text-[8px] font-black uppercase tracking-[.2em] text-sky-300">Laboratório Nexus</span><b className="mt-1 block text-sm text-white">{research} Dados de Pesquisa</b><p className="text-[9px] text-slate-500">Converta sucata em pesquisa e especialize sua expedição.</p></div><button disabled={credits<20} onClick={()=>{setCredits(c=>c-20);setResearch(r=>r+1)}} className="rounded border border-sky-400/25 px-3 py-2 text-[8px] font-black text-sky-200 disabled:opacity-30">20 SUCATA → 1 DADO</button></div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">{[
          {id:'damage',name:'Overclock',desc:'+2 dano por nível'},
          {id:'salvage',name:'Reciclagem',desc:'+1 sucata por abate'},
          {id:'recovery',name:'Blindagem Adaptativa',desc:'-1 desgaste por abate'}
        ].map(u=>{const lv=upgrades[u.id]||0;const cost=2+lv;return <div key={u.id} className="rounded-lg border border-white/10 bg-black/20 p-2"><div className="flex items-center justify-between"><b className="text-[9px] text-white">{u.name}</b><span className="text-[8px] text-sky-300">Nv. {lv}/3</span></div><p className="mt-1 text-[8px] text-slate-500">{u.desc}</p><button disabled={lv>=3||research<cost} onClick={()=>{setResearch(r=>r-cost);setUpgrades(v=>({...v,[u.id]:lv+1}))}} className="mt-2 w-full rounded border border-sky-400/20 px-2 py-1 text-[7px] font-black text-sky-200 disabled:opacity-30">{lv>=3?'MÁXIMO':cost+' DADOS · PESQUISAR'}</button></div>})}</div>
      </section>
      <section className="rounded-xl border border-fuchsia-400/15 bg-gradient-to-r from-fuchsia-500/5 to-violet-500/5 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><span className="text-[8px] font-black uppercase tracking-[.2em] text-fuchsia-300">Renome da Expedição</span><b className="mt-1 block text-sm text-white">{renownTier} · {renown} REN</b><p className="text-[9px] text-slate-500">Conquistas permanentes do protótipo. Não resetam como missões diárias.</p></div><div className="rounded-lg border border-fuchsia-400/20 bg-black/20 px-3 py-2 text-center"><span className="block text-[7px] uppercase text-slate-500">Próximo título</span><b className="text-[9px] text-fuchsia-200">{renown<10?'Batedor':renown<30?'Operador':renown<60?'Vanguarda':'Máximo atual'}</b></div></div>
        <div className="mt-3 grid gap-2 md:grid-cols-4">{milestones.map(m=>{const done=m.value>=m.target;const claimed=!!milestoneClaims[m.id];return <div key={m.id} className="rounded-lg border border-white/10 bg-black/20 p-2"><b className="text-[9px] text-white">{m.title}</b><span className="mt-1 block text-[7px] text-slate-500">{Math.min(m.value,m.target)}/{m.target}</span><button disabled={!done||claimed} onClick={()=>{setMilestoneClaims(c=>({...c,[m.id]:true}));setRenown(r=>r+m.reward)}} className="mt-2 w-full rounded border border-fuchsia-400/20 px-2 py-1 text-[7px] font-black text-fuchsia-200 disabled:opacity-30">{claimed?'CONCLUÍDA':done?'+'+m.reward+' REN':'EM PROGRESSO'}</button></div>})}</div>
      </section>
      <section className="rounded-xl border border-cyan-400/15 bg-[#061019] p-3">
        <div className="flex items-center justify-between"><div><span className="text-[8px] font-black uppercase tracking-[.2em] text-cyan-300">Missões da Expedição</span><p className="mt-1 text-[9px] text-slate-500">Objetivos curtos para dar direção ao farm diário.</p></div><span className="text-[8px] text-slate-500">{missions.filter(m=>m.value>=m.target).length}/4 prontas</span></div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">{missions.map(m=>{const done=m.value>=m.target;const claimed=!!missionClaims[m.id];return <div key={m.id} className="rounded-lg border border-white/10 bg-black/20 p-2"><div className="flex items-start justify-between gap-2"><div><b className="text-[10px] text-white">{m.title}</b><p className="text-[8px] text-slate-500">{m.desc}</p></div><button disabled={!done||claimed} onClick={()=>{setMissionClaims(c=>({...c,[m.id]:true}));if(m.id==='gear')setPotions(p=>p+1);else setCredits(c=>c+(m.id==='boss'?35:m.id==='hunt'?20:15))}} className="rounded border border-cyan-400/25 px-2 py-1 text-[7px] font-black text-cyan-200 disabled:opacity-30">{claimed?'RESGATADA':done?'RESGATAR':Math.min(m.value,m.target)+'/'+m.target}</button></div><div className="mt-2 h-1 overflow-hidden rounded bg-white/5"><div className="h-full bg-cyan-400 transition-all" style={{width:Math.min(100,m.value/m.target*100)+'%'}} /></div><span className="mt-1 block text-[7px] text-emerald-300">Recompensa: {m.reward}</span></div>})}</div>
      </section>
      <section className="rounded-xl border border-amber-300/20 bg-gradient-to-r from-amber-500/10 via-violet-500/5 to-cyan-500/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><span className="text-[8px] font-black uppercase tracking-[.2em] text-amber-300">Sequência de Expedição</span><b className="mt-1 block text-sm text-white">{streakDay} dias em sequência</b><p className="text-[9px] text-slate-500">Entre diariamente para manter a sequência e melhorar o baú do 7º dia.</p></div><button disabled={dailyClaimed} onClick={()=>{setDailyClaimed(true);setCredits(c=>c+15);setPotions(p=>p+1)}} className="rounded-lg border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-[9px] font-black text-amber-200 disabled:opacity-40">{dailyClaimed?'RESGATADO':'RESGATAR DIA '+streakDay}</button></div>
        <div className="mt-3 grid grid-cols-7 gap-1">{[1,2,3,4,5,6,7].map(d=><div key={d} className={(d<streakDay || (d===streakDay&&dailyClaimed)?'border-emerald-400/30 bg-emerald-500/10 ':d===streakDay?'border-amber-300/50 bg-amber-500/10 ':'border-white/10 bg-black/20 ')+"rounded-lg border p-2 text-center"}><span className="block text-[7px] uppercase text-slate-500">Dia {d}</span><b className="text-[9px] text-white">{d===7?'Baú':'+'+(8+d*3)}</b><span className="block text-[6px] text-slate-500">{d===7?'Especial':'Sucata'}</span></div>)}</div>
      </section>
      <section className="rounded-xl border border-emerald-400/15 bg-emerald-500/5 p-3">
        <div className="flex items-center justify-between"><div><span className="text-[8px] font-black uppercase tracking-[.2em] text-emerald-300">Codex de Criaturas</span><b className="mt-1 block text-sm text-white">Pesquisa de Campo</b><p className="text-[9px] text-slate-500">Quanto mais você caça uma espécie, mais informações permanentes descobre sobre ela.</p></div><span className="text-[8px] text-slate-500">{Object.keys(codex).length}/{enemies.length} catalogadas</span></div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">{enemies.map(e=>{const seen=codex[e.name]||0;const tier=seen>=20?3:seen>=8?2:seen>=1?1:0;return <div key={e.name} className="rounded-lg border border-white/10 bg-black/20 p-2"><div className="flex items-center justify-between"><b className="text-[9px] text-white">{tier?e.name:'???'}</b><span className="text-[8px] text-emerald-300">Pesquisa {tier}/3</span></div><p className="mt-1 text-[8px] text-slate-500">{tier===0?'Espécie ainda não registrada.':tier===1?'Habitat e resistência identificados.':tier===2?'Padrões de combate analisados.':'Registro completo · fraqueza catalogada.'}</p><div className="mt-2 h-1 overflow-hidden rounded bg-white/5"><div className="h-full bg-emerald-400" style={{width:Math.min(100,seen/20*100)+'%'}} /></div></div>})}</div>
      </section>
      <section className="rounded-xl border border-yellow-400/15 bg-yellow-500/5 p-3">
        <div className="flex items-center justify-between"><div><span className="text-[8px] font-black uppercase tracking-[.2em] text-yellow-300">Contratos de Caça</span><p className="mt-1 text-[9px] text-slate-500">Recompensas opcionais baseadas no que você já encontrou no mapa.</p></div><span className="text-[8px] text-slate-500">Quadro local</span></div>
        <div className="mt-3 grid gap-2 md:grid-cols-3">{enemies.map((e,i)=>{const need=6+i*3;const done=(codex[e.name]||0)>=need;const claimed=!!bounties[e.name];return <div key={e.name} className="rounded-lg border border-white/10 bg-black/20 p-2"><b className="text-[9px] text-white">Caçar {e.name}</b><p className="text-[8px] text-slate-500">{Math.min(codex[e.name]||0,need)}/{need} abatidos</p><button disabled={!done||claimed} onClick={()=>{setBounties(b=>({...b,[e.name]:true}));setCredits(c=>c+20+i*10);setRenown(r=>r+2+i)}} className="mt-2 w-full rounded border border-yellow-400/20 px-2 py-1 text-[7px] font-black text-yellow-200 disabled:opacity-30">{claimed?'CONTRATO CONCLUÍDO':done?'COLETAR RECOMPENSA':'EM CAÇA'}</button></div>})}</div>
      </section>
      {raidSignal && <section id="exp-party" className="rounded-xl border border-orange-400/25 bg-gradient-to-r from-orange-500/10 to-red-500/5 p-3"><div className="flex flex-wrap items-center justify-between gap-3"><div><span className="text-[8px] font-black uppercase tracking-[.2em] text-orange-300">Sinal de Raid Detectado</span><b className="mt-1 block text-sm text-white">Entidade de Ruptura · PARTY</b><p className="mt-1 text-[9px] text-slate-400">A assinatura excede a capacidade de um único agente. Conteúdo planejado para 2–4 jogadores.</p></div><button disabled className="rounded-lg border border-orange-400/25 bg-orange-500/10 px-4 py-2 text-[8px] font-black text-orange-200 opacity-60">REQUER PARTY · 2/4+</button></div><div className="mt-3 grid grid-cols-4 gap-2">{[1,2,3,4].map(i=><div key={i} className={(i===1?'border-cyan-400/30 text-cyan-200':'border-dashed border-white/10 text-slate-700')+" rounded-lg border p-2 text-center text-[8px]"}>{i===1?'VOCÊ':'AGUARDANDO'}</div>)}</div></section>}
      <section id="exp-map" className="rounded-xl border border-indigo-400/15 bg-[#070a18] p-3">
        <div className="flex items-center justify-between"><div><span className="text-[8px] font-black uppercase tracking-[.2em] text-indigo-300">Mapa da Zona</span><b className="mt-1 block text-sm text-white">{zoneNames[zone-1]}</b></div><span className="text-[8px] text-slate-500">{mapNode}% explorado</span></div>
        <div className="relative mt-4 h-16"><div className="absolute left-4 right-4 top-7 h-px bg-indigo-400/25" />{[0,25,50,75,100].map((n,i)=><div key={n} className="absolute top-4 -translate-x-1/2 text-center" style={{left:(8+i*21)+'%'}}><div className={(mapNode>=n?'border-indigo-300 bg-indigo-400/20 text-indigo-100':'border-white/10 bg-black text-slate-700')+" mx-auto flex h-7 w-7 items-center justify-center rounded-full border text-[9px]"}>{i===4?'☠':i+1}</div><span className="mt-1 block text-[6px] uppercase text-slate-600">{i===4?'Boss':'Setor'}</span></div>)}</div>
        {worldBoss ? <div className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 p-3"><div className="flex items-center justify-between gap-3"><div><span className="text-[7px] font-black uppercase text-red-300">Boss encontrado no mapa</span><b className="block text-xs text-white">{worldBoss.name}</b></div><button onClick={()=>{const dmg=28+power+upgrades.damage*4+(talents.combat||0)*3;const next=worldBoss.hp-dmg;if(next<=0){setWorldBoss(null);setMapNode(0);setCredits(c=>c+60+zone*10);setDrops(d=>d+3);setRenown(r=>r+5);setCores(c=>c+2)}else{setWorldBoss({...worldBoss,hp:next});setHp(h=>Math.max(1,h-Math.max(1,10+zone*2-Math.floor((talents.survival||0)/2))))}}} className="rounded border border-red-400/30 px-3 py-2 text-[8px] font-black text-red-200">ATACAR · {worldBoss.hp}/{worldBoss.max}</button></div><div className="mt-2 h-1.5 overflow-hidden rounded bg-black/60"><div className="h-full bg-red-400 transition-all" style={{width:(worldBoss.hp/worldBoss.max*100)+'%'}} /></div></div> : <p className="mt-1 text-[8px] text-slate-600">Explore a região durante o farm. O último ponto pode esconder uma ameaça maior.</p>}
      </section>
      <section className={elite ? "rounded-xl border border-rose-400/30 bg-gradient-to-r from-rose-500/10 to-orange-500/5 p-3" : "rounded-xl border border-white/10 bg-white/[.02] p-3"}>
        <div className="flex flex-wrap items-center justify-between gap-2"><div><span className="text-[8px] font-black uppercase tracking-[.2em] text-rose-300">Ameaça de Elite</span>{elite ? <><b className="mt-1 block text-sm text-white">{elite.name}</b><p className="text-[9px] text-slate-500">{elite.trait} · inimigo opcional de alto risco.</p></> : <p className="mt-1 text-[9px] text-slate-500">Assinaturas especiais podem surgir durante o farm.</p>}</div>{elite ? <button onClick={()=>{const dmg=22+power+upgrades.damage*3+(talents.combat||0)*2;const next=elite.hp-dmg;if(next<=0){setElite(null);setEliteKills(k=>k+1);setCredits(c=>c+30+zone*5);setDrops(d=>d+2);setCores(c=>c+1)}else{setElite({...elite,hp:next});setHp(h=>Math.max(1,h-Math.max(1,7+zone-Math.floor((talents.survival||0)/2))))}}} className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-[9px] font-black text-rose-200">ENFRENTAR · {elite.hp}/{elite.max}</button> : <span className="text-[8px] text-slate-600">{eliteKills} abatidos</span>}</div>
        {elite && <div className="mt-2 h-1.5 overflow-hidden rounded bg-black/50"><div className="h-full bg-rose-400 transition-all" style={{width:(elite.hp/elite.max*100)+'%'}} /></div>}
      </section>
      <div className="grid gap-3 md:grid-cols-[.8fr_1.2fr]">
        <section className="rounded-xl border border-cyan-400/15 bg-cyan-500/5 p-3"><span className="text-[8px] font-black uppercase tracking-widest text-cyan-300">Sinergia ativa</span><b className="mt-1 block text-sm text-white">{synergy}</b><p className="mt-1 text-[9px] text-slate-500">{synergyText}</p><div className="mt-2 h-1 overflow-hidden rounded bg-black/50"><div className="h-full bg-cyan-400" style={{width:Math.min(100,25+power*2)+'%'}} /></div></section>
        <section className={event ? "rounded-xl border border-amber-300/30 bg-amber-500/10 p-3" : "rounded-xl border border-white/10 bg-white/[.02] p-3"}><div className="flex items-center justify-between"><span className="text-[8px] font-black uppercase tracking-widest text-amber-300">Evento de campo</span><span className="text-[8px] text-slate-500">{event ? 'DECISÃO DISPONÍVEL' : 'Escaneando setor...'}</span></div>{event ? <><b className="mt-1 block text-sm text-white">{event.title}</b><p className="mt-1 text-[9px] text-slate-400">{event.body}</p><div className="mt-2 flex gap-2"><button onClick={()=>{if(event.kind==='risk'){setCredits(c=>c+18);setHp(h=>Math.max(1,h-12))}else if(event.kind==='loot'){setCredits(c=>c+12);setDrops(d=>d+1)}else{setHp(h=>Math.min(maxHp,h+22));setPotions(p=>p+1)}setEvent(null)}} className="rounded border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-[9px] font-bold text-amber-200">INTERAGIR</button><button onClick={()=>setEvent(null)} className="rounded border border-white/10 px-3 py-1 text-[9px] text-slate-400">IGNORAR</button></div></> : <div className="mt-2 h-1 overflow-hidden rounded bg-black/50"><div className="h-full bg-amber-300/60 transition-all" style={{width:(eventMeter/7*100)+'%'}} /></div>}</section>
      </div>
      <section className="rounded-xl border border-violet-400/15 bg-violet-500/5 p-3">
        <div className="flex items-center justify-between"><div><span className="text-[8px] font-black uppercase tracking-widest text-violet-300">Esquadrão de cartas</span><p className="mt-1 text-[9px] text-slate-500">As quatro cartas carregam habilidades automaticamente durante o farm.</p></div><span className="rounded-full border border-violet-400/20 px-2 py-1 text-[8px] text-violet-300">4/4 ATIVAS</span></div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">{companions.map((c,i)=><div key={c.name} className="rounded-lg border border-white/10 bg-black/20 p-2"><div className="flex items-center justify-between"><b className="text-[9px] text-white">{c.name}</b><span className="text-[8px] text-violet-300">{Math.round(cardCharge[i])}%</span></div><span className="text-[7px] uppercase text-slate-500">{c.role}</span><p className="mt-1 text-[8px] text-slate-400">{c.effect}</p></div>)}</div>
      </section>
      <div className="grid gap-3 md:grid-cols-3">
        <section className="rounded-xl border border-emerald-400/15 bg-emerald-500/5 p-3"><span className="text-[8px] font-black uppercase text-emerald-400">Sobrevivência</span><div className="mt-2 h-2 overflow-hidden rounded-full bg-black/60"><div className="h-full bg-emerald-400 transition-all" style={{width: Math.min(100,(effectiveHp/maxHp)*100)+'%'}} /></div><div className="mt-2 flex items-center justify-between text-[9px] text-slate-400"><span>{effectiveHp}/{maxHp} HP</span><button disabled={potions<=0 || effectiveHp>=maxHp} onClick={()=>{setPotions(p=>p-1);setHp(maxHp)}} className="rounded border border-emerald-400/25 px-2 py-1 text-emerald-300 disabled:opacity-30">Usar reparo ({potions})</button></div></section>
        <section className="rounded-xl border border-amber-400/15 bg-amber-500/5 p-3"><span className="text-[8px] font-black uppercase text-amber-400">Oficina de campo</span><b className="mt-1 block text-sm text-white">{credits} sucata</b><button disabled={credits<25} onClick={()=>{setCredits(c=>c-25);setPotions(p=>p+1)}} className="mt-2 w-full rounded border border-amber-400/25 px-2 py-1 text-[9px] font-bold text-amber-200 disabled:opacity-30">25 · Fabricar reparo</button></section>
        <section className="rounded-xl border border-cyan-400/15 bg-cyan-500/5 p-3"><span className="text-[8px] font-black uppercase text-cyan-400">Objetivo da área</span><b className="mt-1 block text-sm text-white">{Math.min(kills,zone*10)}/{zone*10} eliminações</b><p className="mt-2 text-[9px] text-slate-500">{bossDefeated ? 'Guardião derrotado. Área liberada.' : kills>=zone*10 ? 'Guardião localizado.' : 'Continue o auto-farm para localizar o Guardião.'}</p></section>
      </div>
      <div className="grid gap-3 lg:grid-cols-[1.3fr_.7fr]">
        <section id="exp-inventory" className="rounded-xl border border-white/10 bg-[#060b16] p-4">
          <div className="flex items-center justify-between"><b className="text-sm uppercase text-white">Drops e equipamento</b><span className="text-[9px] text-cyan-300">{drops} fragmentos</span></div>
          <p className="mt-1 text-[10px] text-slate-500">A cada 5 eliminações cai um item de teste. Equipe para aumentar o dano.</p>
          <div className="mt-3 grid grid-cols-4 gap-2">{Object.entries(equipped).map(([slot,item])=><div key={slot} className={item ? "min-h-20 rounded-lg border border-cyan-400/30 bg-cyan-400/10 p-2" : "min-h-20 rounded-lg border border-dashed border-white/15 bg-black/20 p-2"}><span className="block text-[8px] font-black uppercase text-slate-500">{slot}</span>{item ? <><span className="mt-2 block text-[9px] font-bold text-cyan-200">{item.name}</span><span className="text-[8px] text-emerald-300">+{item.power} POD</span></> : <span className="mt-3 block text-center text-xl text-slate-700">+</span>}</div>)}</div>
          <div className="mt-3 border-t border-white/5 pt-3"><p className="mb-2 text-[9px] font-black uppercase text-slate-500">Mochila</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{gear.length ? gear.map(item => <button key={item.id} onClick={()=>equipItem(item)} className={'rounded-lg border bg-violet-500/10 p-2 text-left transition hover:brightness-125 '+rarityClass(item.rarity)}><span className="block text-[8px] font-black uppercase">{item.rarity}</span><span className="block text-[10px] font-bold">{item.name}</span><span className="text-[8px] uppercase text-slate-500">{item.slot}</span><span className="block text-[9px] text-emerald-300">+{item.power} POD · Equipar</span></button><div className="mt-1 grid grid-cols-2 gap-1"><button onClick={()=>salvageItem(item)} className="rounded border border-white/10 px-1 py-1 text-[7px] text-slate-500 hover:text-orange-200">RECICLAR</button><button onClick={()=>listMarketItem(item)} className="rounded border border-cyan-400/15 px-1 py-1 text-[7px] text-cyan-300">VENDER</button></div>) : <div className="col-span-full rounded-lg border border-dashed border-white/10 p-3 text-center text-[10px] text-slate-500">Continue farmando para encontrar equipamento.</div>}</div></div>
        </section>
        <section className="rounded-xl border border-rose-400/20 bg-[#100914] p-4">
          <b className="text-sm uppercase text-rose-200">Guardião da Zona</b><p className="mt-1 text-[10px] text-slate-500">Teste de boss disponível a cada 10 eliminações.</p>
          {kills >= zone*10 ? (bossDefeated ? <button disabled={zone>=5} onClick={()=>{const next=Math.min(5,zone+1);setZone(next);setBossDefeated(false);setBossHp(null);setEnemyHp(Math.round(enemies[enemyIndex].max*(1+(next-1)*.28)));setAreaNotice(zoneNames[next-1]);window.setTimeout(()=>setAreaNotice(null),1600)}} className="mt-3 w-full rounded-lg border border-emerald-400/35 bg-emerald-500/10 p-3 text-xs font-black text-emerald-200 disabled:opacity-40">{zone>=5?'EXPEDIÇÃO CONCLUÍDA':'AVANÇAR PARA PRÓXIMA ZONA'}</button> : <button onClick={()=>{const max=120+(zone-1)*70;const hp=bossHp??max;const next=hp-(18+power);if(next<=0){setBossHp(null);setBossDefeated(true); setGuardiansDefeated(v=>v+1);setDrops(d=>d+3);setPower(p=>p+2)}else setBossHp(next)}} className="mt-3 w-full rounded-lg border border-rose-400/35 bg-rose-500/10 p-3 text-xs font-black text-rose-200">ATACAR BOSS · {bossHp??(120+(zone-1)*70)}/{120+(zone-1)*70} HP</button>) : <div className="mt-3 rounded-lg border border-dashed border-white/10 p-3 text-center text-[10px] text-slate-500">Desbloqueia em {Math.max(0,zone*10-kills)} eliminações</div>}
        </section>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-[#060b16] p-4"><div className="flex gap-2"><button onClick={()=>setRunning(v=>!v)} className="flex items-center gap-2 rounded-lg bg-cyan-300 px-4 py-2 text-xs font-black text-slate-950">{running?<Pause size={14}/>:<Play size={14}/>} {running?'Pausar':'Continuar'}</button><button onClick={reset} className="flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs text-slate-200"><RotateCcw size={14}/> Reiniciar</button></div><p className="mt-3 text-[10px] text-amber-300">Não altera XP, NEX, NXA ou inventário reais.</p></section>
        <section className="rounded-xl border border-white/10 bg-[#060b16] p-4"><div className="flex items-center justify-between"><b className="flex items-center gap-2 text-sm text-white"><Users size={15}/> Party · 1/4</b><span className="text-[9px] text-amber-300">planejada</span></div><div className="mt-3 grid grid-cols-3 gap-2">{[2,3,4].map(n=><div key={n} className="rounded-lg border border-dashed border-white/20 p-2 text-center text-[9px] text-slate-500">Slot {n} vazio</div>)}</div></section>
      </div>
    </div>
  );
};

export const Games: React.FC<GamesProps> = ({ onNavigate }) => {
  const [showExpedition, setShowExpedition] = useState(false);
  if (showExpedition) return <ExpeditionPrototype onClose={() => setShowExpedition(false)} />;
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

      <div className="grid gap-4 lg:grid-cols-3">
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
        <button type="button" onClick={() => setShowExpedition(true)} className="group relative min-h-[310px] overflow-hidden rounded-[22px] border border-violet-400/35 bg-[#07101b] p-5 text-left shadow-[0_24px_65px_rgba(0,0,0,.32)] transition hover:-translate-y-1 hover:border-violet-300/70 sm:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,rgba(168,85,247,.20),transparent_35%),linear-gradient(135deg,#07101b,#0b1725)]" />
          <div className="relative z-10 flex min-h-[270px] flex-col justify-between">
            <div><div className="flex items-center gap-2"><span className="font-mono text-[10px] font-black uppercase tracking-[.16em] text-violet-300">NEXA · EXPEDITION</span><span className="rounded-full border border-amber-400/25 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-300">Protótipo</span></div><h2 className="mt-2 font-heading text-[27px] font-black uppercase text-white">Expedition</h2><p className="mt-3 text-[12px] leading-relaxed text-slate-300">Farm automático persistente, progressão, drops, quatro companheiros e estrutura preparada para Party 1–4.</p><div className="mt-4 flex flex-wrap gap-1.5">{['Idle RPG','Auto-farm','4 cartas','Party 1–4'].map(x=><span key={x} className="rounded-full border border-violet-400/20 bg-black/25 px-2.5 py-1 text-[9px] font-bold text-slate-200">{x}</span>)}</div></div>
            <span className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-400 px-4 font-heading text-[10px] font-black uppercase text-slate-950">Testar protótipo <ArrowRight className="h-4 w-4"/></span>
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
