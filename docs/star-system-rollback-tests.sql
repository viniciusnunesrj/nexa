-- Authorized integration tests. Synthetic profiles/cards only; ALWAYS ROLLBACK.
-- No legacy RPC definitions or real users/cards are modified.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='45s';
DO $tests$
DECLARE
  u text := gen_random_uuid()::text;
  other_u text := gen_random_uuid()::text;
  prefix text;
  template text;
  main_id text;
  materials text[];
  chosen text[];
  result jsonb;
  replay jsonb;
  before_state jsonb;
  after_state jsonb;
  before_main jsonb;
  results jsonb := '[]';
  error_message text;
  expected text;
  scenario text;
  request_key text;
  cost numeric;
  receipts_created integer := 0;
  s integer;
  i integer;
BEGIN
  prefix := 'star-v1-test-'||u;
  main_id := prefix||'-main';
  materials := ARRAY[prefix||'-m1',prefix||'-m2',prefix||'-m3',prefix||'-m4'];
  SELECT template_id INTO STRICT template FROM public.card_templates WHERE active ORDER BY template_id LIMIT 1;
  INSERT INTO public.profiles(id,username,email,balance_nex,balance_nxa)
  VALUES(u,'star_test_'||substr(u,1,8),u||'@example.invalid',5000,42),
    (other_u,'star_test_'||substr(other_u,1,8),other_u||'@example.invalid',5000,42);
  INSERT INTO public.user_cards(id,owner_id,owner_name,template_id,name,rarity,collection_id,collection_name,element)
  SELECT card_id,u,'Star synthetic',template,'Star synthetic','Comum','test','test','fire'
  FROM unnest(materials||ARRAY[main_id]) card_id;
  INSERT INTO public.user_cards(id,owner_id,owner_name,template_id,name,rarity,collection_id,collection_name,element)
  SELECT card_id,other_u,'Star synthetic',template,'Star synthetic','Comum','test','test','fire'
  FROM unnest(ARRAY[prefix||'-foreign-main',prefix||'-foreign-mat']) card_id;
  IF EXISTS (SELECT 1 FROM public.user_cards WHERE owner_id IN (u,other_u) AND star_level<>1) THEN
    RAISE EXCEPTION 'FAIL default ★1';
  END IF;
  results := results||jsonb_build_array('default_1_pass');
  PERFORM set_config('request.jwt.claim.sub',u,true);
  PERFORM set_config('request.jwt.claim.role','authenticated',true);

  FOR s IN 1..4 LOOP
    BEGIN
      UPDATE public.user_cards SET star_level=s WHERE id=main_id;
      SELECT to_jsonb(c)-'star_level'-'updated_at' INTO before_main FROM public.user_cards c WHERE id=main_id;
      chosen := materials[1:s];
      cost := CASE s WHEN 1 THEN 100 WHEN 2 THEN 250 WHEN 3 THEN 500 WHEN 4 THEN 1000 END;
      SET LOCAL ROLE authenticated;
      result := public.execute_star_upgrade_v1('upgrade-'||s,main_id,chosen);
      replay := public.execute_star_upgrade_v1('upgrade-'||s,main_id,chosen);
      SET LOCAL ROLE postgres;
      IF result->>'success'<>'true' OR (result#>>'{main_card,star_level}')::integer<>s+1
        OR (result->>'charged_nex')::numeric<>cost OR (result->>'balance_nex')::numeric<>5000-cost
        OR replay->>'idempotent'<>'true'
        OR (SELECT count(*) FROM public.user_cards WHERE id=ANY(chosen))<>0
        OR (SELECT balance_nex FROM public.profiles WHERE id=u)<>5000-cost
        OR (SELECT count(*) FROM public.transactions WHERE user_id=u)<>1
        OR (SELECT count(*) FROM star_system_private.operations WHERE owner_id=u)<>1
        OR (SELECT to_jsonb(c)-'star_level'-'updated_at' FROM public.user_cards c WHERE id=main_id) IS DISTINCT FROM before_main
      THEN RAISE EXCEPTION 'FAIL upgrade %',s; END IF;
      IF EXISTS (SELECT 1 FROM public.profiles WHERE id IN (u,other_u)
        AND (balance_nxa<>42 OR experience<>0 OR level<>1)) THEN RAISE EXCEPTION 'FAIL unrelated economy'; END IF;
      receipts_created := receipts_created+1;
      results := results||jsonb_build_array('upgrade_'||s||'_pass','retry_'||s||'_pass');
      -- Error after a completed call must roll back debit, consumption, stars and ledger.
      RAISE SQLSTATE 'Z0001' USING MESSAGE='intentional fixture rollback';
    EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL;
    END;
    IF (SELECT balance_nex FROM public.profiles WHERE id=u)<>5000
      OR (SELECT star_level FROM public.user_cards WHERE id=main_id)<>1
      OR (SELECT count(*) FROM public.user_cards WHERE id=ANY(materials))<>4
      OR EXISTS (SELECT 1 FROM public.transactions WHERE user_id=u)
      OR EXISTS (SELECT 1 FROM star_system_private.operations WHERE owner_id=u)
    THEN RAISE EXCEPTION 'FAIL complete rollback after upgrade %',s; END IF;
  END LOOP;
  results := results||jsonb_build_array('complete_rollback_after_success_pass');

  FOREACH scenario IN ARRAY ARRAY['max','balance','template','material_star','foreign_material','foreign_main',
    'self','duplicate','quantity','state','card_status','equipped','frozen','not_tradeable','not_synthesizable',
    'synthesized','accrual','exhausted','listed','reserved','crafted','invalid_request','unauthenticated'] LOOP
    BEGIN
      chosen:=materials[1:1]; request_key:='reject-'||scenario; expected:='indisponível';
      CASE scenario
        WHEN 'max' THEN UPDATE public.user_cards SET star_level=5 WHERE id=main_id; expected:='★5';
        WHEN 'balance' THEN UPDATE public.profiles SET balance_nex=99 WHERE id=u; expected:='Saldo';
        WHEN 'template' THEN UPDATE public.user_cards SET template_id='synthetic-other-template' WHERE id=materials[1]; expected:='template';
        WHEN 'material_star' THEN UPDATE public.user_cards SET star_level=2 WHERE id=materials[1]; expected:='★1';
        WHEN 'foreign_material' THEN chosen:=ARRAY[prefix||'-foreign-mat']; expected:='outra conta';
        WHEN 'foreign_main' THEN UPDATE public.user_cards SET owner_id=other_u WHERE id=main_id; expected:='outra conta';
        WHEN 'self' THEN chosen:=ARRAY[main_id]; expected:='distintas';
        WHEN 'duplicate' THEN chosen:=ARRAY[materials[1],materials[1]]; expected:='distintas';
        WHEN 'quantity' THEN chosen:=materials[1:2]; expected:='Quantidade';
        WHEN 'state' THEN UPDATE public.user_cards SET state='ACTIVE' WHERE id=materials[1];
        WHEN 'card_status' THEN UPDATE public.user_cards SET card_status='SYNTHESIZING' WHERE id=materials[1];
        WHEN 'equipped' THEN UPDATE public.user_cards SET status='EQUIPPED' WHERE id=main_id;
        WHEN 'frozen' THEN UPDATE public.user_cards SET status='FROZEN' WHERE id=materials[1];
        WHEN 'not_tradeable' THEN UPDATE public.user_cards SET tradeable=false WHERE id=materials[1];
        WHEN 'not_synthesizable' THEN UPDATE public.user_cards SET synthesizable=false WHERE id=materials[1];
        WHEN 'synthesized' THEN UPDATE public.user_cards SET synthesized_at=now() WHERE id=materials[1];
        WHEN 'accrual' THEN UPDATE public.user_cards SET last_accrual_at=now() WHERE id=materials[1];
        WHEN 'exhausted' THEN UPDATE public.user_cards SET exhausted_at=now() WHERE id=materials[1];
        WHEN 'listed' THEN
          INSERT INTO public.marketplace_listings(id,item_id,seller_id,seller_name,price,item_snapshot)
          VALUES(prefix||'-listing',materials[1],u,'synthetic',1,'{}'); expected:='listada';
        WHEN 'reserved' THEN
          INSERT INTO public.marketplace_listings(id,item_id,seller_id,seller_name,price,item_snapshot,status)
          VALUES(prefix||'-listing',materials[1],u,'synthetic',1,'{}','CANCELLED');
          INSERT INTO public.marketplace_reservations_v2(card_id,listing_id,seller_id,price)
          VALUES(materials[1],prefix||'-listing',u,1); expected:='reservada';
        WHEN 'crafted' THEN
          INSERT INTO public.fragment_craft_operations_v1(owner_id,request_id,template_id,card_id,fragments_spent,result)
          VALUES(u,'synthetic-craft',template,materials[1],100,'{}'); expected:='histórico';
        WHEN 'invalid_request' THEN request_key:='invalid request'; expected:='request_id';
        WHEN 'unauthenticated' THEN PERFORM set_config('request.jwt.claim.sub','',true); expected:='Autenticação';
      END CASE;
      SELECT jsonb_build_object('cards',(SELECT jsonb_agg(to_jsonb(c) ORDER BY id) FROM public.user_cards c WHERE id LIKE prefix||'%'),
        'profiles',(SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM public.profiles p WHERE id IN(u,other_u)),
        'receipts',(SELECT count(*) FROM star_system_private.operations WHERE owner_id IN(u,other_u)),
        'ledger',(SELECT count(*) FROM public.transactions WHERE user_id IN(u,other_u))) INTO before_state;
      error_message:=NULL;
      BEGIN
        SET LOCAL ROLE authenticated;
        PERFORM public.execute_star_upgrade_v1(request_key,main_id,chosen);
        SET LOCAL ROLE postgres;
      EXCEPTION WHEN OTHERS THEN error_message:=SQLERRM;
      END;
      SET LOCAL ROLE postgres;
      IF error_message IS NULL OR position(expected IN error_message)=0 THEN
        RAISE EXCEPTION 'FAIL rejection %, expected %, got %',scenario,expected,error_message;
      END IF;
      SELECT jsonb_build_object('cards',(SELECT jsonb_agg(to_jsonb(c) ORDER BY id) FROM public.user_cards c WHERE id LIKE prefix||'%'),
        'profiles',(SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM public.profiles p WHERE id IN(u,other_u)),
        'receipts',(SELECT count(*) FROM star_system_private.operations WHERE owner_id IN(u,other_u)),
        'ledger',(SELECT count(*) FROM public.transactions WHERE user_id IN(u,other_u))) INTO after_state;
      IF before_state IS DISTINCT FROM after_state THEN RAISE EXCEPTION 'FAIL rejection mutated data: %',scenario; END IF;
      results:=results||jsonb_build_array(scenario||'_rejected_without_mutation');
      RAISE SQLSTATE 'Z0001' USING MESSAGE='fixture rollback';
    EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL;
    END;
  END LOOP;

  -- Request identity and scope; both profiles are synthetic.
  SET LOCAL ROLE authenticated;
  result:=public.execute_star_upgrade_v1('same-key',main_id,materials[1:1]);
  SET LOCAL ROLE postgres;
  receipts_created:=receipts_created+1;
  error_message:=NULL;
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM public.execute_star_upgrade_v1('same-key',main_id,materials[2:2]);
    SET LOCAL ROLE postgres;
  EXCEPTION WHEN OTHERS THEN error_message:=SQLERRM; END;
  SET LOCAL ROLE postgres;
  IF error_message IS NULL OR position('outro conteúdo' IN error_message)=0 THEN RAISE EXCEPTION 'FAIL request mismatch'; END IF;
  results:=results||jsonb_build_array('payload_mismatch_pass');
  PERFORM set_config('request.jwt.claim.sub',other_u,true);
  SET LOCAL ROLE authenticated;
  result:=public.execute_star_upgrade_v1('same-key',prefix||'-foreign-main',ARRAY[prefix||'-foreign-mat']);
  SET LOCAL ROLE postgres;
  IF result->>'idempotent'<>'false' THEN RAISE EXCEPTION 'FAIL owner request scope'; END IF;
  receipts_created:=receipts_created+1;
  results:=results||jsonb_build_array('request_scope_per_owner_pass');
  PERFORM set_config('request.jwt.claim.sub',u,true);

  -- Direct client writes/receipt access and anonymous invocation must fail.
  FOREACH scenario IN ARRAY ARRAY['direct_star','private_receipt','anon_rpc','constraint_0','constraint_6'] LOOP
    error_message:=NULL;
    BEGIN
      IF scenario='direct_star' THEN
        SET LOCAL ROLE authenticated;
        UPDATE public.user_cards SET star_level=5 WHERE id=main_id;
      ELSIF scenario='private_receipt' THEN
        SET LOCAL ROLE authenticated;
        PERFORM 1 FROM star_system_private.operations;
      ELSIF scenario='anon_rpc' THEN
        SET LOCAL ROLE anon;
        PERFORM public.execute_star_upgrade_v1('anon',main_id,materials[2:2]);
      ELSIF scenario='constraint_0' THEN UPDATE public.user_cards SET star_level=0 WHERE id=main_id;
      ELSE UPDATE public.user_cards SET star_level=6 WHERE id=main_id;
      END IF;
      SET LOCAL ROLE postgres;
    EXCEPTION WHEN OTHERS THEN error_message:=SQLERRM; END;
    SET LOCAL ROLE postgres;
    IF error_message IS NULL THEN RAISE EXCEPTION 'FAIL security %',scenario; END IF;
    results:=results||jsonb_build_array(scenario||'_pass');
  END LOOP;
  PERFORM set_config('nexa.star_test_results',jsonb_build_object('checks',results,'passed',jsonb_array_length(results),
    'synthetic_profiles',2,'synthetic_cards',7,'successful_upgrade_receipts_transient',receipts_created,
    'outer_transaction','ROLLBACK','authenticated_role_test',true,'http_jwt_login_test',false)::text,true);
END;
$tests$;
SELECT current_setting('nexa.star_test_results')::jsonb AS test_results;
ROLLBACK;
