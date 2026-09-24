import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { KeyRound, Loader2 } from 'lucide-react';

interface ResetPasswordProps { onNavigate: (page: string) => void; }

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onNavigate }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (password.length < 8) return setMessage('A nova senha precisa ter pelo menos 8 caracteres.');
    if (password !== confirm) return setMessage('As senhas não coincidem.');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setMessage('O link expirou ou não foi possível alterar a senha. Solicite um novo link.');
    await supabase.auth.signOut({ scope: 'local' });
    onNavigate('login');
  };

  return (
    <div className="min-h-screen bg-[#070709] flex items-center justify-center p-4 text-white">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-[#0b0c14] border border-white/10 p-7 shadow-2xl space-y-4">
        <div className="flex items-center gap-2 text-cyan-400 font-heading font-bold text-xl"><KeyRound className="w-5 h-5" />Nova senha</div>
        <p className="text-xs text-slate-300 font-mono">Crie uma nova senha para sua conta NEXA.</p>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Nova senha" autoComplete="new-password" className="w-full bg-[#131422] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400 font-mono" />
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirmar nova senha" autoComplete="new-password" className="w-full bg-[#131422] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400 font-mono" />
        {message && <p className="text-xs font-mono text-amber-300">{message}</p>}
        <button disabled={loading} className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black text-sm flex justify-center">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'ALTERAR SENHA'}
        </button>
      </form>
    </div>
  );
};