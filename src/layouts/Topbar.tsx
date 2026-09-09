import React, { useState } from 'react';
import { Menu, Volume2, VolumeX, ChevronDown, UserCheck, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { soundService } from '../services/soundService';
import { CurrencyBadge } from '../components/common/CurrencyBadge';

interface TopbarProps {
  onOpenMobileMenu: () => void;
  onNavigate: (page: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileMenu, onNavigate }) => {
  const { user, allUsers, switchUser, logout } = useAuth();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundService.enabled = next;
    if (next) soundService.playClick();
  };

  const maxExp = user.maxExperience || 500;
  const xpPercentage = Math.min(100, Math.round(((user.experience || 0) / maxExp) * 100));

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#070709]/80 backdrop-blur-xl border-b border-white/10 px-4 lg:px-8 flex items-center justify-between gap-4">
      {/* Left: Mobile trigger & Page breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-emerald-400 font-bold uppercase">Rede Nexus Ativa</span>
          <span className="text-slate-600">|</span>
          <span>Temporada 1: Ascensão</span>
        </div>
      </div>

      {/* Right: Balances, Sound, Profile Menu */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Currencies */}
        <div className="flex items-center gap-2 sm:gap-3">
          <CurrencyBadge type="NEX" amount={user.balanceNEX} size="sm" />
          <CurrencyBadge type="NXA" amount={user.balanceNXA} size="sm" />
        </div>

        {/* Audio Toggle */}
        <button
          onClick={toggleSound}
          title={soundEnabled ? 'Silenciar Áudio' : 'Ativar Efeitos Sonoros'}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/30 transition-colors"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>

        {/* Account Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/40 transition-all text-left"
          >
            <img
              src={user.avatar}
              alt={user.username}
              className="w-7 h-7 rounded-lg object-cover border border-cyan-400/50 shrink-0"
            />
            <div className="hidden md:flex flex-col">
              <span className="font-heading font-bold text-xs text-white leading-tight">
                {user.username}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-mono text-cyan-400 font-bold">Nv. {user.level}</span>
                <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${xpPercentage}%` }} />
                </div>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {userMenuOpen && (
            <>
              <div
                onClick={() => setUserMenuOpen(false)}
                className="fixed inset-0 z-40"
              />
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#0e0e17] border border-white/15 p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-white/10">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                    Alternar Conta Demo
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Troque de jogador para testar trocas e compras P2P:
                  </p>
                </div>

                <div className="py-1 space-y-1 max-h-56 overflow-y-auto">
                  {allUsers.map((u) => {
                    const isCurrent = u.id === user.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u.id);
                          setUserMenuOpen(false);
                          soundService.playClick();
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors ${
                          isCurrent
                            ? 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-200'
                            : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={u.avatar}
                            alt={u.username}
                            className="w-7 h-7 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-bold font-heading block truncate">
                              {u.username}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {u.balanceNXA} NXA • Nv. {u.level}
                            </span>
                          </div>
                        </div>
                        {isCurrent && <UserCheck className="w-4 h-4 text-cyan-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-white/10 space-y-1">
                  <button
                    onClick={() => {
                      onNavigate('progression');
                      setUserMenuOpen(false);
                      soundService.playClick();
                    }}
                    className="w-full text-center py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/25 text-xs font-mono font-bold text-cyan-300 transition-colors"
                  >
                    ⭐ Trilha de Níveis
                  </button>

                  <button
                    onClick={() => {
                      onNavigate('profile');
                      setUserMenuOpen(false);
                      soundService.playClick();
                    }}
                    className="w-full text-center py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 transition-colors"
                  >
                    Ver Perfil Completo
                  </button>

                  <button
                    onClick={() => {
                      soundService.playClick();
                      setUserMenuOpen(false);
                      logout();
                      onNavigate('login');
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-mono font-bold transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair da Conta</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
