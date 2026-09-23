-- Star V1.1: complementary migration. V1 receipts and public RPC signature preserved.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE OR REPLACE FUNCTION star_system_private.execute_upgrade(
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
  v_fragment public.card_fragments%ROWTYPE;
  v_reserved bigint;
  v_spent integer;
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
    OR p_material_ids IS NULL OR cardinality(p_material_ids) NOT BETWEEN 0 AND 4
    OR array_ndims(p_material_ids) <> 1
    OR EXISTS (SELECT 1 FROM unnest(p_material_ids) x WHERE x IS NULL OR length(x) NOT BETWEEN 1 AND 200)
    OR p_main_card_id = ANY(p_material_ids)
    OR (SELECT count(DISTINCT x) FROM unnest(p_material_ids) x) <> cardinality(p_material_ids)
  THEN RAISE EXCEPTION 'Principal e materiais devem ser instâncias distintas e válidas'; END IF;
  SELECT COALESCE(array_agg(x ORDER BY x COLLATE "C"), ARRAY[]::text[]) INTO v_ids FROM unnest(p_material_ids) x;
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

  -- Legacy payloads may only replay an existing V1 receipt, never consume cards again.
  IF cardinality(v_ids) <> 0 THEN RAISE EXCEPTION 'Ascensão requer fragmentos, não cartas materiais'; END IF;
  IF NOT pg_try_advisory_xact_lock(hashtextextended('nexa:fragments:v1:' || v_uid, 0)) THEN
    RAISE EXCEPTION 'Fragmentos em uso; tente novamente com o mesmo request_id' USING ERRCODE='55P03';
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
  v_old_star := v_main.star_level;
  v_cost := CASE v_old_star WHEN 1 THEN 100 WHEN 2 THEN 250 WHEN 3 THEN 500 WHEN 4 THEN 1000 END;
  IF v_profile.balance_nex IS NULL OR v_profile.balance_nex::text IN ('NaN','Infinity','-Infinity')
    OR v_profile.balance_nex < v_cost THEN RAISE EXCEPTION 'Saldo NEX insuficiente ou inválido'; END IF;

  v_spent := v_old_star * 25;
  SELECT * INTO v_fragment FROM public.card_fragments
  WHERE owner_id=v_uid AND template_id=v_main.template_id FOR UPDATE NOWAIT;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fragmentos insuficientes da mesma carta'; END IF;
  SELECT COALESCE(sum(quantity),0) INTO v_reserved FROM public.fragment_marketplace_reservations_v1
  WHERE seller_id=v_uid AND template_id=v_main.template_id;
  IF v_fragment.quantity - v_reserved < v_spent THEN
    RAISE EXCEPTION 'Fragmentos disponíveis insuficientes da mesma carta';
  END IF;

  UPDATE public.card_fragments SET quantity=quantity-v_spent, updated_at=now()
  WHERE owner_id=v_uid AND template_id=v_main.template_id;
  UPDATE public.profiles SET balance_nex=balance_nex-v_cost, updated_at=now() WHERE id=v_uid;
  UPDATE public.user_cards SET star_level=star_level+1, updated_at=now()
  WHERE id=p_main_card_id AND owner_id=v_uid RETURNING * INTO STRICT v_main;

  INSERT INTO public.transactions(id,user_id,user_name,currency,amount,balance_after,type,description,metadata)
  VALUES ('tx-'||gen_random_uuid()::text,v_uid,v_profile.username,'NEX',-v_cost,
    v_profile.balance_nex-v_cost,'STAR_UPGRADE','Ascensão de carta',
    jsonb_build_object('requestId',p_request_id,'mainCardId',p_main_card_id,
      'templateId',v_main.template_id,'fragmentsSpent',v_spent,'previousStar',v_old_star,'starLevel',v_main.star_level));
  v_result := jsonb_build_object('success',true,'request_id',p_request_id,'idempotent',false,
    'main_card',to_jsonb(v_main),'consumed_ids',v_ids,'charged_nex',v_cost,
    'balance_nex',v_profile.balance_nex-v_cost,'previous_star',v_old_star,
    'template_id',v_main.template_id,'fragments_spent',v_spent,
    'fragments_remaining',v_fragment.quantity-v_spent);
  INSERT INTO star_system_private.operations(owner_id,request_id,main_card_id,material_ids,previous_star,charged_nex,result)
  VALUES(v_uid,p_request_id,p_main_card_id,v_ids,v_old_star,v_cost,v_result);
  RETURN v_result;
END;
$$;

COMMIT;
