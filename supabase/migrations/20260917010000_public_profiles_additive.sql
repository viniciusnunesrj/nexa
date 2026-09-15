BEGIN;

-- Phase 11B1 ADDITIVE. Apply before deploying the social frontend.
-- Existing profiles grants/policies, Auth and economic functions are untouched.
-- SECURITY DEFINER is deliberate: these allowlisted reads must survive future
-- owner-only profiles RLS. Authentication is checked inside every entry point.
DO $preflight$
DECLARE required_column record;
BEGIN
  IF current_user <> 'postgres' OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'postgres' AND rolbypassrls
  ) THEN RAISE EXCEPTION 'Public contracts require postgres with BYPASSRLS'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
    WHERE oid = pg_catalog.to_regclass('public.profiles') AND relkind = 'r'
      AND relrowsecurity AND NOT relforcerowsecurity AND relowner = 'postgres'::regrole
  ) THEN RAISE EXCEPTION 'Unexpected profiles ownership or RLS'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN
      ('get_public_profile_v1', 'list_public_profiles_v1', 'get_public_ranking_v1')
  ) THEN RAISE EXCEPTION 'Public contract name already exists; review before applying'; END IF;
  FOR required_column IN SELECT * FROM (VALUES
    ('id','text'), ('username','text'), ('avatar','text'), ('bio','text'), ('title','text'),
    ('level','integer'), ('victories','integer'), ('defeats','integer'), ('experience','integer')
  ) AS required(name, type_name) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute a
      WHERE a.attrelid = 'public.profiles'::regclass AND a.attname = required_column.name
        AND a.attnum > 0 AND NOT a.attisdropped
        AND a.atttypid = pg_catalog.to_regtype(required_column.type_name)
    ) THEN RAISE EXCEPTION 'Missing or incompatible profiles column: %', required_column.name; END IF;
  END LOOP;
END $preflight$;

CREATE FUNCTION public.get_public_profile_v1(p_user_id text)
RETURNS TABLE(id text, username text, avatar text, bio text, title text, level integer, victories integer, defeats integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF p_user_id IS NULL OR length(btrim(p_user_id)) = 0 OR length(p_user_id) > 128 THEN
    RAISE EXCEPTION 'Invalid player ID';
  END IF;
  RETURN QUERY SELECT p.id, p.username, p.avatar, p.bio, p.title, p.level, p.victories, p.defeats
    FROM public.profiles AS p WHERE p.id = p_user_id;
END $$;

CREATE FUNCTION public.list_public_profiles_v1(p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
RETURNS TABLE(id text, username text, avatar text, bio text, title text, level integer, victories integer, defeats integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 OR p_offset IS NULL OR p_offset < 0 OR p_offset > 1000000 THEN
    RAISE EXCEPTION 'Invalid pagination';
  END IF;
  RETURN QUERY SELECT p.id, p.username, p.avatar, p.bio, p.title, p.level, p.victories, p.defeats
    FROM public.profiles AS p ORDER BY p.username, p.id LIMIT p_limit OFFSET p_offset;
END $$;

-- Score is returned because the existing UI displays it. Raw XP never leaves
-- the function. Score still permits partial XP inference (accepted UI tradeoff).
CREATE FUNCTION public.get_public_ranking_v1(
  p_limit integer DEFAULT 100, p_offset integer DEFAULT 0,
  p_search text DEFAULT '', p_user_id text DEFAULT NULL
)
RETURNS TABLE(user_id text, username text, avatar text, level integer, victories integer, defeats integer,
  title text, ranking_score bigint, rank_position bigint, total_users bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501'; END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 OR p_offset IS NULL OR p_offset < 0 OR p_offset > 1000000
    OR p_search IS NULL OR length(p_search) > 100
    OR (p_user_id IS NOT NULL AND (length(btrim(p_user_id)) = 0 OR length(p_user_id) > 128)) THEN
    RAISE EXCEPTION 'Invalid ranking filters';
  END IF;
  RETURN QUERY
  WITH scored AS (
    SELECT p.id, p.username, p.avatar, p.level, p.victories, p.defeats, p.title, p.experience,
      p.level::bigint * 100 + p.victories::bigint * 50 + floor(p.experience::numeric / 10)::bigint AS score
    FROM public.profiles AS p
  ), ranked AS (
    SELECT s.id, s.username, s.avatar, s.level, s.victories, s.defeats, s.title, s.score,
      row_number() OVER (ORDER BY s.score DESC, s.level DESC, s.experience DESC, s.victories DESC, s.id) AS position,
      count(*) OVER () AS total
    FROM scored AS s
  )
  SELECT r.id, r.username, r.avatar, r.level, r.victories, r.defeats, r.title, r.score, r.position, r.total
    FROM ranked AS r
    WHERE (p_user_id IS NULL OR r.id = p_user_id)
      AND (btrim(p_search) = '' OR strpos(lower(r.username), lower(btrim(p_search))) > 0
        OR strpos(lower(COALESCE(r.title, '')), lower(btrim(p_search))) > 0 OR r.position::text = btrim(p_search))
    ORDER BY r.position LIMIT p_limit OFFSET p_offset;
END $$;

REVOKE ALL ON FUNCTION public.get_public_profile_v1(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.list_public_profiles_v1(integer,integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_public_ranking_v1(integer,integer,text,text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_profile_v1(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_profiles_v1(integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_ranking_v1(integer,integer,text,text) TO authenticated;

COMMIT;
