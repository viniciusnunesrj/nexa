import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { LevelUpResult } from '../../types';
import { soundService } from '../../services/soundService';
import { Sparkles, ArrowRight, Award, Zap, Package, CheckCircle2, Shield } from 'lucide-react';

interface LevelUpModalProps {
  data: LevelUpResult | null;
  onClose: () => void;
  onNavigate?: (page: string) => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ data, onClose, onNavigate }) => {
  useEffect(() => {
    if (data && data.leveledUp) {
      // Sound celebration
      if (data.newLevel >= 10) {
        soundService.playMythicDrop();
      } else {
        soundService.playVictory();
      }

      // Confetti burst
      try {
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.5 },
          colors: ['#22d3ee', '#a855f7', '#f59e0b', '#10b981'],
        });
      } catch {
        // Fallback if canvas-confetti fails
      }
    }
  }, [data]);

  if (!data || !data.leveledUp) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-gradient-to-b from-[#161226] via-[#0d0d18] to-[#080810] border-2 border-cyan-500/50 shadow-[0_0_60px_rgba(34,211,238,0.25)] p-6 sm:p-8 text-center"
        >
          {/* Futuristic ambient glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Header Badge */}
          <div className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-400/40 text-cyan-300 font-mono text-xs uppercase tracking-widest font-black shadow-[0_0_20px_rgba(34,211,238,0.3)] mb-4">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>PROGRESSÃO DE PILOTO</span>
          </div>

          {/* Level Up Main Title */}
          <motion.h1
            initial={{ scale: 0.8 }}
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            className="font-heading text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-purple-400 tracking-tight"
          >
            LEVEL UP!
          </motion.h1>

          {/* Big Level Display */}
          <div className="mt-3 mb-2 flex items-center justify-center gap-3">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Nível Anterior: <strong className="text-slate-200">Nv. {data.previousLevel}</strong>
            </span>
            <ArrowRight className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-mono text-cyan-300 font-bold uppercase tracking-wider">
              Novo Nível: <strong className="text-xl font-heading text-white">Nv. {data.newLevel}</strong>
            </span>
          </div>

          <div className="my-4 py-2 border-y border-white/10 flex items-center justify-center gap-2">
            <span className="text-lg">🎉</span>
            <p className="font-heading text-base sm:text-lg font-black text-amber-300 uppercase tracking-wide">
              PARABÉNS, PILOTO!
            </p>
            <span className="text-lg">🎉</span>
          </div>

          <p className="text-xs font-mono text-slate-300 mb-4">
            {data.rewardsGranted.length > 0
              ? 'Você atingiu novos patamares de sincronização e desbloqueou recompensas exclusivas:'
              : 'Seu avanço de nível foi confirmado. Nenhuma recompensa de nível foi creditada nesta batalha.'}
          </p>

          {/* Unlocked Rewards List */}
          <div className="space-y-3 my-5 text-left">
            {data.rewardsGranted.length > 0 ? (
              data.rewardsGranted.map((reward, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-white/5 border border-cyan-500/30 flex items-center gap-3 shadow-inner"
                >
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-2xl shrink-0">
                    {reward.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
                        {reward.badge || 'Recompensa'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Nível {reward.level}
                      </span>
                    </div>
                    <h4 className="font-heading font-bold text-white text-sm mt-0.5 truncate">
                      {reward.name}
                    </h4>
                    <p className="text-xs text-slate-300 font-mono mt-0.5 line-clamp-1">
                      {reward.description}
                    </p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                </div>
              ))
            ) : (
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                <Award className="w-6 h-6 text-cyan-400" />
                <div>
                  <h4 className="font-heading font-bold text-white text-sm">
                    Avanço de Nível Confirmado
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">
                    Continue subindo para atingir marcos de recompensas e desbloqueios de caixas!
                  </p>
                </div>
              </div>
            )}

            {/* Slots Announcement if unlocked */}
            {data.newSlotsUnlocked && (
              <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/40 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-purple-300">
                    CAPACIDADE EXPANDIDA
                  </span>
                  <h4 className="font-heading font-bold text-white text-sm">
                    {data.unlockedSlots}º Slot de Carta Ativo Liberado!
                  </h4>
                  <p className="text-xs text-slate-300 font-mono">
                    Agora você pode manter {data.unlockedSlots} cartas sintetizando simultaneamente.
                  </p>
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] font-mono text-emerald-400/90 mb-6 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{data.rewardsGranted.length > 0 ? 'Itens e créditos creditados automaticamente à sua conta.' : 'Nível atualizado na sua conta.'}</span>
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => {
                onClose();
                if (onNavigate) onNavigate('progression');
              }}
              className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-heading font-bold text-xs uppercase tracking-wider transition-all"
            >
              Ver Trilha de Níveis
            </button>

            <button
              onClick={onClose}
              className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-heading font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] flex items-center justify-center gap-2"
            >
              <span>{data.rewardsGranted.length > 0 ? 'RESGATAR E CONTINUAR' : 'CONTINUAR'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
