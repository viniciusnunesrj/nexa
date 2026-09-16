import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ToastContainer } from '../components/common/ToastContainer';
import { GlobalChatPanel } from '../components/common/GlobalChatPanel';

interface AppLayoutProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenProfile: (userId: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentPage,
  onNavigate,
  onOpenProfile,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const handleNavigate = (page: string) => {
    if (page === 'chat') {
      setChatOpen(true);
      setMobileMenuOpen(false);
      return;
    }

    onNavigate(page);
  };

  const handleOpenProfile = (userId: string) => {
    setChatOpen(false);
    onOpenProfile(userId);
  };

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100">
      <Sidebar
        currentPage={chatOpen ? 'chat' : currentPage}
        onNavigate={handleNavigate}
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() =>
          setSidebarCollapsed((value) => !value)
        }
      />

      <div
        className={`min-h-screen flex flex-col min-w-0 transition-[padding] duration-300 ease-out ${
          sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-64'
        }`}
      >
        <Topbar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onNavigate={handleNavigate}
        />

        <main className="relative flex-1 w-full">
          {/* Ambient background */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="absolute -top-48 left-[20%] w-[520px] h-[520px] rounded-full bg-cyan-500/[0.025] blur-[120px]" />
            <div className="absolute top-[35%] right-[8%] w-[420px] h-[420px] rounded-full bg-purple-500/[0.025] blur-[120px]" />
          </div>

          {/* Page content */}
          <div className="relative z-10 w-full max-w-[1440px] mx-auto p-4 sm:p-6 lg:px-8 lg:py-7">
            {children}
          </div>
        </main>
      </div>

      <GlobalChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        onOpenProfile={handleOpenProfile}
      />

      {!chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          title="Abrir Chat Global"
          aria-label="Abrir Chat Global"
          className="
            fixed z-40
            right-4 bottom-4
            sm:right-6 sm:bottom-6
            w-12 h-12
            rounded-2xl
            bg-[#0c1118]/95
            border border-cyan-500/30
            text-cyan-300
            shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_25px_rgba(6,182,212,0.12)]
            backdrop-blur-xl
            flex items-center justify-center
            hover:bg-cyan-500/10
            hover:border-cyan-400/50
            hover:text-cyan-200
            hover:-translate-y-0.5
            active:translate-y-0
            transition-all
          "
        >
          <span className="absolute inset-0 rounded-2xl bg-cyan-400/[0.03]" />

          <MessageCircle className="relative w-5 h-5" />

          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 border-2 border-[#0c1118] shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
        </button>
      )}

      <ToastContainer />
    </div>
  );
};