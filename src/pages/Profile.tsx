import { formatEconomicValue } from '../utils/formatEconomicValue';
import { CardImage } from '../components/common/CardImage';
import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGameState } from '../contexts/GameStateContext';
import { RarityBadge } from '../components/common/RarityBadge';
import { CurrencyBadge } from '../components/common/CurrencyBadge';
import { soundService } from '../services/soundService';
import { ProgressionService } from '../services/progressionService';
import { LEVEL_REWARDS, getXpRequiredForLevel } from '../config/levelConfig';
import {
  User,
  Shield,
  Zap,
  Swords,
  Trophy,
  Edit3,
  Check,
  Package,
  History,
  Sparkles,
  TrendingUp,
  Award,
  ChevronRight,
  Layers,
  Lock,
} from 'lucide-react';

interface ProfileProps {
  onNavigate?: (page: string) => void;
}

export const Profile: React.FC<ProfileProps> = ({ onNavigate }) => {
  const { user, updateUserProfile } = useAuth();
  const { assets, transactions, notify, unlockedSlots, activeSynthesizingCardsCount } = useGameState();

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(user.title);
  const [bio, setBio] = useState(user.bio);
  const [avatar, setAvatar] = useState(user.avatar);
  const [isSaving, setIsSaving] = useState(false);
  const saving = useRef(false);

  const userItems = assets.filter((a) => a.ownerId === user.id);
  const totalPower = userItems.reduce((acc, curr) => acc + ('power' in curr ? curr.power : 0), 0);
  const totalBattles = user.victories + user.defeats;
  const winRate = totalBattles > 0 ? Math.round((user.victories / totalBattles) * 100) : 0;
  
  const currentMaxXp = user.maxExperience || getXpRequiredForLevel(user.level);
  const xpPercentage = Math.min(100, Math.round(((user.experience || 0) / currentMaxXp) * 100));

  const nextReward = LEVEL_REWARDS[user.level + 1];
  const nextMajorMilestone = [10, 20, 25, 30, 40, 50].find((l) => l > user.level);
  const milestoneReward = nextMajorMilestone ? LEVEL_REWARDS[nextMajorMilestone] : null;

  const myTransactions = transactions.filter(
    (tx) => tx.sellerId === user.id || tx.buyerId === user.id
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving.current) return;
    saving.current = true;
    setIsSaving(true);
    try {
      const confirmed = await updateUserProfile({ title, bio, avatar });
      setTitle(confirmed.title);
      setBio(confirmed.bio);
      setAvatar(confirmed.avatar);
      setIsEditing(false);
      notify('success', 'Perfil atualizado', 'Alterações salvas com sucesso.');
    } catch (error) {
      notify('error', 'Não foi possível salvar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Profile Card Header */}
      <div className="relative rounded-2xl overflow-hidden border border-cyan-500/15 bg-[#090a0f]">
        {/* Cover Banner */}
        <div className="h-32 sm:h-36 bg-gradient-to-r from-cyan-950/70 via-[#111327] to-purple-950/45 relative">
          <div className="absolute inset-0 bg-grid-white/[0.035]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f] via-transparent to-transparent" />
          <div className="absolute left-6 top-5 flex items-center gap-2 text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-cyan-400/80">
            <Shield className="w-3.5 h-3.5" /> Comunidade // Identidade do Piloto
          </div>
        </div>

        {/* User Identity Row */}
        <div className="px-5 sm:px-7 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 mb-5">
            <div className="flex items-end gap-4">
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-[#090a0f] bg-slate-950 shadow-[0_0_24px_rgba(6,182,212,0.10)]"
                />
                <span className="absolute bottom-1 right-1 px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/35 text-cyan-200 font-mono font-bold text-[9px]">
                  Nv. {user.level}
                </span>
              </div>

              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {user.username}
                </h1>
                <span className="text-xs font-mono text-cyan-400 font-semibold block mt-0.5">
                  {user.title}
                </span>
              </div>
            </div>

            <button
              disabled={isSaving}
              onClick={() => {
                if (!isEditing) {
                  setBio(typeof user.bio === 'string' ? user.bio : '');
                  setTitle(typeof user.title === 'string' ? user.title : '');
                  setAvatar(typeof user.avatar === 'string' ? user.avatar : '');
                }
                setIsEditing(!isEditing);
              }}
              className="px-4 py-2 rounded-xl bg-white/[0.025] hover:bg-cyan-500/[0.06] border border-white/[0.07] hover:border-cyan-500/20 text-xs font-mono text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Cancelar Edição' : 'Editar Perfil'}</span>
            </button>
          </div>

          {/* Edit Form */}
          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="p-4 rounded-xl bg-black/25 border border-cyan-500/10 space-y-4 mb-5">
              <fieldset disabled={isSaving} className="space-y-4">
              <div>
                <label htmlFor="profile-avatar" className="block text-xs font-mono text-slate-400 uppercase mb-1">URL do avatar</label>
                <input id="profile-avatar" type="url" value={avatar}
                  onChange={(e) => setAvatar(e.target.value)} placeholder="https://..."
                  className="w-full bg-black/30 border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/35" />
                <p className="text-xs text-slate-400">Deixe vazio para manter o avatar atual.</p>
              </div>
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                  Título do Piloto:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/30 border border-white/[0.07] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/35"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                  Biografia:
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  className="w-full bg-black/30 border border-white/[0.07] rounded-xl px-3 py-2 text-xs font-sans text-white focus:outline-none focus:border-cyan-500/35"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/35 text-cyan-200 font-mono text-xs font-bold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
              </fieldset>
            </form>
          ) : (
            <p className="text-xs text-slate-300 font-mono max-w-2xl mb-6 leading-relaxed">
              {typeof user.bio === 'string' ? user.bio : ''}
            </p>
          )}

          {/* XP Progression Bar & Next Rewards */}
          <div className="p-4 rounded-xl bg-black/30 border border-cyan-500/15 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <Award className="w-4 h-4 text-cyan-400" />
                <span>Nível {user.level} — Progresso para o Nível {user.level + 1}</span>
              </span>
              <span className="text-cyan-400 font-bold">
                {user.experience} / {currentMaxXp} XP ({xpPercentage}%)
              </span>
            </div>

            <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/[0.07] p-0.5">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${xpPercentage}%` }}
              />
            </div>

            {/* Next Rewards preview */}
            <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {nextReward ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{nextReward.icon}</span>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">
                        Próxima Recompensa (Nível {user.level + 1})
                      </span>
                      <h5 className="font-heading font-bold text-white text-xs">
                        {nextReward.name} • <span className="text-cyan-400">{nextReward.badge}</span>
                      </h5>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs font-mono text-emerald-400">Nível Máximo Atingido!</span>
                )}
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('progression')}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Ver Trilha de Níveis</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Combat & Arsenal Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 rounded-2xl bg-[#090a0f] border border-white/[0.08] overflow-hidden">
        <div className="p-4 border-r border-b sm:border-b-0 border-white/[0.06]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Poder Total</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <span className="font-heading text-2xl font-black text-cyan-300 block mt-2">
            {totalPower.toLocaleString()} PWR
          </span>
        </div>

        <div className="p-4 border-b sm:border-b-0 sm:border-r border-white/[0.06]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Vitórias Arena</span>
            <Swords className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="font-heading text-2xl font-black text-emerald-400 block mt-2">
            {user.victories}
          </span>
        </div>

        <div className="p-4 border-r border-white/[0.06]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Taxa de Vitória</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <span className="font-heading text-2xl font-black text-amber-400 block mt-2">
            {winRate}%
          </span>
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Total de Ativos</span>
            <Package className="w-4 h-4 text-purple-400" />
          </div>
          <span className="font-heading text-2xl font-black text-purple-400 block mt-2">
            {userItems.length}
          </span>
        </div>
      </div>

      {/* My Showcase Top Items */}
      <div className="rounded-2xl bg-[#090a0f] border border-white/[0.08] p-5">
        <h3 className="font-heading text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <span>Destaques do Arsenal</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 rounded-2xl bg-[#090a0f] border border-white/[0.08] overflow-hidden">
          {userItems.slice(0, 4).map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-white/[0.025] border border-white/[0.06] flex flex-col justify-between gap-2 hover:border-cyan-500/15 transition-colors"
            >
              <div className="aspect-square rounded-lg overflow-hidden bg-slate-950">
                <CardImage asset={item} src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h5 className="font-heading font-bold text-xs text-white truncate">
                  {item.name}
                </h5>
                <div className="flex items-center justify-between mt-1">
                  <RarityBadge rarity={item.rarity} size="sm" showDot={false} />
                  <span className="text-[10px] font-mono text-cyan-400">{item.power} PWR</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User's Personal Transactions History */}
      <div className="rounded-2xl bg-[#090a0f] border border-white/[0.08] p-5">
        <h3 className="font-heading text-lg font-bold text-white mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-purple-400" />
          <span>Movimentações Recentes</span>
        </h3>

        {myTransactions.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono py-4">Nenhuma movimentação financeira registrada.</p>
        ) : (
          <div className="space-y-2.5">
            {myTransactions.map((tx) => {
              const isBuyer = tx.buyerId === user.id;

              return (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-white/[0.025] border border-white/[0.06] flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-3">
                    <CardImage asset={tx.itemSnapshot}
                      src={tx.itemSnapshot.image}
                      alt={tx.itemSnapshot.name}
                      className="w-9 h-9 rounded-lg object-cover"
                    />
                    <div>
                      <span className="font-bold text-white block truncate">{tx.itemSnapshot.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {isBuyer ? `Comprado de ${tx.sellerName}` : `Vendido para ${tx.buyerName}`}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-bold block text-sm ${
                        isBuyer ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {isBuyer ? `-${formatEconomicValue(tx.amount)}` : `+${formatEconomicValue(tx.amount - tx.fee)}`} NXA
                    </span>
                    <span className="text-[10px] text-slate-500">{tx.timestamp}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
