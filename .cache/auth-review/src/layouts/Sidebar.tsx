import React from 'react';
import {
  LayoutDashboard,
  Swords,
  ShoppingBag,
  Package,
  PackageOpen,
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
} from 'lucide-react';
import { useGameState } from '../contexts/GameStateContext';
import { useAuth } from '../contexts/AuthContext';
import { soundService } from '../services/soundService';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const { trades, resetAllDemoData, boxes } = useGameState();
  const { user, logout } = useAuth();

  const pendingTradesCount = trades.filter(
    (t) => t.status === 'PENDING' && t.receiverId === user.id
  ).length;

  const myBoxesCount = boxes.filter((b) => b.ownerId === user.id).length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'play', label: 'Jogar & Batalhar', icon: Swords, highlight: true },
    { id: 'progression', label: '⭐ Progressão / Níveis', icon: TrendingUp },
    { id: 'boxes', label: '🎁 CAIXAS', icon: Gift, badge: myBoxesCount > 0 ? myBoxesCount : undefined },
    { id: 'collections', label: '🏆 COLEÇÕES', icon: Layers },
    { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
    { id: 'inventory', label: 'Inventário', icon: Package },
    { id: 'fusion', label: 'Fusão no Reator', icon: Flame },
    {
      id: 'trades',
      label: 'Trades P2P',
      icon: ArrowLeftRight,
      badge: pendingTradesCount > 0 ? pendingTradesCount : undefined,
    },
    { id: 'ranking', label: 'Ranking Global', icon: Trophy },
    { id: 'season', label: 'Temporada S1', icon: Calendar },
    { id: 'history', label: 'Histórico & Análise', icon: History },
    { id: 'profile', label: 'Meu Perfil', icon: User },
  ];

  const handleNav = (id: string) => {
    soundService.playClick();
    onNavigate(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#09090f]/95 border-r border-white/10 flex flex-col justify-between transition-transform duration-300 backdrop-blur-xl lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="h-16 px-6 border-b border-white/10 flex items-center justify-between">
            <div
              onClick={() => handleNav('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 via-cyan-400 to-indigo-600 flex items-center justify-center font-brand font-bold text-slate-950 text-sm shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:scale-105 transition-transform">
                N
              </div>
              <div className="flex flex-col">
                <span className="font-brand font-black text-lg tracking-wider text-white group-hover:text-cyan-400 transition-colors">
                  NEXA
                </span>
                <span className="text-[9px] font-mono text-cyan-400 tracking-widest uppercase">
                  Game & Market
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-heading font-semibold text-sm transition-all text-left ${
                    isActive
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                      : item.highlight
                      ? 'text-cyan-400 hover:bg-cyan-950/30 hover:text-cyan-200'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive
                          ? 'text-cyan-400'
                          : item.highlight
                          ? 'text-cyan-400 animate-pulse'
                          : 'text-slate-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-600 text-white shadow-[0_0_8px_rgba(168,85,247,0.5)]">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer info & quick reset */}
        <div className="p-3 border-t border-white/10 space-y-2 bg-black/40">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-9 h-9 rounded-xl object-cover border border-cyan-500/40 shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                />
                <div className="min-w-0">
                  <span className="font-heading font-bold text-xs text-white block truncate">
                    {user.username}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                    Nv. {user.level} Piloto
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  soundService.playClick();
                  logout();
                  onNavigate('login');
                }}
                title="Sair da Conta"
                className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5 text-xs font-mono font-bold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>

            {/* Currency Balances in Sidebar */}
            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-white/5 font-mono text-[11px]">
              <div className="px-2 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-cyan-300 flex items-center justify-between">
                <span className="text-[9px] text-cyan-500">NEX</span>
                <span className="font-bold">{user.balanceNEX.toLocaleString()}</span>
              </div>
              <div className="px-2 py-1 rounded-lg bg-amber-950/40 border border-amber-500/20 text-amber-300 flex items-center justify-between">
                <span className="text-[9px] text-amber-500">NXA</span>
                <span className="font-bold">{user.balanceNXA.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (window.confirm('Deseja restaurar os dados de demonstração originais do NEXA?')) {
                resetAllDemoData();
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-1 rounded-lg text-[10px] font-mono text-slate-500 hover:text-cyan-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Restaurar Dados Demo
          </button>
        </div>
      </aside>
    </>
  );
};
