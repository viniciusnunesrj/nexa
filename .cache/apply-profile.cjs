const fs = require('node:fs');
let s = fs.readFileSync('src/services/supabaseService.ts', 'utf8').replace(/\r\n/g, '\n');
const a = s.indexOf('  public async updateEditableProfile(');
const b = s.indexOf('  // ==========================================================================', a);
s = s.slice(0, a) + `  public async updateEditableProfile(
    userId: string,
    updates: Partial<Pick<NexaUser, 'username' | 'avatar' | 'bio' | 'title' | 'isFirstAccess'>>
  ): Promise<void> {
    const configurationError = getSupabaseConfigurationError();
    if (configurationError) throw new Error(configurationError);
    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (updates.username !== undefined) payload.username = updates.username;
    if (updates.avatar !== undefined) payload.avatar = updates.avatar;
    if (updates.bio !== undefined) payload.bio = updates.bio;
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.isFirstAccess !== undefined) payload.is_first_access = updates.isFirstAccess;
    const { data, error } = await supabase.from('profiles').update(payload)
      .eq('id', userId).select('*').maybeSingle();
    if (error) throw new Error('Falha ao salvar perfil no Supabase: ' + error.message);
    if (!data || data.id !== userId) throw new Error('O Supabase não confirmou a atualização do perfil.');
    this.inMemoryProfiles.set(userId, mapProfileToNexaUser(data));
  }

  public async upsertProfile(user: NexaUser): Promise<NexaUser> {
    const configurationError = getSupabaseConfigurationError();
    if (configurationError) throw new Error(configurationError);
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user || data.user.id !== user.id) throw new Error('Autenticação do proprietário necessária para gravar o perfil.');
    // Never upload local balances, XP or victories, even for missing profiles.
    await this.ensureAuthenticatedProfile(data.user);
    await this.updateEditableProfile(user.id, {
      username: user.username, avatar: user.avatar, bio: user.bio,
      title: user.title, isFirstAccess: user.isFirstAccess,
    });
    const confirmed = await this.fetchRemoteProfile(user.id);
    if (!confirmed) throw new Error('Perfil não confirmado após gravação.');
    return confirmed;
  }

` + s.slice(b);
s = s.replace('  mapNexaUserToProfileRow,\n', '');
fs.writeFileSync('src/services/supabaseService.ts', s);

s = fs.readFileSync('src/services/authService.ts', 'utf8');
s = s.replace('      this.grantStarterKit(user);', '      if (index === -1) this.grantStarterKit(user);');
fs.writeFileSync('src/services/authService.ts', s);
