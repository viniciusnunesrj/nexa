import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { RankingService, RankingEntry } from '../services/rankingService';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Sparkles,
  Swords,
  Zap,
  User,
  Search,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

export const Leaderboard: React.FC = () => {
  const { user, allUsers } = useAuth();
  const [search, setSearch] = useState('');
  const [tick, setTick] = useState(0);

  // Auto-refresh and event listener for real-time reactivity directly from Supabase
  useEffect(() => {
    RankingService.fetchOnlineGlobalRanking(user?.id).then(() => setTick((t) => t + 1));

    const handleRankingUpdate = () => {
      setTick((t) => t + 1);
    };

    window.addEventListener('storage', handleRankingUpdate);
    window.addEventListener('nexa_ranking_updated', handleRankingUpdate);

    // Periodic safety poll from Supabase
    const interval = setInterval(() => {
      RankingService.fetchOnlineGlobalRanking(user?.id).then(() => setTick((t) => t + 1));
    }, 4000);

    return () => {
      window.removeEventListener('storage', handleRankingUpdate);
      window.removeEventListener('nexa_ranking_updated', handleRankingUpdate);
      clearInterval(interval);
    };
  }, [user?.id]);

  // Compute live ranking dynamically from real database
  const rankingData = useMemo(() => {
    return RankingService.getGlobalRanking(user?.id);
    // tick, user, and allUsers trigger recomputation instantly
  }, [user?.id, user?.level, user?.experience, user?.victories, allUsers, tick]);

  const { top100, myPosition, totalUsers, all } = rankingData;

  // Filter top 100 if user searches
  const filteredList = useMemo(() => {
    if (!search.trim()) return top100;
    const q = search.toLowerCase();
    return all.filter(
      (entry) =>
        entry.username.toLowerCase().includes(q) ||
        (entry.title && entry.title.toLowerCase().includes(q)) ||
        entry.rank.toString() === q
    );
  }, [search, top100, all]);

  const top1 = top100[0];
  const top2 = top100[1];
  const top3 = top100[2];

  const isUserInFilteredList = Boolean(myPosition && filteredList.some((e) => e.userId === myPosition.userId));

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-wider">
            <Trophy className="w-4 h-4 text-amber-400" /> Classificação Geral da Cidadela
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white mt-1 flex items-center gap-3">
            🏆 RANKING GLOBAL
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1 max-w-xl">
            Calculado em tempo real. Pontuação: <span className="text-amber-300 font-bold">(Level × 100) + (Vitórias × 50) + ⌊XP ÷ 10⌋</span>.
          </p>
        </div>

        {/* Global Stats Pill */}
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 rounded-xl bg-[#0d0d15] border border-white/10 flex items-center gap-3">
            <div className="text-right font-mono">
              <span className="text-[10px] text-slate-500 uppercase block">Pilotos Registrados</span>
              <span className="text-sm font-bold text-cyan-400">{totalUsers} pilotos</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* "MINHA POSIÇÃO" Highlight Card */}
      {myPosition && (
        <div className="relative rounded-2xl bg-gradient-to-r from-cyan-950/60 via-[#0e0e1a] to-amber-950/40 border-2 border-cyan-500/40 p-5 shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border-2 border-cyan-400/80 flex items-center justify-center font-brand font-black text-xl text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)] shrink-0">
                #{myPosition.rank}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-400 text-slate-950 font-mono text-[10px] font-black uppercase tracking-wider">
                    VOCÊ
                  </span>
                  <h3 className="font-heading text-lg font-bold text-white">
                    {myPosition.username}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                    • {myPosition.title}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                  <span>
                    Posição Oficial: <strong className="text-cyan-300 font-bold">#{myPosition.rank}</strong> de {totalUsers}
                  </span>
                  {myPosition.rank <= 100 ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> No TOP 100
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold">
                      Fora do TOP 100 (Ascendendo)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Metrics of Current User */}
            <div className="grid grid-cols-4 gap-2 text-center font-mono">
              <div className="bg-black/50 border border-white/5 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-500 block uppercase">Nível</span>
                <span className="text-sm font-bold text-cyan-400">Nv. {myPosition.level}</span>
              </div>
              <div className="bg-black/50 border border-white/5 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-500 block uppercase">XP</span>
                <span className="text-sm font-bold text-slate-200">{myPosition.xp.toLocaleString()}</span>
              </div>
              <div className="bg-black/50 border border-white/5 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-500 block uppercase">Vitórias</span>
                <span className="text-sm font-bold text-emerald-400">{myPosition.wins}V</span>
              </div>
              <div className="bg-gradient-to-b from-amber-500/20 to-black/60 border border-amber-500/40 p-2.5 rounded-xl">
                <span className="text-[10px] text-amber-400 block uppercase font-bold">Score</span>
                <span className="text-sm font-black text-amber-300">
                  {myPosition.rankingScore.toLocaleString()} pts
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Podium for Top 3 (When at least 2 players exist) */}
      {top1 && top2 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-6 pb-2">
          {/* Rank 2 (Silver) */}
          <div className="order-2 sm:order-1 p-6 rounded-2xl bg-[#0a0a14] border border-slate-400/30 text-center flex flex-col items-center relative overflow-hidden shadow-xl">
            <div className="absolute top-2 right-2 text-slate-400 font-brand font-black text-2xl">
              #2
            </div>
            <div className="relative mb-3">
              <img
                src={top2.avatar}
                alt={top2.username}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-300 shadow-[0_0_20px_rgba(203,213,225,0.3)] bg-slate-900"
              />
              <Medal className="w-6 h-6 text-slate-300 absolute -bottom-2 -right-2 drop-shadow" />
            </div>
            <h4 className="font-heading font-bold text-white text-base truncate w-full flex items-center justify-center gap-1.5">
              {top2.username}
              {top2.isCurrentUser && (
                <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 font-mono text-[9px] font-black">
                  VOCÊ
                </span>
              )}
            </h4>
            <span className="text-[11px] font-mono text-slate-400">
              Level {top2.level} • {top2.xp.toLocaleString()} XP • {top2.wins} vitórias
            </span>
            <div className="mt-3 font-heading font-black text-slate-200 text-lg">
              {top2.rankingScore.toLocaleString()} pontos
            </div>
          </div>

          {/* Rank 1 (Gold - Center & Elevated) */}
          <div className="order-1 sm:order-2 p-8 rounded-3xl bg-gradient-to-b from-[#1f1a09] to-[#0d0d18] border-2 border-amber-400 text-center flex flex-col items-center relative overflow-hidden shadow-[0_0_40px_rgba(245,158,11,0.25)] sm:-translate-y-4">
            <div className="absolute top-2 right-3 text-amber-400 font-brand font-black text-3xl">
              #1
            </div>
            <Crown className="w-8 h-8 text-amber-400 mb-1 animate-bounce" />
            <div className="relative mb-3">
              <img
                src={top1.avatar}
                alt={top1.username}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)] bg-slate-900"
              />
            </div>
            <h3 className="font-heading font-black text-white text-lg truncate w-full flex items-center justify-center gap-1.5">
              {top1.username}
              {top1.isCurrentUser && (
                <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 font-mono text-[9px] font-black">
                  VOCÊ
                </span>
              )}
            </h3>
            <span className="text-xs font-mono text-amber-300 font-semibold">
              Level {top1.level} • {top1.xp.toLocaleString()} XP • {top1.wins} vitórias
            </span>
            <div className="mt-4 font-heading font-black text-amber-400 text-2xl">
              {top1.rankingScore.toLocaleString()} pontos
            </div>
          </div>

          {/* Rank 3 (Bronze) */}
          {top3 && (
            <div className="order-3 p-6 rounded-2xl bg-[#0a0a14] border border-amber-800/40 text-center flex flex-col items-center relative overflow-hidden shadow-xl">
              <div className="absolute top-2 right-2 text-amber-600 font-brand font-black text-2xl">
                #3
              </div>
              <div className="relative mb-3">
                <img
                  src={top3.avatar}
                  alt={top3.username}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-600 shadow-[0_0_20px_rgba(217,119,6,0.3)] bg-slate-900"
                />
                <Award className="w-6 h-6 text-amber-600 absolute -bottom-2 -right-2 drop-shadow" />
              </div>
              <h4 className="font-heading font-bold text-white text-base truncate w-full flex items-center justify-center gap-1.5">
                {top3.username}
                {top3.isCurrentUser && (
                  <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 font-mono text-[9px] font-black">
                    VOCÊ
                  </span>
                )}
              </h4>
              <span className="text-[11px] font-mono text-slate-400">
                Level {top3.level} • {top3.xp.toLocaleString()} XP • {top3.wins} vitórias
              </span>
              <div className="mt-3 font-heading font-black text-amber-600 text-lg">
                {top3.rankingScore.toLocaleString()} pontos
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Ranking Table Card */}
      <div className="rounded-2xl bg-[#0b0b12] border border-white/10 overflow-hidden shadow-xl">
        {/* Table Filter / Search Header */}
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-white text-sm">
              Top 100 Pilotos Oficiais
            </span>
            <span className="text-xs font-mono text-slate-400">
              ({filteredList.length} exibidos)
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar jogador ou posição..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Global Ranking Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-white/5 text-slate-400 uppercase text-[10px] border-b border-white/10 tracking-wider">
              <tr>
                <th className="py-3.5 px-4">POSIÇÃO</th>
                <th className="py-3.5 px-4">JOGADOR</th>
                <th className="py-3.5 px-4">LEVEL</th>
                <th className="py-3.5 px-4">XP</th>
                <th className="py-3.5 px-4">VITÓRIAS</th>
                <th className="py-3.5 px-4 text-right">SCORE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredList.map((rankedUser) => {
                const isCurrent = rankedUser.isCurrentUser;

                return (
                  <tr
                    key={rankedUser.userId}
                    className={`transition-colors ${
                      isCurrent
                        ? 'bg-cyan-950/50 text-cyan-200 border-y border-cyan-500/40 shadow-inner'
                        : 'hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    {/* POSIÇÃO */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-brand font-black text-sm">
                        {rankedUser.rank === 1 && (
                          <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        {rankedUser.rank === 2 && (
                          <Medal className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        {rankedUser.rank === 3 && (
                          <Award className="w-4 h-4 text-amber-600 shrink-0" />
                        )}
                        <span
                          className={
                            rankedUser.rank === 1
                              ? 'text-amber-400 font-bold'
                              : rankedUser.rank === 2
                              ? 'text-slate-300 font-bold'
                              : rankedUser.rank === 3
                              ? 'text-amber-600 font-bold'
                              : isCurrent
                              ? 'text-cyan-300 font-bold'
                              : 'text-slate-400'
                          }
                        >
                          #{rankedUser.rank}
                        </span>
                      </div>
                    </td>

                    {/* JOGADOR */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={rankedUser.avatar}
                          alt={rankedUser.username}
                          className={`w-8 h-8 rounded-lg object-cover bg-slate-900 shrink-0 ${
                            isCurrent ? 'border-2 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.4)]' : ''
                          }`}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-heading font-bold text-xs truncate ${
                                isCurrent ? 'text-white' : 'text-slate-200'
                              }`}
                            >
                              {rankedUser.username}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-400 text-slate-950 font-mono text-[9px] font-black uppercase">
                                VOCÊ
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-normal block truncate">
                            {rankedUser.title}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* LEVEL */}
                    <td className="py-3.5 px-4 font-bold text-cyan-400">
                      Level {rankedUser.level}
                    </td>

                    {/* XP */}
                    <td className="py-3.5 px-4 text-slate-300">
                      {rankedUser.xp.toLocaleString()} XP
                    </td>

                    {/* VITÓRIAS */}
                    <td className="py-3.5 px-4">
                      <span className="text-emerald-400 font-bold">
                        {rankedUser.wins} vitórias
                      </span>
                      {rankedUser.losses > 0 && (
                        <span className="text-slate-500 text-[10px] ml-1.5">
                          ({rankedUser.losses}D)
                        </span>
                      )}
                    </td>

                    {/* SCORE */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-heading font-black text-amber-400 text-sm">
                        {rankedUser.rankingScore.toLocaleString()} pontos
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500 font-mono">
                    Nenhum piloto encontrado para o filtro "{search}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Highlight sticky / banner row if current user is outside Top 100 */}
        {myPosition && !isUserInFilteredList && !search && (
          <div className="p-4 bg-cyan-950/40 border-t-2 border-cyan-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-cyan-400 text-slate-950 font-black text-[10px]">
                SUA POSIÇÃO
              </span>
              <span className="text-white font-bold">
                {myPosition.username} (Você)
              </span>
              <span className="text-slate-400">• Posição #{myPosition.rank}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-300">
              <span>Level {myPosition.level}</span>
              <span>{myPosition.xp.toLocaleString()} XP</span>
              <span className="text-emerald-400">{myPosition.wins} vitórias</span>
              <span className="text-amber-400 font-black text-sm">
                {myPosition.rankingScore.toLocaleString()} pontos
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
