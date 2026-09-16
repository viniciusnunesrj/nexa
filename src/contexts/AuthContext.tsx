import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { NexaUser, RegisterData, AuthResult, LevelUpResult } from '../types';
import { authService, ProfileUpdates } from '../services/authService';
import { EconomyService } from '../services/economyService';
import { ProgressionService } from '../services/progressionService';
import { CURRENT_USER } from '../data/mockUsers';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PublicProfileService } from '../services/publicProfileService';
import type { PublicProfile } from '../types/publicProfile';

interface AuthContextType {
  currentUser: NexaUser | null;
  authError: string | null;
  user: NexaUser; // Backwards-compatible alias for existing components
  isAuthenticated: boolean;
  isFirstAccess: boolean;
  publicUsers: PublicProfile[];
  publicUsersLoading: boolean;
  publicUsersError: string | null;
  publicUsersHasMore: boolean;
  loadMorePublicUsers: () => Promise<void>;
  login: (identifier: string, password?: string) => Promise<AuthResult>;
  loginAsDemo: () => Promise<AuthResult>;
  register: (data: RegisterData) => Promise<AuthResult>;
  logout: () => void;
  switchUser: (userId: string) => void;
  syncUser: (updatedUser: NexaUser) => void;
  dismissFirstAccess: () => void;
  updateUserBalance: (deltaNEX: number, deltaNXA: number) => NexaUser | undefined;
  addXP: (amount: number) => LevelUpResult | undefined;
  addSeasonXP: (amount: number) => void;
  claimSeasonReward: (level: number) => void;
  updateUserProfile: (updates: ProfileUpdates) => Promise<NexaUser>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Legacy local sessions never unlock protected routes, even briefly.
  const [currentUser, setCurrentUser] = useState<NexaUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [directory, setDirectory] = useState<{ ownerId: string; users: PublicProfile[]; offset: number; hasMore: boolean }>({ ownerId: '', users: [], offset: 0, hasMore: true });
  const [publicUsersLoading, setPublicUsersLoading] = useState(false);
  const [publicUsersError, setPublicUsersError] = useState<string | null>(null);
  const directoryRequest = useRef(0);
  const directoryPending = useRef(false);
  const activeOperation = useRef(false);
  const revision = useRef(0);
  const mounted = useRef(false);
  const profileSavePending = useRef(false);
  const profileSaveVersion = useRef(0);

  // Dedicated authenticated directory. Never hydrate account/economy caches from it.
  const loadPublicPage = async (ownerId: string, offset: number) => {
    if (!isSupabaseConfigured() || !ownerId || directoryPending.current) return;
    directoryPending.current = true;
    const request = ++directoryRequest.current;
    setPublicUsersLoading(true);
    setPublicUsersError(null);
    try {
      const page = await PublicProfileService.fetchDirectory(ownerId, 100, offset);
      if (!mounted.current || request !== directoryRequest.current) return;
      setDirectory(previous => ({
        ownerId, offset: offset + page.length, hasMore: page.length === 100 && offset + page.length <= 1000000,
        users: Array.from(new Map([
          ...(offset > 0 && previous.ownerId === ownerId ? previous.users : []), ...page,
        ].map(profile => [profile.id, profile])).values()),
      }));
    } catch {
      if (mounted.current && request === directoryRequest.current) setPublicUsersError('Não foi possível carregar os jogadores. Tente novamente.');
    } finally {
      if (request === directoryRequest.current) {
        directoryPending.current = false;
        setPublicUsersLoading(false);
      }
    }
  };
  useEffect(() => {
    ++directoryRequest.current;
    directoryPending.current = false;
    setDirectory({ ownerId: currentUser?.id || '', users: [], offset: 0, hasMore: true });
    setPublicUsersError(null);
    setPublicUsersLoading(false);
    // Deferred until the provider is mounted; cleanup invalidates late pages.
    const timer = setTimeout(() => { if (currentUser) void loadPublicPage(currentUser.id, 0); }, 0);
    return () => { clearTimeout(timer); ++directoryRequest.current; directoryPending.current = false; };
  }, [currentUser?.id]);
  const publicUsers = currentUser && directory.ownerId === currentUser.id ? directory.users : [];
  const loadMorePublicUsers = async () => {
    if (currentUser && directory.ownerId === currentUser.id && directory.hasMore) {
      await loadPublicPage(currentUser.id, directory.offset);
    }
  };

  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const restore = async () => {
      if (disposed || activeOperation.current || profileSavePending.current) return;
      const saveVersion = profileSaveVersion.current;
      const request = ++revision.current;
      try {
        const profile = await authService.restoreCurrentUser();
        if (disposed || request !== revision.current || saveVersion !== profileSaveVersion.current || profileSavePending.current) return;
        setCurrentUser(profile);
        setAuthError(null);
      } catch (err: any) {
        if (disposed || request !== revision.current || saveVersion !== profileSaveVersion.current || profileSavePending.current) return;
        setCurrentUser(null);
        setAuthError(err?.message || 'Não foi possível verificar sua sessão no Supabase.');
      }
    };
    // Never await Supabase operations inside its auth callback (SDK auth lock).
    const listener = isSupabaseConfigured() ? supabase.auth.onAuthStateChange((event) => {
      if (disposed) return;
      if (event === 'SIGNED_OUT') {
        ++revision.current;
        authService.invalidateSession();
        setCurrentUser(null);
        return;
      }
      if (activeOperation.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => { void restore(); }, 0);
    }) : null;
    // Deferred so React StrictMode can clean up the first subscription safely.
    timer = setTimeout(() => { void restore(); }, 0);
    return () => {
      disposed = true;
      mounted.current = false;
      ++revision.current;
      clearTimeout(timer);
      listener?.data.subscription.unsubscribe();
    };
  }, []);

  const runAuth = async (operation: () => Promise<AuthResult>): Promise<AuthResult> => {
    if (activeOperation.current) return { success: false, error: 'Aguarde a autenticação em andamento.' };
    activeOperation.current = true;
    const request = ++revision.current;
    setCurrentUser(null);
    setAuthError(null);
    try {
      const result = await operation();
      if (!mounted.current || request !== revision.current) return { success: false, error: 'Autenticação interrompida. Tente novamente.' };
      if (result.success && result.user && !result.requiresEmailConfirmation) {
        setCurrentUser(result.user);
      } else if (!result.success) {
        setAuthError(result.error || 'Falha na autenticação.');
      }
      return result;
    } catch (err: any) {
      const error = err?.message || 'Falha na autenticação online.';
      if (mounted.current && request === revision.current) setAuthError(error);
      return { success: false, error };
    } finally {
      activeOperation.current = false;
    }
  };

  const login = (identifier: string, password?: string) => runAuth(() => authService.login(identifier, password));
  const register = (data: RegisterData) => runAuth(() => authService.register(data));
  const loginAsDemo = () => authService.loginAsDemo();

  const logout = () => {
    ++revision.current;
    setCurrentUser(null);
    void authService.logout().catch((err) => {
      if (mounted.current) setAuthError(err?.message || 'Não foi possível encerrar a sessão remota. Tente novamente.');
    });
  };

  // Compatibility for old callers: selecting a cached account cannot log in.
  const switchUser = (_userId: string) => {
    setAuthError('Para trocar de conta, saia e entre com e-mail e senha.');
  };

  const syncUser = (updatedUser: NexaUser) => {
    setCurrentUser(previous => previous?.id === updatedUser.id ? updatedUser : previous);
  };

  const dismissFirstAccess = () => {
    if (currentUser) {
      authService.dismissFirstAccess(currentUser.id);
      setCurrentUser((prev) => (prev ? { ...prev, isFirstAccess: false } : null));
    }
  };

  const updateUserBalance = (deltaNEX: number, deltaNXA: number): NexaUser | undefined => {
    if (!currentUser) return undefined;
    // Atualização apenas de visualização / cache local reativo
    // O banco oficial Supabase só é alterado pelas RPCs SECURITY DEFINER
    const updated: NexaUser = {
      ...currentUser,
      balanceNEX: Math.max(0, currentUser.balanceNEX + deltaNEX),
      balanceNXA: Math.max(0, currentUser.balanceNXA + deltaNXA),
    };

    EconomyService.hydrateProfileFromSupabase(updated);
    setCurrentUser(updated);
    return updated;
  };

  const addXP = (amount: number): LevelUpResult | undefined => {
    if (!currentUser) return undefined;
    const result = ProgressionService.addExperience(currentUser.id, amount);
    const updated = EconomyService.getUser(currentUser.id);
    if (updated) {
      setCurrentUser(updated);
    }
    return result;
  };

  const addSeasonXP = (amount: number) => {
    if (!currentUser) return;
    const latest = EconomyService.getUser(currentUser.id) || currentUser;
    let xp = latest.seasonXP + amount;
    let lvl = latest.seasonLevel;
    const xpPerLevel = 1000;

    while (xp >= xpPerLevel && lvl < 20) {
      xp -= xpPerLevel;
      lvl += 1;
    }

    const updated: NexaUser = {
      ...latest,
      seasonXP: xp,
      seasonLevel: lvl,
    };
    EconomyService.saveUser(updated);
    setCurrentUser(updated);
  };

  const claimSeasonReward = (level: number) => {
    if (!currentUser) return;
    const latest = EconomyService.getUser(currentUser.id) || currentUser;
    if (latest.claimedSeasonRewards.includes(level)) return;

    const updated: NexaUser = {
      ...latest,
      claimedSeasonRewards: [...latest.claimedSeasonRewards, level],
    };
    EconomyService.saveUser(updated);
    setCurrentUser(updated);
  };

  const updateUserProfile = async (updates: ProfileUpdates): Promise<NexaUser> => {
    if (!currentUser) throw new Error('Perfil autenticado indisponível.');
    if (profileSavePending.current) throw new Error('Aguarde o salvamento em andamento.');
    profileSavePending.current = true;
    profileSaveVersion.current += 1;
    const request = revision.current;
    try {
      const confirmed = await authService.updateUserProfile(currentUser.id, updates);
      if (request !== revision.current || !mounted.current) throw new Error('A sessão mudou durante o salvamento.');
      setCurrentUser(previous => previous?.id === confirmed.id ? {
        ...previous, bio: confirmed.bio, title: confirmed.title, avatar: confirmed.avatar,
      } : previous);
      return confirmed;
    } finally {
      profileSavePending.current = false;
    }
  };

  // Safe fallback for user object so components don't crash when logged out
  const fallbackUser: NexaUser = currentUser || CURRENT_USER;
  const isAuthenticated = currentUser !== null;
  const isFirstAccess = Boolean(currentUser?.isFirstAccess);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        authError,
        user: fallbackUser,
        isAuthenticated,
        isFirstAccess,
        publicUsers,
        publicUsersLoading,
        publicUsersError,
        publicUsersHasMore: Boolean(currentUser && directory.ownerId === currentUser.id && directory.hasMore),
        loadMorePublicUsers,
        login,
        loginAsDemo,
        register,
        logout,
        switchUser,
        syncUser,
        dismissFirstAccess,
        updateUserBalance,
        addXP,
        addSeasonXP,
        claimSeasonReward,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
