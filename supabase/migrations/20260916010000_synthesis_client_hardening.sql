-- SETOR 10B: review against production before applying. No economic data rewrite.
-- START serializes slot allocation per user before locking its Card.
-- Claim body, economic rules and rewards remain unchanged; no server retry receipts.
BEGIN;

DO $check$
DECLARE signature text;
BEGIN
  IF current_user <> 'postgres' OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'postgres' AND rolbypassrls
  ) THEN RAISE EXCEPTION 'Apply synthesis hardening as postgres with BYPASSRLS'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
    WHERE oid = pg_catalog.to_regclass('public.user_cards') AND relrowsecurity
      AND NOT relforcerowsecurity AND relowner = 'postgres'::regrole
  ) THEN RAISE EXCEPTION 'Unexpected user_cards ownership/RLS'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles
    WHERE rolname IN ('anon', 'authenticated') AND (rolsuper OR rolbypassrls)
  ) THEN RAISE EXCEPTION 'Client roles must not bypass RLS'; END IF;
  FOREACH signature IN ARRAY ARRAY[
    'public.start_synthesis_atomic(text,text)',
    'public.claim_synthesis_and_burn_atomic(text,text,numeric)'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc
      WHERE oid = pg_catalog.to_regprocedure(signature)
        AND prosecdef AND proowner = 'postgres'::regrole
    ) THEN RAISE EXCEPTION 'Required postgres SECURITY DEFINER missing: %', signature; END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy
    WHERE polrelid = 'public.user_cards'::regclass AND polname = 'synthesis_no_client_mint'
  ) THEN RAISE EXCEPTION 'Preflight conflict: policy synthesis_no_client_mint already exists on public.user_cards'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'protect_synthesis_fields_v1'
  ) THEN RAISE EXCEPTION 'Preflight conflict: public.protect_synthesis_fields_v1 already exists (possibly an overload)'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.user_cards'::regclass AND tgname = 'synthesis_fields_v1'
  ) THEN RAISE EXCEPTION 'Preflight conflict: trigger synthesis_fields_v1 already exists on public.user_cards'; END IF;

  -- Defaults belong to the last pronargdefaults input arguments. With exactly
  -- three IN arguments and one default, this expression belongs to argument 3.
  -- Accept only the deparsed literal NULL, never evaluate a default expression.
  -- An unfamiliar representation fails closed for manual review.
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid = pg_catalog.to_regprocedure('public.claim_synthesis_and_burn_atomic(text,text,numeric)')
      AND p.pronargs = 3 AND p.pronargdefaults = 1 AND p.proargmodes IS NULL
      AND p.proargnames = ARRAY['p_user_id', 'p_card_id', 'p_nex_reward']::text[]
      AND pg_catalog.regexp_replace(pg_catalog.pg_get_expr(p.proargdefaults, 0), '[[:space:]]', '', 'g')
        IN ('NULL', 'NULL::numeric', 'NULL::pg_catalog.numeric')
  ) THEN
    RAISE EXCEPTION 'Preflight: claim_synthesis_and_burn_atomic must have the expected named IN arguments and p_nex_reward numeric DEFAULT NULL';
  END IF;
END;
$check$;

CREATE OR REPLACE FUNCTION public.start_synthesis_atomic(
  p_user_id TEXT,
  p_card_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_effective_user_id TEXT;
  v_auth_uid TEXT;
  v_card RECORD;
  v_unlocked_slots INTEGER;
  v_active_count INTEGER;
BEGIN
  -- 1. Validação estrita de autenticação real via auth.uid()
  v_auth_uid := auth.uid()::text;
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado: operação requer sessão ativa via auth.uid().');
  END IF;

  IF p_user_id IS NOT NULL AND p_user_id <> '' AND p_user_id <> v_auth_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado: identificação inválida ou divergente da sessão autenticada.');
  END IF;

  v_effective_user_id := v_auth_uid;

  -- Fresh READ COMMITTED snapshots are required after another activation commits.
  -- Reject stale-snapshot transactions instead of evaluating an outdated count.
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'start_synthesis_atomic requires READ COMMITTED isolation';
  END IF;
  -- First contended lock: no Card/profile lock is held by this function yet.
  -- Transaction-scoped, per authenticated user, shared by every START call.
  -- Fail fast instead of adding a wait edge to marketplace/claim/box locks.
  IF NOT pg_try_advisory_xact_lock(hashtextextended('nexa:synthesis:start:' || v_effective_user_id, 0)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Outra ativação de síntese está em andamento. Tente novamente.');
  END IF;

  -- 1. Bloqueia carta e valida posse
  SELECT * INTO v_card 
  FROM public.user_cards 
  WHERE id = p_card_id AND owner_id = v_effective_user_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Carta não encontrada no inventário.');
  END IF;

  IF v_card.state <> 'FREE' OR v_card.status = 'LISTED' OR v_card.status = 'FROZEN' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta carta não está livre para síntese.');
  END IF;

  -- 2. Valida limite de slots do piloto
  SELECT unlocked_slots INTO v_unlocked_slots 
  FROM public.profiles 
  WHERE id = v_effective_user_id;

  SELECT count(*) INTO v_active_count 
  FROM public.user_cards 
  WHERE owner_id = v_effective_user_id AND state = 'ACTIVE';

  IF v_active_count >= COALESCE(v_unlocked_slots, 3) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Capacidade de slots atingida. Suba de nível para desbloquear mais slots.');
  END IF;

  -- 3. Atualiza carta para síntese ativa
  UPDATE public.user_cards 
  SET state = 'ACTIVE',
      card_status = 'ACTIVE',
      status = 'ACTIVE',
      accumulated_nex = 0,
      synthesized_at = now(),
      last_accrual_at = now(),
      exhausted_at = null,
      tradeable = false,
      synthesizable = false,
      updated_at = now()
  WHERE id = p_card_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, public;
ALTER FUNCTION public.claim_synthesis_and_burn_atomic(text,text,numeric) SET search_path = pg_catalog, public;
REVOKE EXECUTE ON FUNCTION public.start_synthesis_atomic(text,text),
  public.claim_synthesis_and_burn_atomic(text,text,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_synthesis_atomic(text,text),
  public.claim_synthesis_and_burn_atomic(text,text,numeric) TO authenticated;

-- Independent of whether the boxes Phase 2 insert restriction was applied.
-- Trusted postgres SECURITY DEFINER writers and service_role retain their access.
CREATE POLICY synthesis_no_client_mint ON public.user_cards AS RESTRICTIVE
  FOR INSERT TO authenticated, anon WITH CHECK (false);

CREATE FUNCTION public.protect_synthesis_fields_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public AS $guard$
BEGIN
  -- Must remain INVOKER: a definer guard would hide direct-client RLS context.
  IF pg_catalog.row_security_active('public.user_cards'::regclass) AND
    ROW(NEW.id, NEW.owner_id, NEW.state, NEW.card_status, NEW.status,
        NEW.accumulated_nex, NEW.total_generated, NEW.synthesis_rate, NEW.synthesis_cap,
        NEW.synthesized_at, NEW.last_accrual_at, NEW.exhausted_at, NEW.last_claimed_at,
        NEW.tradeable, NEW.synthesizable)
    IS DISTINCT FROM
    ROW(OLD.id, OLD.owner_id, OLD.state, OLD.card_status, OLD.status,
        OLD.accumulated_nex, OLD.total_generated, OLD.synthesis_rate, OLD.synthesis_cap,
        OLD.synthesized_at, OLD.last_accrual_at, OLD.exhausted_at, OLD.last_claimed_at,
        OLD.tradeable, OLD.synthesizable) THEN
    RAISE EXCEPTION 'Card ownership and synthesis fields are server-authoritative';
  END IF;
  RETURN NEW;
END;
$guard$;
CREATE TRIGGER synthesis_fields_v1 BEFORE UPDATE ON public.user_cards
  FOR EACH ROW EXECUTE FUNCTION public.protect_synthesis_fields_v1();
REVOKE ALL ON FUNCTION public.protect_synthesis_fields_v1() FROM PUBLIC, anon, authenticated;

COMMIT;
