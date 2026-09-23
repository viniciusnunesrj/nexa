-- MANUAL PRE-VALIDATION ONLY. These SELECTs have NOT been executed by Codex.
-- Run as the SAME administrative role intended to apply the migration.
-- No DDL/DML, SET, DO, dynamic SQL or calls to business RPCs.

-- 1. Runtime and migration executor. Requires PostgreSQL >= 13 for pg_catalog UUID.
SELECT current_database() AS database_name, current_user AS executor,
  current_setting('server_version') AS server_version,
  current_setting('transaction_isolation') AS transaction_isolation,
  current_setting('default_transaction_isolation') AS default_transaction_isolation,
  current_setting('server_version_num')::integer >= 130000 AS supported_postgres,
  'riftbattle-v2-preview-20260922.1' AS expected_rules_version,
  has_database_privilege(current_user, current_database(), 'CREATE') AS can_create_schema,
  has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_public_rpc,
  (SELECT rolsuper OR rolbypassrls FROM pg_catalog.pg_roles WHERE rolname = current_user) AS bypasses_rls;

-- 2. Every directly referenced relation/column and exact expected LOCAL type.
-- All rows should have relation_kind='r', column_exists=true, type_matches=true.
-- required_not_null=true must also have actual_not_null=true.
SELECT expected.table_name, expected.column_name, expected.expected_type,
  c.relkind AS relation_kind, a.attname IS NOT NULL AS column_exists,
  pg_catalog.format_type(a.atttypid, a.atttypmod) AS actual_type,
  pg_catalog.format_type(a.atttypid, a.atttypmod) = expected.expected_type AS type_matches,
  expected.required_not_null, a.attnotnull AS actual_not_null,
  c.relrowsecurity AS rls_enabled,
  CASE WHEN c.oid IS NOT NULL THEN has_table_privilege(current_user, c.oid, 'SELECT') END AS executor_can_select
FROM (VALUES
  ('user_cards','id','text',true),
  ('user_cards','owner_id','text',true),
  ('user_cards','template_id','text',true),
  ('user_cards','state','text',true),
  ('user_cards','card_status','text',true),
  ('user_cards','status','text',true),
  ('user_cards','synthesized_at','timestamp with time zone',false),
  ('user_cards','last_accrual_at','timestamp with time zone',false),
  ('user_cards','exhausted_at','timestamp with time zone',false),
  ('card_templates','template_id','text',true),
  ('card_templates','active','boolean',true),
  ('marketplace_reservations_v2','card_id','text',true),
  ('marketplace_listings','item_id','text',true),
  ('marketplace_listings','status','text',true)
) AS expected(table_name,column_name,expected_type,required_not_null)
LEFT JOIN pg_catalog.pg_namespace n ON n.nspname = 'public'
LEFT JOIN pg_catalog.pg_class c ON c.relnamespace = n.oid AND c.relname = expected.table_name
LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid AND a.attname = expected.column_name
  AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY expected.table_name, expected.column_name;

-- 3. Keys/checks/FKs from the existing relations, for comparison with local DDL.
-- REQUIRED for join cardinality: user_cards PRIMARY KEY(id), card_templates PRIMARY KEY(template_id).
-- Expected baseline: reservation PRIMARY KEY(card_id), listing PRIMARY KEY(id),
-- FREE/ACTIVE/EXHAUSTED state check and IDLE/EQUIPPED/LISTED/FROZEN/ACTIVE/EXHAUSTED status check.
SELECT n.nspname, c.relname, con.conname, con.contype, con.convalidated,
  pg_catalog.pg_get_constraintdef(con.oid, true) AS definition
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN
  ('user_cards','card_templates','marketplace_reservations_v2','marketplace_listings')
ORDER BY c.relname, con.conname;

-- 4. Expect private_schema_exists=false and NO other rows from collision queries.
-- Check ALL overloads of the public name, not only our intended signature.
SELECT EXISTS(SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'riftbattle_v2_private') AS private_schema_exists,
  to_regprocedure('public.validate_riftbattle_v2_squad(text,text,text,text[])') AS existing_exact_rpc;

SELECT n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,
  p.prokind, p.prosecdef, p.proconfig, pg_catalog.pg_get_userbyid(p.proowner) AS owner
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'riftbattle_v2_private'
  OR (n.nspname = 'public' AND p.proname = 'validate_riftbattle_v2_squad');

SELECT n.nspname, c.relname, c.relkind
FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'riftbattle_v2_private';

SELECT n.nspname, t.typname
FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'riftbattle_v2_private';

SELECT n.nspname, con.conname
FROM pg_catalog.pg_constraint con JOIN pg_catalog.pg_namespace n ON n.oid = con.connamespace
WHERE n.nspname = 'riftbattle_v2_private';

-- 5. Auth, UUID built-in and roles. Missing rows/objects require investigation.
SELECT expected.signature, p.oid IS NOT NULL AS function_exists,
  pg_catalog.pg_get_function_result(p.oid) AS result_type,
  CASE WHEN p.oid IS NOT NULL THEN has_function_privilege(current_user, p.oid, 'EXECUTE') END AS executor_can_execute
FROM (VALUES ('auth.uid()'), ('pg_catalog.gen_random_uuid()')) expected(signature)
LEFT JOIN pg_catalog.pg_proc p ON p.oid = to_regprocedure(expected.signature);

SELECT expected.role_name, r.oid IS NOT NULL AS role_exists, r.rolsuper, r.rolbypassrls
FROM (VALUES ('anon'),('authenticated')) expected(role_name)
LEFT JOIN pg_catalog.pg_roles r ON r.rolname = expected.role_name;

SELECT n.nspname, pg_catalog.pg_get_userbyid(n.nspowner) AS owner, n.nspacl,
  has_schema_privilege(current_user, n.oid, 'USAGE') AS executor_has_usage
FROM pg_catalog.pg_namespace n WHERE n.nspname IN ('auth','public','riftbattle_v2_private');

-- Review inherited defaults; migration explicitly revokes PUBLIC/anon/authenticated
-- access on its new tables and grants only authenticated execution on its functions.
SELECT pg_catalog.pg_get_userbyid(d.defaclrole) AS owner,
  n.nspname AS schema_name, d.defaclobjtype, d.defaclacl
FROM pg_catalog.pg_default_acl d LEFT JOIN pg_catalog.pg_namespace n ON n.oid = d.defaclnamespace;

-- Possible deployment-specific event triggers/RLS policies not visible in local DDL.
SELECT evtname, evtevent, evtenabled FROM pg_catalog.pg_event_trigger WHERE evtenabled <> 'D';

SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_catalog.pg_policies WHERE schemaname = 'public' AND tablename IN
  ('user_cards','card_templates','marketplace_reservations_v2','marketplace_listings');

-- 6. Old RPC fingerprint: save output and compare AFTER installation manually.
-- No call to the old RPC is made here.
SELECT pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,
  md5(pg_catalog.pg_get_functiondef(p.oid)) AS definition_md5, p.proacl, p.proconfig, p.prosecdef
FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'start_battle_atomic' AND p.prokind = 'f';

-- 7. Migration-history metadata and exposed schemas (setting may be NULL here).
-- The Dashboard/API configuration must also confirm private schema is NOT exposed.
SELECT to_regclass('supabase_migrations.schema_migrations') AS history_relation,
  current_setting('pgrst.db_schemas', true) AS visible_api_schema_setting;

-- OPTIONAL: execute the next SELECT ONLY if history_relation exists and has version/name.
-- Local baseline: server_battle_runs creates card_templates; card_marketplace_v2 creates reservations.
-- History is supporting evidence; actual metadata above is decisive.
SELECT version, name FROM supabase_migrations.schema_migrations
WHERE version IN ('20260912230000','20260915010000','20260915020000','20260922215435')
ORDER BY version;
