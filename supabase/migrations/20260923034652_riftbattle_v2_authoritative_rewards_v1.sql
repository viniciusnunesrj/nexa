CREATE OR REPLACE FUNCTION public.settle_riftbattle_v2_run_internal(p_owner_id text, p_run_id uuid, p_actions jsonb, p_outcome text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_run public.battle_runs; v_profile public.profiles;
v_xp int; v_nex int; v_nxa int; v_level int; v_experience int; v_required int; v_level_ups int:=0; v_slots int; v_reward jsonb; v_active_slots int;
begin
  if p_outcome not in ('VICTORY','DEFEAT') then raise exception 'INVALID_OUTCOME'; end if;
  select * into v_run from public.battle_runs where id=p_run_id and owner_id=p_owner_id for update;
  if not found or v_run.formula_version<>'riftbattle-v2-authoritative-v1' then raise exception 'RUN_NOT_FOUND'; end if;
  if v_run.reward_applied then return v_run.rewards; end if;
  if v_run.status<>'RUNNING' then raise exception 'RUN_NOT_RUNNING'; end if;
  v_active_slots:=coalesce((v_run.player_snapshot->'arena'->>'activeSlots')::int,0);
  if v_active_slots=2 then
    v_nex:=case when p_outcome='VICTORY' then 30 else 4 end;
    v_xp:=case when p_outcome='VICTORY' then 100 else 20 end;
    v_nxa:=case when p_outcome='VICTORY' then 4 else 0 end;
  elsif v_active_slots=3 then
    v_nex:=case when p_outcome='VICTORY' then 40 else 6 end;
    v_xp:=case when p_outcome='VICTORY' then 125 else 25 end;
    v_nxa:=case when p_outcome='VICTORY' then 5 else 0 end;
  elsif v_active_slots=4 then
    v_nex:=case when p_outcome='VICTORY' then 50 else 8 end;
    v_xp:=case when p_outcome='VICTORY' then 150 else 30 end;
    v_nxa:=case when p_outcome='VICTORY' then 6 else 0 end;
  else raise exception 'UNSUPPORTED_DUEL_SIZE'; end if;

  select * into v_profile from public.profiles where id=p_owner_id for update;
  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  v_level:=v_profile.level; v_experience:=v_profile.experience+v_xp;
  while v_level<50 loop
    v_required:=public.battle_xp_required(v_level); exit when v_experience<v_required;
    v_experience:=v_experience-v_required; v_level:=v_level+1; v_level_ups:=v_level_ups+1;
  end loop;
  v_slots:=case when v_level>=30 then 6 when v_level>=20 then 5 when v_level>=10 then 4 else 3 end;
  update public.profiles set
    balance_nex=balance_nex+v_nex,balance_nxa=balance_nxa+v_nxa,experience=v_experience,level=v_level,
    max_experience=public.battle_xp_required(v_level),unlocked_slots=v_slots,
    victories=victories+case when p_outcome='VICTORY' then 1 else 0 end,
    defeats=defeats+case when p_outcome='DEFEAT' then 1 else 0 end,updated_at=timezone('utc',now())
  where id=p_owner_id;
  v_reward:=jsonb_build_object('outcome',p_outcome,'xp_gained',v_xp,'nex_gained',v_nex,'nxa_gained',v_nxa,'level_ups',v_level_ups,'level',v_level,'experience',v_experience,'unlocked_slots',v_slots,'balance_nex',v_profile.balance_nex+v_nex,'balance_nxa',v_profile.balance_nxa+v_nxa);
  update public.battle_runs set status='COMPLETED',outcome=p_outcome,events=p_actions,rewards=v_reward,reward_applied=true,
    resulting_profile=jsonb_build_object('level',v_level,'experience',v_experience,'unlocked_slots',v_slots,'balance_nex',v_profile.balance_nex+v_nex,'balance_nxa',v_profile.balance_nxa+v_nxa,'level_ups',v_level_ups),
    result=jsonb_build_object('outcome',p_outcome,'authoritative',true),completed_at=timezone('utc',now())
  where id=p_run_id and reward_applied=false;
  if not found then raise exception 'REWARD_ALREADY_APPLIED'; end if;
  return v_reward;
end $function$
;

CREATE OR REPLACE FUNCTION public.start_riftbattle_v2_run_internal(p_owner_id text, p_request_id text, p_arena jsonb, p_player_cards jsonb, p_opponent_cards jsonb, p_difficulty text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_run public.battle_runs;
begin
  if p_owner_id is null or length(p_owner_id)<1 or p_request_id is null or length(p_request_id)<8 then raise exception 'INVALID_REQUEST'; end if;
  if p_difficulty not in ('RECRUTA','OPERADOR','NEXUS') then raise exception 'INVALID_DIFFICULTY'; end if;
  select * into v_run from public.battle_runs where owner_id=p_owner_id and request_id=p_request_id;
  if found then
    if v_run.formula_version <> 'riftbattle-v2-authoritative-v1' then raise exception 'REQUEST_ID_CONFLICT'; end if;
    return jsonb_build_object('id',v_run.id,'requestId',v_run.request_id,'status',v_run.status,'opponentCards',v_run.npc_snapshot->'cards');
  end if;
  insert into public.battle_runs(owner_id,request_id,status,formula_version,rng_seed,main_card_id,player_card_ids,player_snapshot,npc_snapshot,events,rewards,reward_applied)
  values(
    p_owner_id,p_request_id,'RUNNING','riftbattle-v2-authoritative-v1',0,
    coalesce(p_player_cards->0->>'id','riftbattle-v2'),
    array(select jsonb_array_elements_text(coalesce((select jsonb_agg(x->>'id') from jsonb_array_elements(p_player_cards) x),'[]'::jsonb))),
    jsonb_build_object('arena',p_arena,'cards',p_player_cards,'difficulty',p_difficulty),
    jsonb_build_object('cards',p_opponent_cards),
    '[]'::jsonb,'{}'::jsonb,false
  ) returning * into v_run;
  return jsonb_build_object('id',v_run.id,'requestId',v_run.request_id,'status',v_run.status,'opponentCards',v_run.npc_snapshot->'cards');
end $function$
;

revoke all on function public.start_riftbattle_v2_run_internal(text,text,jsonb,jsonb,jsonb,text) from public, anon, authenticated;
grant execute on function public.start_riftbattle_v2_run_internal(text,text,jsonb,jsonb,jsonb,text) to service_role;
revoke all on function public.settle_riftbattle_v2_run_internal(text,uuid,jsonb,text) from public, anon, authenticated;
grant execute on function public.settle_riftbattle_v2_run_internal(text,uuid,jsonb,text) to service_role;
