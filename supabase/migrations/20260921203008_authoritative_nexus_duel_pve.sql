-- Nexus Duel PvE authoritative settlement.
-- The client submits only its card and Nexo investment. CPU choice, round
-- resolution, final outcome and rewards are calculated atomically here.

CREATE TABLE public.duelo_nexal_pve_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id text NOT NULL,
  status text NOT NULL DEFAULT 'PLAYING' CHECK (status IN ('PLAYING','FINISHED','ABANDONED')),
  round integer NOT NULL DEFAULT 1 CHECK (round BETWEEN 1 AND 4),
  player_hp integer NOT NULL DEFAULT 12 CHECK (player_hp BETWEEN 0 AND 12),
  cpu_hp integer NOT NULL DEFAULT 12 CHECK (cpu_hp BETWEEN 0 AND 12),
  player_nexos integer NOT NULL DEFAULT 12 CHECK (player_nexos BETWEEN 0 AND 12),
  cpu_nexos integer NOT NULL DEFAULT 12 CHECK (cpu_nexos BETWEEN 0 AND 12),
  player_deck jsonb NOT NULL,
  cpu_deck jsonb NOT NULL,
  winner text CHECK (winner IN ('PLAYER','CPU','DRAW')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  next_move_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  UNIQUE (owner_id, request_id)
);

CREATE INDEX duelo_nexal_pve_matches_owner_status_idx
  ON public.duelo_nexal_pve_matches(owner_id, status);

CREATE TABLE public.duelo_nexal_pve_rounds (
  match_id uuid NOT NULL REFERENCES public.duelo_nexal_pve_matches(id) ON DELETE CASCADE,
  round integer NOT NULL CHECK (round BETWEEN 1 AND 4),
  player_card text NOT NULL REFERENCES public.duelo_nexal_arena_rules(card_id),
  cpu_card text NOT NULL REFERENCES public.duelo_nexal_arena_rules(card_id),
  player_nexos_spent integer NOT NULL CHECK (player_nexos_spent BETWEEN 0 AND 12),
  cpu_nexos_spent integer NOT NULL CHECK (cpu_nexos_spent BETWEEN 0 AND 12),
  player_attack integer NOT NULL CHECK (player_attack >= 0),
  cpu_attack integer NOT NULL CHECK (cpu_attack >= 0),
  winner text NOT NULL CHECK (winner IN ('PLAYER','CPU','DRAW')),
  damage integer NOT NULL CHECK (damage >= 0),
  player_hp integer NOT NULL CHECK (player_hp BETWEEN 0 AND 12),
  cpu_hp integer NOT NULL CHECK (cpu_hp BETWEEN 0 AND 12),
  player_nexos integer NOT NULL CHECK (player_nexos BETWEEN 0 AND 12),
  cpu_nexos integer NOT NULL CHECK (cpu_nexos BETWEEN 0 AND 12),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, round)
);

ALTER TABLE public.duelo_nexal_pve_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duelo_nexal_pve_rounds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.duelo_nexal_pve_matches, public.duelo_nexal_pve_rounds FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.start_duelo_nexal_pve(p_request_id text, p_deck jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u text := auth.uid()::text;
  req text := btrim(coalesce(p_request_id, ''));
  m public.duelo_nexal_pve_matches;
  cpu jsonb;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF req = '' OR length(req) > 200 THEN RAISE EXCEPTION 'INVALID_REQUEST_ID'; END IF;
  IF NOT public.validate_duelo_nexal_pvp_deck(u, p_deck) THEN RAISE EXCEPTION 'INVALID_DECK'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('nexa:duelo-pve:start:' || u, 0));
  SELECT * INTO m FROM public.duelo_nexal_pve_matches
   WHERE owner_id=u AND request_id=req;
  IF FOUND THEN
    RETURN jsonb_build_object('id',m.id,'requestId',m.request_id,'status',m.status,'round',m.round,
      'playerHp',m.player_hp,'cpuHp',m.cpu_hp,'playerNexos',m.player_nexos,'cpuNexos',m.cpu_nexos,
      'playerDeck',m.player_deck,'cpuDeck',m.cpu_deck,'winner',m.winner);
  END IF;

  UPDATE public.duelo_nexal_pve_matches
     SET status='ABANDONED', updated_at=now()
   WHERE owner_id=u AND status='PLAYING';

  SELECT jsonb_agg(card_id ORDER BY random()) INTO cpu
  FROM (
    SELECT ar.card_id
    FROM public.duelo_nexal_arena_rules ar
    JOIN public.card_templates ct ON ct.template_id=ar.card_id AND ct.active=true
    WHERE NOT (p_deck ? ar.card_id)
    ORDER BY random()
    LIMIT 4
  ) picked;
  IF jsonb_array_length(coalesce(cpu,'[]'::jsonb)) <> 4 THEN RAISE EXCEPTION 'CPU_DECK_UNAVAILABLE'; END IF;

  INSERT INTO public.duelo_nexal_pve_matches(owner_id,request_id,player_deck,cpu_deck)
  VALUES(u,req,p_deck,cpu) RETURNING * INTO m;
  RETURN jsonb_build_object('id',m.id,'requestId',m.request_id,'status',m.status,'round',m.round,
    'playerHp',m.player_hp,'cpuHp',m.cpu_hp,'playerNexos',m.player_nexos,'cpuNexos',m.cpu_nexos,
    'playerDeck',m.player_deck,'cpuDeck',m.cpu_deck,'winner',m.winner);
END $$;

CREATE OR REPLACE FUNCTION public.submit_duelo_nexal_pve_move(p_match_id uuid, p_round integer, p_card_id text, p_nexos integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u text := auth.uid()::text;
  m public.duelo_nexal_pve_matches;
  pc public.duelo_nexal_arena_rules;
  cc public.duelo_nexal_arena_rules;
  cpu_card_id text;
  rounds_left integer;
  target_investment integer;
  investment_variance integer;
  cpu_spend integer;
  choice_window integer;
  player_attack integer;
  cpu_attack integer;
  damage integer := 0;
  round_winner text := 'DRAW';
  player_wins integer;
  cpu_wins integer;
  outc text;
  nex_gain integer;
  xp_gain integer;
  nxa_gain integer;
  prof public.profiles;
  lvl integer;
  xp integer;
  needed integer;
  ups integer := 0;
  new_nex numeric;
  new_nxa numeric;
  txid text;
  reward jsonb := NULL;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF p_nexos IS NULL OR p_nexos < 0 THEN RAISE EXCEPTION 'INVALID_NEXOS'; END IF;

  SELECT * INTO m FROM public.duelo_nexal_pve_matches WHERE id=p_match_id FOR UPDATE;
  IF NOT FOUND OR m.owner_id<>u THEN RAISE EXCEPTION 'MATCH_NOT_FOUND'; END IF;
  IF m.status<>'PLAYING' THEN RAISE EXCEPTION 'MATCH_NOT_PLAYING'; END IF;
  IF p_round IS NULL OR p_round<>m.round THEN RAISE EXCEPTION 'STALE_ROUND'; END IF;
  IF now()<m.next_move_at THEN RAISE EXCEPTION 'ROUND_COOLDOWN'; END IF;
  IF p_nexos>m.player_nexos THEN RAISE EXCEPTION 'INVALID_NEXOS'; END IF;
  IF NOT (m.player_deck ? p_card_id) THEN RAISE EXCEPTION 'CARD_NOT_IN_DECK'; END IF;
  IF EXISTS(SELECT 1 FROM public.duelo_nexal_pve_rounds WHERE match_id=m.id AND player_card=p_card_id) THEN
    RAISE EXCEPTION 'CARD_ALREADY_USED';
  END IF;

  SELECT * INTO pc FROM public.duelo_nexal_arena_rules WHERE card_id=p_card_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'CARD_RULE_NOT_FOUND'; END IF;

  rounds_left := greatest(1, 5-m.round);
  target_investment := greatest(0, least(4,
    floor(m.cpu_nexos::numeric/rounds_left)::integer +
    CASE WHEN m.cpu_hp<m.player_hp THEN 1 WHEN m.cpu_hp>m.player_hp THEN -1 ELSE 0 END));
  investment_variance := CASE WHEN random()<0.22 THEN -1 WHEN random()>0.78 THEN 1 ELSE 0 END;
  cpu_spend := greatest(0, least(m.cpu_nexos,target_investment+investment_variance));
  choice_window := least(4-m.round+1, CASE WHEN m.round>=3 OR m.cpu_hp<m.player_hp THEN 2 ELSE 3 END);

  SELECT candidate.card_id INTO cpu_card_id
  FROM (
    SELECT ar.card_id,
      ar.power + CASE WHEN ar.ability='IMPULSO' AND cpu_spend>=3 THEN 2 ELSE 0 END +
      ar.damage*0.35 + CASE WHEN ar.ability='BLINDAGEM' THEN 0.7 WHEN ar.ability='DRENO' AND m.cpu_hp<12 THEN 0.6 WHEN ar.ability='ECO' AND m.cpu_nexos<12 THEN 0.5 ELSE 0 END score
    FROM public.duelo_nexal_arena_rules ar
    WHERE m.cpu_deck ? ar.card_id
      AND NOT EXISTS(SELECT 1 FROM public.duelo_nexal_pve_rounds r WHERE r.match_id=m.id AND r.cpu_card=ar.card_id)
    ORDER BY score DESC, ar.card_id
    LIMIT choice_window
  ) candidate
  ORDER BY random() LIMIT 1;
  IF cpu_card_id IS NULL THEN RAISE EXCEPTION 'CPU_CARD_UNAVAILABLE'; END IF;
  SELECT * INTO cc FROM public.duelo_nexal_arena_rules WHERE card_id=cpu_card_id;

  player_attack := pc.power + p_nexos*2 + CASE WHEN pc.ability='IMPULSO' AND p_nexos>=3 THEN 2 ELSE 0 END;
  cpu_attack := cc.power + cpu_spend*2 + CASE WHEN cc.ability='IMPULSO' AND cpu_spend>=3 THEN 2 ELSE 0 END;
  m.player_nexos := m.player_nexos-p_nexos;
  m.cpu_nexos := m.cpu_nexos-cpu_spend;

  IF player_attack>cpu_attack THEN
    round_winner:='PLAYER'; damage:=greatest(1,pc.damage-CASE WHEN cc.ability='BLINDAGEM' THEN 2 ELSE 0 END);
    m.cpu_hp:=greatest(0,m.cpu_hp-damage);
    IF pc.ability='DRENO' THEN m.player_hp:=least(12,m.player_hp+1); END IF;
    IF pc.ability='ECO' THEN m.player_nexos:=least(12,m.player_nexos+1); END IF;
  ELSIF cpu_attack>player_attack THEN
    round_winner:='CPU'; damage:=greatest(1,cc.damage-CASE WHEN pc.ability='BLINDAGEM' THEN 2 ELSE 0 END);
    m.player_hp:=greatest(0,m.player_hp-damage);
    IF cc.ability='DRENO' THEN m.cpu_hp:=least(12,m.cpu_hp+1); END IF;
    IF cc.ability='ECO' THEN m.cpu_nexos:=least(12,m.cpu_nexos+1); END IF;
  END IF;

  INSERT INTO public.duelo_nexal_pve_rounds(match_id,round,player_card,cpu_card,player_nexos_spent,cpu_nexos_spent,
    player_attack,cpu_attack,winner,damage,player_hp,cpu_hp,player_nexos,cpu_nexos)
  VALUES(m.id,m.round,p_card_id,cpu_card_id,p_nexos,cpu_spend,player_attack,cpu_attack,round_winner,damage,
    m.player_hp,m.cpu_hp,m.player_nexos,m.cpu_nexos);

  SELECT count(*) FILTER(WHERE winner='PLAYER'),count(*) FILTER(WHERE winner='CPU')
    INTO player_wins,cpu_wins FROM public.duelo_nexal_pve_rounds WHERE match_id=m.id;

  IF m.player_hp=0 OR m.cpu_hp=0 OR m.round=4 THEN
    m.status:='FINISHED';
    m.winner:=CASE WHEN m.player_hp>m.cpu_hp THEN 'PLAYER' WHEN m.cpu_hp>m.player_hp THEN 'CPU' ELSE 'DRAW' END;
    outc:=CASE m.winner WHEN 'PLAYER' THEN 'VICTORY' WHEN 'CPU' THEN 'DEFEAT' ELSE 'DRAW' END;
    nex_gain:=CASE outc WHEN 'VICTORY' THEN 60 WHEN 'DRAW' THEN 12 ELSE 6 END;
    xp_gain:=CASE outc WHEN 'VICTORY' THEN 150 WHEN 'DRAW' THEN 35 ELSE 20 END;
    nxa_gain:=CASE WHEN outc='VICTORY' THEN 4 ELSE 0 END;

    SELECT * INTO prof FROM public.profiles WHERE id=u FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'PROFILE_NOT_FOUND'; END IF;
    lvl:=prof.level; xp:=prof.experience+xp_gain;
    WHILE lvl<50 LOOP needed:=public.battle_xp_required(lvl); EXIT WHEN xp<needed; xp:=xp-needed; lvl:=lvl+1; ups:=ups+1; END LOOP;
    new_nex:=prof.balance_nex+nex_gain; new_nxa:=prof.balance_nxa+nxa_gain;
    UPDATE public.profiles SET balance_nex=new_nex,balance_nxa=new_nxa,experience=xp,level=lvl,
      max_experience=public.battle_xp_required(lvl),unlocked_slots=CASE WHEN lvl>=30 THEN 6 WHEN lvl>=20 THEN 5 WHEN lvl>=10 THEN 4 ELSE 3 END,
      victories=victories+CASE WHEN outc='VICTORY' THEN 1 ELSE 0 END,
      defeats=defeats+CASE WHEN outc='DEFEAT' THEN 1 ELSE 0 END,updated_at=timezone('utc',now()) WHERE id=u;
    INSERT INTO public.duelo_nexal_rewards(owner_id,request_id,outcome,nex_gained,xp_gained,nxa_gained,result_snapshot)
    VALUES(u,m.request_id,outc,nex_gain,xp_gain,nxa_gain,jsonb_build_object('matchId',m.id,'playerFinalHp',m.player_hp,
      'cpuFinalHp',m.cpu_hp,'playerRoundsWon',player_wins,'cpuRoundsWon',cpu_wins,'roundsPlayed',m.round,
      'playerNexosRemaining',m.player_nexos,'cpuNexosRemaining',m.cpu_nexos));
    txid:=gen_random_uuid()::text;
    INSERT INTO public.transactions(id,user_id,user_name,currency,amount,balance_after,type,description,metadata)
    VALUES(txid,u,prof.username,'NEX',nex_gain,new_nex,'DUEL_NEXAL_PVE_REWARD','Recompensa Nexus Duel PvE',jsonb_build_object('match_id',m.id,'outcome',outc,'xp_gained',xp_gain,'nxa_gained',nxa_gain));
    IF nxa_gain>0 THEN
      txid:=gen_random_uuid()::text;
      INSERT INTO public.transactions(id,user_id,user_name,currency,amount,balance_after,type,description,metadata)
      VALUES(txid,u,prof.username,'NXA',nxa_gain,new_nxa,'DUEL_NEXAL_PVE_REWARD','Recompensa Nexus Duel PvE',jsonb_build_object('match_id',m.id,'outcome',outc,'nex_gained',nex_gain,'xp_gained',xp_gain));
    END IF;
    reward:=jsonb_build_object('success',true,'outcome',outc,'nex_gained',nex_gain,'xp_gained',xp_gain,
      'nxa_gained',nxa_gain,'level_ups',ups,'balance_nex',new_nex,'balance_nxa',new_nxa,'level',lvl,'experience',xp);
  ELSE
    m.round:=m.round+1;
  END IF;

  UPDATE public.duelo_nexal_pve_matches SET status=m.status,round=m.round,player_hp=m.player_hp,cpu_hp=m.cpu_hp,
    player_nexos=m.player_nexos,cpu_nexos=m.cpu_nexos,winner=m.winner,updated_at=now(),
    next_move_at=CASE WHEN m.status='PLAYING' THEN now()+interval '10 seconds' ELSE now() END,
    finished_at=CASE WHEN m.status='FINISHED' THEN now() ELSE NULL END WHERE id=m.id;

  RETURN jsonb_build_object('matchId',m.id,'resolvedRound',CASE WHEN m.status='FINISHED' THEN m.round ELSE m.round-1 END,
    'playerCard',p_card_id,'cpuCard',cpu_card_id,'playerNexosSpent',p_nexos,'cpuNexosSpent',cpu_spend,
    'playerAttack',player_attack,'cpuAttack',cpu_attack,'roundWinner',round_winner,'damage',damage,
    'playerHp',m.player_hp,'cpuHp',m.cpu_hp,'playerNexos',m.player_nexos,'cpuNexos',m.cpu_nexos,
    'playerRoundsWon',player_wins,'cpuRoundsWon',cpu_wins,'status',m.status,'nextRound',m.round,'winner',m.winner,'reward',reward);
END $$;

REVOKE ALL ON FUNCTION public.start_duelo_nexal_pve(text,jsonb), public.submit_duelo_nexal_pve_move(uuid,integer,text,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_duelo_nexal_pve(text,jsonb), public.submit_duelo_nexal_pve_move(uuid,integer,text,integer) TO authenticated, service_role;

-- Disable the client-authoritative settlement endpoint.
REVOKE ALL ON FUNCTION public.complete_duelo_nexal_pve(text,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_duelo_nexal_pve(text,text,jsonb) TO service_role;
