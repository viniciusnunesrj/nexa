const fs = require('node:fs');
let s = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8').replace(/\r\n/g, '\n');
s = s.replace('useState, useEffect', 'useState, useEffect, useRef');
s = s.replace('  currentUser: NexaUser | null;', '  currentUser: NexaUser | null;\n  authError: string | null;');
const start = s.indexOf('  // Try to restore');
const end = s.indexOf('  const dismissFirstAccess');
s = s.slice(0, start) + `  // Legacy local sessions never unlock protected routes, even briefly.
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

` + s.slice(end);
s = s.replace('        currentUser,\n', '        currentUser,\n        authError,\n');
fs.writeFileSync('src/contexts/AuthContext.tsx', s);

s = fs.readFileSync('src/pages/Login.tsx', 'utf8').replace(/\r\n/g, '\n');
s = s.replace('const { login, loginAsDemo, allUsers, switchUser } = useAuth();', 'const { login, authError } = useAuth();');
s = s.replace("  const [isDemoLoading, setIsDemoLoading] = useState(false);\n", '');
s = s.slice(0, s.indexOf('  const handleDemoLogin')) + s.slice(s.indexOf('  return (', s.indexOf('  const handleQuickAccountSelect')));
s = s.slice(0, s.indexOf('        {/* Demo Fast')) + s.slice(s.indexOf('        {/* Error Feedback'));
s = s.replaceAll('isLoading || isDemoLoading', 'isLoading');
s = s.replace('{error && (', '{(error || authError) && (').replace('<span>{error}</span>', '<span role="alert">{error || authError}</span>');
s = s.replace('if (result.success) {', 'if (result.success && result.user) {');
s = s.replace('Autenticação local para desenvolvimento (MVP). Sem blockchain/cripto.', 'Acesso online pelo Supabase. Contas locais antigas permanecem preservadas neste navegador.');
const modalStart = s.indexOf('            <p className="text-xs text-slate-300');
const modalEnd = s.indexOf('            <button', modalStart);
s = s.slice(0, modalStart) + `            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              A recuperação de senha ainda não está disponível nesta tela. Entre em contato com o suporte do NEXA para recuperar sua conta.
            </p>

` + s.slice(modalEnd);
fs.writeFileSync('src/pages/Login.tsx', s);

s = fs.readFileSync('src/pages/Register.tsx', 'utf8').replace(/\r\n/g, '\n');
s = s.replace('const { register } = useAuth();', 'const { register, authError } = useAuth();');
s = s.replace('  const [isLoading', '  const [message, setMessage] = useState<string | null>(null);\n  const [isLoading');
s = s.replace('    setError(null);', '    setError(null);\n    setMessage(null);');
s = s.replace('      if (result.success) {', `      if (result.success && result.requiresEmailConfirmation) {
        setPassword('');
        setConfirmPassword('');
        setMessage(result.message || 'Confirme seu e-mail e faça login para continuar.');
      } else if (result.success && result.user) {`);
s = s.replace('{error && (', '{(error || authError) && (').replace('<span>{error}</span>', '<span role="alert">{error || authError}</span>');
s = s.replace('        {/* Registration Form */}', `        {message && (
          <div role="status" className="mb-5 p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-200 text-sm">
            {message}
          </div>
        )}

        {/* Registration Form */}`);
s = s.replace('Armazenamento local seguro (MVP). Suas credenciais serão preservadas neste navegador.', 'Cadastro online pelo Supabase. Seu progresso local anterior será preservado.');
fs.writeFileSync('src/pages/Register.tsx', s);
