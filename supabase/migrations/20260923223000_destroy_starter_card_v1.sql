CREATE OR REPLACE FUNCTION public.destroy_starter_card_v1(p_card_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog','public'
AS $$
DECLARE
  u text:=auth.uid()::text;
  c public.user_cards;
  remaining_count integer;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_card_id IS NULL OR length(p_card_id)>200 THEN RAISE EXCEPTION 'Invalid card'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('nexa:starter-destroy:'||u,0));
  SELECT * INTO c FROM public.user_cards WHERE id=p_card_id AND owner_id=u FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Carta não encontrada'; END IF;
  IF NOT c.is_starter THEN RAISE EXCEPTION 'Esta operação é exclusiva para Carta Inicial'; END IF;
  IF c.status<>'IDLE' OR c.state<>'FREE' OR c.card_status<>'FREE' THEN RAISE EXCEPTION 'Carta em uso não pode ser destruída'; END IF;
  IF EXISTS(SELECT 1 FROM public.marketplace_listings WHERE item_id=c.id AND status='ACTIVE') THEN RAISE EXCEPTION 'Carta anunciada não pode ser destruída'; END IF;
  DELETE FROM public.user_cards WHERE id=c.id AND owner_id=u;
  SELECT count(*) INTO remaining_count FROM public.user_cards WHERE owner_id=u;
  RETURN jsonb_build_object('success',true,'card_id',c.id,'remaining_cards',remaining_count);
END $$;
REVOKE ALL ON FUNCTION public.destroy_starter_card_v1(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.destroy_starter_card_v1(text) TO authenticated;
