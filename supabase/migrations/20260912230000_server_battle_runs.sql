-- SETOR 5B1: server-authoritative card battles.
-- Apply through the Supabase migration pipeline; do not run from the client.
--
-- Card combat has no persisted stat columns in the real user_cards schema.
-- The bootstrap below is therefore intentionally server-owned and versioned:
-- rarity -> {attack, defense, speed, max_hp}. Client values are never read.

CREATE TABLE IF NOT EXISTS public.card_templates (
  template_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('Comum', 'Incomum', 'Raro', 'Épico', 'Lendário', 'Mítico')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

REVOKE ALL ON TABLE public.card_templates FROM PUBLIC, anon, authenticated;

INSERT INTO public.card_templates (template_id, name, rarity)
VALUES
  ('card-flame-guardian','Guardião da Chama','Incomum'),
  ('card-ice-guardian','Guardião do Gelo','Raro'),
  ('card-storm-guardian','Guardião da Tempestade','Épico'),
  ('card-abyss-guardian','Guardião do Abismo','Lendário'),
  ('card-dragon-red','Dragão Rubro','Incomum'),
  ('card-dragon-frost','Dragão Glacial','Raro'),
  ('card-dragon-emerald','Dragão Esmeralda','Incomum'),
  ('card-dragon-shadow','Dragão Sombrio','Raro'),
  ('card-dragon-gold','Dragão Dourado','Épico'),
  ('card-dragon-astral','Dragão Astral','Épico'),
  ('card-dragon-volcanic','Dragão Vulcânico','Lendário'),
  ('card-dragon-celestial','Dragão Celestial','Mítico'),
  ('card-knight-blade','Cavaleiro da Lâmina','Comum'),
  ('card-knight-black','Cavaleiro Negro','Incomum'),
  ('card-knight-royal','Cavaleiro Real','Incomum'),
  ('card-knight-arcane','Cavaleiro Arcano','Raro'),
  ('card-knight-scarlet','Cavaleiro Escarlate','Raro'),
  ('card-knight-lunar','Cavaleiro Lunar','Épico'),
  ('card-knight-imperial','Cavaleiro Imperial','Lendário'),
  ('card-knight-celestial','Cavaleiro Celestial','Mítico'),
  ('card-abyss-devourer','Devorador','Comum'),
  ('card-abyss-colossus','Colosso Abissal','Incomum'),
  ('card-abyss-serpent','Serpente Sombria','Incomum'),
  ('card-abyss-demon','Demônio do Vazio','Raro'),
  ('card-abyss-kraken','Kraken','Raro'),
  ('card-abyss-leviathan','Leviatã','Épico'),
  ('card-abyss-hydra','Hidra Negra','Lendário'),
  ('card-abyss-king','Rei do Abismo','Mítico'),
  ('card-mage-fire','Mago do Fogo','Comum'),
  ('card-mage-ice','Mago do Gelo','Comum'),
  ('card-mage-earth','Mago da Terra','Incomum'),
  ('card-mage-wind','Mago do Ar','Incomum'),
  ('card-mage-light','Mago da Luz','Raro'),
  ('card-mage-shadow','Mago das Sombras','Raro'),
  ('card-mage-arcane','Mago Arcano','Épico'),
  ('card-mage-archmage','Arquimago','Lendário'),
  ('card-god-war','Deus da Guerra','Raro'),
  ('card-god-moon','Deusa da Lua','Raro'),
  ('card-god-thunder','Deus do Trovão','Épico'),
  ('card-god-sea','Deus do Mar','Épico'),
  ('card-god-death','Deus da Morte','Épico'),
  ('card-god-light','Deusa da Luz','Lendário'),
  ('card-god-chaos','Deus do Caos','Lendário'),
  ('card-god-supreme','Deus Supremo','Mítico'),
  ('card-cosmic-guardian','Guardião Estelar','Incomum'),
  ('card-cosmic-comet','Cometa Vivo','Raro'),
  ('card-cosmic-solar','Entidade Solar','Raro'),
  ('card-cosmic-lunar','Entidade Lunar','Épico'),
  ('card-cosmic-devourer','Devorador de Mundos','Épico'),
  ('card-cosmic-voidlord','Senhor do Vazio','Lendário'),
  ('card-cosmic-being','Ser Cósmico','Lendário'),
  ('card-cosmic-primordial','Entidade Primordial','Mítico'),
  ('card-hunter-novice','Caçador Novato','Comum'),
  ('card-hunter-shadow','Caçador Sombrio','Comum'),
  ('card-hunter-arcane','Caçador Arcano','Incomum'),
  ('card-hunter-dragonslayer','Caçador de Dragões','Incomum'),
  ('card-hunter-lunar','Caçador Lunar','Raro'),
  ('card-hunter-royal','Caçador Real','Raro'),
  ('card-hunter-ghost','Caçador Fantasma','Épico'),
  ('card-hunter-master','Mestre Caçador','Lendário')
ON CONFLICT (template_id) DO UPDATE
SET name = EXCLUDED.name, rarity = EXCLUDED.rarity;

CREATE TABLE IF NOT EXISTS public.battle_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
  outcome TEXT CHECK (outcome IN ('VICTORY', 'DEFEAT', 'DRAW')),
  formula_version TEXT NOT NULL,
  rng_seed BIGINT NOT NULL,
  main_card_id TEXT NOT NULL,
  player_card_ids TEXT[] NOT NULL,
  player_snapshot JSONB NOT NULL,
  npc_snapshot JSONB NOT NULL,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  rewards JSONB NOT NULL DEFAULT '{}'::jsonb,
  reward_applied BOOLEAN NOT NULL DEFAULT FALSE,
  resulting_profile JSONB,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (owner_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_battle_runs_owner_created
  ON public.battle_runs(owner_id, created_at DESC);

ALTER TABLE public.battle_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own battle runs" ON public.battle_runs;
CREATE POLICY "Users can view own battle runs"
  ON public.battle_runs FOR SELECT
  USING (owner_id = (SELECT auth.uid()::text));

REVOKE ALL ON TABLE public.battle_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.battle_runs TO authenticated;

-- Deterministic uniform [0, 1), derived from the persisted seed and step.
CREATE OR REPLACE FUNCTION public.battle_rng_unit(p_seed BIGINT, p_step INTEGER)
RETURNS NUMERIC
LANGUAGE SQL
IMMUTABLE
STRICT
SET search_path = public
AS $$
  SELECT (mod(mod(hashtextextended(p_seed::text || ':' || p_step::text, 0), 1000000) + 1000000, 1000000)::numeric / 1000000);
$$;
REVOKE ALL ON FUNCTION public.battle_rng_unit(BIGINT, INTEGER) FROM PUBLIC, anon, authenticated;

-- Matches src/config/levelConfig.ts exactly through level 50.
CREATE OR REPLACE FUNCTION public.battle_xp_required(p_level INTEGER)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
STRICT
SET search_path = public
AS $$
  SELECT CASE p_level
    WHEN 1 THEN 300 WHEN 2 THEN 450 WHEN 3 THEN 650 WHEN 4 THEN 900
    WHEN 5 THEN 1200 WHEN 6 THEN 1550 WHEN 7 THEN 1950 WHEN 8 THEN 2400
    WHEN 9 THEN 2900 WHEN 10 THEN 3500 WHEN 11 THEN 4200 WHEN 12 THEN 5000
    WHEN 13 THEN 5900 WHEN 14 THEN 6900 WHEN 15 THEN 8000 WHEN 16 THEN 9200
    WHEN 17 THEN 10500 WHEN 18 THEN 11900 WHEN 19 THEN 13400 WHEN 20 THEN 15000
    WHEN 21 THEN 16700 WHEN 22 THEN 18500 WHEN 23 THEN 20400 WHEN 24 THEN 22400
    WHEN 25 THEN 24500 WHEN 26 THEN 26700 WHEN 27 THEN 29000 WHEN 28 THEN 31400
    WHEN 29 THEN 33900 WHEN 30 THEN 36500 WHEN 31 THEN 39500 WHEN 32 THEN 43000
    WHEN 33 THEN 47000 WHEN 34 THEN 51500 WHEN 35 THEN 56500 WHEN 36 THEN 62000
    WHEN 37 THEN 68000 WHEN 38 THEN 74500 WHEN 39 THEN 81500 WHEN 40 THEN 89000
    WHEN 41 THEN 97500 WHEN 42 THEN 107000 WHEN 43 THEN 117500 WHEN 44 THEN 129000
    WHEN 45 THEN 141500 WHEN 46 THEN 155000 WHEN 47 THEN 170000 WHEN 48 THEN 186500
    WHEN 49 THEN 204500 WHEN 50 THEN 250000
    ELSE floor(300 * power(1.18, p_level - 1))::INTEGER
  END;
$$;
REVOKE ALL ON FUNCTION public.battle_xp_required(INTEGER) FROM PUBLIC, anon, authenticated;

-- The legacy client-callable reward RPC remains present for compatibility but
-- can no longer be invoked by any API role. Rewards for a battle are applied
-- only by the internal helper below, after its battle_runs row exists.
ALTER FUNCTION public.apply_battle_reward_atomic(TEXT, BOOLEAN, NUMERIC, NUMERIC, NUMERIC)
  SET search_path = public;
REVOKE ALL ON FUNCTION public.apply_battle_reward_atomic(TEXT, BOOLEAN, NUMERIC, NUMERIC, NUMERIC)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.apply_battle_reward_for_run(
  p_run_id UUID,
  p_user_id TEXT,
  p_outcome TEXT,
  p_xp INTEGER,
  p_nex INTEGER,
  p_nxa INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles;
  v_level INTEGER;
  v_xp INTEGER;
  v_required INTEGER;
  v_level_ups INTEGER := 0;
  v_reward JSONB;
BEGIN
  IF p_outcome NOT IN ('VICTORY', 'DEFEAT', 'DRAW')
     OR p_xp < 0 OR p_nex < 0 OR p_nxa < 0
     OR p_xp > 1000000 OR p_nex > 1000000 OR p_nxa > 1000000 THEN
    RAISE EXCEPTION 'Recompensa inválida';
  END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_profile.level < 1 OR v_profile.level > 50
     OR v_profile.experience < 0 OR v_profile.balance_nex < 0
     OR v_profile.balance_nxa < 0
     OR v_profile.experience = 'NaN'::numeric
     OR v_profile.balance_nex = 'NaN'::numeric
     OR v_profile.balance_nxa = 'NaN'::numeric
     OR v_profile.experience > 1000000000
     OR v_profile.balance_nex > 1000000000000
     OR v_profile.balance_nxa > 1000000000000 THEN
    RAISE EXCEPTION 'Perfil contém valores inválidos';
  END IF;
  IF v_profile.experience > 2147483647 - p_xp
     OR v_profile.balance_nex + p_nex > 1000000000000
     OR v_profile.balance_nxa + p_nxa > 1000000000000 THEN
    RAISE EXCEPTION 'Recompensa excede limites numéricos';
  END IF;

  v_level := v_profile.level;
  v_xp := v_profile.experience + p_xp;
  WHILE v_level < 50 LOOP
    v_required := public.battle_xp_required(v_level);
    EXIT WHEN v_xp < v_required;
    v_xp := v_xp - v_required;
    v_level := v_level + 1;
    v_level_ups := v_level_ups + 1;
  END LOOP;

  UPDATE public.profiles
  SET balance_nex = balance_nex + p_nex,
      balance_nxa = balance_nxa + p_nxa,
      experience = v_xp,
      level = v_level,
      max_experience = public.battle_xp_required(v_level),
      victories = victories + CASE WHEN p_outcome = 'VICTORY' THEN 1 ELSE 0 END,
      defeats = defeats + CASE WHEN p_outcome = 'DEFEAT' THEN 1 ELSE 0 END,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  v_reward := jsonb_build_object(
    'outcome', p_outcome, 'xp_gained', p_xp, 'nex_gained', p_nex,
    'nxa_gained', p_nxa, 'level_ups', v_level_ups,
    'level', v_level, 'experience', v_xp,
    'balance_nex', v_profile.balance_nex + p_nex,
    'balance_nxa', v_profile.balance_nxa + p_nxa
  );
  UPDATE public.battle_runs
  SET reward_applied = TRUE, rewards = v_reward,
      resulting_profile = jsonb_build_object(
        'level', v_level, 'experience', v_xp,
        'balance_nex', v_profile.balance_nex + p_nex,
        'balance_nxa', v_profile.balance_nxa + p_nxa,
        'level_ups', v_level_ups
      )
  WHERE id = p_run_id AND owner_id = p_user_id AND reward_applied = FALSE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Run inválido ou recompensa já aplicada';
  END IF;
  RETURN v_reward;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_battle_reward_for_run(UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.start_battle_atomic(p_request_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_existing public.battle_runs;
  v_preferences public.battle_preferences;
  v_run_id UUID;
  v_request TEXT := btrim(COALESCE(p_request_id, ''));
  v_team TEXT[];
  v_ids TEXT[];
  v_names TEXT[];
  v_rarities TEXT[];
  v_attack NUMERIC[];
  v_defense NUMERIC[];
  v_speed NUMERIC[];
  v_hp NUMERIC[];
  v_max_hp NUMERIC[];
  v_npc_attack NUMERIC[];
  v_npc_defense NUMERIC[];
  v_npc_speed NUMERIC[];
  v_npc_hp NUMERIC[];
  v_npc_max_hp NUMERIC[];
  v_npc_ids TEXT[];
  v_npc_names TEXT[];
  v_npc_rarities TEXT[];
  v_player_snapshot JSONB := '[]'::jsonb;
  v_npc_snapshot JSONB := '[]'::jsonb;
  v_events JSONB := '[]'::jsonb;
  v_result JSONB;
  v_reward JSONB;
  v_seed BIGINT;
  v_count INTEGER;
  v_duplicates INTEGER;
  v_round INTEGER := 0;
  v_step INTEGER := 0;
  v_player_cursor INTEGER := 1;
  v_npc_cursor INTEGER := 1;
  v_player_alive INTEGER;
  v_npc_alive INTEGER;
  v_player_damage NUMERIC;
  v_npc_damage NUMERIC;
  v_player_roll NUMERIC;
  v_npc_roll NUMERIC;
  v_player_initiative NUMERIC;
  v_npc_initiative NUMERIC;
  v_outcome TEXT;
  v_i INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória'; END IF;
  IF v_request = '' OR length(v_request) > 200
     OR v_request <> p_request_id THEN RAISE EXCEPTION 'request_id inválido'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('nexa:battle:' || v_user_id, 0));
  SELECT * INTO v_existing FROM public.battle_runs
  WHERE owner_id = v_user_id AND request_id = v_request FOR UPDATE;
  IF FOUND THEN
    IF v_existing.status = 'COMPLETED' AND v_existing.result IS NOT NULL
       AND v_existing.reward_applied THEN
      RETURN v_existing.result || jsonb_build_object('idempotent', TRUE);
    END IF;
    RAISE EXCEPTION 'Esta solicitação de batalha já está em andamento';
  END IF;

  SELECT * INTO v_preferences FROM public.battle_preferences
  WHERE user_id = v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Preferências de batalha não encontradas'; END IF;
  v_team := v_preferences.battle_team_card_ids;
  IF v_team IS NULL OR cardinality(v_team) < 1 OR cardinality(v_team) > 4
     OR EXISTS (SELECT 1 FROM unnest(v_team) AS x(id) WHERE id IS NULL OR btrim(id) = '') THEN
    RAISE EXCEPTION 'Formação inválida';
  END IF;
  SELECT cardinality(v_team), COUNT(DISTINCT id) INTO v_count, v_duplicates
  FROM unnest(v_team) AS x(id);
  IF v_count <> v_duplicates THEN RAISE EXCEPTION 'A formação não pode conter duplicatas'; END IF;
  IF v_preferences.main_card_id IS NULL
     OR NOT (v_preferences.main_card_id = ANY(v_team)) THEN
    RAISE EXCEPTION 'Líder inválido';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM unnest(v_team) WITH ORDINALITY AS x(card_id, ord)
  JOIN public.user_cards c ON c.id = x.card_id
  JOIN public.card_templates t ON t.template_id = c.template_id AND t.active
  WHERE c.owner_id = v_user_id AND c.state = 'FREE'
    AND c.template_id IS NOT NULL AND c.rarity IS NOT NULL
    AND c.name IS NOT NULL AND c.name <> '';
  IF v_count <> cardinality(v_team) THEN
    RAISE EXCEPTION 'Carta inexistente, inativa, não pertencente, não FREE ou incompleta';
  END IF;

  SELECT
    array_agg(c.id ORDER BY x.ord), array_agg(t.name ORDER BY x.ord),
    array_agg(t.rarity ORDER BY x.ord),
    array_agg(CASE t.rarity WHEN 'Comum' THEN 42 WHEN 'Incomum' THEN 50 WHEN 'Raro' THEN 60
      WHEN 'Épico' THEN 72 WHEN 'Lendário' THEN 86 WHEN 'Mítico' THEN 102 END ORDER BY x.ord),
    array_agg(CASE t.rarity WHEN 'Comum' THEN 38 WHEN 'Incomum' THEN 46 WHEN 'Raro' THEN 55
      WHEN 'Épico' THEN 66 WHEN 'Lendário' THEN 78 WHEN 'Mítico' THEN 94 END ORDER BY x.ord),
    array_agg(CASE t.rarity WHEN 'Comum' THEN 40 WHEN 'Incomum' THEN 48 WHEN 'Raro' THEN 58
      WHEN 'Épico' THEN 70 WHEN 'Lendário' THEN 82 WHEN 'Mítico' THEN 96 END ORDER BY x.ord),
    array_agg(CASE t.rarity WHEN 'Comum' THEN 150 WHEN 'Incomum' THEN 165 WHEN 'Raro' THEN 185
      WHEN 'Épico' THEN 205 WHEN 'Lendário' THEN 230 WHEN 'Mítico' THEN 260 END ORDER BY x.ord)
  INTO v_ids, v_names, v_rarities, v_attack, v_defense, v_speed, v_max_hp
  FROM unnest(v_team) WITH ORDINALITY AS x(card_id, ord)
  JOIN public.user_cards c ON c.id = x.card_id AND c.owner_id = v_user_id AND c.state = 'FREE'
  JOIN public.card_templates t ON t.template_id = c.template_id AND t.active;
  v_hp := v_max_hp;
  v_count := cardinality(v_ids);
  v_seed := hashtextextended(v_user_id || ':' || v_request, 0);
  IF v_seed IS NULL THEN RAISE EXCEPTION 'RNG seed inválido'; END IF;

  -- NPC count always equals player count. NPC bootstrap is versioned and
  -- server-owned; names/r arity are snapshots, not client input.
  v_npc_ids := ARRAY(SELECT 'npc-sector-5b1-' || i FROM generate_series(1, v_count) AS gs(i));
  v_npc_names := ARRAY(SELECT CASE ((i - 1) % 3)
    WHEN 0 THEN 'Sentinela de Cromo' WHEN 1 THEN 'Predador de Néon'
    ELSE 'Guardião do Vazio' END FROM generate_series(1, v_count) AS gs(i));
  v_npc_rarities := ARRAY(SELECT CASE ((i - 1) % 3)
    WHEN 0 THEN 'Raro' WHEN 1 THEN 'Épico' ELSE 'Lendário' END FROM generate_series(1, v_count) AS gs(i));
  v_npc_attack := ARRAY(SELECT CASE ((i - 1) % 3) WHEN 0 THEN 58 WHEN 1 THEN 76 ELSE 94 END::numeric
    FROM generate_series(1, v_count) AS gs(i));
  v_npc_defense := ARRAY(SELECT CASE ((i - 1) % 3) WHEN 0 THEN 52 WHEN 1 THEN 68 ELSE 86 END::numeric
    FROM generate_series(1, v_count) AS gs(i));
  v_npc_speed := ARRAY(SELECT CASE ((i - 1) % 3) WHEN 0 THEN 48 WHEN 1 THEN 72 ELSE 61 END::numeric
    FROM generate_series(1, v_count) AS gs(i));
  v_npc_max_hp := ARRAY(SELECT CASE ((i - 1) % 3) WHEN 0 THEN 210 WHEN 1 THEN 185 ELSE 260 END::numeric
    FROM generate_series(1, v_count) AS gs(i));
  v_npc_hp := v_npc_max_hp;

  FOR v_i IN 1..v_count LOOP
    v_player_snapshot := v_player_snapshot || jsonb_build_array(jsonb_build_object(
      'position', v_i, 'id', v_ids[v_i], 'template_id', (SELECT template_id FROM public.user_cards WHERE id = v_ids[v_i]),
      'name', v_names[v_i], 'rarity', v_rarities[v_i], 'attack', v_attack[v_i],
      'defense', v_defense[v_i], 'speed', v_speed[v_i], 'max_hp', v_max_hp[v_i],
      'hp', v_hp[v_i], 'leader', v_ids[v_i] = v_preferences.main_card_id
    ));
    v_npc_snapshot := v_npc_snapshot || jsonb_build_array(jsonb_build_object(
      'position', v_i, 'id', v_npc_ids[v_i], 'name', v_npc_names[v_i],
      'rarity', v_npc_rarities[v_i], 'attack', v_npc_attack[v_i],
      'defense', v_npc_defense[v_i], 'speed', v_npc_speed[v_i],
      'max_hp', v_npc_max_hp[v_i], 'hp', v_npc_hp[v_i]
    ));
  END LOOP;

  INSERT INTO public.battle_runs (
    owner_id, request_id, formula_version, rng_seed, main_card_id, player_card_ids,
    player_snapshot, npc_snapshot
  ) VALUES (
    v_user_id, v_request, 'v1-bootstrap-rarity', v_seed, v_preferences.main_card_id,
    v_ids, v_player_snapshot, v_npc_snapshot
  ) RETURNING id INTO v_run_id;

  -- v1: damage=max(1,round(attack*roll(0.90..1.10)-defense*0.35));
  -- initiative=speed+roll(-5..5). Every random value is seed+step derived.
  WHILE v_round < 100 LOOP
    WHILE v_player_cursor <= v_count AND v_hp[v_player_cursor] <= 0 LOOP v_player_cursor := v_player_cursor + 1; END LOOP;
    WHILE v_npc_cursor <= v_count AND v_npc_hp[v_npc_cursor] <= 0 LOOP v_npc_cursor := v_npc_cursor + 1; END LOOP;
    EXIT WHEN v_player_cursor > v_count OR v_npc_cursor > v_count;
    v_round := v_round + 1;
    v_step := v_step + 1;
    v_player_initiative := v_speed[v_player_cursor] + (public.battle_rng_unit(v_seed, v_step) * 10 - 5);
    v_step := v_step + 1;
    v_npc_initiative := v_npc_speed[v_npc_cursor] + (public.battle_rng_unit(v_seed, v_step) * 10 - 5);
    v_step := v_step + 1;
    v_player_roll := 0.90 + public.battle_rng_unit(v_seed, v_step) * 0.20;
    v_step := v_step + 1;
    v_npc_roll := 0.90 + public.battle_rng_unit(v_seed, v_step) * 0.20;
    IF v_player_initiative >= v_npc_initiative THEN
      v_player_damage := GREATEST(1, round(v_attack[v_player_cursor] * v_player_roll - v_npc_defense[v_npc_cursor] * 0.35));
      v_npc_hp[v_npc_cursor] := GREATEST(0, v_npc_hp[v_npc_cursor] - v_player_damage);
      v_events := v_events || jsonb_build_array(jsonb_build_object('round',v_round,'attacker_side','PLAYER',
        'attacker_id',v_ids[v_player_cursor],'defender_id',v_npc_ids[v_npc_cursor],
        'damage',v_player_damage,'defender_hp_after',v_npc_hp[v_npc_cursor]));
      IF v_npc_hp[v_npc_cursor] > 0 AND v_hp[v_player_cursor] > 0 THEN
        v_npc_damage := GREATEST(1, round(v_npc_attack[v_npc_cursor] * v_npc_roll - v_defense[v_player_cursor] * 0.35));
        v_hp[v_player_cursor] := GREATEST(0, v_hp[v_player_cursor] - v_npc_damage);
        v_events := v_events || jsonb_build_array(jsonb_build_object('round',v_round,'attacker_side','NPC',
          'attacker_id',v_npc_ids[v_npc_cursor],'defender_id',v_ids[v_player_cursor],
          'damage',v_npc_damage,'defender_hp_after',v_hp[v_player_cursor]));
      END IF;
    ELSE
      v_npc_damage := GREATEST(1, round(v_npc_attack[v_npc_cursor] * v_npc_roll - v_defense[v_player_cursor] * 0.35));
      v_hp[v_player_cursor] := GREATEST(0, v_hp[v_player_cursor] - v_npc_damage);
      v_events := v_events || jsonb_build_array(jsonb_build_object('round',v_round,'attacker_side','NPC',
        'attacker_id',v_npc_ids[v_npc_cursor],'defender_id',v_ids[v_player_cursor],
        'damage',v_npc_damage,'defender_hp_after',v_hp[v_player_cursor]));
      IF v_hp[v_player_cursor] > 0 AND v_npc_hp[v_npc_cursor] > 0 THEN
        v_player_damage := GREATEST(1, round(v_attack[v_player_cursor] * v_player_roll - v_npc_defense[v_npc_cursor] * 0.35));
        v_npc_hp[v_npc_cursor] := GREATEST(0, v_npc_hp[v_npc_cursor] - v_player_damage);
        v_events := v_events || jsonb_build_array(jsonb_build_object('round',v_round,'attacker_side','PLAYER',
          'attacker_id',v_ids[v_player_cursor],'defender_id',v_npc_ids[v_npc_cursor],
          'damage',v_player_damage,'defender_hp_after',v_npc_hp[v_npc_cursor]));
      END IF;
    END IF;
  END LOOP;

  SELECT COUNT(*) INTO v_player_alive FROM unnest(v_hp) x(value) WHERE value > 0;
  SELECT COUNT(*) INTO v_npc_alive FROM unnest(v_npc_hp) x(value) WHERE value > 0;
  v_outcome := CASE WHEN v_player_alive > 0 AND v_npc_alive = 0 THEN 'VICTORY'
                    WHEN v_player_alive = 0 AND v_npc_alive > 0 THEN 'DEFEAT'
                    ELSE 'DRAW' END;
  v_reward := public.apply_battle_reward_for_run(v_run_id, v_user_id, v_outcome,
    CASE v_outcome WHEN 'VICTORY' THEN 150 WHEN 'DEFEAT' THEN 50 ELSE 75 END,
    CASE v_outcome WHEN 'VICTORY' THEN 100 WHEN 'DEFEAT' THEN 25 ELSE 40 END,
    CASE WHEN v_outcome = 'VICTORY' THEN 10 ELSE 0 END);
  v_result := jsonb_build_object('success',TRUE,'idempotent',FALSE,'run_id',v_run_id,
    'formula_version','v1-bootstrap-rarity','rng_seed',v_seed,'outcome',v_outcome,
    'rounds',v_round,'events',v_events,'player_snapshot',v_player_snapshot,
    'npc_snapshot',v_npc_snapshot,'rewards',v_reward,'drops',jsonb_build_array());
  UPDATE public.battle_runs SET status='COMPLETED', outcome=v_outcome, events=v_events,
    rewards=v_reward, result=v_result, completed_at=timezone('utc'::text, now())
  WHERE id=v_run_id AND reward_applied;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.start_battle_atomic(TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.start_battle_atomic(TEXT) TO authenticated;
