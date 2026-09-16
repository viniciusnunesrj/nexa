-- INTEGRATION TEST, NOT A MIGRATION. Only a disposable local/staging database.
-- Requires the real schema + Marketplace/synthesis guards + the P2P migration.
-- The operator must explicitly mark that disposable session:
-- SET nexa.p2p_test_database = 'disposable';
-- Execute with ON_ERROR_STOP. Every fixture and assertion is rolled back.
BEGIN;
DO $$ BEGIN
  IF current_setting('nexa.p2p_test_database',true) IS DISTINCT FROM 'disposable' OR current_user<>'postgres' THEN
    RAISE EXCEPTION 'STOP: disposable database session marker and postgres required';
  END IF;
END $$;

CREATE FUNCTION pg_temp.expect_trade_error(statement text, expected text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF position(expected IN SQLERRM)>0 THEN RETURN; END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'Expected error %, statement succeeded',expected;
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.expect_trade_error(text,text) TO authenticated;

DO $test$
DECLARE
  a text:=gen_random_uuid()::text; b text:=gen_random_uuid()::text; outsider text:=gen_random_uuid()::text;
  ca text:='test-card-'||gen_random_uuid()::text; cb text:='test-card-'||gen_random_uuid()::text;
  offer text; competing text; result jsonb; repeated jsonb; before_count integer; action text;
BEGIN
  INSERT INTO public.profiles(id,username,email,balance_nxa) VALUES
    (a,'test-'||a,a||'@example.invalid',100),(b,'test-'||b,b||'@example.invalid',200),
    (outsider,'test-'||outsider,outsider||'@example.invalid',100);
  INSERT INTO public.user_cards(id,owner_id,owner_name,template_id,name,rarity,collection_id,collection_name,element)
    SELECT ca,a,'test-'||a,'p2p-test-template','A','Raro','p2p-test','P2P test','Luz'
    UNION ALL SELECT cb,b,'test-'||b,'p2p-test-template','B','Raro','p2p-test','P2P test','Luz';
  PERFORM set_config('request.jwt.claim.sub',a,true);
  PERFORM set_config('role','authenticated',true);
  PERFORM pg_temp.expect_trade_error(format('SELECT public.create_trade_offer_v2(%L,ARRAY[%L],ARRAY[%L],10,2,%L)',a,ca,cb,'self'),'Destinatário inválido');
  PERFORM pg_temp.expect_trade_error(format('SELECT public.create_trade_offer_v2(%L,ARRAY[%L],ARRAY[%L],10,2,%L)',b,cb,ca,'owner'),'Carta não pertence');
  PERFORM pg_temp.expect_trade_error(format('SELECT public.create_trade_offer_v2(%L,ARRAY[%L],ARRAY[%L],10,2,%L)',b,ca,ca,'duplicates'),'duplicadas');
  PERFORM pg_temp.expect_trade_error(format('SELECT public.create_trade_offer_v2(%L,ARRAY[%L],ARRAY[%L],101,2,%L)',b,ca,cb,'balance'),'Saldo insuficiente');
  PERFORM set_config('role','postgres',true);
  UPDATE public.user_cards SET state='ACTIVE',status='ACTIVE',card_status='ACTIVE',tradeable=false WHERE id=ca;
  PERFORM set_config('role','authenticated',true);
  PERFORM pg_temp.expect_trade_error(format('SELECT public.create_trade_offer_v2(%L,ARRAY[%L],ARRAY[%L],10,2,%L)',b,ca,cb,'active'),'Carta indisponível');
  PERFORM set_config('role','postgres',true);
  UPDATE public.user_cards SET state='FREE',status='IDLE',card_status='FREE',tradeable=true WHERE id=ca;
  PERFORM set_config('role','authenticated',true);
  result:=public.create_trade_offer_v2(b,ARRAY[ca],ARRAY[cb],10,2,'create');
  repeated:=public.create_trade_offer_v2(b,ARRAY[ca],ARRAY[cb],10,2,'create');
  IF repeated IS DISTINCT FROM result THEN RAISE EXCEPTION 'CREATE replay changed'; END IF;
  offer:=result->>'offer_id';
  competing:=public.create_trade_offer_v2(b,ARRAY[ca],ARRAY[cb],10,2,'competing')->>'offer_id';
  PERFORM pg_temp.expect_trade_error(format('SELECT public.create_trade_offer_v2(%L,ARRAY[%L],ARRAY[%L],11,2,%L)',b,ca,cb,'create'),'dados diferentes');
  PERFORM pg_temp.expect_trade_error(format('SELECT public.accept_trade_offer_v2(%L,%L)',offer,'wrong-accept'),'Operação não permitida');
  -- Recipient cannot cancel; third party cannot read either the RPC or the table.
  PERFORM set_config('request.jwt.claim.sub',b,true);
  PERFORM pg_temp.expect_trade_error(format('SELECT public.cancel_trade_offer_v2(%L,%L)',offer,'wrong-cancel'),'Operação não permitida');
  PERFORM set_config('request.jwt.claim.sub',outsider,true);
  IF EXISTS(SELECT 1 FROM public.fetch_my_trade_offers_v2()) OR EXISTS(SELECT 1 FROM public.trade_offers_v2) THEN
    RAISE EXCEPTION 'Private proposal leaked';
  END IF;
  PERFORM pg_temp.expect_trade_error(format('SELECT public.accept_trade_offer_v2(%L,%L)',offer,'third'),'Proposta não encontrada');
  PERFORM set_config('request.jwt.claim.sub',b,true);
  -- Availability and official balances must be rechecked at ACCEPT, not just CREATE.
  PERFORM set_config('role','postgres',true);
  UPDATE public.profiles SET balance_nxa=0 WHERE id=a;
  PERFORM set_config('role','authenticated',true);
  PERFORM pg_temp.expect_trade_error(format('SELECT public.accept_trade_offer_v2(%L,%L)',offer,'low-balance'),'Saldo insuficiente');
  PERFORM set_config('role','postgres',true);
  UPDATE public.profiles SET balance_nxa=100 WHERE id=a;
  UPDATE public.user_cards SET status='LISTED' WHERE id=ca;
  PERFORM set_config('role','authenticated',true);
  PERFORM pg_temp.expect_trade_error(format('SELECT public.accept_trade_offer_v2(%L,%L)',offer,'listed'),'Carta indisponível');
  PERFORM set_config('role','postgres',true);
  UPDATE public.user_cards SET status='IDLE' WHERE id=ca;
  PERFORM set_config('role','authenticated',true);
  result:=public.accept_trade_offer_v2(offer,'accept');
  repeated:=public.accept_trade_offer_v2(offer,'accept');
  IF result IS DISTINCT FROM repeated THEN RAISE EXCEPTION 'ACCEPT replay changed'; END IF;
  PERFORM pg_temp.expect_trade_error(format('SELECT public.accept_trade_offer_v2(%L,%L)',offer,'double'),'já encerrada');
  PERFORM pg_temp.expect_trade_error(format('SELECT public.accept_trade_offer_v2(%L,%L)',competing,'stale-owner'),'Carta não pertence');
  PERFORM set_config('role','postgres',true);
  IF (SELECT owner_id FROM public.user_cards WHERE id=ca) IS DISTINCT FROM b
    OR (SELECT owner_id FROM public.user_cards WHERE id=cb) IS DISTINCT FROM a
    OR (SELECT owner_name FROM public.user_cards WHERE id=ca) IS DISTINCT FROM 'test-'||b
    OR (SELECT balance_nxa FROM public.profiles WHERE id=a) IS DISTINCT FROM 92::numeric
    OR (SELECT balance_nxa FROM public.profiles WHERE id=b) IS DISTINCT FROM 208::numeric
    OR (SELECT count(*) FROM public.transactions WHERE metadata->>'trade_id'=offer)<>4
    OR (SELECT sum(amount) FROM public.transactions WHERE metadata->>'trade_id'=offer)<>0
    OR (SELECT status FROM public.trade_offers_v2 WHERE id=offer)<>'ACCEPTED' THEN
    RAISE EXCEPTION 'Actual ownership/balances/ledger/status are incorrect';
  END IF;
  SELECT count(*) INTO before_count FROM public.transactions WHERE user_id IN (a,b);
  -- Terminal states and expiry cannot be accepted; failed calls write no receipts.
  FOREACH action IN ARRAY ARRAY['CANCEL','REJECT','EXPIRE'] LOOP
    PERFORM set_config('request.jwt.claim.sub',a,true);
    PERFORM set_config('role','authenticated',true);
    offer:=public.create_trade_offer_v2(b,'{}','{}',1,1,'create-'||action)->>'offer_id';
    IF action='CANCEL' THEN PERFORM public.cancel_trade_offer_v2(offer,'cancel'); END IF;
    PERFORM set_config('request.jwt.claim.sub',b,true);
    IF action='REJECT' THEN PERFORM public.reject_trade_offer_v2(offer,'reject'); END IF;
    IF action='EXPIRE' THEN
      PERFORM set_config('role','postgres',true);
      UPDATE public.trade_offers_v2 SET created_at=now()-interval '50 hours',expires_at=now()-interval '2 hours' WHERE id=offer;
      PERFORM set_config('role','authenticated',true);
    END IF;
    PERFORM pg_temp.expect_trade_error(format('SELECT public.accept_trade_offer_v2(%L,%L)',offer,'accept-'||action),
      CASE WHEN action='EXPIRE' THEN 'expirada' ELSE 'já encerrada' END);
  END LOOP;
  PERFORM set_config('role','postgres',true);
  IF (SELECT count(*) FROM public.transactions WHERE user_id IN (a,b))<>before_count
    OR EXISTS(SELECT 1 FROM public.trade_requests_v2 WHERE user_id IN(a,b) AND request_id LIKE 'accept-%') THEN
    RAISE EXCEPTION 'Failed settlement left partial writes';
  END IF;
  IF has_function_privilege('anon','public.accept_trade_offer_v2(text,text)','EXECUTE')
    OR has_function_privilege('authenticated','public.trade_operation_v2(text,text,text,text,text[],text[],numeric,numeric,text)','EXECUTE')
    OR has_table_privilege('authenticated','public.trade_offers_v2','INSERT,UPDATE,DELETE') THEN
    RAISE EXCEPTION 'Unexpected client privilege';
  END IF;
  RAISE NOTICE 'PASS: actual persisted ownership, balances, ledger, replay, invalid/terminal offers and RLS';
END $test$;
ROLLBACK;
