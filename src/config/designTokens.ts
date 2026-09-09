import { Rarity, NexaClass } from '../types';

export interface RarityTheme {
  label: string;
  color: string;
  gradient: string;
  border: string;
  borderHover: string;
  bgGlow: string;
  text: string;
  badge: string;
  shadow: string;
}

export const RARITY_CONFIG: Record<Rarity, RarityTheme> = {
  Comum: {
    label: 'Comum',
    color: '#94a3b8',
    gradient: 'from-slate-600/30 to-slate-800/10',
    border: 'border-slate-700/60',
    borderHover: 'hover:border-slate-500',
    bgGlow: 'rgba(148, 163, 184, 0.15)',
    text: 'text-slate-300',
    badge: 'bg-slate-800/80 text-slate-300 border-slate-700',
    shadow: 'shadow-[0_0_12px_rgba(148,163,184,0.12)]',
  },
  Incomum: {
    label: 'Incomum',
    color: '#10b981',
    gradient: 'from-emerald-600/30 to-emerald-950/10',
    border: 'border-emerald-600/50',
    borderHover: 'hover:border-emerald-400',
    bgGlow: 'rgba(16, 185, 129, 0.25)',
    text: 'text-emerald-400',
    badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    shadow: 'shadow-[0_0_18px_rgba(16,185,129,0.2)]',
  },
  Raro: {
    label: 'Raro',
    color: '#06b6d4',
    gradient: 'from-cyan-600/30 to-cyan-950/10',
    border: 'border-cyan-500/50',
    borderHover: 'hover:border-cyan-300',
    bgGlow: 'rgba(6, 182, 212, 0.3)',
    text: 'text-cyan-400',
    badge: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
    shadow: 'shadow-[0_0_20px_rgba(6,182,212,0.25)]',
  },
  Épico: {
    label: 'Épico',
    color: '#a855f7',
    gradient: 'from-purple-600/30 to-purple-950/10',
    border: 'border-purple-500/60',
    borderHover: 'hover:border-purple-300',
    bgGlow: 'rgba(168, 85, 247, 0.35)',
    text: 'text-purple-400',
    badge: 'bg-purple-950/80 text-purple-300 border-purple-500/50',
    shadow: 'shadow-[0_0_24px_rgba(168,85,247,0.3)]',
  },
  Lendário: {
    label: 'Lendário',
    color: '#f59e0b',
    gradient: 'from-amber-600/30 to-amber-950/10',
    border: 'border-amber-500/70',
    borderHover: 'hover:border-amber-300',
    bgGlow: 'rgba(245, 158, 11, 0.45)',
    text: 'text-amber-400',
    badge: 'bg-amber-950/80 text-amber-300 border-amber-500/60',
    shadow: 'shadow-[0_0_28px_rgba(245,158,11,0.38)]',
  },
  Mítico: {
    label: 'Mítico',
    color: '#f43f5e',
    gradient: 'from-rose-600/35 to-rose-950/15',
    border: 'border-rose-500/80',
    borderHover: 'hover:border-rose-400',
    bgGlow: 'rgba(244, 63, 94, 0.55)',
    text: 'text-rose-400',
    badge: 'bg-rose-950/90 text-rose-200 border-rose-500/70',
    shadow: 'shadow-[0_0_32px_rgba(244,63,94,0.48)]',
  },
};

export const CLASS_CONFIG: Record<NexaClass, { label: string; color: string; icon: string }> = {
  Guerreiro: { label: 'Guerreiro', color: 'text-red-400', icon: 'Sword' },
  Mago: { label: 'Mago', color: 'text-cyan-400', icon: 'Sparkles' },
  Assassino: { label: 'Assassino', color: 'text-emerald-400', icon: 'Crosshair' },
  Guardião: { label: 'Guardião', color: 'text-amber-400', icon: 'Shield' },
  Caçador: { label: 'Caçador', color: 'text-orange-400', icon: 'Target' },
  Tecnomante: { label: 'Tecnomante', color: 'text-purple-400', icon: 'Cpu' },
};
