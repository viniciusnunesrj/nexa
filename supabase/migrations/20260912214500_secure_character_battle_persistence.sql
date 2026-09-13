-- SETOR 4D: persistent characters and battle formation preferences.
-- Apply through the Supabase migration pipeline; do not run from the client.

CREATE TABLE IF NOT EXISTS public.user_characters (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_name TEXT NOT NULL,
  template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  class TEXT NOT NULL CHECK (class IN ('Guerreiro', 'Mago', 'Assassino', 'Guardião', 'Caçador', 'Tecnomante')),
  rarity TEXT NOT NULL CHECK (rarity IN ('Comum', 'Incomum', 'Raro', 'Épico', 'Lendário', 'Mítico')),
  image TEXT NOT NULL DEFAULT '',
  edition TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  power INTEGER NOT NULL DEFAULT 0 CHECK (power >= 0),
  strength INTEGER NOT NULL DEFAULT 0 CHECK (strength >= 0),
  defense INTEGER NOT NULL DEFAULT 0 CHECK (defense >= 0),
  speed INTEGER NOT NULL DEFAULT 0 CHECK (speed >= 0),
  experience INTEGER NOT NULL DEFAULT 0 CHECK (experience >= 0),
  max_experience INTEGER NOT NULL DEFAULT 500 CHECK (max_experience > 0),
  status TEXT NOT NULL DEFAULT 'IDLE' CHECK (status IN ('IDLE', 'EQUIPPED', 'LISTED', 'TRADING', 'FUSING', 'ACTIVE', 'EXHAUSTED')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_user_characters_owner
  ON public.user_characters(owner_id, created_at);

CREATE TABLE IF NOT EXISTS public.battle_preferences (
  user_id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  main_character_id TEXT REFERENCES public.user_characters(id) ON DELETE SET NULL,
  battle_team_card_ids TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT battle_preferences_team_limit CHECK (cardinality(battle_team_card_ids) <= 4)
);

ALTER TABLE public.user_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own characters" ON public.user_characters;
CREATE POLICY "Users can view own characters"
  ON public.user_characters FOR SELECT
  USING (owner_id = (SELECT auth.uid()::text));

DROP POLICY IF EXISTS "Users can view own battle preferences" ON public.battle_preferences;
CREATE POLICY "Users can view own battle preferences"
  ON public.battle_preferences FOR SELECT
  USING (user_id = (SELECT auth.uid()::text));

REVOKE ALL ON TABLE public.user_characters FROM anon, authenticated;
REVOKE ALL ON TABLE public.battle_preferences FROM anon, authenticated;
GRANT SELECT ON public.user_characters, public.battle_preferences TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_starter_character()
RETURNS public.user_characters
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_owner_name TEXT;
  v_character public.user_characters;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória';
  END IF;
  SELECT p.username INTO v_owner_name
  FROM public.profiles AS p
  WHERE p.id = v_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil autenticado não encontrado em public.profiles';
  END IF;

  SELECT * INTO v_character
  FROM public.user_characters
  WHERE owner_id = v_user_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.user_characters (
      id, owner_id, owner_name, template_id, name, class, rarity, image,
      edition, description, level, power, strength, defense, speed,
      experience, max_experience, status
    )
    SELECT
      'starter-' || v_user_id,
      v_user_id,
      v_owner_name,
      'char-tpl-neon-recruit',
      'Recruta Neon',
      'Guerreiro',
      'Comum',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
      'Base 2026',
      'Combatente recém-chegado ao setor periférico com lâmina de vibração e blindagem básica.',
      1, 480, 42, 38, 40, 0, 500, 'IDLE'
    ON CONFLICT (id) DO NOTHING
    RETURNING * INTO v_character;

    IF NOT FOUND THEN
      SELECT * INTO v_character
      FROM public.user_characters
      WHERE id = 'starter-' || v_user_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Não foi possível confirmar o personagem inicial do usuário autenticado';
      END IF;
    END IF;
  END IF;

  RETURN v_character;
END;
$$;

CREATE OR REPLACE FUNCTION public.save_battle_preferences(
  p_main_character_id TEXT,
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
  IF p_main_character_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.user_characters
    WHERE id = p_main_character_id AND owner_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Personagem principal não pertence ao usuário';
  END IF;

  SELECT COUNT(*) INTO v_owned_count
  FROM public.user_cards
  WHERE owner_id = v_user_id
    AND id = ANY(v_team)
    AND state = 'FREE';
  IF v_owned_count <> cardinality(v_team) THEN
    RAISE EXCEPTION 'A formação contém cartas inválidas ou indisponíveis';
  END IF;

  INSERT INTO public.battle_preferences (user_id, main_character_id, battle_team_card_ids)
  VALUES (v_user_id, p_main_character_id, v_team)
  ON CONFLICT (user_id) DO UPDATE SET
    main_character_id = EXCLUDED.main_character_id,
    battle_team_card_ids = EXCLUDED.battle_team_card_ids,
    updated_at = timezone('utc'::text, now())
  RETURNING * INTO v_preferences;

  RETURN v_preferences;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_starter_character() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_starter_character() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_starter_character() TO authenticated;

REVOKE ALL ON FUNCTION public.save_battle_preferences(TEXT, TEXT[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_battle_preferences(TEXT, TEXT[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_battle_preferences(TEXT, TEXT[]) TO authenticated;
