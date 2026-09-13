-- SETOR 5B3: server-authoritative battle stats, formula version v2.
-- Official card power matches src/config/collectionsData.ts:
-- power = rarity_base + market_value + synthesis_rate * 10.
-- rarity_base: Comum 100, Incomum 180, Raro 280, Epico 420,
-- Lendario 600, Mitico 850.
-- strength = round(power * 0.40)
-- defense = round(power * 0.30)
-- speed = greatest(10, round(sqrt(power) * 2))
-- max_hp = round(rarity_hp_base + 45 * ln(1 + power))
-- Effective attack = (190 + strength * 0.45 + power * 0.05)
--   * rarity_multiplier * level_multiplier.
-- Effective defense = (300 + defense * 0.60 + power * 0.05)
--   * rarity_multiplier * level_multiplier.
-- Initiative = sqrt(speed) * 1.5 + deterministic random in [-5, +5).
-- Minimum damage = greatest(5, round(sqrt(attacker_power) * 0.15)).
-- Damage = greatest(minimum_damage,
--   round(effective_attack * randomFactor - effective_defense * 0.35)),
-- where randomFactor is deterministic and in [0.90, 1.10).
-- Battle cap: 50 rounds; unresolved combat is DRAW.

ALTER TABLE public.card_templates
  ADD COLUMN IF NOT EXISTS market_value NUMERIC,
  ADD COLUMN IF NOT EXISTS synthesis_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS power INTEGER,
  ADD COLUMN IF NOT EXISTS strength INTEGER,
  ADD COLUMN IF NOT EXISTS defense INTEGER,
  ADD COLUMN IF NOT EXISTS speed INTEGER,
  ADD COLUMN IF NOT EXISTS level INTEGER,
  ADD COLUMN IF NOT EXISTS base_level INTEGER,
  ADD COLUMN IF NOT EXISTS max_hp INTEGER,
  ADD COLUMN IF NOT EXISTS version TEXT;

CREATE TABLE IF NOT EXISTS public.battle_rarity_multiplier (
  rarity TEXT PRIMARY KEY,
  multiplier NUMERIC NOT NULL CHECK (multiplier > 0)
);
INSERT INTO public.battle_rarity_multiplier (rarity, multiplier) VALUES
  ('Comum', 1.000), ('Incomum', 1.005), ('Raro', 1.010),
  ('Épico', 1.015), ('Lendário', 1.020), ('Mítico', 1.025)
ON CONFLICT (rarity) DO UPDATE SET multiplier = EXCLUDED.multiplier;

CREATE TABLE IF NOT EXISTS public.battle_level_multiplier (
  level INTEGER PRIMARY KEY CHECK (level BETWEEN 1 AND 50),
  multiplier NUMERIC NOT NULL CHECK (multiplier > 0)
);
INSERT INTO public.battle_level_multiplier(level, multiplier)
SELECT level, 1 + ((level - 1) * 0.0025) FROM generate_series(1, 50) AS levels(level)
ON CONFLICT (level) DO UPDATE SET multiplier = EXCLUDED.multiplier;

-- The 60 official market/synthesis values below are copied from
-- src/config/collectionsData.ts. No hash/random bootstrap is used.
DO $$
BEGIN
  IF (SELECT count(*) FROM public.card_templates WHERE active) <> 60 THEN
    RAISE EXCEPTION 'Cannot enable battle stats: expected exactly 60 active card templates; unknown or missing templates detected';
  END IF;
END
$$;

WITH official_seed(template_id, rarity, market_value, synthesis_rate) AS (
  VALUES
    ('card-flame-guardian', 'Incomum', 120, 8),
    ('card-ice-guardian', 'Raro', 180, 10),
    ('card-storm-guardian', 'Épico', 420, 15),
    ('card-abyss-guardian', 'Lendário', 980, 22),
    ('card-dragon-red', 'Incomum', 130, 8),
    ('card-dragon-frost', 'Raro', 200, 11),
    ('card-dragon-emerald', 'Incomum', 140, 8),
    ('card-dragon-shadow', 'Raro', 240, 12),
    ('card-dragon-gold', 'Épico', 480, 16),
    ('card-dragon-astral', 'Épico', 550, 17),
    ('card-dragon-volcanic', 'Lendário', 1100, 24),
    ('card-dragon-celestial', 'Mítico', 2400, 32),
    ('card-knight-blade', 'Comum', 60, 5),
    ('card-knight-black', 'Incomum', 110, 7),
    ('card-knight-royal', 'Incomum', 130, 8),
    ('card-knight-arcane', 'Raro', 190, 10),
    ('card-knight-scarlet', 'Raro', 220, 11),
    ('card-knight-lunar', 'Épico', 450, 15),
    ('card-knight-imperial', 'Lendário', 1050, 23),
    ('card-knight-celestial', 'Mítico', 2300, 31),
    ('card-abyss-devourer', 'Comum', 60, 5),
    ('card-abyss-colossus', 'Incomum', 110, 7),
    ('card-abyss-serpent', 'Incomum', 125, 8),
    ('card-abyss-demon', 'Raro', 210, 11),
    ('card-abyss-kraken', 'Raro', 230, 12),
    ('card-abyss-leviathan', 'Épico', 470, 16),
    ('card-abyss-hydra', 'Lendário', 1150, 24),
    ('card-abyss-king', 'Mítico', 2600, 33),
    ('card-mage-fire', 'Comum', 55, 5),
    ('card-mage-ice', 'Comum', 55, 5),
    ('card-mage-earth', 'Incomum', 110, 7),
    ('card-mage-wind', 'Incomum', 110, 7),
    ('card-mage-light', 'Raro', 195, 10),
    ('card-mage-shadow', 'Raro', 220, 11),
    ('card-mage-arcane', 'Épico', 460, 16),
    ('card-mage-archmage', 'Lendário', 1200, 25),
    ('card-god-war', 'Raro', 220, 11),
    ('card-god-moon', 'Raro', 230, 12),
    ('card-god-thunder', 'Épico', 490, 16),
    ('card-god-sea', 'Épico', 490, 16),
    ('card-god-death', 'Épico', 530, 17),
    ('card-god-light', 'Lendário', 1200, 24),
    ('card-god-chaos', 'Lendário', 1350, 26),
    ('card-god-supreme', 'Mítico', 3000, 35),
    ('card-cosmic-guardian', 'Incomum', 130, 8),
    ('card-cosmic-comet', 'Raro', 220, 11),
    ('card-cosmic-solar', 'Raro', 240, 12),
    ('card-cosmic-lunar', 'Épico', 470, 15),
    ('card-cosmic-devourer', 'Épico', 520, 17),
    ('card-cosmic-voidlord', 'Lendário', 1250, 25),
    ('card-cosmic-being', 'Lendário', 1300, 26),
    ('card-cosmic-primordial', 'Mítico', 3200, 35),
    ('card-hunter-novice', 'Comum', 50, 5),
    ('card-hunter-shadow', 'Comum', 60, 5),
    ('card-hunter-arcane', 'Incomum', 115, 7),
    ('card-hunter-dragonslayer', 'Incomum', 135, 8),
    ('card-hunter-lunar', 'Raro', 200, 10),
    ('card-hunter-royal', 'Raro', 225, 11),
    ('card-hunter-ghost', 'Épico', 480, 15),
    ('card-hunter-master', 'Lendário', 1180, 23)
), calculated AS (
  SELECT
    s.*,
    CASE s.rarity
      WHEN 'Comum' THEN 100
      WHEN 'Incomum' THEN 180
      WHEN 'Raro' THEN 280
      WHEN 'Épico' THEN 420
      WHEN 'Lendário' THEN 600
      WHEN 'Mítico' THEN 850
    END AS rarity_base,
    CASE s.rarity
      WHEN 'Comum' THEN 120
      WHEN 'Incomum' THEN 150
      WHEN 'Raro' THEN 180
      WHEN 'Épico' THEN 220
      WHEN 'Lendário' THEN 270
      WHEN 'Mítico' THEN 330
    END AS hp_base
  FROM official_seed s
), battle_stats AS (
  SELECT
    c.*,
    (c.rarity_base + c.market_value + c.synthesis_rate * 10)::INTEGER AS official_power
  FROM calculated c
)
UPDATE public.card_templates t
SET rarity = c.rarity,
    market_value = c.market_value,
    synthesis_rate = c.synthesis_rate,
    power = c.official_power,
    level = CASE c.rarity
      WHEN 'Comum' THEN 1 WHEN 'Incomum' THEN 2 WHEN 'Raro' THEN 3
      WHEN 'Épico' THEN 4 WHEN 'Lendário' THEN 5 ELSE 6 END,
    base_level = CASE c.rarity
      WHEN 'Comum' THEN 1 WHEN 'Incomum' THEN 2 WHEN 'Raro' THEN 3
      WHEN 'Épico' THEN 4 WHEN 'Lendário' THEN 5 ELSE 6 END,
    strength = round(c.official_power * 0.40),
    defense = round(c.official_power * 0.30),
    speed = greatest(10, round(sqrt(c.official_power) * 2)),
    max_hp = round(c.hp_base + 45 * ln(1 + c.official_power)),
    version = 'v2'
FROM battle_stats c
WHERE t.template_id = c.template_id;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.card_templates WHERE active AND (power IS NULL OR strength IS NULL OR defense IS NULL OR speed IS NULL OR level IS NULL OR base_level IS NULL OR max_hp IS NULL OR version IS NULL OR market_value IS NULL OR synthesis_rate IS NULL)) THEN
    RAISE EXCEPTION 'Cannot enable battle stats: active card_templates contain unknown or incomplete templates';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='card_templates_power_positive') THEN
    ALTER TABLE public.card_templates ADD CONSTRAINT card_templates_power_positive CHECK (power > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='card_templates_strength_positive') THEN
    ALTER TABLE public.card_templates ADD CONSTRAINT card_templates_strength_positive CHECK (strength > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='card_templates_defense_nonnegative') THEN
    ALTER TABLE public.card_templates ADD CONSTRAINT card_templates_defense_nonnegative CHECK (defense >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='card_templates_speed_positive') THEN
    ALTER TABLE public.card_templates ADD CONSTRAINT card_templates_speed_positive CHECK (speed > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='card_templates_level_positive') THEN
    ALTER TABLE public.card_templates ADD CONSTRAINT card_templates_level_positive CHECK (level > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='card_templates_base_level_positive') THEN
    ALTER TABLE public.card_templates ADD CONSTRAINT card_templates_base_level_positive CHECK (base_level > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='card_templates_max_hp_positive') THEN
    ALTER TABLE public.card_templates ADD CONSTRAINT card_templates_max_hp_positive CHECK (max_hp > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='card_templates_version_v2') THEN
    ALTER TABLE public.card_templates ADD CONSTRAINT card_templates_version_v2 CHECK (version IN ('v2'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='card_templates_power_identity') THEN
    ALTER TABLE public.card_templates ADD CONSTRAINT card_templates_power_identity CHECK (
      power = round(market_value + synthesis_rate * 10 + CASE rarity
        WHEN 'Comum' THEN 100 WHEN 'Incomum' THEN 180 WHEN 'Raro' THEN 280
        WHEN 'Épico' THEN 420 WHEN 'Lendário' THEN 600 WHEN 'Mítico' THEN 850
      END)
    );
  END IF;
END
$$;
ALTER TABLE public.card_templates
  ALTER COLUMN market_value SET NOT NULL, ALTER COLUMN synthesis_rate SET NOT NULL,
  ALTER COLUMN power SET NOT NULL, ALTER COLUMN strength SET NOT NULL,
  ALTER COLUMN defense SET NOT NULL, ALTER COLUMN speed SET NOT NULL,
  ALTER COLUMN level SET NOT NULL, ALTER COLUMN base_level SET NOT NULL,
  ALTER COLUMN max_hp SET NOT NULL, ALTER COLUMN version SET NOT NULL;

CREATE OR REPLACE FUNCTION public.start_battle_atomic(p_request_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text; v_existing public.battle_runs; v_preferences public.battle_preferences;
  v_request TEXT := btrim(COALESCE(p_request_id, '')); v_run_id UUID; v_team TEXT[]; v_ids TEXT[]; v_templates TEXT[]; v_names TEXT[]; v_rarities TEXT[];
  v_power NUMERIC[]; v_strength NUMERIC[]; v_defense NUMERIC[]; v_speed NUMERIC[]; v_level INTEGER[]; v_hp NUMERIC[]; v_max_hp NUMERIC[];
  v_npc_ids TEXT[]; v_npc_templates TEXT[]; v_npc_names TEXT[]; v_npc_rarities TEXT[]; v_npc_power NUMERIC[]; v_npc_strength NUMERIC[]; v_npc_defense NUMERIC[]; v_npc_speed NUMERIC[]; v_npc_level INTEGER[]; v_npc_hp NUMERIC[]; v_npc_max_hp NUMERIC[];
  v_player_snapshot JSONB := '[]'::jsonb; v_npc_snapshot JSONB := '[]'::jsonb; v_events JSONB := '[]'::jsonb; v_result JSONB; v_reward JSONB; v_seed BIGINT; v_count INTEGER; v_duplicates INTEGER;
  v_round INTEGER := 0; v_sequence INTEGER := 0; v_step INTEGER := 0; v_player_cursor INTEGER := 1; v_npc_cursor INTEGER := 1; v_player_alive INTEGER; v_npc_alive INTEGER; v_damage NUMERIC; v_roll NUMERIC; v_initiative NUMERIC; v_npc_initiative NUMERIC; v_before NUMERIC; v_outcome TEXT; v_i INTEGER; v_effective_attack NUMERIC; v_effective_defense NUMERIC; v_npc_effective_attack NUMERIC; v_npc_effective_defense NUMERIC; v_attacker_side TEXT; v_attacker_id TEXT; v_defender_id TEXT; v_after NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF v_request = '' OR length(v_request) > 200 OR v_request <> p_request_id THEN RAISE EXCEPTION 'Invalid request_id'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('nexa:battle:' || v_user_id, 0));
  SELECT * INTO v_existing FROM public.battle_runs WHERE owner_id=v_user_id AND request_id=v_request FOR UPDATE;
  IF FOUND THEN
    IF v_existing.status='COMPLETED' AND v_existing.result IS NOT NULL AND v_existing.reward_applied THEN RETURN v_existing.result || jsonb_build_object('idempotent', TRUE); END IF;
    RAISE EXCEPTION 'This battle request is already in progress';
  END IF;
  SELECT * INTO v_preferences FROM public.battle_preferences WHERE user_id=v_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Battle preferences not found'; END IF;
  v_team := v_preferences.battle_team_card_ids;
  IF v_team IS NULL OR cardinality(v_team)<1 OR cardinality(v_team)>4 OR EXISTS(SELECT 1 FROM unnest(v_team) x(id) WHERE id IS NULL OR btrim(id)='') THEN RAISE EXCEPTION 'Invalid formation'; END IF;
  SELECT cardinality(v_team), COUNT(DISTINCT id) INTO v_count,v_duplicates FROM unnest(v_team) x(id);
  IF v_count<>v_duplicates OR v_preferences.main_card_id IS NULL OR NOT(v_preferences.main_card_id=ANY(v_team)) THEN RAISE EXCEPTION 'Invalid formation or leader'; END IF;
  SELECT COUNT(*) INTO v_duplicates FROM unnest(v_team) WITH ORDINALITY x(card_id,ord) JOIN public.user_cards c ON c.id=x.card_id JOIN public.card_templates t ON t.template_id=c.template_id AND t.active WHERE c.owner_id=v_user_id AND c.state='FREE' AND t.power IS NOT NULL AND t.strength IS NOT NULL AND t.defense IS NOT NULL AND t.speed IS NOT NULL AND t.level IS NOT NULL AND t.max_hp IS NOT NULL;
  IF v_duplicates<>v_count THEN RAISE EXCEPTION 'Card is missing, inactive, not owned, not FREE, or incomplete'; END IF;
  SELECT array_agg(c.id ORDER BY x.ord),array_agg(c.template_id ORDER BY x.ord),array_agg(t.name ORDER BY x.ord),array_agg(t.rarity ORDER BY x.ord),array_agg(t.power ORDER BY x.ord),array_agg(t.strength ORDER BY x.ord),array_agg(t.defense ORDER BY x.ord),array_agg(t.speed ORDER BY x.ord),array_agg(t.level ORDER BY x.ord),array_agg(t.max_hp ORDER BY x.ord) INTO v_ids,v_templates,v_names,v_rarities,v_power,v_strength,v_defense,v_speed,v_level,v_max_hp FROM unnest(v_team) WITH ORDINALITY x(card_id,ord) JOIN public.user_cards c ON c.id=x.card_id AND c.owner_id=v_user_id AND c.state='FREE' JOIN public.card_templates t ON t.template_id=c.template_id AND t.active;
  v_hp:=v_max_hp; v_seed:=hashtextextended(v_user_id||':'||v_request,0);
  -- NPCs are exactly player count, selected from official templates only, with fixed Raro/Epico/Lendario/Raro order.
  SELECT array_agg('npc-sector-5b3-'||x.i ORDER BY x.i),array_agg(t.template_id ORDER BY x.i),array_agg(t.name ORDER BY x.i),array_agg(t.rarity ORDER BY x.i),array_agg(t.power ORDER BY x.i),array_agg(t.strength ORDER BY x.i),array_agg(t.defense ORDER BY x.i),array_agg(t.speed ORDER BY x.i),array_agg(t.level ORDER BY x.i),array_agg(t.max_hp ORDER BY x.i) INTO v_npc_ids,v_npc_templates,v_npc_names,v_npc_rarities,v_npc_power,v_npc_strength,v_npc_defense,v_npc_speed,v_npc_level,v_npc_max_hp FROM generate_series(1,v_count) x(i) CROSS JOIN LATERAL (SELECT t.* FROM public.card_templates t WHERE t.active AND t.rarity = CASE WHEN x.i IN (1,4) THEN 'Raro' WHEN x.i=2 THEN chr(201)||'pico' ELSE chr(76)||'end'||chr(225)||'rio' END ORDER BY t.template_id LIMIT 1) t;
  IF cardinality(v_npc_ids)<>v_count THEN RAISE EXCEPTION 'Official NPC templates are incomplete for fixed rarity composition'; END IF;
  v_npc_hp:=v_npc_max_hp;
  FOR v_i IN 1..v_count LOOP
    v_player_snapshot:=v_player_snapshot||jsonb_build_array(jsonb_build_object('position',v_i,'id',v_ids[v_i],'template_id',v_templates[v_i],'name',v_names[v_i],'rarity',v_rarities[v_i],'power',v_power[v_i],'strength',v_strength[v_i],'defense',v_defense[v_i],'speed',v_speed[v_i],'level',v_level[v_i],'max_hp',v_max_hp[v_i],'hp',v_hp[v_i],'leader',v_ids[v_i]=v_preferences.main_card_id,'version','v2'));
    v_npc_snapshot:=v_npc_snapshot||jsonb_build_array(jsonb_build_object('position',v_i,'id',v_npc_ids[v_i],'template_id',v_npc_templates[v_i],'name',v_npc_names[v_i],'rarity',v_npc_rarities[v_i],'power',v_npc_power[v_i],'strength',v_npc_strength[v_i],'defense',v_npc_defense[v_i],'speed',v_npc_speed[v_i],'level',v_npc_level[v_i],'max_hp',v_npc_max_hp[v_i],'hp',v_npc_hp[v_i],'version','v2'));
  END LOOP;
  INSERT INTO public.battle_runs(owner_id,request_id,formula_version,rng_seed,main_card_id,player_card_ids,player_snapshot,npc_snapshot) VALUES(v_user_id,v_request,'v2',v_seed,v_preferences.main_card_id,v_ids,v_player_snapshot,v_npc_snapshot) RETURNING id INTO v_run_id;
  WHILE v_round < 50 LOOP
    WHILE v_player_cursor<=v_count AND v_hp[v_player_cursor]<=0 LOOP v_player_cursor:=v_player_cursor+1; END LOOP;
    WHILE v_npc_cursor<=v_count AND v_npc_hp[v_npc_cursor]<=0 LOOP v_npc_cursor:=v_npc_cursor+1; END LOOP;
    EXIT WHEN v_player_cursor>v_count OR v_npc_cursor>v_count;
    v_round:=v_round+1; v_step:=v_step+1; v_initiative:=sqrt(v_speed[v_player_cursor])*1.5+public.battle_rng_unit(v_seed,v_step)*10-5; v_step:=v_step+1; v_npc_initiative:=sqrt(v_npc_speed[v_npc_cursor])*1.5+public.battle_rng_unit(v_seed,v_step)*10-5;
    IF v_initiative>=v_npc_initiative THEN
      v_step:=v_step+1; v_roll:=0.90+public.battle_rng_unit(v_seed,v_step)*0.20; v_before:=v_npc_hp[v_npc_cursor]; SELECT (190+v_strength[v_player_cursor]*0.45+v_power[v_player_cursor]*0.05)*r.multiplier*l.multiplier, (300+v_npc_defense[v_npc_cursor]*0.60+v_npc_power[v_npc_cursor]*0.05)*r2.multiplier*l2.multiplier INTO v_effective_attack,v_effective_defense FROM public.battle_rarity_multiplier r,public.battle_level_multiplier l,public.battle_rarity_multiplier r2,public.battle_level_multiplier l2 WHERE r.rarity=v_rarities[v_player_cursor] AND l.level=v_level[v_player_cursor] AND r2.rarity=v_npc_rarities[v_npc_cursor] AND l2.level=v_npc_level[v_npc_cursor]; v_damage:=GREATEST(5,round(sqrt(v_power[v_player_cursor])*0.15),round(v_effective_attack*v_roll-v_effective_defense*0.35)); v_npc_hp[v_npc_cursor]:=GREATEST(0,v_before-v_damage); v_attacker_side:='PLAYER'; v_attacker_id:=v_ids[v_player_cursor]; v_defender_id:=v_npc_ids[v_npc_cursor];
    ELSE
      v_step:=v_step+1; v_roll:=0.90+public.battle_rng_unit(v_seed,v_step)*0.20; v_before:=v_hp[v_player_cursor]; SELECT (190+v_npc_strength[v_npc_cursor]*0.45+v_npc_power[v_npc_cursor]*0.05)*r.multiplier*l.multiplier, (300+v_defense[v_player_cursor]*0.60+v_power[v_player_cursor]*0.05)*r2.multiplier*l2.multiplier INTO v_npc_effective_attack,v_npc_effective_defense FROM public.battle_rarity_multiplier r,public.battle_level_multiplier l,public.battle_rarity_multiplier r2,public.battle_level_multiplier l2 WHERE r.rarity=v_npc_rarities[v_npc_cursor] AND l.level=v_npc_level[v_npc_cursor] AND r2.rarity=v_rarities[v_player_cursor] AND l2.level=v_level[v_player_cursor]; v_damage:=GREATEST(5,round(sqrt(v_npc_power[v_npc_cursor])*0.15),round(v_npc_effective_attack*v_roll-v_npc_effective_defense*0.35)); v_hp[v_player_cursor]:=GREATEST(0,v_before-v_damage); v_attacker_side:='NPC'; v_attacker_id:=v_npc_ids[v_npc_cursor]; v_defender_id:=v_ids[v_player_cursor];
    END IF;
    v_after:=CASE WHEN v_attacker_side='PLAYER' THEN v_npc_hp[v_npc_cursor] ELSE v_hp[v_player_cursor] END;
    v_sequence:=v_sequence+1; v_events:=v_events||jsonb_build_array(jsonb_build_object('sequence',v_sequence,'round',v_round,'attackerSide',v_attacker_side,'attacker_side',v_attacker_side,'attackerId',v_attacker_id,'attacker_id',v_attacker_id,'defenderId',v_defender_id,'defender_id',v_defender_id,'damage',v_damage,'randomFactor',v_roll,'defenderHpBefore',v_before,'defender_hp_before',v_before,'defenderHpAfter',v_after,'defender_hp_after',v_after,'defeated',v_after=0,'player_hp',to_jsonb(v_hp),'npc_hp',to_jsonb(v_npc_hp)));
  END LOOP;
  SELECT COUNT(*) INTO v_player_alive FROM unnest(v_hp) x(value) WHERE value>0; SELECT COUNT(*) INTO v_npc_alive FROM unnest(v_npc_hp) x(value) WHERE value>0; v_outcome:=CASE WHEN v_player_alive>0 AND v_npc_alive=0 THEN 'VICTORY' WHEN v_player_alive=0 AND v_npc_alive>0 THEN 'DEFEAT' ELSE 'DRAW' END;
  v_reward:=public.apply_battle_reward_for_run(v_run_id,v_user_id,v_outcome,CASE v_outcome WHEN 'VICTORY' THEN 150 WHEN 'DEFEAT' THEN 50 ELSE 75 END,CASE v_outcome WHEN 'VICTORY' THEN 100 WHEN 'DEFEAT' THEN 25 ELSE 40 END,CASE WHEN v_outcome='VICTORY' THEN 10 ELSE 0 END);
  v_result:=jsonb_build_object('success',TRUE,'idempotent',FALSE,'run_id',v_run_id,'formula_version','v2','rng_seed',v_seed,'outcome',v_outcome,'rounds',v_round,'events',v_events,'player_snapshot',v_player_snapshot,'npc_snapshot',v_npc_snapshot,'final_hp',jsonb_build_object('player',to_jsonb(v_hp),'npc',to_jsonb(v_npc_hp)),'rewards',v_reward,'drops',jsonb_build_array());
  UPDATE public.battle_runs SET status='COMPLETED',outcome=v_outcome,events=v_events,rewards=v_reward,result=v_result,completed_at=timezone('utc'::text,now()) WHERE id=v_run_id AND reward_applied;
  RETURN v_result;
END; $$;
REVOKE ALL ON FUNCTION public.start_battle_atomic(TEXT) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.start_battle_atomic(TEXT) TO authenticated;