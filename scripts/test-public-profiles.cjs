const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

function load(path, dependencies, extra = '', globals = {}) {
  const exports = {};
  const output = ts.transpileModule(fs.readFileSync(path, 'utf8') + extra, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(output, {
    exports, console, URL, ...globals,
    require: id => {
      if (id in dependencies) return dependencies[id];
      throw new Error(`Unexpected dependency ${id} in ${path}`);
    },
  });
  return exports;
}
function hooks() {
  let slots = [], cursor = 0, effects = [];
  return {
    react: { ...React,
      useState: initial => {
        const i = cursor++;
        if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
        return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
      },
      useEffect: callback => { effects.push(callback); },
    },
    render: (component, props) => { cursor = 0; effects = []; return component(props); },
    effects: () => effects.map(callback => callback()),
  };
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
const plain = value => JSON.parse(JSON.stringify(value));
const profile = { id: 'other', username: 'Outro', avatar: null, bio: '<script>text only</script>', title: 'Piloto', level: 7, victories: 3, defeats: 2 };
const privateFields = { email: 'private@example.test', balance_nex: 123, balance_nxa: 456, experience: 789, max_experience: 1000,
  season_xp: 100, unlocked_slots: 4, starter_pack_claimed: true, level_rewards_claimed: [1], token: 'secret', inventory: [] };
const row = { ...profile, ...privateFields };
const rankingRow = { user_id: 'other', username: 'Outro', avatar: null, title: 'Piloto', level: 7, victories: 3, defeats: 2,
  ranking_score: 928, rank_position: 101, total_users: 250, ...privateFields };
let authId = 'viewer', configured = true, failure = false, returned = [row];
const calls = [];
const supabase = {
  auth: { getUser: async () => ({ data: { user: authId ? { id: authId } : null }, error: null }) },
  rpc: async (name, args) => { calls.push({ name, args }); return failure ? { error: { message: 'private SQL error' } } : { data: returned }; },
  from: () => { throw new Error('Direct table reads are forbidden in public services'); },
};
const lib = { supabase, isSupabaseConfigured: () => configured };
const publicModule = load('src/services/publicProfileService.ts', { '../lib/supabase': lib });
const service = publicModule.PublicProfileService;

async function main() {
  assert.deepEqual(plain(publicModule.mapPublicProfile(row)), profile);
  const mappedRanking = publicModule.mapPublicRankingEntry(rankingRow);
  for (const key of Object.keys(privateFields)) assert(!(key in mappedRanking), key);
  assert(!('xp' in mappedRanking));
  assert.throws(() => publicModule.mapPublicProfile({ ...row, bio: {} }));
  assert.throws(() => publicModule.mapPublicProfile({ ...row, victories: NaN }));
  assert.deepEqual(plain(await service.fetchProfile('other', 'viewer')), profile);
  const beforeAuth = calls.length;
  authId = null;
  await assert.rejects(service.fetchProfile('other', 'viewer'), /Sessão/);
  authId = 'different-session';
  await assert.rejects(service.fetchProfile('other', 'viewer'), /Sessão/);
  authId = 'viewer';
  await assert.rejects(service.fetchProfile('other', ''), /Entre/);
  assert.equal(calls.length, beforeAuth, 'unauthenticated/mismatched requests must not call RPC');
  configured = false;
  await assert.rejects(service.fetchProfile('other', 'viewer'));
  configured = true;
  failure = true;
  await assert.rejects(service.fetchProfile('other', 'viewer'), /Não foi possível carregar/);
  failure = false;
  returned = [];
  assert.equal(await service.fetchProfile('missing', 'viewer'), null);
  returned = [row];
  await assert.rejects(service.fetchProfile('wrong', 'viewer'), /não corresponde/);
  assert.deepEqual(plain(await service.fetchDirectory('viewer', 1, 100)), [profile]);
  assert.equal(calls.at(-1).args.p_offset, 100);
  await assert.rejects(service.fetchDirectory('viewer', 101));
  returned = [rankingRow];
  const page = await service.fetchRanking('viewer', { offset: 100, search: 'Outro' });
  assert.equal(page.entries[0].rank, 101);
  assert.equal(page.totalUsers, 250);
  assert.equal(calls.at(-1).args.p_search, 'Outro');

  const ranking = load('src/services/rankingService.ts', {
    '../lib/supabase': lib, './publicProfileService': publicModule,
    './economyService': { EconomyService: { getAllUsers: () => { throw new Error('No local online fallback'); } } },
    './authService': { authService: { getAllUsers: () => { throw new Error('No cached online identities'); } } },
  });
  supabase.rpc = async (name, args) => ({ data: [{ ...rankingRow, user_id: args.p_user_id || 'other' }] });
  const result = await ranking.RankingService.fetchOnlineGlobalRanking('viewer', { offset: 100 });
  assert.equal(result.myPosition.userId, 'viewer');
  assert.equal(result.top100[0].rank, 101);
  assert(!('xp' in result.top100[0]));
  for (const key of Object.keys(privateFields)) assert(!(key in result.top100[0]), key);
  supabase.rpc = async () => ({ error: { message: 'unavailable' } });
  await assert.rejects(ranking.RankingService.fetchOnlineGlobalRanking('viewer'));
  await assert.rejects(ranking.RankingService.fetchOnlineGlobalRanking());
  console.log('PASS: allowlists, remote identity, errors, pagination and public-only ranking');

  const appHooks = hooks();
  let auth = { currentUser: { id: 'viewer' }, isAuthenticated: true };
  const authDependency = { useAuth: () => auth, AuthProvider: () => null };
  const appSource = fs.readFileSync('src/App.tsx', 'utf8');
  const dependencies = { react: appHooks.react,
    './contexts/AuthContext': authDependency,
    './contexts/GameStateContext': { useGameState: () => ({ levelUpData: null, setLevelUpData() {} }), GameStateProvider: () => null },
  };
  for (const [, names, path] of appSource.matchAll(/import \{ ([^}]+) \} from '([^']+)'/g)) {
    if (path in dependencies) continue;
    dependencies[path] = Object.fromEntries(names.split(',').map(name => [name.trim(), function Stub() {}]));
  }
  const app = load('src/App.tsx', dependencies, '\nexport { AppContent };', { window: { location: { pathname: '/ranking' }, scrollTo() {} } });
  let tree = appHooks.render(app.AppContent);
  let leaderboard = nodes(tree).find(node => node.type === dependencies['./pages/Leaderboard'].Leaderboard);
  leaderboard.props.onOpenProfile('other');
  tree = appHooks.render(app.AppContent);
  let publicPage = nodes(tree).find(node => node.type === dependencies['./pages/PublicProfile'].PublicProfile);
  assert.equal(publicPage.props.userId, 'other');
  publicPage.props.onBack();
  tree = appHooks.render(app.AppContent);
  leaderboard = nodes(tree).find(node => node.type === dependencies['./pages/Leaderboard'].Leaderboard);
  assert(leaderboard);
  leaderboard.props.onOpenProfile('viewer');
  tree = appHooks.render(app.AppContent);
  assert.equal(nodes(tree).find(node => node.type === dependencies['./pages/PublicProfile'].PublicProfile).props.userId, 'viewer');
  auth = { currentUser: null, isAuthenticated: false };
  assert(!nodes(appHooks.render(app.AppContent)).some(node => node.type === dependencies['./pages/PublicProfile'].PublicProfile));
  console.log('PASS: Ranking -> PublicProfile -> back; own profile; logout');

  const uiHooks = hooks();
  auth = { currentUser: { id: 'viewer' }, isAuthenticated: true };
  let rejectProfile = false;
  const ui = load('src/pages/PublicProfile.tsx', {
    react: uiHooks.react, '../contexts/AuthContext': authDependency,
    '../services/publicProfileService': { PublicProfileService: { fetchProfile: async () => { if (rejectProfile) throw new Error('fail'); return profile; } } },
  });
  const props = { userId: 'other', onBack() {} };
  tree = uiHooks.render(ui.PublicProfile, props);
  const cleanup = uiHooks.effects();
  await new Promise(resolve => setImmediate(resolve));
  tree = uiHooks.render(ui.PublicProfile, props);
  const children = nodes(tree).flatMap(node => React.Children.toArray(node.props?.children)).filter(value => typeof value === 'string').join(' ');
  assert(children.includes(profile.username));
  assert(children.includes(profile.bio), 'bio rendered as text');
  assert(!nodes(tree).some(node => node.props?.dangerouslySetInnerHTML));
  for (const value of ['private@example.test', 'secret', 'NEX', 'NXA']) assert(!children.includes(value));
  cleanup.forEach(fn => fn?.());
  rejectProfile = true;
  uiHooks.effects();
  await new Promise(resolve => setImmediate(resolve));
  tree = uiHooks.render(ui.PublicProfile, props);
  assert(nodes(tree).some(node => node.props?.role === 'alert'));
  auth = { currentUser: null, isAuthenticated: false };
  tree = uiHooks.render(ui.PublicProfile, props);
  assert(!nodes(tree).some(node => node.type === 'article'));
  console.log('PASS: public page text-only rendering, error and unauthenticated states');

  const sql = fs.readFileSync('supabase/migrations/20260917010000_public_profiles_additive.sql', 'utf8');
  assert.equal((sql.match(/CREATE FUNCTION public\./g) || []).length, 3);
  assert.equal((sql.match(/IF auth.uid\(\) IS NULL/g) || []).length, 3);
  assert.equal((sql.match(/SECURITY DEFINER SET search_path = pg_catalog, public/g) || []).length, 3);
  assert(!/ALTER TABLE|CREATE POLICY|DROP POLICY|CREATE OR REPLACE FUNCTION|INSERT INTO|UPDATE public\.|DELETE FROM/i.test(sql));
  assert(!/REVOKE[^;]*ON (TABLE )?public\.profiles/i.test(sql));
  assert(!/SELECT\s+p\.\*|to_jsonb\s*\(/i.test(sql));
  for (const match of sql.matchAll(/RETURNS TABLE\(([^)]*)\)/g)) {
    assert(!/email|balance|experience|season|claimed|slots|inventory|deck|token/.test(match[1]));
  }
  assert(sql.includes('s.score DESC, s.level DESC, s.experience DESC, s.victories DESC, s.id'));
  assert(sql.includes('p.level::bigint * 100 + p.victories::bigint * 50 + floor(p.experience::numeric / 10)::bigint'));
  assert.equal((sql.match(/GRANT EXECUTE ON FUNCTION public\.[^;]+ TO authenticated;/g) || []).length, 3);
  assert.equal((sql.match(/REVOKE ALL ON FUNCTION public\.[^;]+ FROM PUBLIC, anon, authenticated, service_role;/g) || []).length, 3);
  assert(sql.includes('Public contract name already exists'));
  const leaderboardSource = fs.readFileSync('src/pages/Leaderboard.tsx', 'utf8');
  assert(!leaderboardSource.includes('.xp'));
  assert(leaderboardSource.includes('const userId = isAuthenticated ? currentUser?.id : undefined'));
  for (const name of ['top1', 'top2', 'top3', 'rankedUser', 'myPosition']) assert(leaderboardSource.includes(`openProfile(${name}.userId)`));
  console.log('PASS: additive SQL contract/static checks (not PostgreSQL execution)');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
