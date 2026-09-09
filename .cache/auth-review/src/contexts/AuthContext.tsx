import React, { createContext, useContext, useState, useEffect } from 'react';
import { NexaUser, RegisterData, AuthResult, LevelUpResult } from '../types';
import { authService } from '../services/authService';
import { EconomyService } from '../services/economyService';
import { ProgressionService } from '../services/progressionService';
import { CURRENT_USER } from '../data/mockUsers';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SupabaseService } from '../services/supabaseService';

interface AuthContextType {
  currentUser: NexaUser | null;
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
  // Try to restore user from active local session
  const [currentUser, setCurrentUser] = useState<NexaUser | null>(() => {
    const session = authService.getCurrentUser();
    if (session) {
      // Always hydrate with latest state from EconomyService database if available
      const persisted = EconomyService.getUser(session.id);
      return persisted || session;
    }
    return null;
  });

  const [allUsers, setAllUsers] = useState<NexaUser[]>(() => {
    const users = EconomyService.getAllUsers();
    return users.length > 0 ? users : authService.getAllUsers();
  });

  // Refresh user list from Supabase profiles as source of truth
  const refreshUsersList = async () => {
    if (isSupabaseConfigured()) {
      try {
        const profiles = await SupabaseService.fetchAllProfiles();
        if (profiles.length > 0) {
          setAllUsers(profiles);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('nexa_ranking_updated'));
          }
          return;
        }
      } catch (err) {
        console.warn('[AuthContext] Erro ao sincronizar perfis do Supabase:', err);
      }
    }
    const users = EconomyService.getAllUsers();
    setAllUsers(users.length > 0 ? users : authService.getAllUsers());
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('nexa_ranking_updated'));
    }
  };

  // Mount initialization: sync profiles from Supabase and check active Supabase Auth session
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      await authService.ensureInitialized();
      await refreshUsersList();

      if (isSupabaseConfigured()) {
        try {
          const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            const profile = await SupabaseService.fetchProfile(sessionData.session.user.id);
            if (profile && isMounted) {
              EconomyService.hydrateProfileFromSupabase(profile);
              setCurrentUser(profile);
              await refreshUsersList();
            }
          } else {
            // Se o Supabase está configurado e NÃO há sessão no Supabase Auth,
            // desvalida login fake de localStorage (exceto demo offline explícito)
            const cached = authService.getCurrentUser();
            if (cached && cached.id !== 'usr_demo' && !cached.id.startsWith('demo')) {
              authService.logout();
              if (isMounted) setCurrentUser(null);
            }
          }
        } catch (err) {
          console.warn('[AuthContext] Falha ao recuperar sessão oficial do Supabase:', err);
        }

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.user) {
            const profile = await SupabaseService.fetchProfile(session.user.id);
            if (profile && isMounted) {
              EconomyService.hydrateProfileFromSupabase(profile);
              setCurrentUser(profile);
              await refreshUsersList();
            }
          } else if (event === 'SIGNED_OUT') {
            if (isMounted) {
              authService.logout();
              setCurrentUser(null);
              await refreshUsersList();
            }
          }
        });

        return () => {
          authListener.subscription.unsubscribe();
        };
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (identifier: string, password?: string): Promise<AuthResult> => {
    const result = await authService.login(identifier, password);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      refreshUsersList();
    }
    return result;
  };

  const loginAsDemo = async (): Promise<AuthResult> => {
    const result = await authService.loginAsDemo();
    if (result.success && result.user) {
      setCurrentUser(result.user);
      refreshUsersList();
    }
    return result;
  };

  const register = async (data: RegisterData): Promise<AuthResult> => {
    const result = await authService.register(data);
    if (result.success && result.user) {
      setCurrentUser(result.user);
      refreshUsersList();
    }
    return result;
  };

  const logout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  const switchUser = (userId: string) => {
    const target = allUsers.find((u) => u.id === userId);
    if (target) {
      authService.updateUser(target);
      setCurrentUser(target);
    }
  };

  const syncUser = (updatedUser: NexaUser) => {
    setCurrentUser(updatedUser);
    refreshUsersList();
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
