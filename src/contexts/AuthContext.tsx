import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { NexaUser, RegisterData, AuthResult, LevelUpResult } from '../types';
import { authService } from '../services/authService';
import { EconomyService } from '../services/economyService';
import { ProgressionService } from '../services/progressionService';
import { CURRENT_USER } from '../data/mockUsers';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SupabaseService } from '../services/supabaseService';

interface AuthContextType {
  currentUser: NexaUser | null;
  authError: string | null;
  user: NexaUser; // Backwards-compatible alias for existing components
  isAuthenticated: boolean;
  isFirstAccess: boolean;
  allUsers: NexaUser[];
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
  updateUserProfile: (bio: string, title?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Legacy local sessions never unlock protected routes, even briefly.
  const [currentUser, setCurrentUser] = useState<NexaUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<NexaUser[]>([]);
  const activeOperation = useRef(false);
  const revision = useRef(0);
  const mounted = useRef(false);

  // Kept for existing consumers; this list cannot grant authentication.
  const refreshUsersList = async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const profiles = await SupabaseService.fetchAllProfiles();
      if (mounted.current) {
        setAllUsers(profiles);
        window.dispatchEvent(new Event('nexa_ranking_updated'));
      }
    } catch { /* Authentication does not depend on the community list. */ }
  };

  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const restore = async () => {
      if (disposed || activeOperation.current) return;
      const request = ++revision.current;
      try {
        const profile = await authService.restoreCurrentUser();
        if (disposed || request !== revision.current) return;
        setCurrentUser(profile);
        setAuthError(null);
        if (profile) void refreshUsersList();
      } catch (err: any) {
        if (disposed || request !== revision.current) return;
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
        void refreshUsersList();
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
    void refreshUsersList();
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
      refreshUsersList();
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
    refreshUsersList();
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
    refreshUsersList();
  };

  const updateUserProfile = (bio: string, title?: string) => {
    if (!currentUser) return;
    const updated: NexaUser = {
      ...currentUser,
      bio,
      title: title !== undefined ? title : currentUser.title,
    };
    setCurrentUser(updated);
    authService.updateUser(updated);
    refreshUsersList();
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
        allUsers,
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
