-- SETOR 12B: Cards + NXA. Pending offers are intents, NOT reservations.
-- Apply only after review against the production schema. No legacy data is removed.
BEGIN;

DO $preflight$
DECLARE v_name text; v_column text;
BEGIN
  IF current_user <> 'postgres' OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = current_user AND rolbypassrls
  ) THEN RAISE EXCEPTION 'P2P requires postgres with BYPASSRLS'; END IF;
  FOREACH v_name IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=v_name) THEN
      RAISE EXCEPTION 'Missing role: %', v_name;
    END IF;
  END LOOP;
  IF pg_catalog.to_regprocedure('auth.uid()') IS NULL OR pg_catalog.to_regprocedure('pg_catalog.gen_random_uuid()') IS NULL THEN
    RAISE EXCEPTION 'Missing auth.uid() or PostgreSQL gen_random_uuid()';
  END IF;
  -- These existing guards are part of the declared Marketplace/synthesis base.
  FOR v_name,v_column IN SELECT * FROM (VALUES ('user_cards','guard_marketplace_card_v2'),
    ('marketplace_listings','guard_marketplace_listing_v2'),('user_cards','synthesis_fields_v1')) AS required(t,tr) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger WHERE tgrelid=pg_catalog.to_regclass('public.'||v_name)
      AND tgname=v_column AND NOT tgisinternal AND tgenabled IN ('O','A')) THEN
      RAISE EXCEPTION 'Missing enabled compatibility guard %.%',v_name,v_column;
    END IF;
  END LOOP;
  FOREACH v_name IN ARRAY ARRAY['trade_offers_v2','trade_requests_v2'] LOOP
    IF pg_catalog.to_regclass('public.' || v_name) IS NOT NULL THEN
      RAISE EXCEPTION 'Unexpected existing object: %', v_name;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname = ANY(ARRAY['trade_operation_v2','trade_card_snapshot_v2',
    'create_trade_offer_v2','accept_trade_offer_v2','reject_trade_offer_v2','cancel_trade_offer_v2',
    'fetch_my_trade_offers_v2','fetch_trade_cards_v2'])) THEN
    RAISE EXCEPTION 'Unexpected existing P2P function; review before applying';
  END IF;
  FOREACH v_name IN ARRAY ARRAY['profiles','user_cards','transactions','marketplace_reservations_v2','marketplace_listings'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=v_name AND c.relkind='r'
      AND c.relowner=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname='postgres') AND NOT c.relforcerowsecurity) THEN
      RAISE EXCEPTION 'Missing/incompatible table or owner: %',v_name;
    END IF;
  END LOOP;
  -- Explicitly check identifiers and monetary types used across the transaction.
  FOR v_name,v_column IN SELECT * FROM (VALUES ('profiles','id'),('profiles','username'),
    ('user_cards','id'),('user_cards','owner_id'),('user_cards','owner_name'),('user_cards','state'),
    ('user_cards','card_status'),('user_cards','status'),('transactions','id'),('transactions','user_id'),
    ('transactions','user_name'),('transactions','type'),('transactions','currency'),
    ('marketplace_reservations_v2','card_id'),('marketplace_listings','item_id')) AS required(t,c) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute WHERE attrelid=pg_catalog.to_regclass('public.'||v_name)
      AND attname=v_column AND NOT attisdropped AND atttypid='text'::regtype) THEN
      RAISE EXCEPTION 'Expected text column %.%',v_name,v_column;
    END IF;
  END LOOP;
  FOR v_name,v_column IN SELECT * FROM (VALUES ('profiles','balance_nxa'),('transactions','amount'),
    ('transactions','balance_after')) AS required(t,c) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute WHERE attrelid=pg_catalog.to_regclass('public.'||v_name)
      AND attname=v_column AND NOT attisdropped AND atttypid='numeric'::regtype) THEN
      RAISE EXCEPTION 'Expected numeric column %.%',v_name,v_column;
    END IF;
  END LOOP;
  -- Extra required columns with no default would make our explicit INSERT fail.
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid='public.transactions'::regclass
    AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull AND NOT a.atthasdef
    AND a.attidentity='' AND a.attgenerated=''
    AND a.attname <> ALL(ARRAY['id','user_id','user_name','currency','amount','balance_after','type','description','metadata','created_at'])) THEN
    RAISE EXCEPTION 'transactions has an unexpected required column';
  END IF;
END $preflight$;

CREATE TABLE public.trade_offers_v2 (
  id text PRIMARY KEY,
  sender_id text NOT NULL REFERENCES public.profiles(id),
  receiver_id text NOT NULL REFERENCES public.profiles(id),
  sender_name text NOT NULL,
  receiver_name text NOT NULL,
  sender_avatar text,
  receiver_avatar text,
  offered_card_ids text[] NOT NULL,
  requested_card_ids text[] NOT NULL,
  offered_items jsonb NOT NULL CHECK (jsonb_typeof(offered_items)='array'),
  requested_items jsonb NOT NULL CHECK (jsonb_typeof(requested_items)='array'),
  offered_nxa numeric NOT NULL CHECK (offered_nxa BETWEEN 0 AND 1000000 AND offered_nxa=trunc(offered_nxa)),
  requested_nxa numeric NOT NULL CHECK (requested_nxa BETWEEN 0 AND 1000000 AND requested_nxa=trunc(requested_nxa)),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED','CANCELLED')),
  note text NOT NULL DEFAULT '' CHECK (length(note)<=500),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now()+interval '48 hours'),
  completed_at timestamptz,
  cancelled_at timestamptz,
  rejected_at timestamptz,
  CHECK (sender_id<>receiver_id),
  CHECK (cardinality(offered_card_ids)<=10 AND cardinality(requested_card_ids)<=10),
  CHECK (cardinality(offered_card_ids)>0 OR offered_nxa>0),
  CHECK (cardinality(requested_card_ids)>0 OR requested_nxa>0),
  CHECK (expires_at>created_at),
  CHECK ((status='ACCEPTED')=(completed_at IS NOT NULL)),
  CHECK ((status='CANCELLED')=(cancelled_at IS NOT NULL)),
  CHECK ((status='REJECTED')=(rejected_at IS NOT NULL))
);
CREATE INDEX trade_offers_sender_v2 ON public.trade_offers_v2(sender_id,created_at DESC,id);
CREATE INDEX trade_offers_receiver_v2 ON public.trade_offers_v2(receiver_id,created_at DESC,id);
CREATE TABLE public.trade_requests_v2 (
  user_id text NOT NULL REFERENCES public.profiles(id),
  request_id text NOT NULL CHECK (length(request_id) BETWEEN 1 AND 128),
  intent jsonb NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,request_id)
);
ALTER TABLE public.trade_offers_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_requests_v2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.trade_offers_v2,public.trade_requests_v2 FROM PUBLIC,anon,authenticated;
CREATE POLICY trade_participant_read_v2 ON public.trade_offers_v2 FOR SELECT TO authenticated
  USING (auth.uid()::text IN (sender_id,receiver_id));
-- Only the offer is readable directly; receipts remain backend-only.
GRANT SELECT ON public.trade_offers_v2 TO authenticated;

-- Display-only snapshot. Never used to decide ownership, eligibility or money.
CREATE FUNCTION public.trade_card_snapshot_v2(p_card public.user_cards)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,public AS $$
  SELECT jsonb_build_object('id',p_card.id,'template_id',p_card.template_id,'name',p_card.name,
    'rarity',p_card.rarity,'image',p_card.image,'owner_id',p_card.owner_id,'owner_name',p_card.owner_name,
    'collection_id',p_card.collection_id,'collection_name',p_card.collection_name,'element',p_card.element,
    'element_icon',p_card.element_icon,'description',p_card.description);
$$;

-- Private dispatcher shared by the four authenticated mutation wrappers.
CREATE FUNCTION public.trade_operation_v2(p_operation text,p_request_id text,p_offer_id text DEFAULT NULL,
  p_receiver_id text DEFAULT NULL,p_offered_card_ids text[] DEFAULT '{}',p_requested_card_ids text[] DEFAULT '{}',
  p_offered_nxa numeric DEFAULT 0,p_requested_nxa numeric DEFAULT 0,p_note text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE
  v_uid text := auth.uid()::text;
  v_intent jsonb; v_previous public.trade_requests_v2%ROWTYPE; v_offer public.trade_offers_v2%ROWTYPE;
  v_sender public.profiles%ROWTYPE; v_receiver public.profiles%ROWTYPE; v_card public.user_cards%ROWTYPE;
  v_id text; v_owner text; v_target text; v_name text; v_result jsonb; v_changed integer;
  v_offered jsonb := '[]'; v_requested jsonb := '[]'; v_all text[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Autenticação necessária.'; END IF;
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'P2P requires READ COMMITTED';
  END IF;
  IF p_operation IS NULL OR p_operation NOT IN ('CREATE','ACCEPT','REJECT','CANCEL') THEN
    RAISE EXCEPTION 'Operação inválida.';
  END IF;
  IF p_request_id IS NULL OR length(btrim(p_request_id))=0 OR length(p_request_id)>128 THEN
    RAISE EXCEPTION 'Request ID inválido.';
  END IF;
  IF NOT pg_try_advisory_xact_lock(hashtextextended('trade-v2:'||v_uid,0)) THEN
    RAISE EXCEPTION 'Outra troca em andamento. Tente novamente.' USING ERRCODE='55P03';
  END IF;
  v_intent := jsonb_build_array(p_operation,p_offer_id,p_receiver_id,p_offered_card_ids,
    p_requested_card_ids,p_offered_nxa,p_requested_nxa,p_note);
  SELECT * INTO v_previous FROM public.trade_requests_v2 WHERE user_id=v_uid AND request_id=p_request_id;
  IF FOUND THEN
    IF v_previous.intent IS DISTINCT FROM v_intent THEN RAISE EXCEPTION 'Request ID reutilizado com dados diferentes.'; END IF;
    RETURN v_previous.result;
  END IF;

  IF p_operation='CREATE' THEN
    IF p_receiver_id IS NULL OR p_receiver_id=v_uid THEN RAISE EXCEPTION 'Destinatário inválido.'; END IF;
    IF p_offered_card_ids IS NULL OR p_requested_card_ids IS NULL
      OR cardinality(p_offered_card_ids)>10 OR cardinality(p_requested_card_ids)>10
      OR COALESCE(array_ndims(p_offered_card_ids),1)<>1 OR COALESCE(array_ndims(p_requested_card_ids),1)<>1 THEN
      RAISE EXCEPTION 'Selecione até 10 cartas por lado.';
    END IF;
    v_all := p_offered_card_ids || p_requested_card_ids;
    IF EXISTS (SELECT 1 FROM unnest(v_all) x WHERE x IS NULL OR length(btrim(x))=0 OR length(x)>256)
      OR cardinality(v_all)<>(SELECT count(DISTINCT x) FROM unnest(v_all) x) THEN
      RAISE EXCEPTION 'Cartas inválidas ou duplicadas.';
    END IF;
    IF p_offered_nxa IS NULL OR p_requested_nxa IS NULL
      OR NOT (p_offered_nxa BETWEEN 0 AND 1000000 AND p_requested_nxa BETWEEN 0 AND 1000000)
      OR p_offered_nxa<>trunc(p_offered_nxa) OR p_requested_nxa<>trunc(p_requested_nxa)
      OR (cardinality(p_offered_card_ids)=0 AND p_offered_nxa=0)
      OR (cardinality(p_requested_card_ids)=0 AND p_requested_nxa=0) THEN
      RAISE EXCEPTION 'Informe cartas ou NXA inteiros de 0 a 1.000.000 em cada lado.';
    END IF;
    IF p_note IS NULL OR length(p_note)>500 THEN RAISE EXCEPTION 'Mensagem inválida (máximo 500 caracteres).'; END IF;
    IF (SELECT count(*) FROM public.trade_offers_v2 WHERE sender_id=v_uid AND status='PENDING' AND expires_at>now())>=20 THEN
      RAISE EXCEPTION 'Limite de 20 propostas pendentes atingido.';
    END IF;
    v_offer.sender_id:=v_uid; v_offer.receiver_id:=p_receiver_id;
    v_offer.offered_card_ids:=p_offered_card_ids; v_offer.requested_card_ids:=p_requested_card_ids;
    v_offer.offered_nxa:=p_offered_nxa; v_offer.requested_nxa:=p_requested_nxa;
  ELSE
    -- Privacy is checked in the lock query, before any status is disclosed.
    SELECT * INTO v_offer FROM public.trade_offers_v2 WHERE id=p_offer_id
      AND v_uid IN (sender_id,receiver_id) FOR UPDATE NOWAIT;
    IF NOT FOUND THEN RAISE EXCEPTION 'Proposta não encontrada.'; END IF;
    IF (p_operation IN ('ACCEPT','REJECT') AND v_uid<>v_offer.receiver_id)
      OR (p_operation='CANCEL' AND v_uid<>v_offer.sender_id) THEN
      RAISE EXCEPTION 'Operação não permitida.';
    END IF;
    IF v_offer.status<>'PENDING' THEN RAISE EXCEPTION 'Proposta já encerrada.'; END IF;
    IF v_offer.expires_at<=now() THEN RAISE EXCEPTION 'Proposta expirada.'; END IF;
    IF p_operation IN ('REJECT','CANCEL') THEN
      UPDATE public.trade_offers_v2 SET status=CASE p_operation WHEN 'REJECT' THEN 'REJECTED' ELSE 'CANCELLED' END,
        rejected_at=CASE WHEN p_operation='REJECT' THEN now() END,
        cancelled_at=CASE WHEN p_operation='CANCEL' THEN now() END WHERE id=v_offer.id;
    END IF;
  END IF;

  IF p_operation IN ('CREATE','ACCEPT') THEN
    -- Compatible with Marketplace: profiles -> table intent -> Cards. All NOWAIT
    -- so legacy claim(Card -> profile) and box table locks cannot form a wait cycle.
    FOR v_id IN SELECT x FROM unnest(ARRAY[v_offer.sender_id,v_offer.receiver_id]) x ORDER BY x COLLATE "C" LOOP
      PERFORM 1 FROM public.profiles WHERE id=v_id FOR UPDATE NOWAIT;
      IF NOT FOUND THEN RAISE EXCEPTION 'Jogador não encontrado.'; END IF;
    END LOOP;
    SELECT * INTO STRICT v_sender FROM public.profiles WHERE id=v_offer.sender_id;
    SELECT * INTO STRICT v_receiver FROM public.profiles WHERE id=v_offer.receiver_id;
    -- Do not expose a third party's balance during proposal creation.
    IF v_sender.balance_nxa IS NULL OR v_sender.balance_nxa::text IN ('NaN','Infinity','-Infinity') OR v_sender.balance_nxa<v_offer.offered_nxa
      OR (p_operation='ACCEPT' AND (v_receiver.balance_nxa IS NULL OR v_receiver.balance_nxa::text IN ('NaN','Infinity','-Infinity') OR v_receiver.balance_nxa<v_offer.requested_nxa)) THEN
      RAISE EXCEPTION 'Saldo insuficiente para concluir a proposta.';
    END IF;
    LOCK TABLE public.user_cards IN ROW EXCLUSIVE MODE NOWAIT;
    FOR v_id IN SELECT x FROM unnest(v_offer.offered_card_ids||v_offer.requested_card_ids) x ORDER BY x COLLATE "C" LOOP
      SELECT * INTO v_card FROM public.user_cards WHERE id=v_id FOR UPDATE NOWAIT;
      v_owner := CASE WHEN v_id=ANY(v_offer.offered_card_ids) THEN v_offer.sender_id ELSE v_offer.receiver_id END;
      IF NOT FOUND OR v_card.owner_id IS DISTINCT FROM v_owner THEN RAISE EXCEPTION 'Carta não pertence mais ao jogador informado.'; END IF;
      IF v_card.state IS DISTINCT FROM 'FREE' OR v_card.card_status IS DISTINCT FROM 'FREE'
        OR v_card.status IS DISTINCT FROM 'IDLE' OR v_card.tradeable IS DISTINCT FROM true
        OR v_card.synthesized_at IS NOT NULL OR v_card.last_accrual_at IS NOT NULL OR v_card.exhausted_at IS NOT NULL
        OR EXISTS (SELECT 1 FROM public.marketplace_reservations_v2 WHERE card_id=v_id)
        OR EXISTS (SELECT 1 FROM public.marketplace_listings WHERE item_id=v_id AND status='ACTIVE') THEN
        RAISE EXCEPTION 'Carta indisponível para troca.';
      END IF;
      IF v_id=ANY(v_offer.offered_card_ids) THEN
        v_offered:=v_offered||jsonb_build_array(public.trade_card_snapshot_v2(v_card));
      ELSE v_requested:=v_requested||jsonb_build_array(public.trade_card_snapshot_v2(v_card)); END IF;
    END LOOP;

    IF p_operation='CREATE' THEN
      v_offer.id:='trd-v2-'||gen_random_uuid()::text;
      INSERT INTO public.trade_offers_v2(id,sender_id,receiver_id,sender_name,receiver_name,sender_avatar,receiver_avatar,
        offered_card_ids,requested_card_ids,offered_items,requested_items,offered_nxa,requested_nxa,note)
      VALUES(v_offer.id,v_sender.id,v_receiver.id,v_sender.username,v_receiver.username,v_sender.avatar,v_receiver.avatar,
        v_offer.offered_card_ids,v_offer.requested_card_ids,v_offered,v_requested,v_offer.offered_nxa,v_offer.requested_nxa,p_note);
    ELSE
      -- Every Card was locked and revalidated above; no client snapshots participate.
      FOR v_id IN SELECT x FROM unnest(v_offer.offered_card_ids||v_offer.requested_card_ids) x ORDER BY x COLLATE "C" LOOP
        v_target:=CASE WHEN v_id=ANY(v_offer.offered_card_ids) THEN v_receiver.id ELSE v_sender.id END;
        v_name:=CASE WHEN v_target=v_receiver.id THEN v_receiver.username ELSE v_sender.username END;
        v_owner:=CASE WHEN v_target=v_receiver.id THEN v_sender.id ELSE v_receiver.id END;
        UPDATE public.user_cards SET owner_id=v_target,owner_name=v_name,updated_at=now()
          WHERE id=v_id AND owner_id=v_owner AND state='FREE' AND card_status='FREE' AND status='IDLE' AND tradeable;
        GET DIAGNOSTICS v_changed=ROW_COUNT;
        IF v_changed<>1 THEN RAISE EXCEPTION 'Transferência da carta não confirmada.'; END IF;
      END LOOP;
      UPDATE public.profiles SET balance_nxa=balance_nxa-v_offer.offered_nxa+v_offer.requested_nxa,updated_at=now() WHERE id=v_sender.id;
      GET DIAGNOSTICS v_changed=ROW_COUNT;
      IF v_changed<>1 THEN RAISE EXCEPTION 'Saldo do remetente não confirmado.'; END IF;
      UPDATE public.profiles SET balance_nxa=balance_nxa-v_offer.requested_nxa+v_offer.offered_nxa,updated_at=now() WHERE id=v_receiver.id;
      GET DIAGNOSTICS v_changed=ROW_COUNT;
      IF v_changed<>1 THEN RAISE EXCEPTION 'Saldo do destinatário não confirmado.'; END IF;
      -- Two ledger legs per currency transfer, including offsetting exchanges.
      IF v_offer.offered_nxa>0 THEN
        INSERT INTO public.transactions(id,user_id,user_name,currency,amount,balance_after,type,description,metadata)
        VALUES ('trd:'||v_offer.id||':offered:debit',v_sender.id,v_sender.username,'NXA',-v_offer.offered_nxa,
          v_sender.balance_nxa-v_offer.offered_nxa,'TRADE_TRANSFER','NXA enviados em troca P2P',jsonb_build_object('trade_id',v_offer.id)),
          ('trd:'||v_offer.id||':offered:credit',v_receiver.id,v_receiver.username,'NXA',v_offer.offered_nxa,
          v_receiver.balance_nxa+v_offer.offered_nxa,'TRADE_TRANSFER','NXA recebidos em troca P2P',jsonb_build_object('trade_id',v_offer.id));
      END IF;
      IF v_offer.requested_nxa>0 THEN
        INSERT INTO public.transactions(id,user_id,user_name,currency,amount,balance_after,type,description,metadata)
        VALUES ('trd:'||v_offer.id||':requested:debit',v_receiver.id,v_receiver.username,'NXA',-v_offer.requested_nxa,
          v_receiver.balance_nxa+v_offer.offered_nxa-v_offer.requested_nxa,'TRADE_TRANSFER','NXA enviados em troca P2P',jsonb_build_object('trade_id',v_offer.id)),
          ('trd:'||v_offer.id||':requested:credit',v_sender.id,v_sender.username,'NXA',v_offer.requested_nxa,
          v_sender.balance_nxa-v_offer.offered_nxa+v_offer.requested_nxa,'TRADE_TRANSFER','NXA recebidos em troca P2P',jsonb_build_object('trade_id',v_offer.id));
      END IF;
      UPDATE public.trade_offers_v2 SET status='ACCEPTED',completed_at=now() WHERE id=v_offer.id;
    END IF;
  END IF;
  v_result:=jsonb_build_object('success',true,'operation',p_operation,'offer_id',v_offer.id);
  INSERT INTO public.trade_requests_v2(user_id,request_id,intent,result) VALUES(v_uid,p_request_id,v_intent,v_result);
  RETURN v_result;
END $$;

CREATE FUNCTION public.create_trade_offer_v2(p_receiver_id text,p_offered_card_ids text[],p_requested_card_ids text[],
  p_offered_nxa numeric,p_requested_nxa numeric,p_request_id text,p_note text DEFAULT '')
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT public.trade_operation_v2('CREATE',p_request_id,NULL,p_receiver_id,p_offered_card_ids,p_requested_card_ids,p_offered_nxa,p_requested_nxa,p_note);
$$;
CREATE FUNCTION public.accept_trade_offer_v2(p_offer_id text,p_request_id text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT public.trade_operation_v2('ACCEPT',p_request_id,p_offer_id);
$$;
CREATE FUNCTION public.reject_trade_offer_v2(p_offer_id text,p_request_id text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT public.trade_operation_v2('REJECT',p_request_id,p_offer_id);
$$;
CREATE FUNCTION public.cancel_trade_offer_v2(p_offer_id text,p_request_id text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT public.trade_operation_v2('CANCEL',p_request_id,p_offer_id);
$$;

CREATE FUNCTION public.fetch_my_trade_offers_v2(p_limit integer DEFAULT 100,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação necessária.'; END IF;
  -- Server clock determines effective expiry; the persisted intent remains intact.
  RETURN QUERY SELECT to_jsonb(t)||jsonb_build_object('status',CASE WHEN t.status='PENDING' AND t.expires_at<=now()
    THEN 'EXPIRED' ELSE t.status END) FROM public.trade_offers_v2 t WHERE auth.uid()::text IN (t.sender_id,t.receiver_id)
    ORDER BY t.created_at DESC,t.id LIMIT LEAST(GREATEST(COALESCE(p_limit,100),1),100) OFFSET GREATEST(COALESCE(p_offset,0),0);
END $$;

-- Trading catalogue, NOT public profile/inventory access: only eligible Cards,
-- explicit display fields, targeted player and bounded pagination; no balances.
CREATE FUNCTION public.fetch_trade_cards_v2(p_owner_id text,p_limit integer DEFAULT 100,p_offset integer DEFAULT 0)
RETURNS SETOF jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação necessária.'; END IF;
  RETURN QUERY SELECT public.trade_card_snapshot_v2(c) FROM public.user_cards c
    WHERE c.owner_id=p_owner_id AND c.state='FREE' AND c.card_status='FREE' AND c.status='IDLE' AND c.tradeable
      AND c.synthesized_at IS NULL AND c.last_accrual_at IS NULL AND c.exhausted_at IS NULL
      AND NOT EXISTS(SELECT 1 FROM public.marketplace_reservations_v2 r WHERE r.card_id=c.id)
      AND NOT EXISTS(SELECT 1 FROM public.marketplace_listings l WHERE l.item_id=c.id AND l.status='ACTIVE')
    ORDER BY c.id LIMIT LEAST(GREATEST(COALESCE(p_limit,100),1),100) OFFSET GREATEST(COALESCE(p_offset,0),0);
END $$;

REVOKE ALL ON FUNCTION public.trade_card_snapshot_v2(public.user_cards),
  public.trade_operation_v2(text,text,text,text,text[],text[],numeric,numeric,text)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.create_trade_offer_v2(text,text[],text[],numeric,numeric,text,text),
  public.accept_trade_offer_v2(text,text),public.reject_trade_offer_v2(text,text),public.cancel_trade_offer_v2(text,text),
  public.fetch_my_trade_offers_v2(integer,integer),public.fetch_trade_cards_v2(text,integer,integer)
  FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.create_trade_offer_v2(text,text[],text[],numeric,numeric,text,text),
  public.accept_trade_offer_v2(text,text),public.reject_trade_offer_v2(text,text),public.cancel_trade_offer_v2(text,text),
  public.fetch_my_trade_offers_v2(integer,integer),public.fetch_trade_cards_v2(text,integer,integer) TO authenticated;

COMMIT;
