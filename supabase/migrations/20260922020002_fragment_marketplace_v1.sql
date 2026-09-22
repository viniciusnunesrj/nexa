-- NEXA — Marketplace de fragmentos + craft autoritativo V1
-- Migration aplicada em produção como 20260922020002.
-- Regras: lotes inteiros, NXA, taxa de 2%, 100 fragmentos por craft.

BEGIN;

CREATE TABLE public.fragment_marketplace_listings_v1 (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES public.card_templates(template_id),
  quantity BIGINT NOT NULL CHECK (quantity > 0),
  price_nxa NUMERIC NOT NULL CHECK (
    price_nxa > 0 AND price_nxa <= 1000000 AND price_nxa = round(price_nxa, 2)
  ),
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'SOLD', 'CANCELLED')),
  buyer_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sold_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX fragment_marketplace_listings_v1_active_created_idx
  ON public.fragment_marketplace_listings_v1(created_at DESC)
  WHERE status = 'ACTIVE';

CREATE INDEX fragment_marketplace_listings_v1_seller_created_idx
  ON public.fragment_marketplace_listings_v1(seller_id, created_at DESC);

CREATE TABLE public.fragment_marketplace_reservations_v1 (
  listing_id TEXT PRIMARY KEY
    REFERENCES public.fragment_marketplace_listings_v1(id) ON DELETE RESTRICT,
  seller_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES public.card_templates(template_id),
  quantity BIGINT NOT NULL CHECK (quantity > 0),
  price_nxa NUMERIC NOT NULL CHECK (
    price_nxa > 0 AND price_nxa <= 1000000 AND price_nxa = round(price_nxa, 2)
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX fragment_marketplace_reservations_v1_subject_idx
  ON public.fragment_marketplace_reservations_v1(seller_id, template_id);

CREATE TABLE public.fragment_marketplace_operations_v1 (
  owner_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL CHECK (
    length(request_id) BETWEEN 1 AND 200 AND request_id = btrim(request_id)
  ),
  intent JSONB NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, request_id)
);

CREATE TABLE public.fragment_craft_operations_v1 (
  owner_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL CHECK (
    length(request_id) BETWEEN 1 AND 200 AND request_id = btrim(request_id)
  ),
  template_id TEXT NOT NULL REFERENCES public.card_templates(template_id),
  card_id TEXT NOT NULL REFERENCES public.user_cards(id),
  fragments_spent BIGINT NOT NULL CHECK (fragments_spent = 100),
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, request_id)
);

ALTER TABLE public.fragment_marketplace_listings_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fragment_marketplace_reservations_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fragment_marketplace_operations_v1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fragment_craft_operations_v1 ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON
  public.fragment_marketplace_listings_v1,
  public.fragment_marketplace_reservations_v1,
  public.fragment_marketplace_operations_v1,
  public.fragment_craft_operations_v1
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.fragment_marketplace_listings_v1 TO authenticated;
GRANT SELECT ON public.fragment_marketplace_operations_v1 TO authenticated;
GRANT SELECT ON public.fragment_craft_operations_v1 TO authenticated;

CREATE POLICY fragment_listings_authenticated_read
  ON public.fragment_marketplace_listings_v1
  FOR SELECT TO authenticated
  USING (
    status = 'ACTIVE'
    OR seller_id = (SELECT auth.uid()::text)
    OR buyer_id = (SELECT auth.uid()::text)
  );

CREATE POLICY fragment_operations_owner_read
  ON public.fragment_marketplace_operations_v1
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()::text));

CREATE POLICY fragment_craft_operations_owner_read
  ON public.fragment_craft_operations_v1
  FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()::text));

-- Impede qualquer função futura de reduzir fragmentos abaixo do total reservado.
CREATE OR REPLACE FUNCTION public.guard_reserved_fragments_v1()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_reserved BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT COALESCE(sum(quantity), 0) INTO v_reserved
    FROM public.fragment_marketplace_reservations_v1
    WHERE seller_id = OLD.owner_id AND template_id = OLD.template_id;
    IF v_reserved > 0 THEN RAISE EXCEPTION 'Fragmentos reservados no Marketplace'; END IF;
    RETURN OLD;
  END IF;

  SELECT COALESCE(sum(quantity), 0) INTO v_reserved
  FROM public.fragment_marketplace_reservations_v1
  WHERE seller_id = NEW.owner_id AND template_id = NEW.template_id;
  IF NEW.quantity < v_reserved THEN
    RAISE EXCEPTION 'Quantidade inferior aos fragmentos reservados';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_reserved_fragments_v1
BEFORE UPDATE OR DELETE ON public.card_fragments
FOR EACH ROW EXECUTE FUNCTION public.guard_reserved_fragments_v1();

CREATE OR REPLACE FUNCTION public.fragment_marketplace_snapshot_v1(
  p_listing public.fragment_marketplace_listings_v1
)
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT jsonb_build_object(
    'id', p_listing.id,
    'type', 'CardFragment',
    'templateId', p_listing.template_id,
    'name', t.name,
    'rarity', t.rarity,
    'quantity', p_listing.quantity,
    'price', p_listing.price_nxa,
    'sellerId', p_listing.seller_id,
    'sellerName', p.username,
    'image', m.image,
    'collectionId', m.collection_id,
    'collectionName', m.collection_name,
    'status', p_listing.status,
    'createdAt', p_listing.created_at
  )
  FROM public.card_templates t
  JOIN public.box_template_metadata_v1 m ON m.template_id = t.template_id
  JOIN public.profiles p ON p.id = p_listing.seller_id
  WHERE t.template_id = p_listing.template_id AND t.active
$$;

CREATE OR REPLACE FUNCTION public.fragment_marketplace_operation_v1(
  p_operation TEXT,
  p_subject TEXT,
  p_quantity BIGINT,
  p_price_nxa NUMERIC,
  p_request_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_intent JSONB;
  v_previous public.fragment_marketplace_operations_v1%ROWTYPE;
  v_listing public.fragment_marketplace_listings_v1%ROWTYPE;
  v_reservation public.fragment_marketplace_reservations_v1%ROWTYPE;
  v_fragment public.card_fragments%ROWTYPE;
  v_buyer public.profiles%ROWTYPE;
  v_seller public.profiles%ROWTYPE;
  v_seller_id TEXT;
  v_profile_id TEXT;
  v_reserved BIGINT;
  v_fee NUMERIC;
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória'; END IF;
  IF p_operation NOT IN ('CREATE', 'BUY', 'CANCEL') THEN RAISE EXCEPTION 'Operação inválida'; END IF;
  IF p_subject IS NULL OR btrim(p_subject) = ''
     OR p_request_id IS NULL OR p_request_id <> btrim(p_request_id)
     OR length(p_request_id) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Identificadores inválidos';
  END IF;
  IF p_operation = 'CREATE' AND (
    p_quantity IS NULL OR p_quantity <= 0 OR p_price_nxa IS NULL
    OR p_price_nxa <= 0 OR p_price_nxa > 1000000
    OR p_price_nxa <> round(p_price_nxa, 2)
  ) THEN RAISE EXCEPTION 'Lote ou preço inválido'; END IF;

  v_intent := jsonb_build_object(
    'operation', p_operation, 'subject', p_subject,
    'quantity', p_quantity, 'price', p_price_nxa
  );
  PERFORM pg_advisory_xact_lock(hashtextextended('nexa:fragments:v1:' || v_user_id, 0));
  SELECT * INTO v_previous FROM public.fragment_marketplace_operations_v1
  WHERE owner_id = v_user_id AND request_id = p_request_id;
  IF FOUND THEN
    IF v_previous.intent IS DISTINCT FROM v_intent THEN
      RAISE EXCEPTION 'request_id reutilizado com intenção diferente';
    END IF;
    RETURN v_previous.result;
  END IF;

  IF p_operation = 'CREATE' THEN
    v_seller_id := v_user_id;
  ELSE
    SELECT * INTO v_listing FROM public.fragment_marketplace_listings_v1
    WHERE id = p_subject FOR UPDATE;
    IF NOT FOUND OR v_listing.status <> 'ACTIVE' THEN RAISE EXCEPTION 'Anúncio indisponível'; END IF;
    SELECT * INTO v_reservation FROM public.fragment_marketplace_reservations_v1
    WHERE listing_id = v_listing.id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Reserva não encontrada'; END IF;
    v_seller_id := v_reservation.seller_id;
  END IF;

  -- Ordem determinística para evitar deadlocks entre compras cruzadas.
  FOR v_profile_id IN SELECT id FROM public.profiles
    WHERE id IN (v_user_id, v_seller_id) ORDER BY id
  LOOP
    PERFORM id FROM public.profiles WHERE id = v_profile_id FOR UPDATE;
  END LOOP;
  SELECT * INTO v_buyer FROM public.profiles WHERE id = v_user_id;
  SELECT * INTO v_seller FROM public.profiles WHERE id = v_seller_id;
  IF v_buyer.id IS NULL OR v_seller.id IS NULL THEN RAISE EXCEPTION 'Perfil ausente'; END IF;

  IF p_operation = 'CREATE' THEN
    SELECT * INTO v_fragment FROM public.card_fragments
    WHERE owner_id = v_user_id AND template_id = p_subject FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Fragmentos não encontrados'; END IF;
    SELECT COALESCE(sum(quantity), 0) INTO v_reserved
    FROM public.fragment_marketplace_reservations_v1
    WHERE seller_id = v_user_id AND template_id = p_subject;
    IF v_fragment.quantity - v_reserved < p_quantity THEN RAISE EXCEPTION 'Fragmentos disponíveis insuficientes'; END IF;
    IF EXISTS (SELECT 1 FROM public.fragment_marketplace_reservations_v1
      WHERE seller_id = v_user_id AND template_id = p_subject) THEN
      RAISE EXCEPTION 'Já existe um lote ativo desta carta';
    END IF;

    INSERT INTO public.fragment_marketplace_listings_v1(
      id, seller_id, template_id, quantity, price_nxa
    ) VALUES (
      'flist-' || gen_random_uuid()::text, v_user_id, p_subject, p_quantity, p_price_nxa
    ) RETURNING * INTO v_listing;
    INSERT INTO public.fragment_marketplace_reservations_v1(
      listing_id, seller_id, template_id, quantity, price_nxa
    ) VALUES (
      v_listing.id, v_user_id, p_subject, p_quantity, p_price_nxa
    );
  ELSIF p_operation = 'BUY' THEN
    IF v_user_id = v_seller_id THEN RAISE EXCEPTION 'Não é possível comprar o próprio lote'; END IF;
    IF v_listing.seller_id IS DISTINCT FROM v_reservation.seller_id
       OR v_listing.template_id IS DISTINCT FROM v_reservation.template_id
       OR v_listing.quantity IS DISTINCT FROM v_reservation.quantity
       OR v_listing.price_nxa IS DISTINCT FROM v_reservation.price_nxa THEN
      RAISE EXCEPTION 'Reserva inconsistente';
    END IF;
    IF v_buyer.balance_nxa < v_reservation.price_nxa THEN RAISE EXCEPTION 'Saldo NXA insuficiente'; END IF;

    SELECT * INTO v_fragment FROM public.card_fragments
    WHERE owner_id = v_seller_id AND template_id = v_reservation.template_id FOR UPDATE;
    IF NOT FOUND OR v_fragment.quantity < v_reservation.quantity THEN RAISE EXCEPTION 'Saldo de fragmentos inconsistente'; END IF;
    INSERT INTO public.card_fragments(owner_id, template_id, quantity)
    VALUES(v_user_id, v_reservation.template_id, 0)
    ON CONFLICT(owner_id, template_id) DO NOTHING;
    PERFORM owner_id FROM public.card_fragments
    WHERE owner_id = v_user_id AND template_id = v_reservation.template_id FOR UPDATE;

    DELETE FROM public.fragment_marketplace_reservations_v1 WHERE listing_id = v_listing.id;
    UPDATE public.card_fragments SET quantity = quantity - v_listing.quantity, updated_at = now()
    WHERE owner_id = v_seller_id AND template_id = v_listing.template_id;
    UPDATE public.card_fragments SET quantity = quantity + v_listing.quantity, updated_at = now()
    WHERE owner_id = v_user_id AND template_id = v_listing.template_id;

    v_fee := round(v_listing.price_nxa * 0.02, 2);
    UPDATE public.profiles SET balance_nxa = balance_nxa - v_listing.price_nxa, updated_at = now()
    WHERE id = v_user_id RETURNING * INTO v_buyer;
    UPDATE public.profiles SET balance_nxa = balance_nxa + v_listing.price_nxa - v_fee, updated_at = now()
    WHERE id = v_seller_id RETURNING * INTO v_seller;
    UPDATE public.fragment_marketplace_listings_v1
    SET status = 'SOLD', buyer_id = v_user_id, sold_at = now()
    WHERE id = v_listing.id RETURNING * INTO v_listing;

    INSERT INTO public.transactions(id,user_id,user_name,currency,amount,balance_after,type,description,metadata) VALUES
      ('tx-' || gen_random_uuid()::text,v_user_id,v_buyer.username,'NXA',-v_listing.price_nxa,v_buyer.balance_nxa,'FRAGMENT_MARKET_BUY','Compra de fragmentos',jsonb_build_object('listingId',v_listing.id,'templateId',v_listing.template_id,'quantity',v_listing.quantity,'fee',v_fee)),
      ('tx-' || gen_random_uuid()::text,v_seller_id,v_seller.username,'NXA',v_listing.price_nxa-v_fee,v_seller.balance_nxa,'FRAGMENT_MARKET_SALE','Venda de fragmentos',jsonb_build_object('listingId',v_listing.id,'templateId',v_listing.template_id,'quantity',v_listing.quantity,'fee',v_fee));
  ELSE
    IF v_user_id <> v_seller_id THEN RAISE EXCEPTION 'Somente o vendedor pode cancelar'; END IF;
    DELETE FROM public.fragment_marketplace_reservations_v1 WHERE listing_id = v_listing.id;
    UPDATE public.fragment_marketplace_listings_v1
    SET status = 'CANCELLED', cancelled_at = now()
    WHERE id = v_listing.id RETURNING * INTO v_listing;
  END IF;

  v_result := jsonb_build_object(
    'success', true, 'operation', p_operation,
    'listing', public.fragment_marketplace_snapshot_v1(v_listing),
    'profile', to_jsonb(v_buyer), 'fee', COALESCE(v_fee, 0)
  );
  INSERT INTO public.fragment_marketplace_operations_v1(owner_id,request_id,intent,result)
  VALUES(v_user_id,p_request_id,v_intent,v_result);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_fragment_listing_v1(
  p_template_id TEXT, p_quantity BIGINT, p_price_nxa NUMERIC, p_request_id TEXT
) RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT public.fragment_marketplace_operation_v1('CREATE',p_template_id,p_quantity,p_price_nxa,p_request_id)
$$;

CREATE OR REPLACE FUNCTION public.buy_fragment_listing_v1(
  p_listing_id TEXT, p_request_id TEXT
) RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT public.fragment_marketplace_operation_v1('BUY',p_listing_id,NULL,NULL,p_request_id)
$$;

CREATE OR REPLACE FUNCTION public.cancel_fragment_listing_v1(
  p_listing_id TEXT, p_request_id TEXT
) RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT public.fragment_marketplace_operation_v1('CANCEL',p_listing_id,NULL,NULL,p_request_id)
$$;

CREATE OR REPLACE FUNCTION public.fetch_fragment_listings_v1()
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN pg_catalog.jsonb_build_array()
    ELSE COALESCE(jsonb_agg(public.fragment_marketplace_snapshot_v1(l) ORDER BY l.created_at DESC),'[]'::jsonb)
  END
  FROM public.fragment_marketplace_listings_v1 l
  JOIN public.fragment_marketplace_reservations_v1 r ON r.listing_id = l.id
  WHERE l.status = 'ACTIVE' AND l.seller_id = r.seller_id
    AND l.template_id = r.template_id AND l.quantity = r.quantity AND l.price_nxa = r.price_nxa
$$;

CREATE OR REPLACE FUNCTION public.craft_card_from_fragments_v1(
  p_template_id TEXT, p_request_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_previous public.fragment_craft_operations_v1%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_fragment public.card_fragments%ROWTYPE;
  v_template public.card_templates%ROWTYPE;
  v_meta public.box_template_metadata_v1%ROWTYPE;
  v_reserved BIGINT;
  v_card public.user_cards%ROWTYPE;
  v_card_id TEXT;
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória'; END IF;
  IF p_template_id IS NULL OR btrim(p_template_id) = ''
     OR p_request_id IS NULL OR p_request_id <> btrim(p_request_id)
     OR length(p_request_id) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Identificadores inválidos'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('nexa:fragments:v1:' || v_user_id, 0));
  SELECT * INTO v_previous FROM public.fragment_craft_operations_v1
  WHERE owner_id = v_user_id AND request_id = p_request_id;
  IF FOUND THEN
    IF v_previous.template_id IS DISTINCT FROM p_template_id THEN
      RAISE EXCEPTION 'request_id reutilizado com template diferente';
    END IF;
    RETURN v_previous.result;
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Perfil não encontrado'; END IF;
  SELECT * INTO v_fragment FROM public.card_fragments
  WHERE owner_id = v_user_id AND template_id = p_template_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Fragmentos não encontrados'; END IF;
  SELECT COALESCE(sum(quantity),0) INTO v_reserved
  FROM public.fragment_marketplace_reservations_v1
  WHERE seller_id = v_user_id AND template_id = p_template_id;
  IF v_fragment.quantity - v_reserved < 100 THEN RAISE EXCEPTION 'São necessários 100 fragmentos disponíveis'; END IF;

  SELECT * INTO v_template FROM public.card_templates
  WHERE template_id = p_template_id AND active;
  SELECT * INTO v_meta FROM public.box_template_metadata_v1
  WHERE template_id = p_template_id;
  IF v_template.template_id IS NULL OR v_meta.template_id IS NULL THEN RAISE EXCEPTION 'Template oficial indisponível'; END IF;

  UPDATE public.card_fragments SET quantity = quantity - 100, updated_at = now()
  WHERE owner_id = v_user_id AND template_id = p_template_id;
  v_card_id := 'card-' || gen_random_uuid()::text;
  INSERT INTO public.user_cards(
    id,owner_id,owner_name,template_id,name,rarity,collection_id,collection_name,
    element,element_icon,image,description,synthesis_rate,synthesis_cap,market_value,
    state,card_status,status,tradeable,synthesizable,accumulated_nex,total_generated
  ) VALUES (
    v_card_id,v_user_id,v_profile.username,v_template.template_id,v_template.name,v_template.rarity,
    v_meta.collection_id,v_meta.collection_name,v_meta.element,v_meta.element_icon,v_meta.image,
    v_meta.description,v_template.synthesis_rate,v_meta.synthesis_cap,v_template.market_value,
    'FREE','FREE','IDLE',TRUE,TRUE,0,0
  ) RETURNING * INTO v_card;

  v_result := jsonb_build_object(
    'success',true,'operation','CRAFT','templateId',p_template_id,
    'fragmentsSpent',100,'fragmentsRemaining',v_fragment.quantity-100,'card',to_jsonb(v_card)
  );
  INSERT INTO public.fragment_craft_operations_v1(owner_id,request_id,template_id,card_id,fragments_spent,result)
  VALUES(v_user_id,p_request_id,p_template_id,v_card_id,100,v_result);
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION
  public.guard_reserved_fragments_v1(),
  public.fragment_marketplace_snapshot_v1(public.fragment_marketplace_listings_v1),
  public.fragment_marketplace_operation_v1(TEXT,TEXT,BIGINT,NUMERIC,TEXT)
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION
  public.create_fragment_listing_v1(TEXT,BIGINT,NUMERIC,TEXT),
  public.buy_fragment_listing_v1(TEXT,TEXT),
  public.cancel_fragment_listing_v1(TEXT,TEXT),
  public.fetch_fragment_listings_v1(),
  public.craft_card_from_fragments_v1(TEXT,TEXT)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  public.create_fragment_listing_v1(TEXT,BIGINT,NUMERIC,TEXT),
  public.buy_fragment_listing_v1(TEXT,TEXT),
  public.cancel_fragment_listing_v1(TEXT,TEXT),
  public.fetch_fragment_listings_v1(),
  public.craft_card_from_fragments_v1(TEXT,TEXT)
TO authenticated;

COMMIT;
