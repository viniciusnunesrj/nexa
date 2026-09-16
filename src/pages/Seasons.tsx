import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CURRENT_SEASON } from '../config/seasons';
import {
  Calendar,
  Sparkles,
  Trophy,
  CheckCircle2,
  Lock,
  Gift,
  Zap,
  Clock,
} from 'lucide-react';

export const Seasons: React.FC = () => {
  const { user } = useAuth();

  const challenges = CURRENT_SEASON.challenges;

  // Temporada em modo de prévia durante os testes online.
  // O progresso é exibido, mas recompensas ainda não são creditadas.
  const currentTier = Math.min(20, Math.max(1, Math.floor(user.level * 1.5)));

  return (
    <div className="space-y-7 max-w-6xl mx-auto pb-10">
      {/* Banner */}
      <div className="relative rounded-[28px] overflow-hidden border border-cyan-400/20 bg-gradient-to-br from-[#0d1624] via-[#090d17] to-[#100b18] p-6 sm:p-9 shadow-[0_18px_60px_rgba(0,0,0,0.32)]">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider">
              <Calendar className="w-4 h-4" /> {CURRENT_SEASON.editionLabel}
            </div>
            <h1 className="font-heading text-4xl sm:text-5xl font-black text-white mt-2 tracking-[-0.035em]">
              Ciclo: {CURRENT_SEASON.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-mono mt-2 leading-relaxed">
              {CURRENT_SEASON.slogan} Este ciclo é complementar à progressão permanente do piloto.
            </p>

            <div className="flex items-center gap-4 mt-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Clock className="w-4 h-4 text-cyan-400" />
                Ciclo ativo: {CURRENT_SEASON.startDate} — {CURRENT_SEASON.endDate}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-purple-300">Progresso {currentTier} / {CURRENT_SEASON.maxLevel}</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-black/30 backdrop-blur-sm border border-cyan-400/20 text-center shrink-0 w-full md:w-auto">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Progresso do Ciclo</span>
            <span className="font-heading font-black text-3xl text-cyan-400">
              Nv. {currentTier}
            </span>
            <div className="w-36 h-1.5 bg-white/10 rounded-full mt-2 mx-auto overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full"
                style={{ width: `${(currentTier / 20) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Season Pass Tracks */}
      <div className="rounded-[24px] bg-[#0a0d14] border border-white/10 p-5 sm:p-6 shadow-[0_14px_40px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-cyan-400" />
            <span>Trilha de Recompensas</span>
          </h3>
          <span className="text-xs font-mono text-amber-300">
            Prévia de recompensas — resgate ainda não disponível
          </span>
        </div>

        {/* Horizontal scrollable track */}
        <div className="flex gap-3 overflow-x-auto pb-4 pt-2 snap-x">
          {CURRENT_SEASON.rewards.map((reward) => {
            const isUnlocked = currentTier >= reward.level;

            return (
              <div
                key={reward.level}
                className={`min-w-[175px] rounded-2xl p-4 border flex flex-col justify-between transition-all snap-start ${
                  isUnlocked
                    ? 'bg-white/5 border-cyan-500/40 text-white'
                    : 'bg-black/40 border-white/5 opacity-60 text-slate-500'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-heading font-black text-sm text-cyan-400">
                      Nível {reward.level}
                    </span>
                    {isUnlocked ? (
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-600" />
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 mb-3 text-center">
                    <span className="text-[10px] font-mono text-slate-400 block uppercase">
                      {reward.isPremium ? 'Elite' : 'Gratuito'}
                    </span>
                    <span className="font-heading font-bold text-xs text-white block mt-1">
                      {reward.name}
                    </span>
                  </div>
                </div>

                <div
                  className={`w-full py-2 rounded-xl text-xs font-mono font-bold text-center ${
                    isUnlocked
                      ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                      : 'bg-white/5 text-slate-600'
                  }`}
                >
                  {isUnlocked ? 'Recompensa em breve' : 'Bloqueado'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Season Challenges */}
      <div className="rounded-[24px] bg-[#0a0d14] border border-white/10 p-5 sm:p-6 shadow-[0_14px_40px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Missões do Ciclo</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Missões em teste — recompensas serão ativadas depois
          </span>
        </div>

        <div className="space-y-3">
          {challenges.map((c) => {
            const isDone = c.isCompleted || c.progress >= c.maxProgress;

            return (
              <div
                key={c.id}
                className="p-4 rounded-2xl bg-white/[0.035] border border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-sm text-white">{c.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/20 text-amber-300">
                      Recompensa em breve
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      Categoria: {c.category}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-mono mt-1">{c.description}</p>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3 mt-3">
                    <div className="w-48 h-1.5 bg-black/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (c.progress / c.maxProgress) * 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {c.progress} / {c.maxProgress}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {isDone ? (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4" /> Missão concluída
                    </div>
                  ) : (
                    <span className="text-xs font-mono text-slate-500 px-3 py-2 rounded-xl bg-white/5">
                      Em Andamento
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
