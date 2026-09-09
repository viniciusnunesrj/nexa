import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import { CURRENT_SEASON } from '../config/seasons';
import { soundService } from '../services/soundService';
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
  const { notify } = useGameState();

  const [claimedTiers, setClaimedTiers] = useState<number[]>([1]);
  const [challenges, setChallenges] = useState(CURRENT_SEASON.challenges);

  // Compute current season tier based on user experience
  const currentTier = Math.min(20, Math.max(1, Math.floor(user.level * 1.5)));

  const handleClaimTier = (tierNum: number, rewardLabel: string) => {
    if (claimedTiers.includes(tierNum)) return;
    soundService.playVictory();
    setClaimedTiers((prev) => [...prev, tierNum]);
    notify({
      type: 'SUCCESS',
      message: `Recompensa do Nível ${tierNum} resgatada: ${rewardLabel}!`,
    });
  };

  const handleClaimChallenge = (challengeId: string, rewardXp: number) => {
    soundService.playVictory();
    setChallenges((prev) =>
      prev.map((c) => (c.id === challengeId ? { ...c, isCompleted: true } : c))
    );
    notify({
      type: 'SUCCESS',
      message: `Desafio cumprido! +${rewardXp} XP de Temporada creditados!`,
    });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-cyan-500/30 bg-gradient-to-r from-[#0d131f] via-[#090b14] to-[#120a1c] p-6 sm:p-10 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider">
              <Calendar className="w-4 h-4" /> {CURRENT_SEASON.editionLabel}
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl font-black text-white mt-1">
              Temporada: {CURRENT_SEASON.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-mono mt-2 leading-relaxed">
              {CURRENT_SEASON.slogan}
            </p>

            <div className="flex items-center gap-4 mt-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-cyan-300">
                <Clock className="w-4 h-4 text-cyan-400" />
                Vigência: {CURRENT_SEASON.startDate} até {CURRENT_SEASON.endDate}
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-purple-300">Passe Nível {currentTier} / {CURRENT_SEASON.maxLevel}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-black/60 border border-cyan-500/30 text-center shrink-0 w-full md:w-auto">
            <span className="text-[10px] font-mono text-slate-400 uppercase block">Seu Progresso Atual</span>
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
      <div className="rounded-2xl bg-[#0b0b12] border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
            <Gift className="w-5 h-5 text-cyan-400" />
            <span>Trilha de Recompensas do Passe de Temporada</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {claimedTiers.length} de {CURRENT_SEASON.maxLevel} níveis resgatados
          </span>
        </div>

        {/* Horizontal scrollable track */}
        <div className="flex gap-4 overflow-x-auto pb-4 pt-2">
          {CURRENT_SEASON.rewards.map((reward) => {
            const isUnlocked = currentTier >= reward.level;
            const isClaimed = claimedTiers.includes(reward.level);

            return (
              <div
                key={reward.level}
                className={`min-w-[175px] rounded-2xl p-4 border flex flex-col justify-between transition-all ${
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
                    {isClaimed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isUnlocked ? (
                      <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-600" />
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-white/5 mb-3 text-center">
                    <span className="text-[10px] font-mono text-slate-400 block uppercase">
                      {reward.isPremium ? 'Passe Elite' : 'Gratuito'}
                    </span>
                    <span className="font-heading font-bold text-xs text-white block mt-1">
                      {reward.name}
                    </span>
                  </div>
                </div>

                <button
                  disabled={!isUnlocked || isClaimed}
                  onClick={() => handleClaimTier(reward.level, reward.name)}
                  className={`w-full py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                    isClaimed
                      ? 'bg-white/5 text-slate-500 cursor-default'
                      : isUnlocked
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                      : 'bg-white/5 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {isClaimed ? 'Resgatado' : isUnlocked ? 'Resgatar' : 'Bloqueado'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Season Challenges */}
      <div className="rounded-2xl bg-[#0b0b12] border border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>Missões e Desafios de Temporada</span>
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Conclua missões para acelerar seu progresso
          </span>
        </div>

        <div className="space-y-3">
          {challenges.map((c) => {
            const isDone = c.isCompleted || c.progress >= c.maxProgress;

            return (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-sm text-white">{c.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                      +{c.xpReward} XP
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
                  {c.isCompleted ? (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                      <CheckCircle2 className="w-4 h-4" /> Concluído
                    </div>
                  ) : isDone ? (
                    <button
                      onClick={() => handleClaimChallenge(c.id, c.xpReward)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                    >
                      Reivindicar
                    </button>
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
