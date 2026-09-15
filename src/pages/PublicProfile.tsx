import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PublicProfileService } from '../services/publicProfileService';
import type { PublicProfile as ProfileData } from '../types/publicProfile';

export const PublicProfile: React.FC<{ userId: string; onBack: () => void }> = ({ userId, onBack }) => {
  const { currentUser, isAuthenticated } = useAuth();
  const viewerId = isAuthenticated ? currentUser?.id : undefined;
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ viewerId: string; userId: string; profile: ProfileData | null; error: string } | null>(null);
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    if (viewerId) {
      PublicProfileService.fetchProfile(userId, viewerId).then(profile => {
        if (!cancelled) setResult({ viewerId, userId, profile, error: '' });
      }).catch(() => {
        if (!cancelled) setResult({ viewerId, userId, profile: null, error: 'Não foi possível carregar o perfil público. Tente novamente.' });
      });
    }
    return () => { cancelled = true; };
  }, [viewerId, userId, retry]);

  const visible = result && result.viewerId === viewerId && result.userId === userId ? result : null;
  const profile = visible?.profile;
  let avatar: string | null = null;
  if (profile?.avatar) {
    try {
      const url = new URL(profile.avatar);
      if (['https:', 'http:'].includes(url.protocol)) avatar = url.href;
    } catch { /* Show initials for invalid URLs. */ }
  }

  return (
    <section className="max-w-3xl mx-auto space-y-5">
      <button type="button" onClick={onBack} className="text-cyan-300 hover:underline">← Voltar ao Ranking</button>
      <h1 className="text-2xl font-bold text-white">Perfil público</h1>
      {!viewerId ? <p role="alert">Entre na sua conta para acessar perfis públicos.</p>
        : !visible ? <p role="status" className="text-slate-400">Carregando perfil...</p>
        : visible.error ? <div role="alert" className="text-rose-300">{visible.error} <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>Tentar novamente</button></div>
        : !profile ? <p className="text-slate-400">Jogador não encontrado.</p>
        : <article className="rounded-2xl bg-slate-950 border border-cyan-500/20 p-6 space-y-6">
          <header className="flex items-center gap-4">
            {avatar && failedAvatar !== avatar ? <img src={avatar} alt={profile.username} referrerPolicy="no-referrer" onError={() => setFailedAvatar(avatar)} className="w-20 h-20 rounded-2xl object-cover" />
              : <span className="w-20 h-20 rounded-2xl bg-cyan-950 flex items-center justify-center text-3xl text-cyan-200" aria-hidden="true">{profile.username.slice(0, 1).toUpperCase()}</span>}
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white break-words">{profile.username}</h2>
              <p className="text-cyan-300 break-words">{profile.title || 'Sem título'}</p>
            </div>
          </header>
          <p className="text-slate-300 whitespace-pre-wrap break-words">{profile.bio || 'Este jogador ainda não escreveu uma bio.'}</p>
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div><dt className="text-slate-400 text-sm">Nível</dt><dd className="text-cyan-300 text-xl font-bold">{profile.level}</dd></div>
            <div><dt className="text-slate-400 text-sm">Vitórias</dt><dd className="text-emerald-300 text-xl font-bold">{profile.victories}</dd></div>
            <div><dt className="text-slate-400 text-sm">Derrotas</dt><dd className="text-slate-200 text-xl font-bold">{profile.defeats}</dd></div>
          </dl>
        </article>}
    </section>
  );
};
