import { formatEconomicValue } from '../utils/formatEconomicValue';
import React from 'react';
import {
  LayoutDashboard,
  Swords,
  ShoppingBag,
  Package,
  Gift,
  Layers,
  Flame,
  ArrowLeftRight,
  Trophy,
  Calendar,
  History,
  User,
  LogOut,
  RefreshCw,
  TrendingUp,
  MessageCircle,
  ChevronLeft,
  Gamepad2,
} from 'lucide-react';
import { useGameState } from '../contexts/GameStateContext';
import { useAuth } from '../contexts/AuthContext';
import { soundService } from '../services/soundService';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpenMobile = false,
  onCloseMobile,
  collapsed = false,
  onToggleCollapsed,
}) => {
  const { trades, resetAllDemoData, boxes } = useGameState();
  const { user, logout } = useAuth();

  const pendingTradesCount = trades.filter(
    (trade) =>
      trade.status === 'PENDING' &&
      trade.receiverId === user.id
  ).length;

  const myBoxesCount = boxes.filter(
    (box) => box.ownerId === user.id
  ).length;

  const navGroups = [
    {
      label: 'CENTRAL',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      label: 'JOGAR',
      items: [
        {
          id: 'games',
          label: 'Jogos',
          icon: Gamepad2,
        },
        {
          id: 'progression',
          label: 'Progressão / Níveis',
          icon: TrendingUp,
        },
        {
          id: 'season',
          label: 'Temporada S1',
          icon: Calendar,
        },
      ],
    },
    {
      label: 'ARSENAL',
      items: [
        {
          id: 'boxes',
          label: 'Caixas',
          icon: Gift,
          badge: myBoxesCount > 0 ? myBoxesCount : undefined,
        },
        {
          id: 'collections',
          label: 'Coleções',
          icon: Layers,
        },
        {
          id: 'inventory',
          label: 'Inventário',
          icon: Package,
        },
        {
          id: 'fusion',
          label: 'Fusão no Reator',
          icon: Flame,
        },
      ],
    },
    {
      label: 'MERCADO',
      items: [
        {
          id: 'marketplace',
          label: 'Marketplace',
          icon: ShoppingBag,
        },
        {
          id: 'trades',
          label: 'Trades P2P',
          icon: ArrowLeftRight,
          badge:
            pendingTradesCount > 0
              ? pendingTradesCount
              : undefined,
        },
      ],
    },
    {
      label: 'COMUNIDADE',
      items: [
        {
          id: 'chat',
          label: 'Chat Global',
          icon: MessageCircle,
        },
        {
          id: 'ranking',
          label: 'Ranking Global',
          icon: Trophy,
        },
        {
          id: 'history',
          label: 'Histórico & Análise',
          icon: History,
        },
        {
          id: 'profile',
          label: 'Meu Perfil',
          icon: User,
        },
      ],
    },
  ];

  const handleNav = (id: string) => {
    soundService.playClick();
    onNavigate(id);

    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const handleLogout = () => {
    soundService.playClick();
    logout();
    onNavigate('login');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50
          w-64
          ${collapsed ? 'lg:w-[76px]' : 'lg:w-64'}
          bg-[#09090f]/95
          border-r border-white/10
          flex flex-col
          backdrop-blur-xl
          transition-[width,transform] duration-300 ease-out
          lg:translate-x-0
          ${
            isOpenMobile
              ? 'translate-x-0'
              : '-translate-x-full'
          }
        `}
      >
        {/* Brand */}
        <div
          className={`
            relative h-16 shrink-0
            border-b border-white/10
            flex items-center
            ${
              collapsed
                ? 'lg:justify-center lg:px-2 px-5'
                : 'px-5'
            }
          `}
        >
          <button
            type="button"
            onClick={() => handleNav('dashboard')}
            title={collapsed ? 'NEXA' : undefined}
            className="flex items-center gap-2.5 min-w-0 group"
          >
            <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-tr from-cyan-600 via-cyan-400 to-indigo-600 flex items-center justify-center font-brand font-bold text-slate-950 text-sm shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform">
              N
            </div>

            <div
              className={`flex flex-col text-left ${
                collapsed ? 'lg:hidden' : ''
              }`}
            >
              <span className="font-brand font-black text-lg leading-none tracking-wider text-white group-hover:text-cyan-400 transition-colors">
                NEXA
              </span>

              <span className="mt-1 text-[8px] font-mono text-cyan-400 tracking-[0.18em] uppercase whitespace-nowrap">
                Game & Market
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            className={`
              hidden lg:flex
              absolute top-[72px] -right-3 z-20
              w-6 h-6
              items-center justify-center
              rounded-full
              bg-[#11111a]
              border border-white/15
              text-slate-400
              hover:text-cyan-300
              hover:border-cyan-500/50
              shadow-lg
              transition-all
              ${collapsed ? 'rotate-180' : ''}
            `}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Navigation */}
        <nav
          className={`
            flex-1 min-h-0 overflow-y-auto
            py-3
            ${collapsed ? 'lg:px-2 px-3' : 'px-3'}
            scrollbar-thin
          `}
        >
          <div className="space-y-3">
            {navGroups.map((group) => (
              <div key={group.label}>
                <div
                  className={`mb-1 px-2 flex items-center gap-2 ${
                    collapsed ? 'lg:hidden' : ''
                  }`}
                >
                  <span className="text-[8px] font-mono font-bold tracking-[0.16em] text-slate-600">
                    {group.label}
                  </span>

                  <div className="h-px flex-1 bg-white/5" />
                </div>

                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        title={collapsed ? item.label : undefined}
                        onClick={() => handleNav(item.id)}
                        className={`
                          group relative w-full h-9
                          flex items-center
                          rounded-lg
                          border
                          font-heading font-semibold
                          text-[12px]
                          transition-all
                          ${
                            collapsed
                              ? 'lg:justify-center lg:px-0 px-2.5'
                              : 'justify-between px-2.5'
                          }
                          ${
                            isActive
                              ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 shadow-[inset_2px_0_0_rgba(34,211,238,0.9),0_0_15px_rgba(6,182,212,0.07)]'
                              : 'highlight' in item && item.highlight
                              ? 'border-transparent text-cyan-400 hover:bg-cyan-500/[0.07]'
                              : 'border-transparent text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                          }
                        `}
                      >
                        <div
                          className={`
                            flex items-center min-w-0
                            ${collapsed ? 'lg:gap-0 gap-2.5' : 'gap-2.5'}
                          `}
                        >
                          <div
                            className={`
                              w-7 h-7 shrink-0
                              rounded-lg
                              flex items-center justify-center
                              transition-colors
                              ${
                                isActive
                                  ? 'bg-cyan-500/10'
                                  : 'bg-white/[0.02] group-hover:bg-white/[0.05]'
                              }
                            `}
                          >
                            <Icon
                              className={`w-4 h-4 ${
                                isActive || ('highlight' in item && item.highlight)
                                  ? 'text-cyan-400'
                                  : 'text-slate-500 group-hover:text-slate-300'
                              }`}
                            />
                          </div>

                          <span
                            className={`truncate ${
                              collapsed ? 'lg:hidden' : ''
                            }`}
                          >
                            {item.label}
                          </span>
                        </div>

                        {item.badge !== undefined && (
                          <span
                            className={`
                              min-w-[18px] h-[18px]
                              px-1
                              rounded-md
                              bg-purple-500/15
                              border border-purple-400/25
                              text-purple-300
                              text-[8px]
                              font-mono font-bold
                              flex items-center justify-center
                              ${
                                collapsed
                                  ? 'lg:absolute lg:-top-1 lg:-right-1'
                                  : 'ml-2'
                              }
                            `}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Footer expandido */}
        <div
          className={`
            shrink-0 border-t border-white/10 bg-black/40
            ${collapsed ? 'lg:hidden' : ''}
          `}
        >
          <div className="p-2.5">
            <div className="p-2.5 rounded-xl bg-white/[0.035] border border-white/10">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleNav('profile')}
                  className="flex items-center gap-2 min-w-0 text-left group"
                >
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-8 h-8 rounded-lg object-cover border border-cyan-500/30 shrink-0"
                  />

                  <div className="min-w-0">
                    <span className="font-heading font-bold text-[11px] text-white block truncate group-hover:text-cyan-300 transition-colors">
                      {user.username}
                    </span>

                    <span className="text-[9px] font-mono text-cyan-500">
                      Nv. {user.level} Piloto
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sair da conta"
                  className="w-8 h-8 shrink-0 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 flex items-center justify-center transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-white/5 font-mono">
                <div className="px-2 py-1 rounded-md bg-cyan-950/30 border border-cyan-500/15 flex items-center justify-between gap-1">
                  <span className="text-[8px] text-cyan-600">
                    NEX
                  </span>

                  <span className="text-[9px] font-bold text-cyan-300 truncate">
                    {formatEconomicValue(user.balanceNEX)}
                  </span>
                </div>

                <div className="px-2 py-1 rounded-md bg-amber-950/30 border border-amber-500/15 flex items-center justify-between gap-1">
                  <span className="text-[8px] text-amber-600">
                    NXA
                  </span>

                  <span className="text-[9px] font-bold text-amber-300 truncate">
                    {formatEconomicValue(user.balanceNXA)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer compacto */}
        <div
          className={`
            hidden shrink-0 border-t border-white/10 bg-black/40 py-3
            ${collapsed ? 'lg:flex lg:flex-col lg:items-center lg:gap-2' : ''}
          `}
        >
          <button
            type="button"
            onClick={() => handleNav('profile')}
            title={`Meu Perfil — ${user.username}`}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors"
          >
            <img
              src={user.avatar}
              alt={user.username}
              className="w-8 h-8 rounded-lg object-cover border border-cyan-500/30"
            />
          </button>

          <button
            type="button"
            onClick={handleLogout}
            title="Sair da conta"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
