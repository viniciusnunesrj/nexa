-- SETOR 5B3: adaptive PvE template selection only. Combat v2 and rewards unchanged.
CREATE OR REPLACE FUNCTION public.start_battle_atomic(p_request_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_match_template public.card_templates%ROWTYPE;
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
  -- Match each server-validated player template by power; never use client power.
  -- Prefer unused templates, then widen 10%, 15%, 25%, 40%, then nearest power.
  -- The seed ordering is independent of battle_rng_unit/v_step (combat is unchanged).
  FOR v_i IN 1..v_count LOOP
    SELECT t.* INTO v_match_template
    FROM public.card_templates t
    WHERE t.active
      AND t.power > 0 AND t.strength IS NOT NULL AND t.defense IS NOT NULL
      AND t.speed IS NOT NULL AND t.level IS NOT NULL AND t.max_hp IS NOT NULL
    ORDER BY
      (t.template_id = ANY(COALESCE(v_npc_templates, ARRAY[]::TEXT[]))),
      CASE
        WHEN t.power BETWEEN v_power[v_i] * 0.90 AND v_power[v_i] * 1.10 THEN 0
        WHEN t.power BETWEEN v_power[v_i] * 0.85 AND v_power[v_i] * 1.15 THEN 1
        WHEN t.power BETWEEN v_power[v_i] * 0.75 AND v_power[v_i] * 1.25 THEN 2
        WHEN t.power BETWEEN v_power[v_i] * 0.60 AND v_power[v_i] * 1.40 THEN 3
        ELSE 4
      END,
      CASE WHEN t.power BETWEEN v_power[v_i] * 0.60 AND v_power[v_i] * 1.40
        THEN 0 ELSE abs(t.power - v_power[v_i]) END,
      hashtextextended('npc-match:' || v_i || ':' || t.template_id, v_seed),
      t.template_id
    LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'Official NPC templates are incomplete for adaptive matchmaking'; END IF;
    v_npc_ids := array_append(v_npc_ids, 'npc-sector-5b3-' || v_i);
    v_npc_templates := array_append(v_npc_templates, v_match_template.template_id);
    v_npc_names := array_append(v_npc_names, v_match_template.name);
    v_npc_rarities := array_append(v_npc_rarities, v_match_template.rarity);
    v_npc_power := array_append(v_npc_power, v_match_template.power);
    v_npc_strength := array_append(v_npc_strength, v_match_template.strength);
    v_npc_defense := array_append(v_npc_defense, v_match_template.defense);
    v_npc_speed := array_append(v_npc_speed, v_match_template.speed);
    v_npc_level := array_append(v_npc_level, v_match_template.level);
    v_npc_max_hp := array_append(v_npc_max_hp, v_match_template.max_hp);
  END LOOP;
  IF cardinality(v_npc_ids) IS DISTINCT FROM v_count THEN
    RAISE EXCEPTION 'Official NPC count does not match player formation';
  END IF;
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