import React, { useState } from 'react';
import {
  Menu,
  Volume2,
  VolumeX,
  ChevronDown,
  User,
  TrendingUp,
  LogOut,
  Radio,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { soundService } from '../services/soundService';
import { CurrencyBadge } from '../components/common/CurrencyBadge';

interface TopbarProps {
  onOpenMobileMenu: () => void;
  onNavigate: (page: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenMobileMenu,
  onNavigate,
}) => {
  const { user, logout } = useAuth();

  const [soundEnabled, setSoundEnabled] = useState(
    soundService.enabled !== false
  );
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const maxExp = user.maxExperience || 500;
  const currentExp = user.experience || 0;

  const xpPercentage = Math.min(
    100,
    Math.round((currentExp / maxExp) * 100)
  );

  const toggleSound = () => {
    const next = !soundEnabled;

    setSoundEnabled(next);
    soundService.enabled = next;

    if (next) {
      soundService.playClick();
    }
  };

  const navigateFromMenu = (page: string) => {
    soundService.playClick();
    setUserMenuOpen(false);
    onNavigate(page);
  };

  const handleLogout = () => {
    soundService.playClick();
    setUserMenuOpen(false);
    logout();
    onNavigate('login');
  };

  return (
    <header
      className="
        sticky top-0 z-30
        h-16
        border-b border-white/[0.08]
        bg-[#07080b]/90
        backdrop-blur-xl
      "
    >
      {/* subtle HUD line */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent pointer-events-none" />

      <div className="h-full px-3 sm:px-4 lg:px-7 flex items-center justify-between gap-3">
        {/* LEFT */}
        <div className="flex items-center min-w-0 gap-3">
          {/* Mobile navigation */}
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Abrir navegação"
            title="Abrir navegação"
            className="
              lg:hidden
              w-9 h-9 shrink-0
              rounded-xl
              border border-white/10
              bg-white/[0.035]
              text-slate-400
              flex items-center justify-center
              hover:text-cyan-300
              hover:border-cyan-500/30
              transition-colors
            "
          >
            <Menu className="w-4.5 h-4.5" />
          </button>

          {/* Nexus status */}
          <div className="hidden sm:flex items-center min-w-0">
            <div
              className="
                h-9
                px-3
                rounded-xl
                border border-emerald-500/10
                bg-emerald-500/[0.025]
                flex items-center gap-2.5
              "
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute w-2 h-2 rounded-full bg-emerald-400/40 animate-ping" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
              </div>

              <div className="flex items-center gap-2 whitespace-nowrap">
                <Radio className="w-3 h-3 text-emerald-500/70" />

                <span className="text-[9px] font-mono font-bold tracking-[0.12em] text-emerald-400 uppercase">
                  Rede Nexus
                </span>

                <span className="text-[8px] font-mono text-emerald-500/50">
                  //
                </span>

                <span className="text-[8px] font-mono font-bold tracking-wider text-emerald-500/70 uppercase">
                  Online
                </span>
              </div>
            </div>

            <div className="hidden xl:block w-px h-5 bg-white/10 mx-3" />

            {/* Season */}
            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                onNavigate('season');
              }}
              className="
                hidden xl:flex
                h-9 px-3
                items-center gap-2
                rounded-xl
                border border-transparent
                text-slate-500
                hover:text-slate-300
                hover:bg-white/[0.025]
                hover:border-white/[0.06]
                transition-all
              "
            >
              <Zap className="w-3.5 h-3.5 text-purple-400/70" />

              <span className="text-[9px] font-mono uppercase tracking-[0.12em]">
                Temporada
              </span>

              <span className="text-[9px] font-mono font-bold text-purple-300">
                S1 · ASCENSÃO
              </span>
            </button>
          </div>

          {/* Small mobile identity */}
          <div className="sm:hidden min-w-0">
            <span className="block text-[8px] font-mono font-bold uppercase tracking-[0.12em] text-emerald-400">
              Nexus Online
            </span>

            <span className="block text-[10px] font-heading font-bold text-slate-300 truncate">
              S1 · Ascensão
            </span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 min-w-0">
          {/* Economy */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <CurrencyBadge
              type="NEX"
              amount={user.balanceNEX}
              size="sm"
            />

            <CurrencyBadge
              type="NXA"
              amount={user.balanceNXA}
              size="sm"
            />
          </div>

          <div className="hidden sm:block w-px h-6 bg-white/[0.08] mx-0.5" />

          {/* Audio */}
          <button
            type="button"
            onClick={toggleSound}
            title={
              soundEnabled
                ? 'Desativar efeitos sonoros'
                : 'Ativar efeitos sonoros'
            }
            aria-label={
              soundEnabled
                ? 'Desativar efeitos sonoros'
                : 'Ativar efeitos sonoros'
            }
            className="
              hidden sm:flex
              w-9 h-9 shrink-0
              rounded-xl
              border border-white/[0.08]
              bg-white/[0.025]
              items-center justify-center
              text-slate-500
              hover:text-cyan-300
              hover:border-cyan-500/25
              hover:bg-cyan-500/[0.04]
              transition-all
            "
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-purple-400 drop-shadow-[0_0_7px_rgba(192,132,252,.45)]" />
            ) : (
              <VolumeX className="w-4 h-4 text-purple-400/70" />
            )}
          </button>

          {/* Pilot */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((value) => !value)}
              aria-expanded={userMenuOpen}
              title="Menu do piloto"
              className={`
                h-10
                flex items-center
                gap-2
                rounded-xl
                border
                transition-all
                ${
                  userMenuOpen
                    ? 'bg-cyan-500/[0.07] border-cyan-500/30'
                    : 'bg-white/[0.025] border-white/[0.08] hover:border-cyan-500/25 hover:bg-white/[0.04]'
                }
                p-1
                sm:pl-1 sm:pr-2
              `}
            >
              <div className="relative shrink-0">
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-8 h-8 rounded-lg object-cover border border-cyan-400/30 bg-slate-900"
                />

                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border-2 border-[#090a0e]" />
              </div>

              <div className="hidden md:flex flex-col min-w-[86px] max-w-[120px] text-left">
                <span className="font-heading font-bold text-[11px] leading-tight text-white truncate">
                  {user.username}
                </span>

                <div className="mt-1 flex items-center gap-2">
                  <span className="shrink-0 text-[8px] font-mono font-bold text-cyan-400 uppercase">
                    NV. {user.level}
                  </span>

                  <div className="flex-1 h-[3px] min-w-[36px] rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"
                      style={{ width: `${xpPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <ChevronDown
                className={`hidden sm:block w-3.5 h-3.5 text-slate-600 transition-transform ${
                  userMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {userMenuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Fechar menu do piloto"
                  onClick={() => setUserMenuOpen(false)}
                  className="fixed inset-0 z-40 cursor-default"
                />

                <div
                  className="
                    absolute right-0 top-full mt-2 z-50
                    w-[280px]
                    overflow-hidden
                    rounded-2xl
                    border border-white/10
                    bg-[#0a0b11]/98
                    shadow-[0_24px_80px_rgba(0,0,0,0.65)]
                    backdrop-blur-xl
                  "
                >
                  {/* Pilot card */}
                  <div className="relative p-4 overflow-hidden border-b border-white/[0.07]">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.07] via-transparent to-purple-500/[0.06] pointer-events-none" />

                    <div className="relative flex items-center gap-3">
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="w-11 h-11 rounded-xl object-cover border border-cyan-400/30 bg-slate-900"
                      />

                      <div className="min-w-0 flex-1">
                        <span className="block text-[8px] font-mono font-bold tracking-[0.15em] text-cyan-500 uppercase">
                          Piloto conectado
                        </span>

                        <span className="mt-0.5 block font-heading font-black text-sm text-white truncate">
                          {user.username}
                        </span>

                        <span className="block text-[9px] font-mono text-slate-500">
                          Nível {user.level} · Rede Nexus
                        </span>
                      </div>
                    </div>

                    {/* XP */}
                    <div className="relative mt-4">
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-slate-500">
                          Progressão
                        </span>

                        <span className="text-[8px] font-mono text-cyan-400">
                          {currentExp} / {maxExp} XP
                        </span>
                      </div>

                      <div className="h-1.5 rounded-full bg-black/50 border border-white/[0.05] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-[width] duration-500"
                          style={{ width: `${xpPercentage}%` }}
                        />
                      </div>

                      <div className="mt-1.5 flex justify-between">
                        <span className="text-[8px] font-mono text-slate-600">
                          NV. {user.level}
                        </span>

                        <span className="text-[8px] font-mono text-slate-600">
                          {xpPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => navigateFromMenu('progression')}
                      className="
                        w-full h-10 px-3
                        rounded-xl
                        flex items-center gap-3
                        text-left
                        text-slate-300
                        hover:text-cyan-200
                        hover:bg-cyan-500/[0.06]
                        transition-colors
                      "
                    >
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/[0.07] flex items-center justify-center">
                        <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                      </div>

                      <div>
                        <span className="block text-[10px] font-heading font-bold">
                          Progressão do Piloto
                        </span>

                        <span className="block text-[8px] font-mono text-slate-600">
                          Níveis, XP e recompensas
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateFromMenu('profile')}
                      className="
                        w-full h-10 px-3
                        rounded-xl
                        flex items-center gap-3
                        text-left
                        text-slate-300
                        hover:text-purple-200
                        hover:bg-purple-500/[0.06]
                        transition-colors
                      "
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-500/[0.07] flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-purple-400" />
                      </div>

                      <div>
                        <span className="block text-[10px] font-heading font-bold">
                          Meu Perfil
                        </span>

                        <span className="block text-[8px] font-mono text-slate-600">
                          Identidade pública do piloto
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="p-2 border-t border-white/[0.07]">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="
                        w-full h-9 px-3
                        rounded-xl
                        flex items-center gap-3
                        text-left
                        text-slate-500
                        hover:text-rose-300
                        hover:bg-rose-500/[0.07]
                        transition-colors
                      "
                    >
                      <LogOut className="w-3.5 h-3.5" />

                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider">
                        Encerrar sessão
                      </span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};