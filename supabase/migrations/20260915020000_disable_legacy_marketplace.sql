-- Phase 2: apply only after Marketplace v2 has been validated in production.
-- One atomic DO statement: failed checks roll back all permission changes.
-- No rows or function bodies are changed. SELECT and service_role grants remain.
DO $phase2$
DECLARE
  signature text;
  role_name text;
  column_name text;
  public_rpcs text[] := ARRAY[
    'public.create_marketplace_listing_v2(text,numeric,text)',
    'public.buy_marketplace_listing_v2(text,text)',
    'public.cancel_marketplace_listing_v2(text,text)',
    'public.fetch_marketplace_listings_v2()'
  ];
BEGIN
  IF current_user <> 'postgres' OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'postgres' AND rolbypassrls
  ) THEN
    RAISE EXCEPTION 'Phase 2 requires postgres with BYPASSRLS';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
    WHERE oid = pg_catalog.to_regclass('public.marketplace_listings')
      AND relkind = 'r' AND relrowsecurity AND NOT relforcerowsecurity
      AND relowner = 'postgres'::regrole
  ) THEN
    RAISE EXCEPTION 'Unexpected marketplace_listings ownership or RLS configuration';
  END IF;
  IF pg_catalog.to_regprocedure('public.buy_marketplace_listing_atomic(text,text)') IS NULL
    OR (SELECT count(*) FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'buy_marketplace_listing_atomic') <> 1 THEN
    RAISE EXCEPTION 'Legacy RPC missing or unexpected overload exists';
  END IF;
  FOREACH signature IN ARRAY public_rpcs || ARRAY[
    'public.marketplace_operation_v2(text,text,numeric,text)'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc
      WHERE oid = pg_catalog.to_regprocedure(signature)
        AND prosecdef AND proowner = 'postgres'::regrole
    ) THEN
      RAISE EXCEPTION 'Required postgres SECURITY DEFINER function missing: %', signature;
    END IF;
  END LOOP;
  -- Preserve this production SELECT policy, including its expression and roles.
  -- Other SELECT policies are also left untouched.
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polrelid = 'public.marketplace_listings'::regclass
      AND polname = 'Listings viewable' AND polcmd = 'r'
  ) THEN
    RAISE EXCEPTION 'Required SELECT policy Listings viewable missing or incompatible';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polrelid = 'public.marketplace_listings'::regclass
      AND ((polcmd <> 'r' AND polname NOT IN (
        'Users can create own listings',
        'Users can update own listings', 'Users can delete own listings'
      ))
      OR (polname = 'Users can create own listings' AND polcmd <> 'a')
      OR (polname = 'Users can update own listings' AND polcmd <> 'w')
      OR (polname = 'Users can delete own listings' AND polcmd <> 'd'))
  ) THEN
    RAISE EXCEPTION 'Unknown marketplace write policy; review before applying Phase 2';
  END IF;

  REVOKE EXECUTE ON FUNCTION public.buy_marketplace_listing_atomic(text,text)
    FROM PUBLIC, anon, authenticated;
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.marketplace_listings
    FROM PUBLIC, anon, authenticated;
  -- Table-level REVOKE does not remove independent column-level grants.
  FOR column_name IN
    SELECT attname FROM pg_catalog.pg_attribute
    WHERE attrelid = 'public.marketplace_listings'::regclass
      AND attnum > 0 AND NOT attisdropped
  LOOP
    EXECUTE pg_catalog.format(
      'REVOKE INSERT (%I), UPDATE (%I) ON TABLE public.marketplace_listings FROM PUBLIC, anon, authenticated',
      column_name, column_name
    );
  END LOOP;
  DROP POLICY IF EXISTS "Users can create own listings" ON public.marketplace_listings;
  DROP POLICY IF EXISTS "Users can update own listings" ON public.marketplace_listings;
  DROP POLICY IF EXISTS "Users can delete own listings" ON public.marketplace_listings;

  FOREACH signature IN ARRAY public_rpcs LOOP
    EXECUTE pg_catalog.format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', signature);
    EXECUTE pg_catalog.format('GRANT EXECUTE ON FUNCTION %s TO authenticated', signature);
    IF pg_catalog.has_function_privilege('anon', signature, 'EXECUTE')
      OR NOT pg_catalog.has_function_privilege('authenticated', signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'Unexpected effective v2 EXECUTE privileges: %', signature;
    END IF;
  END LOOP;
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF pg_catalog.has_function_privilege(role_name,
         'public.buy_marketplace_listing_atomic(text,text)', 'EXECUTE')
      OR pg_catalog.has_table_privilege(role_name,
         'public.marketplace_listings', 'INSERT,UPDATE,DELETE,TRUNCATE')
      OR pg_catalog.has_any_column_privilege(role_name,
         'public.marketplace_listings', 'INSERT,UPDATE') THEN
      RAISE EXCEPTION 'Legacy write privileges remain (possibly inherited) for %', role_name;
    END IF;
    FOREACH signature IN ARRAY ARRAY[
      'public.marketplace_operation_v2(text,text,numeric,text)',
      'public.marketplace_card_snapshot_v2(public.user_cards)',
      'public.guard_marketplace_card_v2()',
      'public.guard_marketplace_listing_v2()'
    ] LOOP
      IF pg_catalog.has_function_privilege(role_name, signature, 'EXECUTE') THEN
        RAISE EXCEPTION 'Internal v2 function unexpectedly accessible to %: %', role_name, signature;
      END IF;
    END LOOP;
  END LOOP;
END;
$phase2$;
