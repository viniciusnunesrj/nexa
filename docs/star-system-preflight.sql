-- READ ONLY. Executed against NEXA during the authorized Star System preflight.
-- Expected: no missing/type mismatches; review triggers/FKs/grants before applying.
SELECT current_database(), current_user, current_setting('server_version') AS server_version,
  current_setting('transaction_isolation') AS isolation,
  current_setting('pgrst.db_schemas',true) AS exposed_schemas_if_available;

WITH required(relation_name,column_name,expected_type) AS (VALUES
  ('profiles','id','text'),('profiles','username','text'),('profiles','balance_nex','numeric'),('profiles','updated_at','timestamp with time zone'),
  ('user_cards','id','text'),('user_cards','owner_id','text'),('user_cards','template_id','text'),
  ('user_cards','state','text'),('user_cards','card_status','text'),('user_cards','status','text'),
  ('user_cards','tradeable','boolean'),('user_cards','synthesizable','boolean'),
  ('user_cards','synthesized_at','timestamp with time zone'),('user_cards','last_accrual_at','timestamp with time zone'),
  ('user_cards','exhausted_at','timestamp with time zone'),('user_cards','updated_at','timestamp with time zone'),
  ('marketplace_reservations_v2','card_id','text'),('marketplace_listings','item_id','text'),('marketplace_listings','status','text'),
  ('fragment_craft_operations_v1','card_id','text'),
  ('transactions','id','text'),('transactions','user_id','text'),('transactions','user_name','text'),
  ('transactions','currency','text'),('transactions','amount','numeric'),('transactions','balance_after','numeric'),
  ('transactions','type','text'),('transactions','description','text'),('transactions','metadata','jsonb')
)
SELECT r.*, c.oid IS NOT NULL AS relation_exists, a.attname IS NOT NULL AS column_exists,
  pg_catalog.format_type(a.atttypid,a.atttypmod) AS actual_type,
  pg_catalog.format_type(a.atttypid,a.atttypmod)=r.expected_type AS type_matches,
  a.attnotnull, pg_catalog.pg_get_expr(d.adbin,d.adrelid) AS default_expression
FROM required r
LEFT JOIN pg_catalog.pg_class c ON c.oid=to_regclass('public.'||r.relation_name)
LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attname=r.column_name AND a.attnum>0 AND NOT a.attisdropped
LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
ORDER BY r.relation_name,r.column_name;

-- All of these should be empty before first application (not an idempotent installer).
SELECT nspname FROM pg_catalog.pg_namespace WHERE nspname='star_system_private';
SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
WHERE (n.nspname='public' AND p.proname='execute_star_upgrade_v1') OR n.nspname='star_system_private';
SELECT attname FROM pg_catalog.pg_attribute WHERE attrelid=to_regclass('public.user_cards') AND attname='star_level' AND NOT attisdropped;
SELECT conname FROM pg_catalog.pg_constraint WHERE conrelid=to_regclass('public.user_cards') AND conname='user_cards_star_level_v1_check';
SELECT tgname FROM pg_catalog.pg_trigger WHERE tgrelid=to_regclass('public.user_cards') AND tgname='star_level_v1';

-- Existing PKs, incoming FKs and checks, including any unknown restriction on STAR_UPGRADE.
SELECT conrelid::regclass AS relation,conname,contype,confrelid::regclass AS referenced_relation,
  pg_get_constraintdef(oid) AS definition
FROM pg_catalog.pg_constraint WHERE conrelid IN (
  to_regclass('public.profiles'),to_regclass('public.user_cards'),to_regclass('public.transactions'),
  to_regclass('public.marketplace_reservations_v2'),to_regclass('public.fragment_craft_operations_v1'))
  OR confrelid=to_regclass('public.user_cards');

-- Five enabled guards required by the migration; inspect definitions, not only names.
SELECT t.tgrelid::regclass AS relation,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid),
  p.prosecdef,p.proowner::regrole,p.proconfig,pg_get_functiondef(p.oid)
FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid
WHERE t.tgrelid IN (to_regclass('public.user_cards'),to_regclass('public.profiles'),to_regclass('public.marketplace_listings')) AND NOT t.tgisinternal;
SELECT polname,polpermissive,polcmd,polroles,pg_get_expr(polqual,polrelid) AS using_expression,
  pg_get_expr(polwithcheck,polrelid) AS check_expression
FROM pg_catalog.pg_policy WHERE polrelid=to_regclass('public.user_cards');
SELECT rolname,rolsuper,rolbypassrls FROM pg_catalog.pg_roles WHERE rolname IN ('postgres','anon','authenticated');
SELECT c.oid::regclass AS relation,c.relowner::regrole,c.relrowsecurity,c.relforcerowsecurity,
  has_table_privilege('postgres',c.oid,'SELECT') AS owner_can_read,
  has_table_privilege('postgres',c.oid,'UPDATE') AS owner_can_update,
  has_table_privilege('postgres',c.oid,'DELETE') AS owner_can_delete,
  has_table_privilege('postgres',c.oid,'INSERT') AS owner_can_insert
FROM pg_catalog.pg_class c WHERE c.oid IN (to_regclass('public.profiles'),to_regclass('public.user_cards'),
  to_regclass('public.transactions'),to_regclass('public.marketplace_reservations_v2'),
  to_regclass('public.marketplace_listings'),to_regclass('public.fragment_craft_operations_v1'));
SELECT to_regprocedure('auth.uid()') AS auth_uid,
  has_schema_privilege('postgres','public','CREATE') AS can_create_public,
  has_database_privilege('postgres',current_database(),'CREATE') AS can_create_schema;
-- Optional baseline for later verification; no invocation of legacy economic RPCs.
SELECT p.oid::regprocedure AS signature,md5(pg_get_functiondef(p.oid)) AS definition_hash
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN ('start_battle_atomic','execute_fusion_v2',
  'start_synthesis_atomic','claim_synthesis_and_burn_atomic','buy_marketplace_listing_v2','open_box_v2','trade_operation_v2');
