// No network/Supabase. Frontend contracts and SQL run only in in-memory PGlite.
// Runtime: npm install --prefix <temporary-dir> --ignore-scripts --save-exact @electric-sql/pglite@0.5.8
// NEXA_PGLITE_PATH can point to that node_modules/@electric-sql/pglite directory.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (mod, file) => mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, file);
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const { starRequirement, starUpgradeParams, isStarEligible } = require('../src/features/star-system/rules.ts');
const { mapRowToCard, mapCardToRow } = require('../src/lib/supabaseMappers.ts');
const migration = read('supabase/migrations/20260923010000_star_system_v1.sql');


test('V1.1 costs and IDs-only request', () => {
  [25,50,75,100].forEach((fragments,i)=>assert.deepEqual(starRequirement(i+1),{fragments,nex:[100,250,500,1000][i]}));
  assert.equal(starRequirement(5),null);
  assert.deepEqual(starUpgradeParams('main','retry'),{p_main_card_id:'main',p_request_id:'retry',p_material_ids:[]});
  assert.doesNotMatch(read('supabase/migrations/20260923005141_star_system_v1_1_fragments.sql'),/DELETE FROM public.user_cards/i);
});
test('Síntese renders with the existing three-slot flow', () => {
  const React=require('react');
  const exp={};
  const component=()=>null;
  vm.runInNewContext(ts.transpileModule(read('src/pages/Fusion.tsx'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true}}).outputText,{
    exports:exp,require(name){
      if(name==='react')return React;
      if(name.includes('AuthContext'))return {useAuth:()=>({user:{id:'fixture',balanceNEX:5000}})};
      if(name.includes('GameStateContext'))return {useGameState:()=>({assets:[],cardFragments:[],fragmentListings:[]})};
      if(name.includes('star-system/rules'))return {starRequirement,isStarEligible};
      if(name.includes('fusionRules'))return {FUSION_RULES:{},NEXT_RARITY_MAP:{}};
      if(name.includes('formatEconomicValue'))return {formatEconomicValue:String};
      return new Proxy({},{get:()=>component});
    },
  });
  const html=require('react-dom/server').renderToStaticMarkup(React.createElement(exp.Fusion));
  assert.match(html,/Síntese/); assert.match(html,/Slot 1/); assert.match(html,/Slot 3/);
});
test('actual migration and atomic RPC against synthetic PostgreSQL database', async t => {
  const { PGlite } = require(process.env.NEXA_PGLITE_PATH || path.join(os.tmpdir(), 'nexa-star-tests-runtime/node_modules/@electric-sql/pglite'));
  const db = new PGlite();
  t.after(() => db.close());
  const schema = read('supabase/schema.sql');
  const table = (source, name) => {
    const sql = source.match(new RegExp(`CREATE TABLE (?:IF NOT EXISTS )?public\\.${name} \\([\\s\\S]*?\\n\\);`));
    assert.ok(sql, `fixture DDL ${name}`); return sql[0];
  };
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO authenticated, anon;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    ${['profiles','user_cards','transactions','marketplace_listings'].map(name => table(schema,name)).join('\n')}
    ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;
    GRANT SELECT,INSERT,UPDATE,DELETE ON public.user_cards TO authenticated;
    CREATE POLICY fixture_owner ON public.user_cards TO authenticated
      USING(owner_id=auth.uid()::text) WITH CHECK(owner_id=auth.uid()::text);
    CREATE TABLE public.fragment_craft_operations_v1(card_id text NOT NULL REFERENCES public.user_cards(id));`);
  const marketplace = read('supabase/migrations/20260915010000_card_marketplace_v2.sql');
  await db.exec(table(marketplace, 'marketplace_reservations_v2'));
  await db.exec(marketplace.slice(marketplace.indexOf('CREATE OR REPLACE FUNCTION public.guard_marketplace_card_v2'),
    marketplace.indexOf('CREATE OR REPLACE FUNCTION public.marketplace_card_snapshot_v2')));
  const boxGuard = read('supabase/migrations/20260914020000_disable_legacy_box_rpcs.sql');
  await db.exec(boxGuard.slice(boxGuard.indexOf('CREATE OR REPLACE FUNCTION public.protect_box_card_identity_v1')));
  const synthesis = read('supabase/migrations/20260916010000_synthesis_client_hardening.sql');
  await db.exec(synthesis.slice(synthesis.indexOf('CREATE POLICY synthesis_no_client_mint'), synthesis.lastIndexOf('COMMIT;')));
  await db.exec(schema.match(/CREATE OR REPLACE FUNCTION protect_profile_economic_columns\(\)[\s\S]*?EXECUTE FUNCTION protect_profile_economic_columns\(\);/)[0]);
  await db.exec(migration); // Exact proposed file, no substitutions.
  await db.exec(`CREATE TABLE public.card_fragments(owner_id text,template_id text,quantity bigint NOT NULL,updated_at timestamptz,PRIMARY KEY(owner_id,template_id));
    CREATE TABLE public.fragment_marketplace_reservations_v1(seller_id text,template_id text,quantity bigint);`);
  await db.exec(read('supabase/migrations/20260923005141_star_system_v1_1_fragments.sql'));
  const owner = '00000000-0000-0000-0000-000000000001';
  const foreign = '00000000-0000-0000-0000-000000000002';
  await db.query(`INSERT INTO profiles(id,username,email,balance_nex,balance_nxa) VALUES
    ($1,'synthetic-a','a@example.invalid',5000,42),($2,'synthetic-b','b@example.invalid',5000,42)`, [owner,foreign]);
  await db.query(`SELECT set_config('request.jwt.claim.sub',$1,false)`, [owner]);
  const mint = async (id, stars=1, who=owner, template='same') => db.query(`INSERT INTO user_cards
    (id,owner_id,owner_name,template_id,name,rarity,collection_id,collection_name,element,star_level)
    VALUES($1,$2,'fixture',$3,'fixture','Comum','fixture','fixture','fire',$4)`, [id,who,template,stars]);
  const rpc = async (request, main='main', materials=[]) => {
    await db.exec('SET ROLE authenticated');
    try { return (await db.query('SELECT public.execute_star_upgrade_v1($1,$2,$3) AS result', [request,main,materials])).rows[0].result; }
    finally { await db.exec('RESET ROLE').catch(error => { if (error.code !== '25P02') throw error; }); }
  };
  const snapshot = async () => (await db.query(`SELECT
    (SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM profiles p) AS profiles,
    (SELECT jsonb_agg(to_jsonb(c) ORDER BY id) FROM user_cards c) AS cards,
    (SELECT jsonb_agg(to_jsonb(f) ORDER BY template_id) FROM card_fragments f) AS fragments,
    (SELECT count(*)::int FROM transactions) AS ledger,
    (SELECT count(*)::int FROM star_system_private.operations) AS receipts`)).rows[0];
  const isolated = async run => { await db.exec('BEGIN'); try { await run(); } finally { await db.exec('ROLLBACK'); } };
  const reject = async (setup, args, pattern) => {
    await isolated(async () => {
      await mint('main'); await mint('mat'); await setup();
      const before = await snapshot();
      await db.exec('SAVEPOINT rejected');
      await assert.rejects(rpc(...args), pattern);
      await db.exec('ROLLBACK TO SAVEPOINT rejected');
      assert.deepEqual(await snapshot(), before, 'failure must not mutate balance, inventory, history');
    });
  };

  const fund=()=>db.query("INSERT INTO card_fragments VALUES($1,'same',250,now()),($1,'other',999,now())",[owner]);
  for(let stars=1;stars<=4;stars++) await t.test('fragments '+stars+' → '+(stars+1)+' and idempotency',()=>isolated(async()=>{
    await mint('main',stars);await mint('mat');await fund();
    const result=await rpc('upgrade-'+stars);
    assert.equal(result.main_card.star_level,stars+1);
    assert.equal(result.fragments_spent,stars*25);
    assert.equal(result.charged_nex,starRequirement(stars).nex);
    assert.deepEqual(result.consumed_ids,[]);
    const state=await snapshot();
    assert.equal(state.cards.length,2);
    assert.equal(state.fragments.find(f=>f.template_id==='same').quantity,250-stars*25);
    assert.equal(state.fragments.find(f=>f.template_id==='other').quantity,999);
    assert.equal(state.profiles[0].balance_nex,5000-starRequirement(stars).nex);
    assert.equal(state.receipts,1);assert.equal(state.ledger,1);
    assert.equal((await rpc('upgrade-'+stars)).idempotent,true);
    assert.deepEqual(await snapshot(),state);
  }));
  for(const [name,setup,pattern] of [
    ['same template only',()=>db.exec("DELETE FROM card_fragments WHERE template_id='same'"),/Fragmentos/],
    ['insufficient fragments',()=>db.exec("UPDATE card_fragments SET quantity=24 WHERE template_id='same'"),/Fragmentos/],
    ['insufficient NEX',()=>db.query('UPDATE profiles SET balance_nex=99 WHERE id=$1',[owner]),/Saldo/],
    ['max stars',()=>db.exec("UPDATE user_cards SET star_level=5 WHERE id='main'"),/★5/],
    ['reserved fragments',()=>db.query("INSERT INTO fragment_marketplace_reservations_v1 VALUES($1,'same',240)",[owner]),/Fragmentos/],
    ['late failure atomicity',()=>db.exec('ALTER TABLE transactions ADD CONSTRAINT fixture_fail CHECK(amount>0)'),/fixture_fail/],
  ])await t.test(name,()=>reject(async()=>{await fund();await setup();},[name.replaceAll(' ','-')],pattern));
  await t.test('legacy material payload cannot delete cards',()=>reject(fund,['legacy','main',['mat']],/fragmentos/));
});
