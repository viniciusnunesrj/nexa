-- SETOR 4F: one card formation with a card leader.
-- Apply through the Supabase migration pipeline; do not run from the client.

ALTER TABLE public.battle_preferences
  ADD COLUMN IF NOT EXISTS main_card_id TEXT
    REFERENCES public.user_cards(id) ON DELETE SET NULL;

DROP FUNCTION IF EXISTS public.save_battle_preferences(TEXT, TEXT[]);

CREATE OR REPLACE FUNCTION public.save_battle_preferences(
  p_main_card_id TEXT,
  p_battle_team_card_ids TEXT[] DEFAULT '{}'::text[]
)
RETURNS public.battle_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_team TEXT[] := COALESCE(p_battle_team_card_ids, '{}'::text[]);
  v_preferences public.battle_preferences;
  v_owned_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória';
  END IF;
  IF cardinality(v_team) > 4 THEN
    RAISE EXCEPTION 'A formação aceita no máximo 4 cartas';
  END IF;
  IF (SELECT COUNT(*) FROM unnest(v_team)) <>
     (SELECT COUNT(DISTINCT card_id) FROM unnest(v_team) AS ids(card_id)) THEN
    RAISE EXCEPTION 'A formação não pode conter cartas duplicadas';
  END IF;
  IF p_main_card_id IS NOT NULL AND NOT (p_main_card_id = ANY(v_team)) THEN
    RAISE EXCEPTION 'A carta principal precisa pertencer à formação';
  END IF;

  SELECT COUNT(*) INTO v_owned_count
  FROM public.user_cards
  WHERE owner_id = v_user_id
    AND id = ANY(v_team)
    AND state = 'FREE';
  IF v_owned_count <> cardinality(v_team) THEN
    RAISE EXCEPTION 'A formação contém cartas inválidas ou indisponíveis';
  END IF;

  INSERT INTO public.battle_preferences (user_id, main_card_id, battle_team_card_ids)
  VALUES (v_user_id, p_main_card_id, v_team)
  ON CONFLICT (user_id) DO UPDATE SET
    main_card_id = EXCLUDED.main_card_id,
    battle_team_card_ids = EXCLUDED.battle_team_card_ids,
    updated_at = timezone('utc'::text, now())
  RETURNING * INTO v_preferences;

  RETURN v_preferences;
END;
$$;

REVOKE ALL ON FUNCTION public.save_battle_preferences(TEXT, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_battle_preferences(TEXT, TEXT[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_battle_preferences(TEXT, TEXT[]) TO authenticated;
