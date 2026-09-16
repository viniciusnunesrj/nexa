-- Operational prerequisite for username-login; independent of profiles hardening.
BEGIN;

DO $preflight$
BEGIN
  IF current_user <> 'postgres' OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'postgres' AND rolbypassrls
  ) THEN RAISE EXCEPTION 'Requires postgres with BYPASSRLS'; END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_roles
      WHERE rolname IN ('anon', 'authenticated') AND NOT rolsuper AND NOT rolbypassrls) <> 2
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'service_role' AND rolbypassrls)
  THEN RAISE EXCEPTION 'Unexpected API roles'; END IF;
  IF pg_catalog.to_regprocedure('auth.role()') IS NULL
  THEN RAISE EXCEPTION 'Missing verified gateway role helper'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'username_login_private')
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'consume_username_login_attempt_v1')
  THEN RAISE EXCEPTION 'Username limiter objects already exist; review before applying'; END IF;
END;
$preflight$;

CREATE SCHEMA username_login_private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA username_login_private FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE username_login_private.global_window (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  started_at timestamptz NOT NULL,
  attempts integer NOT NULL CHECK (attempts BETWEEN 0 AND 300)
);
INSERT INTO username_login_private.global_window VALUES (true, pg_catalog.clock_timestamp(), 0);

CREATE TABLE username_login_private.username_windows (
  username_key text PRIMARY KEY CHECK (username_key ~ '^[a-f0-9]{64}$'),
  minute_started_at timestamptz NOT NULL,
  minute_attempts integer NOT NULL CHECK (minute_attempts BETWEEN 0 AND 10),
  hour_started_at timestamptz NOT NULL,
  hour_attempts integer NOT NULL CHECK (hour_attempts BETWEEN 0 AND 50)
);
CREATE INDEX username_login_expiry_v1 ON username_login_private.username_windows (hour_started_at);
ALTER TABLE username_login_private.global_window ENABLE ROW LEVEL SECURITY;
ALTER TABLE username_login_private.username_windows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA username_login_private FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.consume_username_login_attempt_v1(p_username_key text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog
SET lock_timeout = '1s'
AS $function$
DECLARE
  v_global username_login_private.global_window%ROWTYPE;
  v_user username_login_private.username_windows%ROWTYPE;
  v_now timestamptz;
  v_retry integer := 0;
BEGIN
  -- EXECUTE grant + verified gateway role, never a caller-supplied identity.
  IF auth.role() IS DISTINCT FROM 'service_role'
  THEN RAISE EXCEPTION 'Backend only' USING ERRCODE = '42501'; END IF;
  IF pg_catalog.current_setting('transaction_isolation') <> 'read committed'
  THEN RAISE EXCEPTION 'Requires READ COMMITTED'; END IF;
  IF p_username_key IS NULL OR pg_catalog.length(p_username_key) <> 64
    OR p_username_key !~ '^[a-f0-9]{64}$'
  THEN RAISE EXCEPTION 'Invalid limiter key' USING ERRCODE = '22023'; END IF;

  -- Serialize decision + counters in this short RPC, before any username state.
  -- No profiles/cards locks and no external calls while this transaction is open.
  SELECT * INTO v_global FROM username_login_private.global_window WHERE singleton FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Limiter unavailable'; END IF;
  v_now := pg_catalog.clock_timestamp();
  IF v_now >= v_global.started_at + interval '1 minute' THEN
    v_global.started_at := v_now;
    v_global.attempts := 0;
  END IF;
  IF v_global.attempts >= 300 THEN
    RETURN pg_catalog.jsonb_build_object('allowed', false, 'retry_after',
      GREATEST(1, ceil(extract(epoch FROM (v_global.started_at + interval '1 minute' - v_now)))::integer));
  END IF;
  UPDATE username_login_private.global_window
    SET started_at = v_global.started_at, attempts = v_global.attempts + 1 WHERE singleton;

  -- Global admission bounds new keys to 300/minute. Hour TTL is NOT renewed
  -- on every request; cleanup precedes insertion. At most ~18,300 live keys.
  -- Idle expired rows stay bounded and are removed at the next admitted call.
  DELETE FROM username_login_private.username_windows WHERE hour_started_at <= v_now - interval '1 hour';
  SELECT * INTO v_user FROM username_login_private.username_windows WHERE username_key = p_username_key FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO username_login_private.username_windows VALUES (p_username_key, v_now, 0, v_now, 0)
      RETURNING * INTO v_user;
  END IF;
  IF v_now >= v_user.minute_started_at + interval '1 minute' THEN
    v_user.minute_started_at := v_now;
    v_user.minute_attempts := 0;
  END IF;
  IF v_user.minute_attempts >= 10 THEN
    v_retry := GREATEST(1, ceil(extract(epoch FROM (v_user.minute_started_at + interval '1 minute' - v_now)))::integer);
  END IF;
  IF v_user.hour_attempts >= 50 THEN
    v_retry := GREATEST(v_retry, 1, ceil(extract(epoch FROM (v_user.hour_started_at + interval '1 hour' - v_now)))::integer);
  END IF;
  IF v_retry > 0 THEN
    RETURN pg_catalog.jsonb_build_object('allowed', false, 'retry_after', v_retry);
  END IF;
  UPDATE username_login_private.username_windows
    SET minute_started_at = v_user.minute_started_at, minute_attempts = v_user.minute_attempts + 1,
      hour_attempts = v_user.hour_attempts + 1 WHERE username_key = p_username_key;
  RETURN pg_catalog.jsonb_build_object('allowed', true, 'retry_after', 0);
END;
$function$;
ALTER FUNCTION public.consume_username_login_attempt_v1(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.consume_username_login_attempt_v1(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_username_login_attempt_v1(text) TO service_role;

DO $postflight$
DECLARE client_role text;
BEGIN
  FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF pg_catalog.has_function_privilege(client_role, 'public.consume_username_login_attempt_v1(text)', 'EXECUTE')
      OR pg_catalog.has_schema_privilege(client_role, 'username_login_private', 'USAGE,CREATE')
      OR pg_catalog.has_table_privilege(client_role, 'username_login_private.global_window', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR pg_catalog.has_table_privilege(client_role, 'username_login_private.username_windows', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    THEN RAISE EXCEPTION 'Unexpected inherited limiter privileges: %', client_role; END IF;
  END LOOP;
END;
$postflight$;
COMMIT;
