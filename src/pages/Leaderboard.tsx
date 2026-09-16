import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { RankingService, GlobalRankingResult } from '../services/rankingService';
import {
  Trophy,
  Crown,
  Medal,
  Award,
  Sparkles,
  Search,
  ShieldCheck,
} from 'lucide-react';

export const Leaderboard: React.FC<{ onOpenProfile: (userId: string) => void }> = ({ onOpenProfile }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState<{ userId: string; search: string; offset: number; data: GlobalRankingResult } | null>(null);
  const userId = isAuthenticated ? currentUser?.id : undefined;

  useEffect(() => {
    let disposed = false;
    let running = false;
    setLoading(true);
    setError('');
    const load = async () => {
      if (disposed || running || !userId) return;
      running = true;
      try {
        const data = await RankingService.fetchOnlineGlobalRanking(userId, { offset, search });
        if (!disposed) { setSnapshot({ userId, search, offset, data }); setError(''); }
      } catch (err) {
        if (!disposed) setError(err instanceof Error ? err.message : 'Ranking indisponível.');
      } finally {
        running = false;
        if (!disposed) setLoading(false);
      }
    };
    // Debounce search and prevent overlap. No query uses the fallback user.
    const timeout = setTimeout(() => { void load(); }, 250);
    const interval = setInterval(() => { void load(); }, 4000);
    return () => { disposed = true; clearTimeout(timeout); clearInterval(interval); };
  }, [userId, search, offset, retry]);

  const visible = snapshot && snapshot.userId === userId && snapshot.search === search && snapshot.offset === offset;
  const { top100, myPosition, totalUsers } = visible ? snapshot.data : { top100: [], myPosition: null, totalUsers: 0 };
  const filteredList = top100;
  const openProfile = (id: string) => {
    if (userId) onOpenProfile(id);
  };

  const top1 = !search && offset === 0 ? top100[0] : undefined;
  const top2 = top100[1];
  const top3 = top100[2];

  const isUserInFilteredList = Boolean(myPosition && filteredList.some((e) => e.userId === myPosition.userId));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {!userId && <p role="alert">Entre na sua conta para acessar o ranking.</p>}
      {loading && userId && <p role="status" className="text-slate-400">Carregando ranking...</p>}
      {error && <div role="alert" className="text-rose-300">{error} <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>Tentar novamente</button></div>}
      {/* Ranking Command Header */}
      <section className="relative overflow-hidden rounded-2xl border border-amber-500/15 bg-gradient-to-br from-[#100d08] via-[#090a0f] to-[#07080c] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-amber-500/[0.07] blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-amber-400 uppercase tracking-[0.2em]">
            <Trophy className="w-4 h-4" /> Comunidade // Classificação Global
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-black text-white mt-2 tracking-tight">
            Ranking Global
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-mono mt-1.5 max-w-2xl leading-relaxed">
            Classificação oficial calculada no servidor. Score: <span className="text-amber-300 font-bold">(Nível × 100) + (Vitórias × 50) + ⌊XP ÷ 10⌋</span>.
          </p>
        </div>

        {/* Global Stats Pill */}
        <div className="flex items-center gap-2">
          <div className="px-4 py-3 rounded-xl bg-black/25 border border-white/[0.07] flex items-center gap-3">
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
      </section>

      {/* "MINHA POSIÇÃO" Highlight Card */}
      {myPosition && (
        <div className="relative rounded-2xl bg-gradient-to-r from-cyan-500/[0.06] via-[#090a0f] to-amber-500/[0.04] border border-cyan-500/25 p-5 overflow-hidden">
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
                    <button type="button" className="hover:underline focus-visible:outline focus-visible:outline-cyan-400" onClick={() => openProfile(myPosition.userId)} aria-label={`Ver perfil de ${myPosition.username}`}>{myPosition.username}</button>
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center font-mono">
              <div className="bg-black/30 border border-white/[0.06] p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-500 block uppercase">Nível</span>
                <span className="text-sm font-bold text-cyan-400">Nv. {myPosition.level}</span>
              </div>
              <div className="bg-black/30 border border-white/[0.06] p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-500 block uppercase">Derrotas</span>
                <span className="text-sm font-bold text-slate-200">{myPosition.losses.toLocaleString()}</span>
              </div>
              <div className="bg-black/30 border border-white/[0.06] p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-500 block uppercase">Vitórias</span>
                <span className="text-sm font-bold text-emerald-400">{myPosition.wins}V</span>
              </div>
              <div className="bg-amber-500/[0.07] border border-amber-500/25 p-2.5 rounded-xl">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-3 pb-1">
          {/* Rank 2 (Silver) */}
          <div className="order-2 sm:order-1 p-5 rounded-2xl bg-[#090a0f] border border-slate-400/20 text-center flex flex-col items-center relative overflow-hidden">
            <div className="absolute top-2 right-2 text-slate-400 font-brand font-black text-2xl">
              #2
            </div>
            <div className="relative mb-3">
              <img
                src={top2.avatar}
                alt={top2.username}
                className="w-16 h-16 rounded-xl object-cover border border-slate-300/60 bg-slate-900"
              />
              <Medal className="w-6 h-6 text-slate-300 absolute -bottom-2 -right-2 drop-shadow" />
            </div>
            <h4 className="font-heading font-bold text-white text-base truncate w-full flex items-center justify-center gap-1.5">
              <button type="button" className="hover:underline focus-visible:outline focus-visible:outline-cyan-400" onClick={() => openProfile(top2.userId)} aria-label={`Ver perfil de ${top2.username}`}>{top2.username}</button>
              {top2.isCurrentUser && (
                <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 font-mono text-[9px] font-black">
                  VOCÊ
                </span>
              )}
            </h4>
            <span className="text-[11px] font-mono text-slate-400">
              Level {top2.level} • {top2.wins} vitórias
            </span>
            <div className="mt-3 font-heading font-black text-slate-200 text-lg">
              {top2.rankingScore.toLocaleString()} pontos
            </div>
          </div>

          {/* Rank 1 (Gold - Center & Elevated) */}
          <div className="order-1 sm:order-2 p-6 rounded-2xl bg-gradient-to-b from-amber-500/[0.10] to-[#090a0f] border border-amber-400/55 text-center flex flex-col items-center relative overflow-hidden shadow-[0_0_28px_rgba(245,158,11,0.10)] sm:-translate-y-3">
            <div className="absolute top-2 right-3 text-amber-400 font-brand font-black text-3xl">
              #1
            </div>
            <Crown className="w-8 h-8 text-amber-400 mb-1" />
            <div className="relative mb-3">
              <img
                src={top1.avatar}
                alt={top1.username}
                className="w-20 h-20 rounded-xl object-cover border border-amber-400/80 shadow-[0_0_18px_rgba(245,158,11,0.16)] bg-slate-900"
              />
            </div>
            <h3 className="font-heading font-black text-white text-lg truncate w-full flex items-center justify-center gap-1.5">
              <button type="button" className="hover:underline focus-visible:outline focus-visible:outline-cyan-400" onClick={() => openProfile(top1.userId)} aria-label={`Ver perfil de ${top1.username}`}>{top1.username}</button>
              {top1.isCurrentUser && (
                <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 font-mono text-[9px] font-black">
                  VOCÊ
                </span>
              )}
            </h3>
            <span className="text-xs font-mono text-amber-300 font-semibold">
              Level {top1.level} • {top1.wins} vitórias
            </span>
            <div className="mt-4 font-heading font-black text-amber-400 text-2xl">
              {top1.rankingScore.toLocaleString()} pontos
            </div>
          </div>

          {/* Rank 3 (Bronze) */}
          {top3 && (
            <div className="order-3 p-5 rounded-2xl bg-[#090a0f] border border-amber-700/25 text-center flex flex-col items-center relative overflow-hidden">
              <div className="absolute top-2 right-2 text-amber-600 font-brand font-black text-2xl">
                #3
              </div>
              <div className="relative mb-3">
                <img
                  src={top3.avatar}
                  alt={top3.username}
                  className="w-16 h-16 rounded-xl object-cover border border-amber-600/60 bg-slate-900"
                />
                <Award className="w-6 h-6 text-amber-600 absolute -bottom-2 -right-2 drop-shadow" />
              </div>
              <h4 className="font-heading font-bold text-white text-base truncate w-full flex items-center justify-center gap-1.5">
                <button type="button" className="hover:underline focus-visible:outline focus-visible:outline-cyan-400" onClick={() => openProfile(top3.userId)} aria-label={`Ver perfil de ${top3.username}`}>{top3.username}</button>
                {top3.isCurrentUser && (
                  <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 font-mono text-[9px] font-black">
                    VOCÊ
                  </span>
                )}
              </h4>
              <span className="text-[11px] font-mono text-slate-400">
                Level {top3.level} • {top3.wins} vitórias
              </span>
              <div className="mt-3 font-heading font-black text-amber-600 text-lg">
                {top3.rankingScore.toLocaleString()} pontos
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Ranking Table Card */}
      <div className="rounded-2xl bg-[#090a0f] border border-white/[0.08] overflow-hidden">
        {/* Table Filter / Search Header */}
        <div className="p-4 border-b border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.015]">
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-white text-sm">
              Ranking de Pilotos
            </span>
            <span className="text-xs font-mono text-slate-400">
              ({filteredList.length} exibidos)
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              maxLength={100}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
              placeholder="Buscar piloto..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/30 border border-white/[0.07] text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/35"
            />
          </div>
        </div>

        {/* Global Ranking Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-white/[0.025] text-slate-500 uppercase text-[9px] border-b border-white/[0.07] tracking-[0.12em]">
              <tr>
                <th className="py-3.5 px-4">POSIÇÃO</th>
                <th className="py-3.5 px-4">JOGADOR</th>
                <th className="py-3.5 px-4">LEVEL</th>
                <th className="py-3.5 px-4">DERROTAS</th>
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
                              <button type="button" className="hover:underline focus-visible:outline focus-visible:outline-cyan-400" onClick={() => openProfile(rankedUser.userId)} aria-label={`Ver perfil de ${rankedUser.username}`}>{rankedUser.username}</button>
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
                      {rankedUser.losses.toLocaleString()} derrotas
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

        <div className="flex justify-between items-center p-4 border-t border-white/[0.06] text-xs font-mono text-slate-400">
        <button type="button" disabled={!userId || loading || offset === 0} className="disabled:opacity-40" onClick={() => setOffset(value => Math.max(0, value - 100))}>Anterior</button>
        <span>Página {Math.floor(offset / 100) + 1}</span>
        <button type="button" disabled={!userId || loading || !!error || filteredList.length < 100 || offset >= 1000000 || (!search && offset + 100 >= totalUsers)} className="disabled:opacity-40" onClick={() => setOffset(value => value + 100)}>Próxima</button>
      </div>
      {/* Highlight sticky / banner row if current user is outside Top 100 */}
        {myPosition && !isUserInFilteredList && !search && (
          <div className="p-4 bg-cyan-950/40 border-t-2 border-cyan-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-cyan-400 text-slate-950 font-black text-[10px]">
                SUA POSIÇÃO
              </span>
              <span className="text-white font-bold">
                <button type="button" className="hover:underline focus-visible:outline focus-visible:outline-cyan-400" onClick={() => openProfile(myPosition.userId)} aria-label={`Ver perfil de ${myPosition.username}`}>{myPosition.username}</button> (Você)
              </span>
              <span className="text-slate-400">• Posição #{myPosition.rank}</span>
            </div>
            <div className="flex items-center gap-4 text-slate-300">
              <span>Level {myPosition.level}</span>
              <span>{myPosition.losses.toLocaleString()} derrotas</span>
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
