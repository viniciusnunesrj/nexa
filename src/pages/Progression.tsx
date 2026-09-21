import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import { ProgressionService } from '../services/progressionService';
import { LEVEL_REWARDS, MAX_GAME_LEVEL, getXpRequiredForLevel, SLOTS_CONFIG } from '../config/levelConfig';
import {
  TrendingUp,
  Award,
  Zap,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  Clock,
  ChevronRight,
  Flame,
} from 'lucide-react';

interface ProgressionProps {
  onNavigate: (page: string) => void;
}

interface DueloReward {
  request_id: string;
  outcome: 'VICTORY' | 'DEFEAT' | 'DRAW';
  nex_gained: number;
  xp_gained: number;
  nxa_gained: number;
  created_at: string;
}

const dueloOutcomes = {
  VICTORY: { label: 'Vitória', color: 'text-cyan-300' },
  DEFEAT: { label: 'Derrota', color: 'text-rose-400' },
  DRAW: { label: 'Empate', color: 'text-slate-300' },
};
const formatDueloNumber = (value: number) => value.toLocaleString('pt-BR');

const DueloPveStats: React.FC<{ ownerId: string }> = ({ ownerId }) => {
  const [records, setRecords] = useState<DueloReward[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setStatus('loading');
      try {
        const rewards: DueloReward[] = [];
        // Fetch every page: the API row limit must not truncate lifetime totals.
        while (!controller.signal.aborted) {
          const { data, error } = await supabase
            .from('duelo_nexal_rewards')
            .select('request_id,outcome,nex_gained,xp_gained,nxa_gained,created_at')
            .eq('owner_id', ownerId)
            .order('created_at', { ascending: false })
            .order('request_id', { ascending: false })
            .range(rewards.length, rewards.length + 499)
            .abortSignal(controller.signal);
          if (error) throw error;
          if (!data?.length) break;
          rewards.push(...(data as DueloReward[]));
        }
        if (!controller.signal.aborted) {
          setRecords(rewards);
          setStatus('ready');
        }
      } catch {
        if (!controller.signal.aborted) setStatus('error');
      }
    };
    void load();
    return () => controller.abort();
  }, [ownerId, attempt]);

  const totals = records.reduce((sum, record) => ({
    ...sum,
    [record.outcome]: sum[record.outcome] + 1,
    nex: sum.nex + Number(record.nex_gained),
    xp: sum.xp + Number(record.xp_gained),
    nxa: sum.nxa + Number(record.nxa_gained),
  }), { VICTORY: 0, DEFEAT: 0, DRAW: 0, nex: 0, xp: 0, nxa: 0 });
  const stats = [
    ['Partidas disputadas', formatDueloNumber(records.length)],
    ['Vitórias', formatDueloNumber(totals.VICTORY)],
    ['Derrotas', formatDueloNumber(totals.DEFEAT)],
    ['Empates', formatDueloNumber(totals.DRAW)],
    ['Taxa de vitória', `${(records.length ? totals.VICTORY / records.length * 100 : 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`],
    ['NEX conquistado', formatDueloNumber(totals.nex)],
    ['XP conquistado', formatDueloNumber(totals.xp)],
    ...(totals.nxa > 0 ? [['NXA conquistado', formatDueloNumber(totals.nxa)]] : []),
  ];

  return (
    <section aria-labelledby="duelo-pve-title" className="p-5 sm:p-6 rounded-3xl bg-[#0b0b12] border border-cyan-400/20 space-y-5">
      <div>
        <p className="text-xs font-mono text-cyan-400 uppercase tracking-wider">ESTATÍSTICAS PVE</p>
        <h2 id="duelo-pve-title" className="font-heading text-2xl font-black text-white mt-1">NEXUS DUEL</h2>
      </div>
      {status === 'loading' ? (
        <p role="status" className="text-xs font-mono text-slate-400">Carregando histórico do NEXUS DUEL...</p>
      ) : status === 'error' ? (
        <div role="alert" className="text-xs font-mono text-slate-400 space-y-3">
          <p>Não foi possível carregar o histórico do NEXUS DUEL.</p>
          <button onClick={() => setAttempt(value => value + 1)} className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 transition-colors">
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {stats.map(([label, value]) => (
              <div key={label} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 min-w-0">
                <dt className="text-[10px] font-mono text-slate-400 uppercase">{label}</dt>
                <dd className="font-heading text-xl sm:text-2xl font-black text-cyan-300 break-words">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="pt-4 border-t border-white/10 space-y-3">
            <h3 className="text-xs font-mono text-slate-300 font-bold tracking-wider">PARTIDAS RECENTES</h3>
            {records.length === 0 ? (
              <p className="text-xs font-mono text-slate-400">Nenhuma partida PVE registrada. Jogue NEXUS DUEL para acompanhar seus resultados aqui.</p>
            ) : (
              <ul className="space-y-2">
                {records.slice(0, 5).map(record => (
                  <li key={record.request_id} className="p-3 rounded-xl bg-black/25 border border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-mono">
                    <span className={`font-bold ${dueloOutcomes[record.outcome].color}`}>{dueloOutcomes[record.outcome].label}</span>
                    <span className="text-cyan-300">+{formatDueloNumber(Number(record.nex_gained))} NEX <span className="text-slate-400 mx-1">/</span> +{formatDueloNumber(Number(record.xp_gained))} XP</span>
                    <time dateTime={record.created_at} className="text-slate-400 text-[11px]">{new Date(record.created_at).toLocaleString('pt-BR')}</time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
};



interface BattleRun {
  id: string; outcome: 'VICTORY' | 'DEFEAT' | 'DRAW'; rewards: { nex_gained?: number; xp_gained?: number; nxa_gained?: number } | null; completed_at: string | null; created_at: string;
}
const BattleStats: React.FC<{ ownerId: string }> = ({ ownerId }) => {
  const [records, setRecords] = useState<BattleRun[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setStatus('loading');
      try {
        const rows: BattleRun[] = [];
        while (!controller.signal.aborted) {
          const { data, error } = await supabase.from('battle_runs')
            .select('id,outcome,rewards,completed_at,created_at')
            .eq('owner_id', ownerId).eq('status','COMPLETED')
            .order('completed_at',{ascending:false}).order('id',{ascending:false})
            .range(rows.length, rows.length + 499).abortSignal(controller.signal);
          if (error) throw error;
          if (!data?.length) break;
          rows.push(...(data as BattleRun[]));
        }
        if (!controller.signal.aborted) { setRecords(rows); setStatus('ready'); }
      } catch { if (!controller.signal.aborted) setStatus('error'); }
    };
    void load(); return () => controller.abort();
  }, [ownerId, attempt]);
  const wins=records.filter(r=>r.outcome==='VICTORY').length, losses=records.filter(r=>r.outcome==='DEFEAT').length, draws=records.filter(r=>r.outcome==='DRAW').length;
  const nex=records.reduce((n,r)=>n+Number(r.rewards?.nex_gained||0),0), xp=records.reduce((n,r)=>n+Number(r.rewards?.xp_gained||0),0), nxa=records.reduce((n,r)=>n+Number(r.rewards?.nxa_gained||0),0);
  const stats=[['Partidas',records.length],['Vitórias',wins],['Derrotas',losses],['Empates',draws],['Taxa de vitória',records.length?Math.round(wins/records.length*100)+'%':'0%'],['NEX conquistado',nex],['XP conquistado',xp],...(nxa>0?[['NXA conquistado',nxa]]:[])];
  return <section className="p-5 sm:p-6 rounded-3xl bg-[#0b0b12] border border-emerald-400/20 space-y-5">
    <div><p className="text-xs font-mono text-emerald-300 uppercase tracking-wider">RIFT BATTLE · PVE</p><h2 className="font-heading text-2xl font-black text-white mt-1">NEXA: RIFT BATTLE</h2></div>
    {status==='loading'?<p role="status" className="text-xs font-mono text-slate-400">Carregando histórico do RIFT BATTLE...</p>:status==='error'?<div role="alert" className="space-y-3 text-xs font-mono text-slate-400"><p>Não foi possível carregar o histórico do RIFT BATTLE.</p><button onClick={()=>setAttempt(v=>v+1)} className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">Tentar novamente</button></div>:<>
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">{stats.map(([label,value])=><div key={String(label)} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10"><dt className="text-[10px] font-mono text-slate-400 uppercase">{label}</dt><dd className="font-heading text-xl font-black text-emerald-300">{typeof value==='number'?formatDueloNumber(value):value}</dd></div>)}</dl>
    <div className="pt-4 border-t border-white/10 space-y-3"><h3 className="text-xs font-mono text-slate-300 font-bold tracking-wider">PARTIDAS RECENTES</h3>{records.length===0?<p className="text-xs font-mono text-slate-400">Nenhuma partida do RIFT BATTLE registrada.</p>:<ul className="space-y-2">{records.slice(0,5).map(r=><li key={r.id} className="p-3 rounded-xl bg-black/25 border border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-mono"><span className={`font-bold ${dueloOutcomes[r.outcome].color}`}>{dueloOutcomes[r.outcome].label}</span><span className="text-emerald-300">+{formatDueloNumber(Number(r.rewards?.nex_gained||0))} NEX / +{formatDueloNumber(Number(r.rewards?.xp_gained||0))} XP</span><time className="text-slate-400 text-[11px]">{new Date(r.completed_at||r.created_at).toLocaleString('pt-BR')}</time></li>)}</ul>}</div></>}
  </section>;
};

interface DueloPvpReward {
  room_id: string; outcome: 'VICTORY' | 'DEFEAT' | 'DRAW' | 'FORFEIT';
  nex_gained: number; xp_gained: number; rewarded: boolean; created_at: string;
}

const DueloPvpStats: React.FC<{ ownerId: string }> = ({ ownerId }) => {
  const [records, setRecords] = useState<DueloPvpReward[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setStatus('loading');
      try {
        const rows: DueloPvpReward[] = [];
        while (!controller.signal.aborted) {
          const { data, error } = await supabase.from('duelo_nexal_pvp_rewards')
            .select('room_id,outcome,nex_gained,xp_gained,rewarded,created_at')
            .eq('player_id', ownerId).order('created_at', { ascending: false }).order('room_id', { ascending: false })
            .range(rows.length, rows.length + 499).abortSignal(controller.signal);
          if (error) throw error;
          if (!data?.length) break;
          rows.push(...(data as DueloPvpReward[]));
        }
        if (!controller.signal.aborted) { setRecords(rows); setStatus('ready'); }
      } catch { if (!controller.signal.aborted) setStatus('error'); }
    };
    void load(); return () => controller.abort();
  }, [ownerId, attempt]);
  const completed = records.filter(r => r.outcome !== 'FORFEIT');
  const wins = completed.filter(r => r.outcome === 'VICTORY').length;
  const losses = completed.filter(r => r.outcome === 'DEFEAT').length;
  const draws = completed.filter(r => r.outcome === 'DRAW').length;
  const forfeits = records.filter(r => r.outcome === 'FORFEIT').length;
  const nex = records.reduce((n,r) => n + Number(r.nex_gained || 0), 0);
  const xp = records.reduce((n,r) => n + Number(r.xp_gained || 0), 0);
  return <section className="p-5 sm:p-6 rounded-3xl bg-[#0b0b12] border border-purple-400/20 space-y-5">
    <div><p className="text-xs font-mono text-purple-300 uppercase tracking-wider">NEXA: NEXUS DUEL · PVP</p><h2 className="font-heading text-2xl font-black text-white mt-1">NEXUS DUEL · PVP</h2></div>
    {status==='loading'?<p role="status" className="text-xs font-mono text-slate-400">Carregando histórico PvP...</p>:status==='error'?<div role="alert" className="space-y-3 text-xs font-mono text-slate-400"><p>Não foi possível carregar o histórico PvP.</p><button onClick={()=>setAttempt(v=>v+1)} className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300">Tentar novamente</button></div>:<>
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[['Partidas concluídas',completed.length],['Vitórias',wins],['Derrotas',losses],['Empates',draws],...(forfeits>0?[['Desistências',forfeits]]:[]),['Taxa de vitória',completed.length ? Math.round(wins/completed.length*100)+'%' : '0%'],['NEX conquistado',nex],['XP conquistado',xp],['Partidas recompensadas',records.filter(r=>r.rewarded).length]].map(([label,value]) =>
        <div key={String(label)} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10"><dt className="text-[10px] font-mono text-slate-400 uppercase">{label}</dt><dd className="font-heading text-xl font-black text-purple-300">{value}</dd></div>)}
    </dl>
    <div className="pt-4 border-t border-white/10 space-y-3"><h3 className="text-xs font-mono text-slate-300 font-bold tracking-wider">PARTIDAS RECENTES</h3>{records.length===0?<p className="text-xs font-mono text-slate-400">Nenhuma partida PvP registrada.</p>:<ul className="space-y-2">{records.slice(0,5).map(r=><li key={r.room_id} className="p-3 rounded-xl bg-black/25 border border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs font-mono"><span className={`font-bold ${r.outcome==='VICTORY'?'text-cyan-300':r.outcome==='DEFEAT'?'text-rose-400':'text-slate-300'}`}>{r.outcome==='VICTORY'?'Vitória':r.outcome==='DEFEAT'?'Derrota':r.outcome==='DRAW'?'Empate':'Desistência'}</span><span className="text-purple-300">+{r.nex_gained} NEX / +{r.xp_gained} XP</span><time className="text-slate-400 text-[11px]">{new Date(r.created_at).toLocaleString('pt-BR')}</time></li>)}</ul>}</div><p className="text-[11px] font-mono text-slate-500">PvP e PvE usam o mesmo nível de Piloto. O limite anti-farm continua valendo apenas para recompensas repetidas contra o mesmo adversário.</p>
  </>}
  </section>;
};

export const Progression: React.FC<ProgressionProps> = ({ onNavigate }) => {
  const { user, currentUser } = useAuth();
  const { unlockedSlots, activeSynthesizingCardsCount } = useGameState();

  const [activeTab, setActiveTab] = useState<'timeline' | 'slots' | 'history'>('timeline');

  const history = ProgressionService.getLevelUpHistory(user.id);
  const progressionMilestones = Object.values(LEVEL_REWARDS).sort((a, b) => a.level - b.level);
  const nextMilestone = progressionMilestones.find((reward) => reward.level > user.level);
  const currentMilestone = [...progressionMilestones].reverse().find((reward) => reward.level <= user.level);

  const progressPercent = Math.min(
    100,
    Math.round(((user.experience || 0) / (user.maxExperience || getXpRequiredForLevel(user.level))) * 100)
  );

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" /> NEXA // PROGRESSÃO DO PILOTO
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white mt-1">
            Progressão do Piloto
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Avance jogando RIFT BATTLE ou NEXUS DUEL, desbloqueie capacidades e acompanhe os marcos permanentes da sua conta.
          </p>
        </div>

        <button
          onClick={() => onNavigate('games')}
          className="self-start sm:self-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(34,211,238,0.35)] flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          <span>ESCOLHER JOGO</span>
        </button>
      </div>

      {/* Hero Overview Card */}
      <div className="p-5 sm:p-7 lg:p-8 rounded-[28px] bg-gradient-to-br from-[#0d1624] via-[#090d17] to-[#070910] border border-cyan-400/20 shadow-[0_18px_60px_rgba(0,0,0,0.32)] relative overflow-hidden">
        <div className="absolute -top-32 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 right-1/3 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Col 1: Current Level & XP */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold uppercase tracking-wider">
                STATUS ATUAL DO PILOTO
              </span>
              <span className="text-xs font-mono text-slate-400">
                Nível Máximo: {MAX_GAME_LEVEL}
              </span>
            </div>

            <div className="flex items-baseline gap-4">
              <span className="font-heading text-5xl sm:text-6xl lg:text-7xl font-black text-white tracking-[-0.04em]">
                NÍVEL {user.level}
              </span>
              <span className="text-xs sm:text-sm font-mono text-cyan-400 font-semibold">
                {user.experience} / {user.maxExperience} XP
              </span>
            </div>

            {/* Glowing Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Progresso para o Nível {user.level + 1}</span>
                <span className="text-cyan-300 font-bold">{progressPercent}%</span>
              </div>
              <div className="h-2.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/10 p-px">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-cyan-400 via-cyan-500 to-blue-500 rounded-full shadow-[0_0_14px_rgba(34,211,238,0.35)]"
                />
              </div>
              <span className="text-[11px] font-mono text-slate-500 block">
                Faltam {Math.max(0, (user.maxExperience || getXpRequiredForLevel(user.level)) - (user.experience || 0))} XP para o próximo nível.
              </span>
            </div>
          </div>

          {/* Col 2: Online progression status */}
          <div className="p-5 rounded-2xl bg-black/25 border border-white/10 backdrop-blur-sm space-y-3">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
              PRÓXIMO OBJETIVO
            </span>
            {user.level < MAX_GAME_LEVEL ? (
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6 text-cyan-300" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold">
                    Nível {user.level + 1}
                  </span>
                  <h4 className="font-heading font-bold text-white text-sm mt-1">
                    {nextMilestone ? `${nextMilestone.name} · Nível ${nextMilestone.level}` : 'Avançar patente do piloto'}
                  </h4>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                    {nextMilestone ? nextMilestone.description : 'Ganhe XP no RIFT BATTLE ou no NEXUS DUEL (PvE/PvP).'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs font-mono text-emerald-400">Nível máximo atingido!</p>
            )}
            <div className="pt-2.5 border-t border-white/10 text-[11px] font-mono text-slate-500">
              A progressão não aumenta Poder ou Dano. PvE e PvP permanecem equilibrados; os níveis liberam recursos de conta e marcos de prestígio.
            </div>
          </div>
        </div>

        {/* Quick Stats Footer */}
        <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Slots Desbloqueados</span>
            <span className="font-heading text-xl font-bold text-cyan-300">
              {unlockedSlots} Slots
            </span>
            <span className="text-[10px] font-mono text-slate-400 block">
              {activeSynthesizingCardsCount} cartas sintetizando
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Módulo Coleções</span>
            <span className={`font-heading text-xl font-bold ${user.level >= 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {user.level >= 5 ? 'Liberado' : 'Requer Nv. 5'}
            </span>
            <span className="text-[10px] font-mono text-slate-400 block">
              {user.level >= 5 ? 'Acesso ativo' : `Faltam ${Math.max(0, 5 - user.level)} níveis`}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Patente Atual</span>
            <span className="font-heading text-xl font-bold text-purple-300">
              {currentMilestone?.name || `Nível ${user.level}`}
            </span>
            <span className="text-[10px] font-mono text-slate-400 block">
              Nível {user.level} · Máximo {MAX_GAME_LEVEL}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Histórico de Nível</span>
            <span className="font-heading text-xl font-bold text-amber-300">
              {history.length} Avanços
            </span>
            <span className="text-[10px] font-mono text-slate-400 block">
              Avanços registrados
            </span>
          </div>
        </div>
      </div>

      {currentUser && (
        <div className="space-y-5">
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-cyan-500/[0.07] via-[#0b0b12] to-purple-500/[0.07] border border-white/10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">Central de atividade</p>
                <h2 className="font-heading text-2xl font-black text-white mt-1">Seus jogos na Rede Nexus</h2>
                <p className="text-xs font-mono text-slate-400 mt-1 max-w-2xl">
                  RIFT BATTLE e NEXUS DUEL compartilham a progressão do Piloto, mas mantêm estatísticas e históricos separados.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => onNavigate('play')} className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/20 font-heading font-black text-xs uppercase tracking-wider transition-all">
                  Jogar Rift Battle
                </button>
                <button onClick={() => onNavigate('arena')} className="px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-400/30 text-purple-300 hover:bg-purple-500/20 font-heading font-black text-xs uppercase tracking-wider transition-all">
                  Jogar Nexus Duel
                </button>
              </div>
            </div>
          </div>
          <BattleStats key={'battle-'+currentUser.id} ownerId={currentUser.id} />
          <div className="grid gap-5 xl:grid-cols-2">
            <DueloPveStats key={'pve-'+currentUser.id} ownerId={currentUser.id} />
            <DueloPvpStats key={'pvp-'+currentUser.id} ownerId={currentUser.id} />
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 pb-3 scrollbar-none">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 rounded-xl font-heading text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2 ${
            activeTab === 'timeline'
              ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Trilha de Progressão</span>
        </button>

        <button
          onClick={() => setActiveTab('slots')}
          className={`px-4 py-2 rounded-xl font-heading text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2 ${
            activeTab === 'slots'
              ? 'bg-purple-500/20 border border-purple-400/40 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Sistema de Slots</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl font-heading text-xs uppercase tracking-wider font-bold transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-amber-500/20 border border-amber-400/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Histórico de Avanço ({history.length})</span>
        </button>
      </div>

      {/* Tab Content 1: ONLINE PROGRESSION */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="p-5 sm:p-6 rounded-3xl bg-[#0b0b12] border border-white/10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6 text-cyan-300" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-bold text-white">
                  Progressão permanente do piloto
                </h3>
                <p className="text-xs font-mono text-slate-400 mt-1 max-w-3xl leading-relaxed">
                  PvE e PvP concedem XP de forma autoritativa no servidor. Ao atingir a experiência necessária,
                  seu nível é atualizado automaticamente. A trilha representa a patente e o progresso da conta. Os marcos liberam recursos de conta e prestígio, sem aumentar Poder, Dano ou dar vantagem competitiva nas batalhas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Nível Atual</span>
                <span className="font-heading text-2xl font-black text-cyan-300">Nível {user.level}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Experiência</span>
                <span className="font-heading text-2xl font-black text-white">
                  {user.experience} / {user.maxExperience} XP
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Capacidade de Síntese</span>
                <span className="font-heading text-2xl font-black text-purple-300">
                  {unlockedSlots} {unlockedSlots === 1 ? 'Slot' : 'Slots'}
                </span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('games')}
              className="mt-5 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-black text-xs uppercase tracking-wider transition-all inline-flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Escolher jogo
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tab Content 2: SLOTS SYSTEM */}
      {activeTab === 'slots' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#0b0b12] border border-white/10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-bold text-white">
                  Regras de Capacidade de Slots de Síntese
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Os slots determinam quantas cartas podem sintetizar NEX ao mesmo tempo. Não alteram taxas intrínsecas das cartas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
              {SLOTS_CONFIG.map((tier, idx) => {
                const isUnlocked = user.level >= tier.minLevel;
                const isCurrentTier = unlockedSlots === tier.slots;

                return (
                  <div
                    key={idx}
                    className={`p-5 rounded-2xl border transition-all ${
                      isCurrentTier
                        ? 'bg-purple-950/30 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                        : isUnlocked
                        ? 'bg-[#0f0f1c] border-white/10'
                        : 'bg-[#090910] border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs text-purple-300 font-bold">
                        Nível {tier.minLevel}+
                      </span>
                      {isUnlocked ? (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                          Liberado
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          Bloqueado
                        </span>
                      )}
                    </div>

                    <h4 className="font-heading text-2xl font-black text-white">
                      {tier.slots} {tier.slots === 1 ? 'Slot Ativo' : 'Slots Ativos'}
                    </h4>

                    <p className="text-xs font-mono text-slate-400 mt-1">
                      {tier.description}
                    </p>

                    {isCurrentTier && (
                      <span className="inline-block mt-3 text-[10px] font-mono text-purple-300 font-bold bg-purple-950 px-2 py-1 rounded border border-purple-500/40">
                        Capacidade Atual do Piloto
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 3: HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#0b0b12] border border-white/10 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Histórico disponível de avanços de nível da sua conta.</span>
            <span>Total: {history.length} eventos</span>
          </div>

          {history.length > 0 ? (
            <div className="space-y-3">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="p-4 rounded-2xl bg-[#0b0b12] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 font-heading font-black text-sm">
                      Nv.{record.newLevel}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">
                          Avanço de Nível {record.previousLevel} → <strong className="text-white">Nível {record.newLevel}</strong>
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30">
                          CONFIRMADO
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">
                        Progressão confirmada para o Nível {record.newLevel}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(record.timestamp).toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center rounded-3xl bg-[#0b0b12] border border-white/10">
              <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="font-heading text-lg font-bold text-white">
                Nenhum Avanço Registrado
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-1 max-w-sm mx-auto">
                Jogue RIFT BATTLE ou NEXUS DUEL para ganhar XP e registrar seus avanços.
              </p>
              <button
                onClick={() => onNavigate('games')}
                className="mt-4 px-4 py-2 rounded-xl bg-cyan-500 text-black font-heading font-black text-xs uppercase tracking-wider hover:bg-cyan-400"
              >
                Jogar Agora
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
