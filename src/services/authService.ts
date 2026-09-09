import { NexaUser, RegisterData, AuthResult, StoredAuthAccount, Character, GameItem, NexaAsset } from '../types';
import { supabase, isSupabaseConfigured, getSupabaseConfigurationError } from '../lib/supabase';
import { SupabaseService } from './supabaseService';

export const AUTH_USERS_KEY = 'nexa_auth_users_db_v2';
export const AUTH_SESSION_KEY = 'nexa_auth_current_session_v2';
export const ASSETS_STORAGE_KEY = 'nexa_assets_v1';
export const AUTH_BACKUP_KEY = 'nexa_auth_before_online_v1';

class AuthServiceClass {
  private currentUser: NexaUser | null = null;
  private revision = 0;

  // Retained for existing callers. Never seed demo accounts or write remote data.
  public async ensureInitialized(): Promise<void> {}

  private requireOnline(): void {
    const error = getSupabaseConfigurationError();
    if (error) throw new Error(error);
  }

  private getStoredAccounts(): StoredAuthAccount[] {
    const raw = localStorage.getItem(AUTH_USERS_KEY);
    if (!raw) return [];
    const accounts = JSON.parse(raw);
    if (!Array.isArray(accounts)) throw new Error('Backup local de contas inválido; os dados foram preservados.');
    return accounts;
  }

  // Snapshot raw values before any hydration can replace a legacy profile.
  // If storage is full/corrupt, skip cache writes rather than destroy the backup.
  private cacheVerifiedProfile(user: NexaUser): void {
    try {
      if (!localStorage.getItem(AUTH_BACKUP_KEY)) {
        localStorage.setItem(AUTH_BACKUP_KEY, JSON.stringify({
          savedAt: new Date().toISOString(),
          accounts: localStorage.getItem(AUTH_USERS_KEY),
          session: localStorage.getItem(AUTH_SESSION_KEY),
          assets: localStorage.getItem(ASSETS_STORAGE_KEY),
        }));
      }
      const accounts = this.getStoredAccounts();
      const index = accounts.findIndex(account => account.id === user.id);
      if (index >= 0) accounts[index] = { ...accounts[index], ...user };
      else accounts.push({ ...user, passwordHash: 'remote_synced', salt: 'remote_salt' });
      localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(accounts));
      // AUTH_SESSION_KEY remains untouched as legacy backup. Only the Supabase
      // SDK persists actual authentication tokens under its own storage key.
      if (index === -1) this.grantStarterKit(user);
    } catch {
      console.warn('[AuthService] Não foi possível atualizar o cache; dados locais anteriores preservados.');
    }
  }

  private acceptProfile(user: NexaUser, revision: number): NexaUser {
    if (revision !== this.revision) throw new Error('Operação de autenticação substituída. Tente novamente.');
    this.cacheVerifiedProfile(user);
    this.currentUser = user;
    return user;
  }

  // getUser verifies the token with Supabase Auth, unlike reading local JSON.
  public async restoreCurrentUser(): Promise<NexaUser | null> {
    const revision = ++this.revision;
    this.currentUser = null;
    this.requireOnline();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) return null;
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error('Sessão não confirmada pelo Supabase. Faça login novamente.');
    const profile = await SupabaseService.ensureAuthenticatedProfile(data.user);
    return this.acceptProfile(profile, revision);
  }

  public async register(data: RegisterData): Promise<AuthResult> {
    const revision = ++this.revision;
    this.currentUser = null;
    const username = data.username.trim();
    const email = data.email.trim().toLowerCase();
    const password = data.password;
    const confirmPassword = data.confirmPassword;

    // 1. Validation: Username required and length
    if (!username) {
      return { success: false, error: 'O nome de usuário (username) é obrigatório.' };
    }
    if (username.length < 3) {
      return { success: false, error: 'O nome de usuário deve conter no mínimo 3 caracteres.' };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return { success: false, error: 'O username só pode conter letras, números, hífen e underline.' };
    }

    // 2. Validation: Valid Email
    if (!email) {
      return { success: false, error: 'O e-mail é obrigatório.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Por favor, informe um endereço de e-mail válido.' };
    }

    // 3. Validation: Password length
    if (!password) {
      return { success: false, error: 'A senha é obrigatória.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'A senha deve conter no mínimo 6 caracteres.' };
    }

    // 4. Validation: Confirm password
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return { success: false, error: 'A confirmação de senha não confere com a senha digitada.' };
    }


    let authCreated = false;
    try {
      this.requireOnline();
      const { data: authData, error } = await supabase.auth.signUp({
        email, password, options: { data: { username } },
      });
      if (error) throw error;
      if (!authData.user?.id || authData.user.identities?.length === 0) {
        throw new Error('O Supabase não confirmou um novo cadastro. Se já possui conta, confirme seu e-mail e faça login.');
      }
      authCreated = true;
      if (!authData.session) {
        // A public profile may be read while email confirmation is pending, but
        // never insert it anonymously or manufacture an authenticated session.
        const profile = await SupabaseService.fetchRemoteProfile(authData.user.id);
        if (!profile) throw new Error('Perfil correspondente não encontrado em profiles.');
        return {
          success: true,
          requiresEmailConfirmation: true,
          message: 'Cadastro e perfil confirmados no Supabase. Confirme seu e-mail antes de fazer login.',
        };
      }
      const { data: verified, error: verificationError } = await supabase.auth.getUser();
      if (verificationError) throw verificationError;
      if (!verified.user || verified.user.id !== authData.user.id) throw new Error('A sessão retornada não corresponde ao cadastro.');
      const profile = await SupabaseService.ensureAuthenticatedProfile(verified.user);
      return { success: true, user: this.acceptProfile(profile, revision) };
    } catch (err: any) {
      return { success: false, error: authCreated
        ? 'O Supabase aceitou o cadastro, mas não foi possível concluir a verificação do perfil/sessão. Confirme seu e-mail, se solicitado, e tente fazer login. Não é necessário criar outra conta. Detalhe: ' + (err?.message || 'Erro de conexão.')
        : err?.message || 'Falha de conexão com o Supabase. Nenhuma sessão local foi criada.' };
    }
  }

  private grantStarterKit(user: NexaUser): void {
    const starterChar: Character = {
      id: `char-starter-${user.id}`,
      name: 'Recruta da Vanguarda',
      type: 'Character',
      class: 'Guerreiro',
      rarity: 'Comum',
      level: 1,
      power: 450,
      experience: 0,
      maxExperience: 300,
      stats: {
        strength: 40,
        defense: 40,
        speed: 40,
      },
      edition: 'Kit Inicial',
      ownerId: user.id,
      ownerName: user.username,
      createdAt: new Date().toISOString().split('T')[0],
      description: 'Personagem de combate comum entregue aos pilotos recém-chegados ao NEXA.',
      status: 'EQUIPPED',
      isEquipped: true,
      image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
    };

    const starterWeapon: GameItem = {
      id: `wpn-starter-${user.id}`,
      name: 'Lâmina Cinética de Treino',
      type: 'Weapon',
      rarity: 'Comum',
      level: 1,
      power: 120,
      edition: 'Kit Inicial',
      ownerId: user.id,
      ownerName: user.username,
      createdAt: new Date().toISOString().split('T')[0],
      description: 'Armamento de treinamento inicial para calibragem na arena cibernética.',
      status: 'IDLE',
      image: 'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=600&auto=format&fit=crop&q=80',
      bonusStats: { stat: 'strength', value: 8 },
    };

    try {
      const stored = localStorage.getItem(ASSETS_STORAGE_KEY);
      const existingAssets: NexaAsset[] = stored ? JSON.parse(stored) : [];
      const missing = [starterChar, starterWeapon].filter(asset => !existingAssets.some(existing => existing.id === asset.id));
      if (!missing.length) return;
      const updatedAssets = [...existingAssets, ...missing];
      localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(updatedAssets));
    } catch {
      // Storage fallback
    }
  }

  public async login(identifier: string, password?: string): Promise<AuthResult> {
    const revision = ++this.revision;
    this.currentUser = null;
    try {
      this.requireOnline();
      const cleanId = identifier.trim().toLowerCase();
      if (!cleanId) throw new Error('Informe seu nome de usuário ou e-mail.');
      if (!password) throw new Error('A senha de acesso é obrigatória.');
      let email = cleanId;
      if (!cleanId.includes('@')) {
        if (!/^[a-z0-9_-]+$/.test(cleanId)) throw new Error('Nome de usuário inválido.');
        const { data: profile, error } = await supabase.from('profiles')
          .select('email').ilike('username', cleanId.replace(/_/g, '\\_')).maybeSingle();
        if (error) throw new Error('Não foi possível consultar o usuário. Tente entrar com seu e-mail.');
        if (!profile?.email) throw new Error('Perfil não encontrado. Tente entrar com seu e-mail para verificar a conta no Supabase.');
        email = profile.email;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user || !data.session || data.session.user.id !== data.user.id) throw new Error('O Supabase não retornou uma sessão válida.');
      const { data: verified, error: verificationError } = await supabase.auth.getUser();
      if (verificationError) throw verificationError;
      if (!verified.user || verified.user.id !== data.user.id) throw new Error('Não foi possível confirmar a identidade no Supabase.');
      const profile = await SupabaseService.ensureAuthenticatedProfile(verified.user);
      return { success: true, user: this.acceptProfile(profile, revision) };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro de conexão com o Supabase. Tente novamente.' };
    }
  }

  public async loginAsDemo(): Promise<AuthResult> {
    return { success: false, error: 'Acesso demo local desativado. Entre com uma conta autenticada no Supabase.' };
  }

  public invalidateSession(): void {
    ++this.revision;
    this.currentUser = null;
  }

  public async logout(): Promise<void> {
    this.invalidateSession();
    if (isSupabaseConfigured()) {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    }
  }

  public getCurrentUser(): NexaUser | null { return this.currentUser; }
  public isAuthenticated(): boolean { return this.currentUser !== null; }

  public updateUser(updatedUser: NexaUser): void {
    if (this.currentUser?.id !== updatedUser.id) return;
    this.currentUser = updatedUser;
    SupabaseService.updateEditableProfile(updatedUser.id, {
      username: updatedUser.username, avatar: updatedUser.avatar,
      bio: updatedUser.bio, title: updatedUser.title, isFirstAccess: updatedUser.isFirstAccess,
    }).catch(() => console.warn('[AuthService] Falha ao salvar alterações do perfil.'));
  }

  public dismissFirstAccess(userId: string): void {
    if (this.currentUser?.id === userId) this.updateUser({ ...this.currentUser, isFirstAccess: false });
  }

  // Legacy list is retained for existing non-authentication consumers only.
  public getAllUsers(): NexaUser[] {
    try { return this.getStoredAccounts().map(({ passwordHash, salt, ...user }) => user); }
    catch { return []; }
  }
}

export const authService = new AuthServiceClass();
export const AuthService = authService;
export { AuthServiceClass };
