const fs = require('node:fs');
const write = (p, s) => fs.writeFileSync(p, s);
const read = p => fs.readFileSync(p, 'utf8');
write('src/lib/supabase.ts', `import { createClient, SupabaseClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env || {};
const supabaseUrl = (metaEnv.VITE_SUPABASE_URL || '').trim();
const supabaseAnonKey = (metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();

// Validate without logging credentials or accepting privileged server keys.
export function getSupabaseConfigurationError(): string | null {
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project') || supabaseAnonKey.includes('your-anon-key')) {
    return 'Autenticação online indisponível: configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente da aplicação e publique novamente.';
  }
  try {
    const url = new URL(supabaseUrl);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      return 'VITE_SUPABASE_URL inválida. Informe a URL base do projeto Supabase.';
    }
  } catch {
    return 'VITE_SUPABASE_URL inválida. Informe a URL base do projeto Supabase.';
  }
  if (supabaseAnonKey.startsWith('sb_publishable_')) return null;
  try {
    const parts = supabaseAnonKey.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role === 'anon') return null;
    }
  } catch {
    // Malformed keys must not silently enable local authentication.
  }
  return 'VITE_SUPABASE_ANON_KEY inválida. Use apenas a chave pública anon ou publishable; chaves secret e service_role não são permitidas no frontend.';
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfigurationError() === null;
}

// Keep imports safe without configuration. Auth operations reject this inert
// client before making requests; it is never an offline authentication provider.
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: isSupabaseConfigured(),
      autoRefreshToken: isSupabaseConfigured(),
      detectSessionInUrl: isSupabaseConfigured(),
      storageKey: 'nexa_supabase_auth_token_v1',
    },
  }
);

export const SUPABASE_STATUS = {
  isConfigured: isSupabaseConfigured(),
  url: isSupabaseConfigured() ? supabaseUrl : null,
};
`);

const original = read('src/services/authService.ts');
const kit = original.slice(original.indexOf('  private grantStarterKit('), original.indexOf('  /**\n   * Logs in with')).replace('const updatedAssets = [starterChar, starterWeapon, ...existingAssets];', `const missing = [starterChar, starterWeapon].filter(asset => !existingAssets.some(existing => existing.id === asset.id));
      if (!missing.length) return;
      const updatedAssets = [...existingAssets, ...missing];`);
// CRLF-safe extraction.
const kitStart = original.indexOf('  private grantStarterKit(');
const kitEnd = original.indexOf('  public async login(');
const kitBody = original.slice(kitStart, kitEnd).replace(/\s*\/\*\*[\s\S]*?Logs in with[\s\S]*$/, '').replace('const updatedAssets = [starterChar, starterWeapon, ...existingAssets];', `const missing = [starterChar, starterWeapon].filter(asset => !existingAssets.some(existing => existing.id === asset.id));
      if (!missing.length) return;
      const updatedAssets = [...existingAssets, ...missing];`);
const validation = original.slice(original.indexOf('    const username = data.username.trim();'), original.indexOf('    // 5. Validation:'));
write('src/services/authService.ts', `import { NexaUser, RegisterData, AuthResult, StoredAuthAccount, Character, GameItem, NexaAsset } from '../types';
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
      this.grantStarterKit(user);
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
${validation}
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

${kitBody}

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
          .select('email').ilike('username', cleanId.replace(/_/g, '\\\\_')).maybeSingle();
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
`);
