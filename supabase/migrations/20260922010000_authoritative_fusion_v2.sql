-- ============================================================================
-- NEXA — FUSÃO V2 SERVER-AUTHORITATIVE
-- Migration: 20260922010000_authoritative_fusion_v2.sql
--
-- Objetivo:
--   Substituir a fusão 3 -> 1 resolvida no cliente por uma operação atômica,
--   autenticada e totalmente autoritativa no servidor.
--
-- Regras V1 preservadas:
--   Comum      -> Incomum    300 NEX   100%
--   Incomum    -> Raro       800 NEX   100%
--   Raro       -> Épico     2500 NEX   100%
--   Épico      -> Lendário  7500 NEX    70%
--   Lendário   -> Mítico   20000 NEX    45%
--
-- Falha:
--   - preserva a primeira carta enviada;
--   - destrói as outras duas;
--   - cobra 50% do custo.
--
-- Sucesso:
--   - destrói as três cartas;
--   - cria uma carta física oficial da raridade seguinte.
--
-- O cliente NÃO escolhe:
--   - custo;
--   - chance;
--   - resultado;
--   - raridade de saída;
--   - template de saída;
--   - cartas efetivamente queimadas.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. REGISTRO IDEMPOTENTE DAS OPERAÇÕES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fusion_operations_v2 (
  owner_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  input_card_ids TEXT[] NOT NULL,
  input_rarity TEXT NOT NULL,
  output_rarity TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  charged_nex NUMERIC NOT NULL CHECK (charged_nex >= 0),
  output_card_id TEXT,
  output_template_id TEXT,
  burned_card_ids TEXT[] NOT NULL DEFAULT '{}',
  preserved_card_id TEXT,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

  PRIMARY KEY (owner_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_fusion_operations_v2_owner_created
  ON public.fusion_operations_v2(owner_id, created_at DESC);

ALTER TABLE public.fusion_operations_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fusion_operations_v2_owner_read
  ON public.fusion_operations_v2;

CREATE POLICY fusion_operations_v2_owner_read
  ON public.fusion_operations_v2
  FOR SELECT
  TO authenticated
  USING (owner_id = (SELECT auth.uid()::text));

REVOKE ALL
  ON TABLE public.fusion_operations_v2
  FROM PUBLIC, anon, authenticated;

GRANT SELECT
  ON TABLE public.fusion_operations_v2
  TO authenticated;


-- ============================================================================
-- 2. RPC AUTORITATIVA
-- ============================================================================

CREATE OR REPLACE FUNCTION public.execute_fusion_v2(
  p_request_id TEXT,
  p_card_ids TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_user_id TEXT := auth.uid()::text;
  v_request_id TEXT := btrim(COALESCE(p_request_id, ''));

  v_profile public.profiles%ROWTYPE;
  v_existing public.fusion_operations_v2%ROWTYPE;

  v_card_ids TEXT[];
  v_card_count INTEGER;
  v_distinct_count INTEGER;

  v_input_rarity TEXT;
  v_output_rarity TEXT;

  v_full_cost NUMERIC;
  v_failure_cost NUMERIC;
  v_success_rate NUMERIC;
  v_charge NUMERIC;

  v_roll NUMERIC;
  v_success BOOLEAN;

  v_preserved_card_id TEXT;
  v_burned_card_ids TEXT[];

  v_output_template public.card_templates%ROWTYPE;
  v_output_meta public.box_template_metadata_v1%ROWTYPE;
  v_output_card public.user_cards%ROWTYPE;

  v_output_card_id TEXT;

  v_result JSONB;

  v_valid_cards INTEGER;
  v_rarity_count INTEGER;
BEGIN
  -- ==========================================================================
  -- AUTENTICAÇÃO
  -- ==========================================================================

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória';
  END IF;

  IF v_request_id = ''
     OR length(v_request_id) > 200
     OR v_request_id <> p_request_id THEN
    RAISE EXCEPTION 'request_id inválido';
  END IF;

  IF p_card_ids IS NULL THEN
    RAISE EXCEPTION 'Selecione exatamente 3 cartas';
  END IF;

  v_card_ids := p_card_ids;
  v_card_count := cardinality(v_card_ids);

  IF v_card_count <> 3 THEN
    RAISE EXCEPTION 'A fusão requer exatamente 3 cartas';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(v_card_ids) AS x(card_id)
    WHERE card_id IS NULL OR btrim(card_id) = ''
  ) THEN
    RAISE EXCEPTION 'IDs de cartas inválidos';
  END IF;

  SELECT COUNT(DISTINCT card_id)
  INTO v_distinct_count
  FROM unnest(v_card_ids) AS x(card_id);

  IF v_distinct_count <> 3 THEN
    RAISE EXCEPTION 'As 3 cartas da fusão devem ser diferentes';
  END IF;


  -- ==========================================================================
  -- SERIALIZA OPERAÇÕES DE FUSÃO DA MESMA CONTA
  -- ==========================================================================

  PERFORM pg_advisory_xact_lock(
    hashtextextended('nexa:fusion:v2:' || v_user_id, 0)
  );


  -- ==========================================================================
  -- IDEMPOTÊNCIA
  -- ==========================================================================

  SELECT *
  INTO v_existing
  FROM public.fusion_operations_v2
  WHERE owner_id = v_user_id
    AND request_id = v_request_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.input_card_ids <> v_card_ids THEN
      RAISE EXCEPTION
        'request_id já utilizado com outras cartas';
    END IF;

    RETURN v_existing.result
      || jsonb_build_object('idempotent', TRUE);
  END IF;


  -- ==========================================================================
  -- BLOQUEIA PERFIL
  -- ==========================================================================

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado';
  END IF;

  IF v_profile.balance_nex IS NULL
     OR v_profile.balance_nex < 0
     OR v_profile.balance_nex = 'NaN'::numeric THEN
    RAISE EXCEPTION 'Saldo NEX inválido';
  END IF;


  -- ==========================================================================
  -- BLOQUEIA AS 3 CARTAS EM ORDEM DETERMINÍSTICA
  -- ==========================================================================

  PERFORM 1
  FROM public.user_cards c
  WHERE c.id = ANY(v_card_ids)
  ORDER BY c.id
  FOR UPDATE;


  -- ==========================================================================
  -- VALIDA OWNERSHIP / ESTADO / DISPONIBILIDADE
  --
  -- A fusão não aceita:
  --   - carta de outro usuário;
  --   - carta ACTIVE/EXHAUSTED;
  --   - carta equipada;
  --   - carta listada;
  --   - carta congelada;
  --   - carta em qualquer estado econômico não livre.
  -- ==========================================================================

  SELECT COUNT(*)
  INTO v_valid_cards
  FROM public.user_cards c
  JOIN public.card_templates t
    ON t.template_id = c.template_id
   AND t.active
  WHERE c.id = ANY(v_card_ids)
    AND c.owner_id = v_user_id
    AND c.state = 'FREE'
    AND c.card_status = 'FREE'
    AND c.status = 'IDLE'
    AND c.template_id IS NOT NULL
    AND t.rarity IS NOT NULL;

  IF v_valid_cards <> 3 THEN
    RAISE EXCEPTION
      'Carta inexistente, não pertencente à conta, ocupada, listada, congelada ou indisponível';
  END IF;


  -- ==========================================================================
  -- TODAS DEVEM TER A MESMA RARIDADE OFICIAL
  -- ==========================================================================

  SELECT COUNT(DISTINCT t.rarity), MIN(t.rarity)
  INTO v_rarity_count, v_input_rarity
  FROM public.user_cards c
  JOIN public.card_templates t
    ON t.template_id = c.template_id
   AND t.active
  WHERE c.id = ANY(v_card_ids)
    AND c.owner_id = v_user_id;

  IF v_rarity_count <> 1 OR v_input_rarity IS NULL THEN
    RAISE EXCEPTION
      'As 3 cartas devem possuir a mesma raridade';
  END IF;


  -- ==========================================================================
  -- REGRAS ECONÔMICAS — SOMENTE SERVIDOR
  -- ==========================================================================

  CASE v_input_rarity
    WHEN 'Comum' THEN
      v_output_rarity := 'Incomum';
      v_full_cost := 300;
      v_success_rate := 1.00;

    WHEN 'Incomum' THEN
      v_output_rarity := 'Raro';
      v_full_cost := 800;
      v_success_rate := 1.00;

    WHEN 'Raro' THEN
      v_output_rarity := 'Épico';
      v_full_cost := 2500;
      v_success_rate := 1.00;

    WHEN 'Épico' THEN
      v_output_rarity := 'Lendário';
      v_full_cost := 7500;
      v_success_rate := 0.70;

    WHEN 'Lendário' THEN
      v_output_rarity := 'Mítico';
      v_full_cost := 20000;
      v_success_rate := 0.45;

    WHEN 'Mítico' THEN
      RAISE EXCEPTION
        'Cartas Míticas já atingiram a raridade máxima';

    ELSE
      RAISE EXCEPTION 'Raridade de fusão desconhecida';
  END CASE;

  v_failure_cost := floor(v_full_cost * 0.50);


  -- ==========================================================================
  -- SORTEIO SERVER-SIDE
  -- ==========================================================================

  v_roll := random();
  v_success := v_roll <= v_success_rate;

  IF v_success THEN
    v_charge := v_full_cost;
  ELSE
    v_charge := v_failure_cost;
  END IF;


  -- ==========================================================================
  -- SALDO
  --
  -- Mantém o comportamento econômico antigo:
  -- em sucesso cobra 100%;
  -- em falha cobra 50%.
  -- ==========================================================================

  IF v_profile.balance_nex < v_charge THEN
    RAISE EXCEPTION
      'Saldo NEX insuficiente para concluir a fusão';
  END IF;


  -- ==========================================================================
  -- RESULTADO: SUCESSO
  -- ==========================================================================

  IF v_success THEN

    -- Escolhe exclusivamente entre templates oficiais ativos
    -- da raridade seguinte.
    SELECT *
    INTO v_output_template
    FROM public.card_templates
    WHERE active
      AND rarity = v_output_rarity
    ORDER BY random()
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Nenhum template oficial disponível para a raridade de saída';
    END IF;


    -- Metadados oficiais usados pelo mesmo sistema das caixas.
    SELECT *
    INTO v_output_meta
    FROM public.box_template_metadata_v1
    WHERE template_id = v_output_template.template_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Metadados oficiais da carta resultante não encontrados';
    END IF;


    -- Cobra NEX.
    UPDATE public.profiles
    SET
      balance_nex = balance_nex - v_charge,
      updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id;


    -- Em sucesso, as 3 cartas são consumidas.
    v_burned_card_ids := v_card_ids;
    v_preserved_card_id := NULL;

    DELETE FROM public.user_cards
    WHERE owner_id = v_user_id
      AND id = ANY(v_burned_card_ids);

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Falha ao consumir cartas da fusão';
    END IF;


    -- Cria uma carta física oficial.
    v_output_card_id :=
      'card-' || gen_random_uuid()::text;

    INSERT INTO public.user_cards (
      id,
      owner_id,
      owner_name,
      template_id,
      name,
      rarity,
      collection_id,
      collection_name,
      element,
      element_icon,
      image,
      description,
      synthesis_rate,
      synthesis_cap,
      market_value,
      state,
      card_status,
      status,
      tradeable,
      synthesizable,
      accumulated_nex,
      total_generated
    )
    VALUES (
      v_output_card_id,
      v_user_id,
      v_profile.username,
      v_output_template.template_id,
      v_output_template.name,
      v_output_template.rarity,
      v_output_meta.collection_id,
      v_output_meta.collection_name,
      v_output_meta.element,
      v_output_meta.element_icon,
      v_output_meta.image,
      v_output_meta.description,
      v_output_template.synthesis_rate,
      v_output_meta.synthesis_cap,
      v_output_template.market_value,
      'FREE',
      'FREE',
      'IDLE',
      TRUE,
      TRUE,
      0,
      0
    )
    RETURNING *
    INTO v_output_card;


    -- Ledger econômico.
    INSERT INTO public.transactions (
      id,
      user_id,
      user_name,
      currency,
      amount,
      balance_after,
      type,
      description,
      metadata
    )
    VALUES (
      'tx-' || gen_random_uuid()::text,
      v_user_id,
      v_profile.username,
      'NEX',
      -v_charge,
      v_profile.balance_nex - v_charge,
      'FUSION',
      'Fusão server-authoritative concluída com sucesso',
      jsonb_build_object(
        'requestId', v_request_id,
        'success', TRUE,
        'inputRarity', v_input_rarity,
        'outputRarity', v_output_rarity,
        'inputCardIds', to_jsonb(v_card_ids),
        'burnedCardIds', to_jsonb(v_burned_card_ids),
        'outputCardId', v_output_card.id,
        'outputTemplateId', v_output_template.template_id,
        'successRate', v_success_rate
      )
    );


    v_result := jsonb_build_object(
      'success', TRUE,
      'idempotent', FALSE,

      'message',
      'Fusão bem-sucedida! Você sintetizou uma carta de raridade '
        || v_output_rarity || '!',

      'input_rarity', v_input_rarity,
      'output_rarity', v_output_rarity,

      'success_rate', v_success_rate,
      'charged_nex', v_charge,

      'balance_nex',
      v_profile.balance_nex - v_charge,

      'burned_card_ids',
      to_jsonb(v_burned_card_ids),

      'preserved_card_id',
      NULL,

      'output_template_id',
      v_output_template.template_id,

      'output_card',
      to_jsonb(v_output_card)
    );


  -- ==========================================================================
  -- RESULTADO: FALHA
  -- ==========================================================================

  ELSE

    -- Mantém exatamente a semântica antiga:
    -- primeira carta preservada, segunda e terceira destruídas.
    v_preserved_card_id := v_card_ids[1];

    v_burned_card_ids := ARRAY[
      v_card_ids[2],
      v_card_ids[3]
    ];


    UPDATE public.profiles
    SET
      balance_nex = balance_nex - v_charge,
      updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id;


    DELETE FROM public.user_cards
    WHERE owner_id = v_user_id
      AND id = ANY(v_burned_card_ids);

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Falha ao consumir cartas da fusão';
    END IF;


    INSERT INTO public.transactions (
      id,
      user_id,
      user_name,
      currency,
      amount,
      balance_after,
      type,
      description,
      metadata
    )
    VALUES (
      'tx-' || gen_random_uuid()::text,
      v_user_id,
      v_profile.username,
      'NEX',
      -v_charge,
      v_profile.balance_nex - v_charge,
      'FUSION',
      'Fusão server-authoritative falhou',
      jsonb_build_object(
        'requestId', v_request_id,
        'success', FALSE,
        'inputRarity', v_input_rarity,
        'outputRarity', v_output_rarity,
        'inputCardIds', to_jsonb(v_card_ids),
        'burnedCardIds', to_jsonb(v_burned_card_ids),
        'preservedCardId', v_preserved_card_id,
        'successRate', v_success_rate
      )
    );


    v_result := jsonb_build_object(
      'success', FALSE,
      'idempotent', FALSE,

      'message',
      'Instabilidade no Reator! A síntese falhou ('
        || round(v_success_rate * 100)::text
        || '% de chance). 2 cartas foram desintegradas, mas 1 foi recuperada.',

      'input_rarity', v_input_rarity,
      'output_rarity', v_output_rarity,

      'success_rate', v_success_rate,
      'charged_nex', v_charge,

      'balance_nex',
      v_profile.balance_nex - v_charge,

      'burned_card_ids',
      to_jsonb(v_burned_card_ids),

      'preserved_card_id',
      v_preserved_card_id,

      'output_template_id',
      NULL,

      'output_card',
      NULL
    );

  END IF;


  -- ==========================================================================
  -- PERSISTE RESULTADO PARA IDEMPOTÊNCIA
  -- ==========================================================================

  INSERT INTO public.fusion_operations_v2 (
    owner_id,
    request_id,
    input_card_ids,
    input_rarity,
    output_rarity,
    success,
    charged_nex,
    output_card_id,
    output_template_id,
    burned_card_ids,
    preserved_card_id,
    result
  )
  VALUES (
    v_user_id,
    v_request_id,
    v_card_ids,
    v_input_rarity,
    v_output_rarity,
    v_success,
    v_charge,
    CASE
      WHEN v_success THEN v_output_card.id
      ELSE NULL
    END,
    CASE
      WHEN v_success THEN v_output_template.template_id
      ELSE NULL
    END,
    v_burned_card_ids,
    v_preserved_card_id,
    v_result
  );


  RETURN v_result;
END;
$$;


-- ============================================================================
-- 3. PERMISSÕES
-- ============================================================================

REVOKE ALL
  ON FUNCTION public.execute_fusion_v2(TEXT, TEXT[])
  FROM PUBLIC, anon, service_role;

GRANT EXECUTE
  ON FUNCTION public.execute_fusion_v2(TEXT, TEXT[])
  TO authenticated;


COMMIT;