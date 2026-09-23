-- Star System V1. Apply separately after approval; no existing RPC is replaced.
BEGIN;
SET LOCAL lock_timeout = '5s';

DO $check$
DECLARE v_required record;
BEGIN
  IF current_user <> 'postgres' THEN RAISE EXCEPTION 'Apply as postgres'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='postgres' AND rolbypassrls)
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE oid='public.user_cards'::regclass
      AND relrowsecurity AND NOT relforcerowsecurity AND relowner='postgres'::regrole)
  THEN RAISE EXCEPTION 'Unexpected user_cards ownership/RLS'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname IN ('anon','authenticated') AND (rolsuper OR rolbypassrls))
  THEN RAISE EXCEPTION 'Client roles must not bypass RLS'; END IF;
  FOR v_required IN SELECT * FROM (VALUES
    ('public.user_cards','box_card_identity_v1'),
    ('public.user_cards','synthesis_fields_v1'),
    ('public.user_cards','guard_marketplace_card_v2'),
    ('public.marketplace_listings','guard_marketplace_listing_v2'),
    ('public.profiles','trg_protect_profile_economic_columns')
  ) AS required(relation_name,trigger_name) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid=to_regclass(v_required.relation_name)
      AND tgname=v_required.trigger_name AND tgenabled IN ('O','A') AND NOT tgisinternal)
    THEN RAISE EXCEPTION 'Required integrity trigger missing: %.%',v_required.relation_name,v_required.trigger_name; END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid='public.user_cards'::regclass
    AND polname='synthesis_no_client_mint' AND NOT polpermissive AND polcmd='a'
    AND pg_get_expr(polwithcheck,polrelid)='false')
  THEN RAISE EXCEPTION 'Required synthesis_no_client_mint restriction missing'; END IF;
END;
$check$;

ALTER TABLE public.user_cards ADD COLUMN star_level smallint NOT NULL DEFAULT 1
  CONSTRAINT user_cards_star_level_v1_check CHECK (star_level BETWEEN 1 AND 5);

CREATE SCHEMA star_system_private;
REVOKE ALL ON SCHEMA star_system_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA star_system_private TO authenticated;

CREATE TABLE star_system_private.operations (
  owner_id text NOT NULL REFERENCES public.profiles(id),
  request_id text NOT NULL CHECK (request_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  main_card_id text NOT NULL,
  material_ids text[] NOT NULL,
  previous_star smallint NOT NULL CHECK (previous_star BETWEEN 1 AND 4),
  charged_nex numeric NOT NULL CHECK (charged_nex IN (100,250,500,1000)),
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, request_id)
);
ALTER TABLE star_system_private.operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON star_system_private.operations FROM PUBLIC, anon, authenticated;

-- INVOKER is essential: direct clients cannot write the new authoritative field.
CREATE FUNCTION star_system_private.protect_star_level_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF pg_catalog.row_security_active('public.user_cards'::regclass) THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.star_level IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'star_level is server-authoritative'; END IF;
    ELSIF NEW.star_level IS DISTINCT FROM OLD.star_level THEN
      RAISE EXCEPTION 'star_level is server-authoritative';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER star_level_v1 BEFORE INSERT OR UPDATE ON public.user_cards
FOR EACH ROW EXECUTE FUNCTION star_system_private.protect_star_level_v1();
REVOKE ALL ON FUNCTION star_system_private.protect_star_level_v1() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION star_system_private.execute_upgrade(
  p_request_id text, p_main_card_id text, p_material_ids text[]
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_uid text := auth.uid()::text;
  v_ids text[];
  v_all text[];
  v_id text;
  v_main public.user_cards%ROWTYPE;
  v_card public.user_cards%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_previous star_system_private.operations%ROWTYPE;
  v_cost numeric;
  v_count integer;
  v_old_star smallint;
  v_result jsonb;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória'; END IF;
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'READ COMMITTED required';
  END IF;
  IF p_request_id IS NULL OR p_request_id !~ '^[A-Za-z0-9_-]{1,100}$' THEN
    RAISE EXCEPTION 'request_id inválido';
  END IF;
  IF p_main_card_id IS NULL OR length(p_main_card_id) NOT BETWEEN 1 AND 200
    OR p_material_ids IS NULL OR cardinality(p_material_ids) NOT BETWEEN 1 AND 4
    OR array_ndims(p_material_ids) <> 1
    OR EXISTS (SELECT 1 FROM unnest(p_material_ids) x WHERE x IS NULL OR length(x) NOT BETWEEN 1 AND 200)
    OR p_main_card_id = ANY(p_material_ids)
    OR (SELECT count(DISTINCT x) FROM unnest(p_material_ids) x) <> cardinality(p_material_ids)
  THEN RAISE EXCEPTION 'Principal e materiais devem ser instâncias distintas e válidas'; END IF;
  SELECT array_agg(x ORDER BY x COLLATE "C") INTO v_ids FROM unnest(p_material_ids) x;
  -- Fail fast; the same request can safely be retried after the winner commits.
  IF NOT pg_try_advisory_xact_lock(hashtextextended('nexa:star:v1:' || v_uid, 0)) THEN
    RAISE EXCEPTION 'Ascensão em andamento; tente novamente com o mesmo request_id' USING ERRCODE='55P03';
  END IF;
  SELECT * INTO v_previous FROM star_system_private.operations
  WHERE owner_id=v_uid AND request_id=p_request_id;
  IF FOUND THEN
    IF v_previous.main_card_id <> p_main_card_id OR v_previous.material_ids <> v_ids THEN
      RAISE EXCEPTION 'request_id já utilizado com outro conteúdo';
    END IF;
    RETURN v_previous.result || jsonb_build_object('idempotent',true);
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id=v_uid FOR UPDATE NOWAIT;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil não encontrado'; END IF;
  -- Compatible with trade/fusion locking; never wait behind a box table lock.
  LOCK TABLE public.user_cards IN ROW EXCLUSIVE MODE NOWAIT;
  v_all := v_ids || ARRAY[p_main_card_id];
  FOR v_id IN SELECT x FROM unnest(v_all) x ORDER BY x COLLATE "C" LOOP
    SELECT * INTO v_card FROM public.user_cards WHERE id=v_id FOR UPDATE NOWAIT;
    IF NOT FOUND OR v_card.owner_id IS DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'Carta inexistente ou pertencente a outra conta';
    END IF;
    IF v_card.state IS DISTINCT FROM 'FREE' OR v_card.card_status IS DISTINCT FROM 'FREE'
      OR v_card.status IS DISTINCT FROM 'IDLE' OR v_card.tradeable IS DISTINCT FROM true
      OR v_card.synthesizable IS DISTINCT FROM true
      OR v_card.synthesized_at IS NOT NULL OR v_card.last_accrual_at IS NOT NULL
      OR v_card.exhausted_at IS NOT NULL
      OR EXISTS (SELECT 1 FROM public.marketplace_reservations_v2 WHERE card_id=v_id)
      OR EXISTS (SELECT 1 FROM public.marketplace_listings WHERE item_id=v_id AND status='ACTIVE')
    THEN RAISE EXCEPTION 'Carta indisponível, em síntese, listada ou reservada'; END IF;
  END LOOP;
  SELECT * INTO STRICT v_main FROM public.user_cards WHERE id=p_main_card_id;
  IF v_main.star_level >= 5 THEN RAISE EXCEPTION 'Esta carta já atingiu ★5'; END IF;
  IF cardinality(v_ids) <> v_main.star_level THEN RAISE EXCEPTION 'Quantidade incorreta de materiais'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_cards WHERE id=ANY(v_ids)
    AND (template_id IS DISTINCT FROM v_main.template_id OR star_level <> 1)) THEN
    RAISE EXCEPTION 'Materiais devem ser ★1 do mesmo template da principal';
  END IF;
  -- Historical craft receipts have a restrictive FK. Never erase that history.
  IF EXISTS (SELECT 1 FROM public.fragment_craft_operations_v1 WHERE card_id=ANY(v_ids)) THEN
    RAISE EXCEPTION 'Material vinculado ao histórico de fabricação não pode ser consumido';
  END IF;
  v_old_star := v_main.star_level;
  v_cost := CASE v_old_star WHEN 1 THEN 100 WHEN 2 THEN 250 WHEN 3 THEN 500 WHEN 4 THEN 1000 END;
  IF v_profile.balance_nex IS NULL OR v_profile.balance_nex::text IN ('NaN','Infinity','-Infinity')
    OR v_profile.balance_nex < v_cost THEN RAISE EXCEPTION 'Saldo NEX insuficiente ou inválido'; END IF;

  UPDATE public.profiles SET balance_nex=balance_nex-v_cost, updated_at=now() WHERE id=v_uid;
  DELETE FROM public.user_cards WHERE owner_id=v_uid AND id=ANY(v_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> cardinality(v_ids) THEN RAISE EXCEPTION 'Falha ao consumir materiais'; END IF;
  UPDATE public.user_cards SET star_level=star_level+1, updated_at=now()
  WHERE id=p_main_card_id AND owner_id=v_uid RETURNING * INTO STRICT v_main;

  INSERT INTO public.transactions(id,user_id,user_name,currency,amount,balance_after,type,description,metadata)
  VALUES ('tx-'||gen_random_uuid()::text,v_uid,v_profile.username,'NEX',-v_cost,
    v_profile.balance_nex-v_cost,'STAR_UPGRADE','Ascensão de carta',
    jsonb_build_object('requestId',p_request_id,'mainCardId',p_main_card_id,
      'materialIds',v_ids,'previousStar',v_old_star,'starLevel',v_main.star_level));
  v_result := jsonb_build_object('success',true,'request_id',p_request_id,'idempotent',false,
    'main_card',to_jsonb(v_main),'consumed_ids',v_ids,'charged_nex',v_cost,
    'balance_nex',v_profile.balance_nex-v_cost,'previous_star',v_old_star);
  INSERT INTO star_system_private.operations(owner_id,request_id,main_card_id,material_ids,previous_star,charged_nex,result)
  VALUES(v_uid,p_request_id,p_main_card_id,v_ids,v_old_star,v_cost,v_result);
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION star_system_private.execute_upgrade(text,text,text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION star_system_private.execute_upgrade(text,text,text[]) TO authenticated;

CREATE FUNCTION public.execute_star_upgrade_v1(p_request_id text,p_main_card_id text,p_material_ids text[])
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT star_system_private.execute_upgrade(p_request_id,p_main_card_id,p_material_ids);
$$;
REVOKE ALL ON FUNCTION public.execute_star_upgrade_v1(text,text,text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.execute_star_upgrade_v1(text,text,text[]) TO authenticated;
COMMIT;
