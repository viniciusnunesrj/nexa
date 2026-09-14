-- Marketplace v2, additive rollout. Run as postgres via the migration runner.
-- Legacy buy RPC and existing listing grants remain unchanged in this phase.
-- Phase 2 must revoke legacy buy + direct listing writes after v2 validation.
-- Only v2-reserved Cards are protected now; legacy listings remain stored but
-- are intentionally excluded from the v2 feed and rejected by v2 BUY/CANCEL.
-- Price policy: (0, 1,000,000] NXA, at most two fractional digits; fee remains 2%.
CREATE TABLE public.marketplace_operations_v2 (
 owner_id text NOT NULL REFERENCES public.profiles(id),
 request_id text NOT NULL CHECK(length(request_id) BETWEEN 1 AND 200 AND request_id=btrim(request_id)),
 intent jsonb NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,request_id)
);
CREATE TABLE public.marketplace_reservations_v2 (
 card_id text PRIMARY KEY REFERENCES public.user_cards(id),
 listing_id text NOT NULL UNIQUE REFERENCES public.marketplace_listings(id),
 seller_id text NOT NULL REFERENCES public.profiles(id),
 price numeric NOT NULL CHECK(price>0 AND price<=1000000 AND price=round(price,2)),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marketplace_operations_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_reservations_v2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.marketplace_operations_v2,public.marketplace_reservations_v2 FROM PUBLIC,anon,authenticated;

-- The reservation is a server-owned capability, not a client-settable GUC/status.
-- Definer runs only the guard; no writes are authorized through this function.
CREATE OR REPLACE FUNCTION public.guard_marketplace_card_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.marketplace_reservations_v2 WHERE card_id=OLD.id) THEN
  RAISE EXCEPTION 'Card reserved by Marketplace v2';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_marketplace_card_v2 BEFORE UPDATE OR DELETE ON public.user_cards
 FOR EACH ROW EXECUTE FUNCTION public.guard_marketplace_card_v2();

CREATE OR REPLACE FUNCTION public.guard_marketplace_listing_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF TG_OP<>'INSERT' AND EXISTS(SELECT 1 FROM public.marketplace_reservations_v2 WHERE listing_id=OLD.id) THEN
  RAISE EXCEPTION 'Listing reserved by Marketplace v2';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 IF NEW.status='ACTIVE' THEN
  -- Serialize legacy INSERT/reactivation with CREATE v2 on the actual card.
  -- NOWAIT avoids waiting behind synthesis, boxes, or profile/card lock inversions.
  PERFORM id FROM public.user_cards WHERE id=NEW.item_id FOR UPDATE NOWAIT;
  IF EXISTS(SELECT 1 FROM public.marketplace_reservations_v2 WHERE card_id=NEW.item_id) THEN
   RAISE EXCEPTION 'Card already reserved by Marketplace v2';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_marketplace_listing_v2 BEFORE INSERT OR UPDATE OR DELETE ON public.marketplace_listings
 FOR EACH ROW EXECUTE FUNCTION public.guard_marketplace_listing_v2();

CREATE OR REPLACE FUNCTION public.marketplace_card_snapshot_v2(c public.user_cards)
RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog,public AS $$
 SELECT jsonb_build_object('id',c.id,'type','Card','templateId',c.template_id,'name',c.name,
 'rarity',c.rarity,'collectionId',c.collection_id,'collectionName',c.collection_name,
 'element',c.element,'elementIcon',c.element_icon,'image',c.image,'description',c.description,
 'ownerId',c.owner_id,'ownerName',c.owner_name,'createdAt',c.created_at,'status',c.status,
 'state',c.state,'cardStatus',c.card_status,'tradeable',c.tradeable,'synthesizable',c.synthesizable,
 'marketValue',c.market_value,'synthesisRate',c.synthesis_rate,'synthesisCap',c.synthesis_cap)
$$;

-- Internal dispatcher: three public wrappers below expose only the allowed inputs.
CREATE OR REPLACE FUNCTION public.marketplace_operation_v2(p_operation text,p_subject text,p_price numeric,p_request_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE
 u text:=auth.uid()::text; operation_intent jsonb; previous public.marketplace_operations_v2;
 c public.user_cards; l public.marketplace_listings; reservation public.marketplace_reservations_v2;
 buyer public.profiles; seller public.profiles; profile_id text; seller_id text;
 response jsonb; fee numeric; transferred integer;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_operation NOT IN ('CREATE','BUY','CANCEL') OR p_operation IS NULL THEN RAISE EXCEPTION 'Invalid operation'; END IF;
 IF p_request_id IS NULL OR p_request_id !~ '[^[:space:]]' OR length(p_request_id) NOT BETWEEN 1 AND 200
    OR p_request_id<>btrim(p_request_id) OR p_subject IS NULL OR btrim(p_subject)='' THEN RAISE EXCEPTION 'Invalid identifiers'; END IF;
 IF p_operation='CREATE' AND (p_price IS NULL OR NOT(p_price>0 AND p_price<=1000000 AND p_price=round(p_price,2))) THEN
  RAISE EXCEPTION 'Price must be positive, at most 1000000 NXA and two decimal places';
 END IF;
 operation_intent:=jsonb_build_object('operation',p_operation,'subject',p_subject,'price',p_price);
 IF NOT pg_try_advisory_xact_lock(hashtextextended('nexa:marketplace:v2:'||u,0)) THEN
  RAISE EXCEPTION 'Marketplace busy; retry the same request' USING ERRCODE='55P03';
 END IF;
 SELECT * INTO previous FROM public.marketplace_operations_v2 WHERE owner_id=u AND request_id=p_request_id;
 IF FOUND THEN
  IF previous.intent IS DISTINCT FROM operation_intent THEN RAISE EXCEPTION 'Request reused with different intent'; END IF;
  RETURN previous.result;
 END IF;

 IF p_operation='CREATE' THEN
  seller_id:=u;
 ELSE
  -- Unlocked discovery only; everything is locked and revalidated below.
  SELECT * INTO reservation FROM public.marketplace_reservations_v2 WHERE listing_id=p_subject;
  IF NOT FOUND THEN RAISE EXCEPTION 'Legacy, closed or unreserved listing is not eligible for v2'; END IF;
  seller_id:=reservation.seller_id;
 END IF;
 -- Deterministic profile order; NOWAIT prevents cycles with card-first synthesis.
 FOR profile_id IN SELECT id FROM public.profiles WHERE id IN (u,seller_id) ORDER BY id LOOP
  PERFORM id FROM public.profiles WHERE id=profile_id FOR UPDATE NOWAIT;
 END LOOP;
 SELECT * INTO buyer FROM public.profiles WHERE id=u;
 SELECT * INTO seller FROM public.profiles WHERE id=seller_id;
 IF buyer.id IS NULL OR seller.id IS NULL THEN RAISE EXCEPTION 'Profile missing'; END IF;
 -- Take the required write table lock without waiting for the boxes global lock.
 LOCK TABLE public.user_cards IN ROW EXCLUSIVE MODE NOWAIT;
 SELECT * INTO c FROM public.user_cards WHERE id=CASE WHEN p_operation='CREATE' THEN p_subject ELSE reservation.card_id END FOR UPDATE NOWAIT;
 IF NOT FOUND THEN RAISE EXCEPTION 'Card missing'; END IF;
 IF c.owner_id IS DISTINCT FROM seller_id THEN RAISE EXCEPTION 'Card ownership mismatch'; END IF;
 IF c.state IS DISTINCT FROM 'FREE' OR c.card_status IS DISTINCT FROM 'FREE'
    OR c.tradeable IS DISTINCT FROM true OR c.synthesized_at IS NOT NULL
    OR c.last_accrual_at IS NOT NULL OR c.exhausted_at IS NOT NULL THEN RAISE EXCEPTION 'Card not tradable'; END IF;

 IF p_operation='CREATE' THEN
  IF c.status IS DISTINCT FROM 'IDLE' THEN RAISE EXCEPTION 'Card not available'; END IF;
  IF EXISTS(SELECT 1 FROM public.marketplace_reservations_v2 WHERE card_id=c.id)
     OR EXISTS(SELECT 1 FROM public.marketplace_listings WHERE item_id=c.id AND status='ACTIVE') THEN RAISE EXCEPTION 'Card already listed'; END IF;
  UPDATE public.user_cards SET status='LISTED',updated_at=now() WHERE id=c.id AND owner_id=u RETURNING * INTO c;
  IF NOT FOUND THEN RAISE EXCEPTION 'Card reservation update failed'; END IF;
  INSERT INTO public.marketplace_listings(id,item_id,seller_id,seller_name,seller_avatar,price,status,item_snapshot)
  VALUES('list-'||gen_random_uuid()::text,c.id,u,seller.username,seller.avatar,p_price,'ACTIVE',public.marketplace_card_snapshot_v2(c)) RETURNING * INTO l;
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing creation failed'; END IF;
  INSERT INTO public.marketplace_reservations_v2(card_id,listing_id,seller_id,price) VALUES(c.id,l.id,u,p_price);
 ELSE
  SELECT * INTO l FROM public.marketplace_listings WHERE id=p_subject FOR UPDATE NOWAIT;
  IF NOT FOUND OR l.status IS DISTINCT FROM 'ACTIVE' THEN RAISE EXCEPTION 'Listing not active'; END IF;
  SELECT * INTO reservation FROM public.marketplace_reservations_v2 WHERE listing_id=l.id FOR UPDATE NOWAIT;
  IF NOT FOUND OR reservation.card_id IS DISTINCT FROM c.id OR reservation.seller_id IS DISTINCT FROM seller_id
     OR l.item_id IS DISTINCT FROM c.id OR l.seller_id IS DISTINCT FROM seller_id OR l.price IS DISTINCT FROM reservation.price
     OR c.status IS DISTINCT FROM 'LISTED' THEN RAISE EXCEPTION 'Reservation mismatch'; END IF;
  IF EXISTS(SELECT 1 FROM public.marketplace_listings WHERE item_id=c.id AND status='ACTIVE' AND id<>l.id) THEN RAISE EXCEPTION 'Conflicting listing'; END IF;
  IF p_operation='BUY' THEN
   IF u=seller_id THEN RAISE EXCEPTION 'Cannot buy own listing'; END IF;
   IF buyer.balance_nxa IS NULL OR buyer.balance_nxa='NaN'::numeric OR buyer.balance_nxa='Infinity'::numeric OR buyer.balance_nxa<reservation.price THEN RAISE EXCEPTION 'Insufficient or invalid balance'; END IF;
   IF seller.balance_nxa IS NULL OR seller.balance_nxa='NaN'::numeric OR seller.balance_nxa='Infinity'::numeric OR seller.balance_nxa<0 THEN RAISE EXCEPTION 'Invalid seller balance'; END IF;
   fee:=round(reservation.price*0.02,2);
  ELSE
   IF u<>seller_id THEN RAISE EXCEPTION 'Only seller can cancel'; END IF;
  END IF;
  -- Removing the private reservation authorizes exactly this transactional change.
  -- The card + listing locks remain held; on any error the reservation is restored.
  DELETE FROM public.marketplace_reservations_v2 WHERE listing_id=l.id AND card_id=c.id;
  UPDATE public.user_cards SET owner_id=CASE WHEN p_operation='BUY' THEN u ELSE seller_id END,
   owner_name=CASE WHEN p_operation='BUY' THEN buyer.username ELSE seller.username END,status='IDLE',updated_at=now()
   WHERE id=l.item_id AND owner_id=l.seller_id AND status='LISTED' AND state='FREE' AND card_status='FREE' AND tradeable=true;
  GET DIAGNOSTICS transferred=ROW_COUNT;
  IF transferred<>1 THEN RAISE EXCEPTION 'Expected exactly one card transfer'; END IF;
  IF p_operation='BUY' THEN
   UPDATE public.profiles SET balance_nxa=balance_nxa-reservation.price,updated_at=now() WHERE id=u RETURNING * INTO buyer;
   IF NOT FOUND THEN RAISE EXCEPTION 'Buyer debit failed'; END IF;
   UPDATE public.profiles SET balance_nxa=balance_nxa+reservation.price-fee,updated_at=now() WHERE id=seller_id RETURNING * INTO seller;
   IF NOT FOUND THEN RAISE EXCEPTION 'Seller credit failed'; END IF;
   UPDATE public.marketplace_listings SET status='SOLD',buyer_id=u,sold_at=now() WHERE id=l.id RETURNING * INTO l;
   IF NOT FOUND THEN RAISE EXCEPTION 'Listing transition failed'; END IF;
   INSERT INTO public.transactions(id,user_id,user_name,currency,amount,balance_after,type,description,metadata) VALUES
    ('tx-'||gen_random_uuid()::text,u,buyer.username,'NXA',-reservation.price,buyer.balance_nxa,'MARKET_BUY',c.name,jsonb_build_object('listingId',l.id,'requestId',p_request_id,'fee',fee)),
    ('tx-'||gen_random_uuid()::text,seller_id,seller.username,'NXA',reservation.price-fee,seller.balance_nxa,'MARKET_SALE',c.name,jsonb_build_object('listingId',l.id,'requestId',p_request_id,'fee',fee));
  ELSE
   UPDATE public.marketplace_listings SET status='CANCELLED' WHERE id=l.id RETURNING * INTO l;
   IF NOT FOUND THEN RAISE EXCEPTION 'Listing transition failed'; END IF;
  END IF;
  SELECT * INTO c FROM public.user_cards WHERE id=c.id;
 END IF;
 response:=jsonb_build_object('success',true,'operation',p_operation,'listing',to_jsonb(l),'card',to_jsonb(c),
  'profile',to_jsonb(buyer),'fee',COALESCE(fee,0));
 INSERT INTO public.marketplace_operations_v2(owner_id,request_id,intent,result) VALUES(u,p_request_id,operation_intent,response);
 RETURN response;
END $$;

CREATE OR REPLACE FUNCTION public.create_marketplace_listing_v2(p_card_id text,p_price numeric,p_request_id text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT public.marketplace_operation_v2('CREATE',p_card_id,p_price,p_request_id)
$$;
CREATE OR REPLACE FUNCTION public.buy_marketplace_listing_v2(p_listing_id text,p_request_id text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT public.marketplace_operation_v2('BUY',p_listing_id,NULL,p_request_id)
$$;
CREATE OR REPLACE FUNCTION public.cancel_marketplace_listing_v2(p_listing_id text,p_request_id text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT public.marketplace_operation_v2('CANCEL',p_listing_id,NULL,p_request_id)
$$;
-- Read-only feed reconstructs presentation from the actual reserved card, never JSON supplied by clients.
CREATE OR REPLACE FUNCTION public.fetch_marketplace_listings_v2()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT COALESCE(jsonb_agg(to_jsonb(l)||jsonb_build_object('item_snapshot',public.marketplace_card_snapshot_v2(c)) ORDER BY l.created_at DESC),'[]'::jsonb)
 INTO result FROM public.marketplace_reservations_v2 r JOIN public.marketplace_listings l ON l.id=r.listing_id
 JOIN public.user_cards c ON c.id=r.card_id
 WHERE l.status='ACTIVE' AND l.item_id=c.id AND l.seller_id=r.seller_id AND l.price=r.price
 AND c.owner_id=r.seller_id AND c.status='LISTED' AND c.state='FREE' AND c.card_status='FREE' AND c.tradeable;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.marketplace_operation_v2(text,text,numeric,text),public.marketplace_card_snapshot_v2(public.user_cards),
 public.guard_marketplace_card_v2(),public.guard_marketplace_listing_v2() FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.create_marketplace_listing_v2(text,numeric,text),public.buy_marketplace_listing_v2(text,text),
 public.cancel_marketplace_listing_v2(text,text),public.fetch_marketplace_listings_v2() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_marketplace_listing_v2(text,numeric,text),public.buy_marketplace_listing_v2(text,text),
 public.cancel_marketplace_listing_v2(text,text),public.fetch_marketplace_listings_v2() TO authenticated;
