-- FUTURE / NOT FOR THIS DEPLOY. Kept outside migrations to avoid automatic application.
-- Apply only after username-login, its distributed limiter, and the new frontend
-- have been deployed and tested; retire legacy clients first. Review production first.
BEGIN;

DO $preflight$
DECLARE
  signature text;
  required_column text;
BEGIN
  IF current_user <> 'postgres' OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'postgres' AND rolbypassrls
  ) THEN RAISE EXCEPTION 'Requires postgres with BYPASSRLS'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
    WHERE oid = pg_catalog.to_regclass('public.profiles') AND relkind = 'r'
      AND relowner = 'postgres'::regrole AND relrowsecurity AND NOT relforcerowsecurity
  ) THEN RAISE EXCEPTION 'Unexpected profiles ownership/RLS'; END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_roles
      WHERE rolname IN ('anon', 'authenticated') AND NOT rolsuper AND NOT rolbypassrls) <> 2
  THEN RAISE EXCEPTION 'Missing or privileged client roles'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'service_role' AND rolbypassrls)
    OR NOT pg_catalog.has_column_privilege('service_role', 'public.profiles', 'id', 'SELECT')
    OR NOT pg_catalog.has_column_privilege('service_role', 'public.profiles', 'email', 'SELECT')
    OR NOT pg_catalog.has_column_privilege('service_role', 'public.profiles', 'username', 'SELECT')
  THEN RAISE EXCEPTION 'Backend identity lookup requires SELECT on id/email/username and BYPASSRLS'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc
    WHERE oid = pg_catalog.to_regprocedure('auth.jwt()') AND prorettype = 'jsonb'::regtype)
  THEN RAISE EXCEPTION 'Expected verified Auth JWT helper'; END IF;

  IF (SELECT count(*) FROM pg_catalog.pg_policy WHERE polrelid = 'public.profiles'::regclass) <> 3
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid = 'public.profiles'::regclass
      AND polname = 'Public profiles are viewable by everyone' AND polcmd = 'r' AND polpermissive)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid = 'public.profiles'::regclass
      AND polname = 'Users can insert their own profile' AND polcmd = 'a' AND polpermissive)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid = 'public.profiles'::regclass
      AND polname = 'Users can update their own profile' AND polcmd = 'w' AND polpermissive)
  THEN RAISE EXCEPTION 'Unexpected profiles policies; review before hardening'; END IF;

  FOREACH required_column IN ARRAY ARRAY['id','email','username','avatar','bio','title','is_first_access','updated_at'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute WHERE attrelid = 'public.profiles'::regclass
      AND attname = required_column AND attnum > 0 AND NOT attisdropped)
    THEN RAISE EXCEPTION 'Missing profiles column: %', required_column; END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute WHERE attrelid = 'public.profiles'::regclass
    AND attname = 'id' AND atttypid = 'text'::regtype)
  THEN RAISE EXCEPTION 'Expected text profiles.id'; END IF;

  -- Check trusted entry points without changing any function or EXECUTE grant.
  -- In particular, do not re-enable a claim RPC that operations have suspended.
  FOREACH signature IN ARRAY ARRAY[
    'public.get_public_profile_v1(text)',
    'public.list_public_profiles_v1(integer,integer)',
    'public.get_public_ranking_v1(integer,integer,text,text)',
    'public.handle_new_user()',
    'public.start_battle_atomic(text)',
    'public.purchase_box_v2(text,text)', 'public.open_box_v2(text,text)',
    'public.create_marketplace_listing_v2(text,numeric,text)',
    'public.buy_marketplace_listing_v2(text,text)',
    'public.cancel_marketplace_listing_v2(text,text)',
    'public.fetch_marketplace_listings_v2()',
    'public.marketplace_operation_v2(text,text,numeric,text)',
    'public.start_synthesis_atomic(text,text)',
    'public.claim_synthesis_and_burn_atomic(text,text,numeric)'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc
      WHERE oid = pg_catalog.to_regprocedure(signature) AND prosecdef AND proowner = 'postgres'::regrole)
    THEN RAISE EXCEPTION 'Required postgres SECURITY DEFINER missing: %', signature; END IF;
  END LOOP;
END;
$preflight$;

-- No DML, no change to service_role grants or to other tables.
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
-- Table revocation alone does not remove pre-existing column privileges.
DO $columns$
DECLARE column_name text;
BEGIN
  FOR column_name IN SELECT attname FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.profiles'::regclass AND attnum > 0 AND NOT attisdropped
  LOOP
    EXECUTE pg_catalog.format(
      'REVOKE SELECT (%1$I), INSERT (%1$I), UPDATE (%1$I), REFERENCES (%1$I) ON TABLE public.profiles FROM PUBLIC, anon, authenticated', column_name);
  END LOOP;
END;
$columns$;

DROP POLICY "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY "Users can insert their own profile" ON public.profiles;
DROP POLICY "Users can update their own profile" ON public.profiles;
CREATE POLICY profiles_own_read_v1 ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND id = auth.uid()::text);
CREATE POLICY profiles_own_insert_v1 ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND id = auth.uid()::text
    AND NULLIF(auth.jwt()->>'email', '') IS NOT NULL AND email = auth.jwt()->>'email');
CREATE POLICY profiles_own_update_v1 ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND id = auth.uid()::text)
  WITH CHECK (auth.uid() IS NOT NULL AND id = auth.uid()::text);

GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT INSERT (id, email, username) ON TABLE public.profiles TO authenticated;
GRANT UPDATE (username, avatar, bio, title, is_first_access, updated_at) ON TABLE public.profiles TO authenticated;

-- Fail closed if inherited grants would defeat the column allowlist or anon denial.
DO $postflight$
DECLARE column_name text;
BEGIN
  IF pg_catalog.has_table_privilege('anon', 'public.profiles', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
  THEN RAISE EXCEPTION 'Unexpected inherited table grants; rolling back'; END IF;
  FOR column_name IN SELECT attname FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.profiles'::regclass AND attnum > 0 AND NOT attisdropped
  LOOP
    IF pg_catalog.has_column_privilege('anon', 'public.profiles', column_name, 'SELECT,INSERT,UPDATE,REFERENCES')
      OR pg_catalog.has_column_privilege('authenticated', 'public.profiles', column_name, 'REFERENCES')
      OR (column_name <> ALL(ARRAY['id','email','username'])
        AND pg_catalog.has_column_privilege('authenticated', 'public.profiles', column_name, 'INSERT'))
      OR (column_name <> ALL(ARRAY['username','avatar','bio','title','is_first_access','updated_at'])
        AND pg_catalog.has_column_privilege('authenticated', 'public.profiles', column_name, 'UPDATE'))
    THEN RAISE EXCEPTION 'Unexpected inherited column grant: %; rolling back', column_name; END IF;
  END LOOP;
END;
$postflight$;
COMMIT;
