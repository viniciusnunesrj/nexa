-- Only synthetic data. This script always rolls back the entire transaction.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
DO $test$
DECLARE
  u text := gen_random_uuid()::text;
  t text;
  c text := 'star-v11-smoke-'||u;
  r jsonb;
  replay jsonb;
BEGIN
  SELECT template_id INTO STRICT t FROM public.card_templates WHERE active ORDER BY template_id LIMIT 1;
  INSERT INTO public.profiles(id,username,email,balance_nex,balance_nxa)
  VALUES(u,'star_v11_'||substr(u,1,8),u||'@example.invalid',5000,0);
  INSERT INTO public.user_cards(id,owner_id,owner_name,template_id,name,rarity,collection_id,collection_name,element)
  SELECT id,u,'Synthetic',t,'Synthetic','Comum','test','test','fire'
  FROM unnest(ARRAY[c,c||'-duplicate']) id;
  INSERT INTO public.card_fragments(owner_id,template_id,quantity) VALUES(u,t,100);
  PERFORM set_config('request.jwt.claim.sub',u,true);
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  SET LOCAL ROLE authenticated;
  r := public.execute_star_upgrade_v1('smoke-v11',c,ARRAY[]::text[]);
  replay := public.execute_star_upgrade_v1('smoke-v11',c,ARRAY[]::text[]);
  SET LOCAL ROLE postgres;
  IF (r#>>'{main_card,star_level}')::integer<>2
    OR (r->>'fragments_spent')::integer<>25
    OR (r->>'charged_nex')::numeric<>100
    OR r->'consumed_ids'<>'[]'::jsonb
    OR replay->>'idempotent'<>'true'
    OR (SELECT quantity FROM public.card_fragments WHERE owner_id=u AND template_id=t)<>75
    OR (SELECT balance_nex FROM public.profiles WHERE id=u)<>4900
    OR (SELECT count(*) FROM public.user_cards WHERE owner_id=u)<>2
    OR (SELECT count(*) FROM star_system_private.operations WHERE owner_id=u)<>1
    OR (SELECT count(*) FROM public.transactions WHERE user_id=u)<>1
  THEN RAISE EXCEPTION 'Star V1.1 smoke failed'; END IF;
  PERFORM set_config('nexa.star_v11_smoke','PASS: fragments, NEX, stars, idempotency, cards preserved',true);
END;
$test$;
SELECT current_setting('nexa.star_v11_smoke') AS result;
ROLLBACK;
