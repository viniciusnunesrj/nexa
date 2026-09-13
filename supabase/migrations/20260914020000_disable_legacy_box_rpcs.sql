-- FUTURE PHASE 2: apply ONLY after phase 1, v2 frontend deployment,
-- successful v2 purchase/opening tests in production, and retirement of old clients.
-- Do not deploy both phases in one automatic migration batch.
REVOKE EXECUTE ON FUNCTION public.purchase_box_atomic(text,text,text,text,numeric),public.open_box_atomic(text,text)
 FROM PUBLIC,anon,authenticated;

-- Necessary for box reward integrity: direct clients must not mint cards or rewrite
-- template identity to manipulate duplicate detection. Existing server RPCs retain access.
DROP POLICY IF EXISTS box_rewards_no_client_mint ON public.user_cards;
CREATE POLICY box_rewards_no_client_mint ON public.user_cards AS RESTRICTIVE
 FOR INSERT TO authenticated,anon WITH CHECK(false);
CREATE OR REPLACE FUNCTION public.protect_box_card_identity_v1()
-- Invoker context: RLS applies to direct clients, not a trusted definer/table owner
-- or BYPASSRLS role. Do not make this trigger SECURITY DEFINER.
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF pg_catalog.row_security_active('public.user_cards'::regclass) AND
   (NEW.template_id IS DISTINCT FROM OLD.template_id OR NEW.rarity IS DISTINCT FROM OLD.rarity
    OR NEW.market_value IS DISTINCT FROM OLD.market_value) THEN
  RAISE EXCEPTION 'Card template identity is server-authoritative';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS box_card_identity_v1 ON public.user_cards;
CREATE TRIGGER box_card_identity_v1 BEFORE UPDATE ON public.user_cards
 FOR EACH ROW EXECUTE FUNCTION public.protect_box_card_identity_v1();
REVOKE ALL ON FUNCTION public.protect_box_card_identity_v1() FROM PUBLIC,anon,authenticated;
