BEGIN;
ALTER TABLE public.user_cards ADD COLUMN IF NOT EXISTS is_starter boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.guard_starter_card_v1()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF TG_OP='UPDATE' AND OLD.is_starter THEN
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      RAISE EXCEPTION 'Carta inicial é vinculada à conta';
    END IF;
    IF NEW.tradeable IS DISTINCT FROM false THEN
      RAISE EXCEPTION 'Carta inicial não pode ser comercializada';
    END IF;
    IF NEW.star_level IS DISTINCT FROM 1 THEN
      RAISE EXCEPTION 'Carta inicial permanece em ★1';
    END IF;
  END IF;
  IF TG_OP='INSERT' AND NEW.is_starter THEN
    NEW.tradeable:=false;
    NEW.star_level:=1;
  END IF;
  RETURN NEW;
END $function$
;
DROP TRIGGER IF EXISTS guard_starter_card_v1 ON public.user_cards;
CREATE TRIGGER guard_starter_card_v1 BEFORE INSERT OR UPDATE ON public.user_cards FOR EACH ROW EXECUTE FUNCTION public.guard_starter_card_v1();
REVOKE ALL ON FUNCTION public.guard_starter_card_v1() FROM PUBLIC,anon,authenticated;
DO $$ BEGIN IF to_regprocedure('public.open_box_v2_single(text,text)') IS NULL THEN ALTER FUNCTION public.open_box_v2(text,text) RENAME TO open_box_v2_single; END IF; END $$;
CREATE OR REPLACE FUNCTION public.open_box_v2(p_box_id text, p_request_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  u text:=auth.uid()::text;
  v_box public.user_boxes;
  v_profile public.profiles;
  v_op public.box_operations_v1;
  v_tpl public.card_templates;
  v_meta public.box_template_metadata_v1;
  v_card public.user_cards;
  v_cards jsonb:='[]'::jsonb;
  v_rewards jsonb:='[]'::jsonb;
  v_used text[]:='{}';
  v_rarity text;
  v_i integer;
  v_result jsonb;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_request_id IS NULL OR length(p_request_id) NOT BETWEEN 1 AND 200
     OR btrim(p_request_id)<>p_request_id OR p_box_id IS NULL THEN
    RAISE EXCEPTION 'Invalid identifiers';
  END IF;

  SELECT * INTO v_box FROM public.user_boxes WHERE id=p_box_id AND owner_id=u;
  IF NOT FOUND OR v_box.box_type<>'RECRUIT' THEN
    RETURN public.open_box_v2_single(p_box_id,p_request_id);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('nexa:boxes:'||u,0));

  SELECT * INTO v_op FROM public.box_operations_v1
   WHERE owner_id=u AND (request_id=p_request_id OR p_request_id=ANY(request_aliases));
  IF FOUND THEN
    IF v_op.operation<>'OPEN' OR v_op.subject IS DISTINCT FROM p_box_id THEN
      RAISE EXCEPTION 'Request reused with different intent';
    END IF;
    RETURN v_op.result;
  END IF;

  SELECT * INTO v_op FROM public.box_operations_v1
   WHERE owner_id=u AND operation='OPEN' AND box_id=p_box_id;
  IF FOUND THEN
    IF cardinality(v_op.request_aliases)>=20 THEN
      RAISE EXCEPTION 'Too many distinct retries; reuse the original request';
    END IF;
    UPDATE public.box_operations_v1
       SET request_aliases=array_append(request_aliases,p_request_id)
     WHERE owner_id=u AND request_id=v_op.request_id;
    RETURN v_op.result;
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id=u FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile missing'; END IF;

  LOCK TABLE public.user_cards IN SHARE ROW EXCLUSIVE MODE;
  SELECT * INTO v_box FROM public.user_boxes WHERE id=p_box_id AND owner_id=u FOR UPDATE;
  IF NOT FOUND OR v_box.box_type<>'RECRUIT' THEN RAISE EXCEPTION 'Recruit box missing'; END IF;

  FOR v_i IN 1..4 LOOP
    v_rarity:=CASE WHEN random()<0.75 THEN 'Comum' ELSE 'Incomum' END;

    SELECT t.* INTO v_tpl
      FROM public.card_templates t
      JOIN public.box_template_metadata_v1 m USING(template_id)
     WHERE t.active
       AND t.rarity=v_rarity
       AND NOT (t.template_id=ANY(v_used))
       AND NOT EXISTS (
         SELECT 1 FROM public.user_cards c
          WHERE c.owner_id=u AND c.template_id=t.template_id
       )
     ORDER BY random() LIMIT 1;

    IF NOT FOUND THEN
      SELECT t.* INTO v_tpl
        FROM public.card_templates t
        JOIN public.box_template_metadata_v1 m USING(template_id)
       WHERE t.active
         AND t.rarity IN ('Comum','Incomum')
         AND NOT (t.template_id=ANY(v_used))
         AND NOT EXISTS (
           SELECT 1 FROM public.user_cards c
            WHERE c.owner_id=u AND c.template_id=t.template_id
         )
       ORDER BY random() LIMIT 1;
    END IF;

    IF NOT FOUND THEN RAISE EXCEPTION 'Starter pool has fewer than four available unique cards'; END IF;

    SELECT * INTO STRICT v_meta
      FROM public.box_template_metadata_v1 WHERE template_id=v_tpl.template_id;

    INSERT INTO public.user_cards(
      id,owner_id,owner_name,template_id,name,rarity,collection_id,collection_name,
      element,element_icon,image,description,synthesis_rate,synthesis_cap,market_value,
      state,card_status,status,tradeable,star_level,is_starter
    ) VALUES (
      'card-'||gen_random_uuid()::text,u,v_profile.username,v_tpl.template_id,v_tpl.name,v_tpl.rarity,
      v_meta.collection_id,v_meta.collection_name,v_meta.element,v_meta.element_icon,v_meta.image,
      v_meta.description,v_tpl.synthesis_rate,v_meta.synthesis_cap,v_tpl.market_value,
      'FREE','FREE','IDLE',false,1,true
    ) RETURNING * INTO v_card;

    v_used:=array_append(v_used,v_tpl.template_id);
    v_cards:=v_cards||jsonb_build_array(to_jsonb(v_card));
    v_rewards:=v_rewards||jsonb_build_array(jsonb_build_object(
      'templateId',v_tpl.template_id,'name',v_tpl.name,'rarity',v_tpl.rarity,'image',v_meta.image
    ));
  END LOOP;

  INSERT INTO public.transactions(id,user_id,user_name,currency,amount,balance_after,type,description,metadata)
  VALUES(
    'tx-'||gen_random_uuid()::text,u,v_profile.username,'NEX',0,v_profile.balance_nex,'BOX_OPEN',
    'Caixa de Recruta',
    jsonb_build_object('boxId',v_box.id,'requestId',p_request_id,'starterCards',v_used)
  );

  v_result:=jsonb_build_object(
    'success',true,'box_id',v_box.id,'box_type','RECRUIT','box_name','Caixa de Recruta','opened_at',now(),
    'reward',v_rewards->0,'rewards',v_rewards,'card',v_cards->0,'cards',v_cards,
    'fragment',NULL,'fragments_awarded',0,'starter_pack',true
  );

  INSERT INTO public.box_operations_v1(owner_id,request_id,operation,subject,box_id,result,created_at)
  VALUES(u,p_request_id,'OPEN',v_box.id,v_box.id,v_result,now());

  DELETE FROM public.user_boxes WHERE id=v_box.id AND owner_id=u;
  RETURN v_result;
END $function$
;
REVOKE ALL ON FUNCTION public.open_box_v2(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.open_box_v2(text,text) TO authenticated;
REVOKE ALL ON FUNCTION public.open_box_v2_single(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.open_box_v2_single(text,text) TO authenticated;
COMMIT;
