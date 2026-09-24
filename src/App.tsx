import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GameStateProvider, useGameState } from './contexts/GameStateContext';
import { AppLayout } from './layouts/AppLayout';
import { Chat } from './pages/Chat';

import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { Play } from './pages/Play';
import { Games } from './pages/Games';
import { Arena } from './pages/Arena';
import { Marketplace } from './pages/Marketplace';
import { Inventory } from './pages/Inventory';
import { Fusion } from './pages/Fusion';
import { Trades } from './pages/Trades';
import { Leaderboard } from './pages/Leaderboard';
import { Seasons } from './pages/Seasons';
import { HistoryPage } from './pages/History';
import { Profile } from './pages/Profile';
import { PublicProfile } from './pages/PublicProfile';
import { Boxes } from './pages/Boxes';
import { Collections } from './pages/Collections';
import { Progression } from './pages/Progression';
import { RiftBattleV2 } from './pages/RiftBattleV2';
import { LevelUpModal } from './components/progression/LevelUpModal';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

const AppContent: React.FC = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const { levelUpData, setLevelUpData } = useGameState();
  const [publicProfileId, setPublicProfileId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState<string>(() => {
    // Public landing page at /; explicit paths keep their existing behavior.
    const path = window.location.pathname.replace(/^\//, '').toLowerCase();
    if (!path) return 'home';
    if (path === 'register') return 'register';
    if (path === 'login') return 'login';
    if (path === 'reset-password') return 'reset-password';
    if (path === 'boxes' || path === 'caixas') return 'boxes';
    if (path === 'collections' || path === 'colecoes') return 'collections';
    if (path === 'progression' || path === 'progressao') return 'progression';
    if (path === 'ranking' || path === 'leaderboard') return 'ranking';
    if (path === 'play' || path === 'batalha') return 'play';
    if (path === 'games' || path === 'jogos') return 'games';
    if (path === 'arena') return 'arena';
    if (path === 'riftbattle-v2') return 'riftbattle-v2';
    return 'dashboard';
  });
  const initialPage = useRef(currentPage);
  const pendingProtectedPage = useRef<string | null>(null);

  // Keep state in sync with authentication status
  useEffect(() => {
    if (!isAuthenticated) {
      setPublicProfileId(null);
      if (currentPage !== 'home' && currentPage !== 'register' && currentPage !== 'login' && currentPage !== 'reset-password') {
        pendingProtectedPage.current = currentPage;
        setCurrentPage('login');
      }
    } else {
      if (
        (currentPage === 'login' || currentPage === 'register') &&
        (initialPage.current === 'login' || initialPage.current === 'register')
      ) {
        setCurrentPage('dashboard');
      }
    }
  }, [isAuthenticated, currentPage]);

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = () => {
    const pendingPage = pendingProtectedPage.current;
    pendingProtectedPage.current = null;
    handleNavigate(pendingPage || 'dashboard');
  };

  const openPublicProfile = (userId: string) => {
    if (!isAuthenticated || !currentUser) return;
    setPublicProfileId(userId);
    handleNavigate('public-profile');
  };

  // Public unauthenticated screens
  if (!isAuthenticated) {
    if (currentPage === 'home') {
      return <Home onNavigate={handleNavigate} />;
    }
    if (currentPage === 'register') {
      return <Register onNavigate={handleNavigate} />;
    }
    if (currentPage === 'reset-password') {
      return <ResetPassword onNavigate={handleNavigate} />;
    }
    return <Login onNavigate={handleNavigate} onSuccess={handleLoginSuccess} />;
  }

  if (currentPage === 'reset-password') {
    return <ResetPassword onNavigate={handleNavigate} />;
  }

  // Authenticated screens protected by ProtectedRoute
  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'play':
        return <Play onNavigate={handleNavigate} />;
      case 'games':
      case 'jogos':
        return <Games onNavigate={handleNavigate} />;
      case 'arena':
        return <Arena onNavigate={handleNavigate} />;
      case 'riftbattle-v2':
        return <RiftBattleV2 />;
      case 'boxes':
      case 'caixas':
        return <Boxes onNavigate={handleNavigate} />;
      case 'collections':
      case 'colecoes':
        return <Collections onNavigate={handleNavigate} />;
      case 'marketplace':
        return <Marketplace onNavigate={handleNavigate} />;
      case 'inventory':
        return <Inventory onNavigate={handleNavigate} />;
      case 'fusion':
        return <Fusion />;
      case 'trades':
        return <Trades />;
	case 'chat':
	  return <Chat />;
      case 'ranking':
      case 'leaderboard':
        return <Leaderboard onOpenProfile={openPublicProfile} />;
      case 'season':
      case 'seasons':
        return <Seasons />;
      case 'history':
        return <HistoryPage />;
      case 'profile':
        return <Profile onNavigate={handleNavigate} />;
      case 'public-profile':
        return publicProfileId
          ? <PublicProfile userId={publicProfileId} onBack={() => handleNavigate('ranking')} />
          : <Leaderboard onOpenProfile={openPublicProfile} />;
      case 'progression':
      case 'progressao':
      case 'levels':
        return <Progression onNavigate={handleNavigate} />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <ProtectedRoute onRedirectToLogin={() => handleNavigate('login')}>
      <AppLayout
  currentPage={currentPage}
  onNavigate={handleNavigate}
  onOpenProfile={openPublicProfile}
>
  {renderCurrentPage()}
</AppLayout>

      {/* Global Level Up Celebration Modal */}
      <LevelUpModal
        data={levelUpData}
        onClose={() => setLevelUpData(null)}
        onNavigate={handleNavigate}
      />
    </ProtectedRoute>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <GameStateProvider>
        <AppContent />
      </GameStateProvider>
    </AuthProvider>
  );
}
