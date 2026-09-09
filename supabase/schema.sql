-- ============================================================================
-- NEXA UNIVERSE - SUPABASE POSTGRESQL SCHEMA COMPLETO (HARDENED & SECURE)
-- ============================================================================
-- Este script provisiona as tabelas, constraints, índices, políticas RLS estritas,
-- triggers de proteção de colunas econômicas e funções transacionais atômicas (RPC)
-- para garantir que o Supabase seja a FONTE ÚNICA DA VERDADE (PC ↔ Celular).
-- ============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. TABELA DE PERFIS DE USUÁRIOS (PROFILES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  experience INTEGER NOT NULL DEFAULT 0 CHECK (experience >= 0),
  max_experience INTEGER NOT NULL DEFAULT 1000 CHECK (max_experience > 0),
  balance_nex NUMERIC NOT NULL DEFAULT 1000 CHECK (balance_nex >= 0),
  balance_nxa NUMERIC NOT NULL DEFAULT 100 CHECK (balance_nxa >= 0),
  victories INTEGER NOT NULL DEFAULT 0 CHECK (victories >= 0),
  defeats INTEGER NOT NULL DEFAULT 0 CHECK (defeats >= 0),
  season_level INTEGER NOT NULL DEFAULT 1 CHECK (season_level >= 1),
  season_xp INTEGER NOT NULL DEFAULT 0 CHECK (season_xp >= 0),
  claimed_season_rewards JSONB DEFAULT '[]'::jsonb,
  bio TEXT DEFAULT 'Piloto ativo na rede NEXA.',
  title TEXT DEFAULT 'Recruta Neon',
  is_first_access BOOLEAN DEFAULT TRUE,
  unlocked_slots INTEGER NOT NULL DEFAULT 3 CHECK (unlocked_slots >= 1),
  level_rewards_claimed JSONB DEFAULT '[1]'::jsonb,
  starter_pack_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_level_xp ON public.profiles(level DESC, experience DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_victories ON public.profiles(victories DESC);

-- ============================================================================
-- 2. TABELA DE CARTAS DOS JOGADORES (USER_CARDS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_cards (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_name TEXT NOT NULL,
  template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL,
  collection_id TEXT NOT NULL,
  collection_name TEXT NOT NULL,
  element TEXT NOT NULL,
  element_icon TEXT DEFAULT '⚡',
  image TEXT,
  description TEXT,
  state TEXT NOT NULL DEFAULT 'FREE' CHECK (state IN ('FREE', 'ACTIVE', 'EXHAUSTED')),
  card_status TEXT NOT NULL DEFAULT 'FREE',
  status TEXT NOT NULL DEFAULT 'IDLE' CHECK (status IN ('IDLE', 'EQUIPPED', 'LISTED', 'FROZEN', 'ACTIVE', 'EXHAUSTED')),
  synthesis_rate NUMERIC NOT NULL DEFAULT 0 CHECK (synthesis_rate >= 0),
  synthesis_cap NUMERIC NOT NULL DEFAULT 0 CHECK (synthesis_cap >= 0),
  accumulated_nex NUMERIC NOT NULL DEFAULT 0 CHECK (accumulated_nex >= 0),
  total_generated NUMERIC NOT NULL DEFAULT 0 CHECK (total_generated >= 0),
  market_value NUMERIC NOT NULL DEFAULT 0,
  tradeable BOOLEAN DEFAULT TRUE,
  synthesizable BOOLEAN DEFAULT TRUE,
  synthesized_at TIMESTAMP WITH TIME ZONE,
  last_accrual_at TIMESTAMP WITH TIME ZONE,
  exhausted_at TIMESTAMP WITH TIME ZONE,
  last_claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_cards_owner ON public.user_cards(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_state ON public.user_cards(owner_id, state);

-- ============================================================================
-- 3. TABELA DE CAIXAS DOS JOGADORES (USER_BOXES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_boxes (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  box_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'GAMEPLAY_DROP',
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_boxes_owner ON public.user_boxes(owner_id);

-- ============================================================================
-- 4. TABELA DE TRANSAÇÕES E LEDGER (TRANSACTIONS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('NEX', 'NXA')),
  amount NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id, created_at DESC);

-- ============================================================================
-- 5. TABELA DE ANÚNCIOS DO MERCADO (MARKETPLACE_LISTINGS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  seller_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_name TEXT NOT NULL,
  seller_avatar TEXT,
  price NUMERIC NOT NULL CHECK (price > 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SOLD', 'CANCELLED')),
  item_snapshot JSONB NOT NULL,
  buyer_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  sold_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_marketplace_status ON public.marketplace_listings(status, created_at DESC);

-- ============================================================================
-- 6. ITENS E PERSONAGENS DO INVENTÁRIO (USER_INVENTORY_ITEMS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_inventory_items (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('Character', 'Weapon', 'Armor', 'Accessory', 'Material')),
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_owner ON public.user_inventory_items(owner_id);

-- ============================================================================
-- ATIVAÇÃO DO ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory_items ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas se existirem
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Cards viewable by everyone" ON public.user_cards;
DROP POLICY IF EXISTS "Users can modify their own cards" ON public.user_cards;
DROP POLICY IF EXISTS "Users can insert own cards" ON public.user_cards;
DROP POLICY IF EXISTS "Users can update own cards" ON public.user_cards;
DROP POLICY IF EXISTS "Users can delete own cards" ON public.user_cards;
DROP POLICY IF EXISTS "Boxes viewable by owner" ON public.user_boxes;
DROP POLICY IF EXISTS "Boxes viewable by owner only" ON public.user_boxes;
DROP POLICY IF EXISTS "Users can modify boxes" ON public.user_boxes;
DROP POLICY IF EXISTS "Boxes inserted via authorized procedures" ON public.user_boxes;
DROP POLICY IF EXISTS "Boxes are immutable" ON public.user_boxes;
DROP POLICY IF EXISTS "Boxes deleted by owner or procedures" ON public.user_boxes;
DROP POLICY IF EXISTS "Transactions viewable" ON public.transactions;
DROP POLICY IF EXISTS "Transactions viewable by owner only" ON public.transactions;
DROP POLICY IF EXISTS "Transactions insertable" ON public.transactions;
DROP POLICY IF EXISTS "Transactions inserted via authorized procedures" ON public.transactions;
DROP POLICY IF EXISTS "Transactions are immutable" ON public.transactions;
DROP POLICY IF EXISTS "Transactions cannot be deleted" ON public.transactions;
DROP POLICY IF EXISTS "Listings viewable by everyone" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Listings viewable" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Users can manage listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Users can create own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Users can update own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Users can delete own listings" ON public.marketplace_listings;
DROP POLICY IF EXISTS "Inventory items viewable" ON public.user_inventory_items;
DROP POLICY IF EXISTS "Inventory items manageable" ON public.user_inventory_items;
DROP POLICY IF EXISTS "Users can insert own inventory items" ON public.user_inventory_items;
DROP POLICY IF EXISTS "Users can update own inventory items" ON public.user_inventory_items;
DROP POLICY IF EXISTS "Users can delete own inventory items" ON public.user_inventory_items;

-- ============================================================================
-- POLÍTICAS RLS ESTRITAS (HARDENED POLICIES)
-- ============================================================================

-- 1. PROFILES RLS
-- SELECT: Público (necessário para ranking global, social, leaderboard e exibição no marketplace)
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

-- INSERT: Apenas pelo próprio usuário autenticado (ou service role ou conta demo)
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid()::text = id) OR
    auth.role() = 'service_role' OR
    id = 'usr_demo'
  );

-- UPDATE: Usuário só pode alterar o PRÓPRIO perfil
CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = id) OR
    auth.role() = 'service_role' OR
    id = 'usr_demo'
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid()::text = id) OR
    auth.role() = 'service_role' OR
    id = 'usr_demo'
  );

-- 2. USER_CARDS RLS
-- SELECT: Público para inventários, marketplace e cartas equipadas
CREATE POLICY "Cards viewable by everyone" 
  ON public.user_cards FOR SELECT 
  USING (true);

-- INSERT: Usuário só pode inserir cartas associadas ao seu próprio ID
CREATE POLICY "Users can insert own cards" 
  ON public.user_cards FOR INSERT 
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid()::text = owner_id) OR
    auth.role() = 'service_role' OR
    owner_id = 'usr_demo'
  );

-- UPDATE: Usuário só pode atualizar suas próprias cartas
CREATE POLICY "Users can update own cards" 
  ON public.user_cards FOR UPDATE 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = owner_id) OR
    auth.role() = 'service_role' OR
    owner_id = 'usr_demo'
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid()::text = owner_id) OR
    auth.role() = 'service_role' OR
    owner_id = 'usr_demo'
  );

-- DELETE: Apenas o dono ou procedimentos autorizados
CREATE POLICY "Users can delete own cards" 
  ON public.user_cards FOR DELETE 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = owner_id) OR
    auth.role() = 'service_role' OR
    owner_id = 'usr_demo'
  );

-- 3. USER_BOXES RLS
-- SELECT: Usuário só pode ver as SUAS próprias caixas não abertas
CREATE POLICY "Boxes viewable by owner only" 
  ON public.user_boxes FOR SELECT 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = owner_id) OR
    auth.role() = 'service_role' OR
    owner_id = 'usr_demo'
  );

-- INSERT: Bloqueado diretamente para clientes! Apenas RPCs ou service_role podem mintar caixas
CREATE POLICY "Boxes inserted via authorized procedures" 
  ON public.user_boxes FOR INSERT 
  WITH CHECK (
    auth.role() = 'service_role' OR
    (auth.uid() IS NULL AND owner_id = 'usr_demo')
  );

-- UPDATE: Caixas são itens imutáveis
CREATE POLICY "Boxes are immutable" 
  ON public.user_boxes FOR UPDATE 
  USING (false);

-- DELETE: Somente o dono ou o processo atômico de abertura
CREATE POLICY "Boxes deleted by owner or procedures" 
  ON public.user_boxes FOR DELETE 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = owner_id) OR
    auth.role() = 'service_role' OR
    owner_id = 'usr_demo'
  );

-- 4. TRANSACTIONS RLS (LEDGER)
-- SELECT: Cada usuário só pode consultar seu próprio extrato
CREATE POLICY "Transactions viewable by owner only" 
  ON public.transactions FOR SELECT 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = user_id) OR
    auth.role() = 'service_role' OR
    user_id = 'usr_demo'
  );

-- INSERT: Bloqueado diretamente para clientes! Apenas RPCs / service_role podem emitir transações
CREATE POLICY "Transactions inserted via authorized procedures" 
  ON public.transactions FOR INSERT 
  WITH CHECK (
    auth.role() = 'service_role' OR
    (auth.uid() IS NULL AND user_id = 'usr_demo')
  );

-- UPDATE & DELETE: Imutabilidade total do livro-razão
CREATE POLICY "Transactions are immutable" 
  ON public.transactions FOR UPDATE 
  USING (false);

CREATE POLICY "Transactions cannot be deleted" 
  ON public.transactions FOR DELETE 
  USING (false);

-- 5. MARKETPLACE_LISTINGS RLS
-- SELECT: Anúncios ativos visíveis para todos; concluídos/cancelados para o vendedor ou comprador
CREATE POLICY "Listings viewable" 
  ON public.marketplace_listings FOR SELECT 
  USING (
    status = 'ACTIVE' OR
    (auth.uid() IS NOT NULL AND auth.uid()::text = seller_id) OR
    (auth.uid() IS NOT NULL AND auth.uid()::text = buyer_id) OR
    auth.role() = 'service_role' OR
    seller_id = 'usr_demo'
  );

-- INSERT: Usuário só pode criar anúncio para si mesmo com preço positivo
CREATE POLICY "Users can create own listings" 
  ON public.marketplace_listings FOR INSERT 
  WITH CHECK (
    ((auth.uid() IS NOT NULL AND auth.uid()::text = seller_id) OR auth.role() = 'service_role' OR seller_id = 'usr_demo') AND
    price > 0 AND
    status = 'ACTIVE'
  );

-- UPDATE: Vendedor só pode alterar/cancelar seu próprio anúncio
CREATE POLICY "Users can update own listings" 
  ON public.marketplace_listings FOR UPDATE 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = seller_id) OR
    auth.role() = 'service_role' OR
    seller_id = 'usr_demo'
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid()::text = seller_id) OR
    auth.role() = 'service_role' OR
    seller_id = 'usr_demo'
  );

-- DELETE: Vendedor pode remover seu próprio anúncio
CREATE POLICY "Users can delete own listings" 
  ON public.marketplace_listings FOR DELETE 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = seller_id) OR
    auth.role() = 'service_role' OR
    seller_id = 'usr_demo'
  );

-- 6. USER_INVENTORY_ITEMS RLS
CREATE POLICY "Inventory items viewable" 
  ON public.user_inventory_items FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert own inventory items" 
  ON public.user_inventory_items FOR INSERT 
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid()::text = owner_id) OR
    auth.role() = 'service_role' OR
    owner_id = 'usr_demo'
  );

CREATE POLICY "Users can update own inventory items" 
  ON public.user_inventory_items FOR UPDATE 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = owner_id) OR
    auth.role() = 'service_role' OR
    owner_id = 'usr_demo'
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid()::text = owner_id) OR
    auth.role() = 'service_role' OR
    owner_id = 'usr_demo'
  );

CREATE POLICY "Users can delete own inventory items" 
  ON public.user_inventory_items FOR DELETE 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid()::text = owner_id) OR
    auth.role() = 'service_role' OR
    owner_id = 'usr_demo'
  );

-- ============================================================================
-- TRIGGERS DE INTEGRIDADE CONTRA ADULTERAÇÃO DIRETA VIA CLIENTE
-- ============================================================================

-- 1. Trigger de proteção econômica em PROFILES
-- Impede que o frontend faça UPDATE direto de saldos, experiência, nível ou estatísticas
CREATE OR REPLACE FUNCTION protect_profile_economic_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o comando partiu diretamente do cliente autenticado/anônimo e não de uma função interna RPC
  IF (current_user = 'authenticated' OR current_user = 'anon') AND pg_trigger_depth() = 1 THEN
    IF NEW.balance_nex IS DISTINCT FROM OLD.balance_nex OR
       NEW.balance_nxa IS DISTINCT FROM OLD.balance_nxa OR
       NEW.experience IS DISTINCT FROM OLD.experience OR
       NEW.level IS DISTINCT FROM OLD.level OR
       NEW.victories IS DISTINCT FROM OLD.victories OR
       NEW.defeats IS DISTINCT FROM OLD.defeats OR
       NEW.unlocked_slots IS DISTINCT FROM OLD.unlocked_slots OR
       NEW.id IS DISTINCT FROM OLD.id OR
       NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Acesso negado: Atualização direta de saldo econômico, nível ou estatísticas não é permitida pelo cliente. Utilize as funções atômicas autorizadas do NEXA.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_profile_economic_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_economic_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_economic_columns();

-- 2. Trigger de proteção em USER_CARDS
-- Impede alteração direta de proprietário, síntese e rendimentos pelo cliente
CREATE OR REPLACE FUNCTION protect_user_cards_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF (current_user = 'authenticated' OR current_user = 'anon') AND pg_trigger_depth() = 1 THEN
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id OR
       NEW.state IS DISTINCT FROM OLD.state OR
       NEW.accumulated_nex IS DISTINCT FROM OLD.accumulated_nex OR
       NEW.total_generated IS DISTINCT FROM OLD.total_generated OR
       NEW.synthesis_rate IS DISTINCT FROM OLD.synthesis_rate OR
       NEW.synthesis_cap IS DISTINCT FROM OLD.synthesis_cap OR
       NEW.synthesizable IS DISTINCT FROM OLD.synthesizable THEN
      RAISE EXCEPTION 'Acesso negado: Mutação direta de campos protegidos de cartas (propriedade, estado, síntese) não é permitida pelo cliente.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_user_cards_integrity ON public.user_cards;
CREATE TRIGGER trg_protect_user_cards_integrity
  BEFORE UPDATE ON public.user_cards
  FOR EACH ROW
  EXECUTE FUNCTION protect_user_cards_integrity();

-- 3. Trigger de proteção em USER_INVENTORY_ITEMS
CREATE OR REPLACE FUNCTION protect_user_inventory_items_integrity()
RETURNS TRIGGER AS $$
BEGIN
  IF (current_user = 'authenticated' OR current_user = 'anon') AND pg_trigger_depth() = 1 THEN
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
      RAISE EXCEPTION 'Acesso negado: Não é permitido transferir propriedade de itens diretamente via client.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_user_inventory_items_integrity ON public.user_inventory_items;
CREATE TRIGGER trg_protect_user_inventory_items_integrity
  BEFORE UPDATE ON public.user_inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION protect_user_inventory_items_integrity();

-- ============================================================================
-- VÍNCULO AUTOMÁTICO AUTH.USERS ↔ PUBLIC.PROFILES
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    email,
    avatar,
    balance_nex,
    balance_nxa,
    level,
    experience,
    unlocked_slots
  ) VALUES (
    NEW.id::text,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80'),
    1000,
    100,
    1,
    0,
    3
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- FUNÇÕES POSTGRESQL ATÔMICAS PARA PROTEÇÃO ECONÔMICA (RPC - SECURITY DEFINER)
-- ============================================================================
-- TODAS as funções abaixo exigem autenticação real estrita via auth.uid().
-- Não é permitido fallback para p_user_id ou execução por usuários anônimos.
-- O usuário efetivo é sempre auth.uid()::text. Divergências rejeitam a chamada.
-- ============================================================================

-- 1. COMPRA ATÔMICA DE CAIXA (PURCHASE_BOX_ATOMIC)
CREATE OR REPLACE FUNCTION purchase_box_atomic(
  p_user_id TEXT,
  p_box_id TEXT,
  p_box_type TEXT,
  p_box_name TEXT,
  p_cost_nex NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_effective_user_id TEXT;
  v_auth_uid TEXT;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_user_name TEXT;
  v_real_box_id TEXT;
BEGIN
  -- 1. Validação estrita de autenticação real via auth.uid()
  v_auth_uid := auth.uid()::text;
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado: operação requer sessão ativa via auth.uid().');
  END IF;

  -- Validação de correspondência entre auth.uid() e p_user_id
  IF p_user_id IS NOT NULL AND p_user_id <> '' AND p_user_id <> v_auth_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado: identificação inválida ou divergente da sessão autenticada.');
  END IF;

  -- O usuário efetivo é estritamente o usuário autenticado
  v_effective_user_id := v_auth_uid;

  -- Validação de custo
  IF p_cost_nex <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Preço da caixa inválido.');
  END IF;

  -- Bloqueio pessimista de linha (FOR UPDATE) para eliminar race conditions
  SELECT balance_nex, username INTO v_current_balance, v_user_name 
  FROM public.profiles 
  WHERE id = v_effective_user_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil de usuário não encontrado.');
  END IF;

  IF v_current_balance < p_cost_nex THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente de NEX para esta caixa.');
  END IF;

  v_new_balance := v_current_balance - p_cost_nex;

  -- Atualiza saldo
  UPDATE public.profiles 
  SET balance_nex = v_new_balance, updated_at = now() 
  WHERE id = v_effective_user_id;

  v_real_box_id := COALESCE(p_box_id, 'box_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 6));

  -- Adiciona a caixa no inventário do usuário
  INSERT INTO public.user_boxes (id, owner_id, box_type, name, source)
  VALUES (v_real_box_id, v_effective_user_id, p_box_type, p_box_name, 'SHOP_PURCHASE');

  -- Registra no livro-razão imutável
  INSERT INTO public.transactions (id, user_id, user_name, currency, amount, balance_after, type, description, metadata)
  VALUES (
    'tx_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 6),
    v_effective_user_id,
    v_user_name,
    'NEX',
    -p_cost_nex,
    v_new_balance,
    'BOX_PURCHASE',
    'Compra de Caixa: ' || p_box_name,
    jsonb_build_object('boxId', v_real_box_id, 'boxType', p_box_type)
  );

  RETURN jsonb_build_object(
    'success', true, 
    'new_balance', v_new_balance, 
    'box_id', v_real_box_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. CONSUMO ATÔMICO DE CAIXA (OPEN_BOX_ATOMIC)
CREATE OR REPLACE FUNCTION open_box_atomic(
  p_user_id TEXT,
  p_box_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_effective_user_id TEXT;
  v_auth_uid TEXT;
  v_box_type TEXT;
  v_box_name TEXT;
BEGIN
  -- 1. Validação estrita de autenticação real via auth.uid()
  v_auth_uid := auth.uid()::text;
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado: operação requer sessão ativa via auth.uid().');
  END IF;

  IF p_user_id IS NOT NULL AND p_user_id <> '' AND p_user_id <> v_auth_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado: identificação inválida ou divergente da sessão autenticada.');
  END IF;

  v_effective_user_id := v_auth_uid;

  -- Consumo atômico: DELETE com verificação estrita de proprietário
  DELETE FROM public.user_boxes 
  WHERE id = p_box_id AND owner_id = v_effective_user_id
  RETURNING box_type, name INTO v_box_type, v_box_name;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Caixa não encontrada no inventário do usuário ou já consumida.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'box_type', v_box_type,
    'box_name', v_box_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. SAQUE ATÔMICO DE SÍNTESE E QUEIMA DA CARTA (CLAIM_SYNTHESIS_AND_BURN_ATOMIC)
CREATE OR REPLACE FUNCTION claim_synthesis_and_burn_atomic(
  p_user_id TEXT,
  p_card_id TEXT,
  p_nex_reward NUMERIC DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_effective_user_id TEXT;
  v_auth_uid TEXT;
  v_card RECORD;
  v_new_balance NUMERIC;
  v_user_name TEXT;
  v_last_accrual TIMESTAMP WITH TIME ZONE;
  v_elapsed_seconds NUMERIC;
  v_elapsed_hours NUMERIC;
  v_accrued_nex NUMERIC;
  v_calculated_reward NUMERIC;
BEGIN
  -- 1. Validação estrita de autenticação real via auth.uid()
  v_auth_uid := auth.uid()::text;
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado: operação requer sessão ativa via auth.uid().');
  END IF;

  IF p_user_id IS NOT NULL AND p_user_id <> '' AND p_user_id <> v_auth_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado: identificação inválida ou divergente da sessão autenticada.');
  END IF;

  v_effective_user_id := v_auth_uid;

  -- 1. Bloqueia a carta com FOR UPDATE e valida a posse
  SELECT * INTO v_card 
  FROM public.user_cards 
  WHERE id = p_card_id AND owner_id = v_effective_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Carta não encontrada no inventário do usuário.');
  END IF;

  -- 2. Valida estado da carta
  IF v_card.state = 'FREE' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apenas cartas em síntese ativa ou esgotadas podem realizar saques.');
  END IF;

  -- 3. CÁLCULO AUTORITATIVO NO SERVIDOR (Não confia no p_nex_reward do cliente!)
  v_last_accrual := COALESCE(v_card.last_accrual_at, v_card.synthesized_at, v_card.created_at);
  v_elapsed_seconds := GREATEST(0, EXTRACT(EPOCH FROM (now() - v_last_accrual)));
  v_elapsed_hours := v_elapsed_seconds / 3600.0;
  v_accrued_nex := v_elapsed_hours * v_card.synthesis_rate;

  -- Recompensa total calculada pelo banco e estritamente limitada ao synthesis_cap
  v_calculated_reward := LEAST(v_card.synthesis_cap, v_card.accumulated_nex + v_accrued_nex);

  IF v_calculated_reward <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nenhum rendimento de NEX acumulado para saque.');
  END IF;

  -- 4. Bloqueia perfil do usuário
  SELECT username, balance_nex INTO v_user_name, v_new_balance 
  FROM public.profiles 
  WHERE id = v_effective_user_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil de usuário não encontrado.');
  END IF;

  v_new_balance := v_new_balance + v_calculated_reward;

  -- 5. Atualiza saldo de forma atômica
  UPDATE public.profiles 
  SET balance_nex = v_new_balance, updated_at = now() 
  WHERE id = v_effective_user_id;

  -- 6. REGRA CRÍTICA: "SACAR = DESTRUIR A CARTA" (Queima permanente da carta)
  DELETE FROM public.user_cards WHERE id = p_card_id;

  -- 7. Registra transações no livro-razão
  INSERT INTO public.transactions (id, user_id, user_name, currency, amount, balance_after, type, description, metadata)
  VALUES (
    'tx_' || extract(epoch from now())::bigint || '_synth',
    v_effective_user_id,
    v_user_name,
    'NEX',
    v_calculated_reward,
    v_new_balance,
    'SYNTHESIS_REWARD',
    'Rendimento de síntese resgatado: ' || v_card.name,
    jsonb_build_object('cardId', p_card_id, 'reward', v_calculated_reward)
  );

  INSERT INTO public.transactions (id, user_id, user_name, currency, amount, balance_after, type, description, metadata)
  VALUES (
    'tx_' || extract(epoch from now())::bigint || '_burn',
    v_effective_user_id,
    v_user_name,
    'NEX',
    0,
    v_new_balance,
    'CARD_BURNED',
    'Carta destruída permanentemente após o saque de síntese: ' || v_card.name,
    jsonb_build_object('cardId', p_card_id, 'reason', 'SYNTHESIS_WITHDRAWAL')
  );

  RETURN jsonb_build_object(
    'success', true, 
    'new_balance', v_new_balance,
    'claimed_nex', v_calculated_reward,
    'card_name', v_card.name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. INÍCIO ATÔMICO DE SÍNTESE (START_SYNTHESIS_ATOMIC)
CREATE OR REPLACE FUNCTION start_synthesis_atomic(
  p_user_id TEXT,
  p_card_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_effective_user_id TEXT;
  v_auth_uid TEXT;
  v_card RECORD;
  v_unlocked_slots INTEGER;
  v_active_count INTEGER;
BEGIN
  -- 1. Validação estrita de autenticação real via auth.uid()
  v_auth_uid := auth.uid()::text;
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado: operação requer sessão ativa via auth.uid().');
  END IF;

  IF p_user_id IS NOT NULL AND p_user_id <> '' AND p_user_id <> v_auth_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado: identificação inválida ou divergente da sessão autenticada.');
  END IF;

  v_effective_user_id := v_auth_uid;

  -- 1. Bloqueia carta e valida posse
  SELECT * INTO v_card 
  FROM public.user_cards 
  WHERE id = p_card_id AND owner_id = v_effective_user_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Carta não encontrada no inventário.');
  END IF;

  IF v_card.state <> 'FREE' OR v_card.status = 'LISTED' OR v_card.status = 'FROZEN' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Esta carta não está livre para síntese.');
  END IF;

  -- 2. Valida limite de slots do piloto
  SELECT unlocked_slots INTO v_unlocked_slots 
  FROM public.profiles 
  WHERE id = v_effective_user_id;

  SELECT count(*) INTO v_active_count 
  FROM public.user_cards 
  WHERE owner_id = v_effective_user_id AND state = 'ACTIVE';

  IF v_active_count >= COALESCE(v_unlocked_slots, 3) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Capacidade de slots atingida. Suba de nível para desbloquear mais slots.');
  END IF;

  -- 3. Atualiza carta para síntese ativa
  UPDATE public.user_cards 
  SET state = 'ACTIVE',
      card_status = 'ACTIVE',
      status = 'ACTIVE',
      accumulated_nex = 0,
      synthesized_at = now(),
      last_accrual_at = now(),
      exhausted_at = null,
      tradeable = false,
      synthesizable = false,
      updated_at = now()
  WHERE id = p_card_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. COMPRA P2P ATÔMICA NO MARKETPLACE (BUY_MARKETPLACE_LISTING_ATOMIC)
CREATE OR REPLACE FUNCTION buy_marketplace_listing_atomic(
  p_listing_id TEXT,
  p_buyer_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_effective_buyer_id TEXT;
  v_auth_uid TEXT;
  v_listing RECORD;
  v_buyer RECORD;
  v_seller RECORD;
  v_fee NUMERIC;
  v_seller_gain NUMERIC;
  v_buyer_new_balance NUMERIC;
  v_seller_new_balance NUMERIC;
BEGIN
  -- 1. Validação estrita de autenticação real via auth.uid()
  v_auth_uid := auth.uid()::text;
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado: operação requer sessão ativa via auth.uid().');
  END IF;

  IF p_buyer_id IS NOT NULL AND p_buyer_id <> '' AND p_buyer_id <> v_auth_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado: comprador não corresponde à sessão autenticada.');
  END IF;

  v_effective_buyer_id := v_auth_uid;

  -- 1. Bloqueia o anúncio com FOR UPDATE
  SELECT * INTO v_listing 
  FROM public.marketplace_listings 
  WHERE id = p_listing_id AND status = 'ACTIVE' 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Anúncio não encontrado ou item já adquirido por outro jogador.');
  END IF;

  IF v_listing.seller_id = v_effective_buyer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você não pode comprar seu próprio anúncio.');
  END IF;

  -- 2. Bloqueia comprador com FOR UPDATE
  SELECT * INTO v_buyer 
  FROM public.profiles 
  WHERE id = v_effective_buyer_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil do comprador não encontrado.');
  END IF;

  IF v_buyer.balance_nxa < v_listing.price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente de NXA.');
  END IF;

  -- 3. Bloqueia vendedor com FOR UPDATE
  SELECT * INTO v_seller 
  FROM public.profiles 
  WHERE id = v_listing.seller_id 
  FOR UPDATE;

  -- 4. Cálculo financeiro (Taxa de 2%)
  v_fee := round(v_listing.price * 0.02, 2);
  v_seller_gain := v_listing.price - v_fee;

  v_buyer_new_balance := v_buyer.balance_nxa - v_listing.price;
  v_seller_new_balance := COALESCE(v_seller.balance_nxa, 0) + v_seller_gain;

  -- Atualiza saldo do comprador
  UPDATE public.profiles 
  SET balance_nxa = v_buyer_new_balance, updated_at = now() 
  WHERE id = v_effective_buyer_id;

  -- Atualiza saldo do vendedor (se cadastrado no profiles)
  IF v_seller.id IS NOT NULL THEN
    UPDATE public.profiles 
    SET balance_nxa = v_seller_new_balance, updated_at = now() 
    WHERE id = v_listing.seller_id;
  END IF;

  -- 5. Atualiza anúncio para SOLD
  UPDATE public.marketplace_listings 
  SET status = 'SOLD',
      buyer_id = v_effective_buyer_id,
      sold_at = now() 
  WHERE id = p_listing_id;

  -- 6. Transfere a titularidade do item
  UPDATE public.user_cards 
  SET owner_id = v_effective_buyer_id,
      owner_name = v_buyer.username,
      status = 'IDLE',
      updated_at = now() 
  WHERE id = v_listing.item_id;

  UPDATE public.user_inventory_items 
  SET owner_id = v_effective_buyer_id,
      owner_name = v_buyer.username,
      updated_at = now() 
  WHERE id = v_listing.item_id;

  -- 7. Registra transações no livro-razão
  INSERT INTO public.transactions (id, user_id, user_name, currency, amount, balance_after, type, description)
  VALUES (
    'tx_' || extract(epoch from now())::bigint || '_buy',
    v_effective_buyer_id,
    v_buyer.username,
    'NXA',
    -v_listing.price,
    v_buyer_new_balance,
    'MARKET_BUY',
    'Compra de item no Marketplace: ' || (v_listing.item_snapshot->>'name')
  );

  IF v_seller.id IS NOT NULL THEN
    INSERT INTO public.transactions (id, user_id, user_name, currency, amount, balance_after, type, description)
    VALUES (
      'tx_' || extract(epoch from now())::bigint || '_sale',
      v_seller.id,
      v_seller.username,
      'NXA',
      v_seller_gain,
      v_seller_new_balance,
      'MARKET_SALE',
      'Venda de item no Marketplace: ' || (v_listing.item_snapshot->>'name')
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'buyer_balance_nxa', v_buyer_new_balance,
    'seller_gain_nxa', v_seller_gain,
    'fee_nxa', v_fee
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RECOMPENSA ATÔMICA DE BATALHA (APPLY_BATTLE_REWARD_ATOMIC)
CREATE OR REPLACE FUNCTION apply_battle_reward_atomic(
  p_user_id TEXT,
  p_victory BOOLEAN,
  p_nex_gained NUMERIC,
  p_nxa_gained NUMERIC,
  p_xp_gained NUMERIC
) RETURNS JSONB AS $$
DECLARE
  v_effective_user_id TEXT;
  v_auth_uid TEXT;
  v_user RECORD;
  v_new_nex NUMERIC;
  v_new_nxa NUMERIC;
  v_new_xp NUMERIC;
  v_new_level INTEGER;
  v_max_xp NUMERIC;
  v_leveled_up BOOLEAN := false;
BEGIN
  -- 1. Validação estrita de autenticação real via auth.uid()
  v_auth_uid := auth.uid()::text;
  IF v_auth_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autenticado: operação requer sessão ativa via auth.uid().');
  END IF;

  IF p_user_id IS NOT NULL AND p_user_id <> '' AND p_user_id <> v_auth_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado: identificação inválida ou divergente da sessão autenticada.');
  END IF;

  v_effective_user_id := v_auth_uid;

  -- Bloqueia perfil do usuário
  SELECT * INTO v_user 
  FROM public.profiles 
  WHERE id = v_effective_user_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Perfil do usuário não encontrado.');
  END IF;

  v_new_nex := v_user.balance_nex + GREATEST(0, p_nex_gained);
  v_new_nxa := v_user.balance_nxa + GREATEST(0, p_nxa_gained);
  v_new_xp := v_user.experience + GREATEST(0, p_xp_gained);
  v_new_level := v_user.level;
  v_max_xp := v_user.max_experience;

  -- Checa progressão de nível
  IF v_new_xp >= v_max_xp THEN
    v_leveled_up := true;
    v_new_level := v_new_level + 1;
    v_new_xp := v_new_xp - v_max_xp;
    v_max_xp := round(v_max_xp * 1.35);
  END IF;

  UPDATE public.profiles 
  SET balance_nex = v_new_nex,
      balance_nxa = v_new_nxa,
      experience = v_new_xp,
      max_experience = v_max_xp,
      level = v_new_level,
      victories = CASE WHEN p_victory THEN v_user.victories + 1 ELSE v_user.victories END,
      defeats = CASE WHEN NOT p_victory THEN v_user.defeats + 1 ELSE v_user.defeats END,
      updated_at = now()
  WHERE id = v_effective_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'balance_nex', v_new_nex,
    'balance_nxa', v_new_nxa,
    'level', v_new_level,
    'experience', v_new_xp,
    'leveled_up', v_leveled_up
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. CONTROLE RIGOROSO DE PERMISSÕES DE EXECUÇÃO (EXECUTE PRIVILEGES)
-- ============================================================================
-- Apenas usuários autenticados (e service_role) podem invocar as RPCs econômicas.
-- Qualquer acesso anônimo ou público não autenticado é terminantemente revogado.

REVOKE EXECUTE ON FUNCTION purchase_box_atomic(TEXT, TEXT, TEXT, TEXT, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION purchase_box_atomic(TEXT, TEXT, TEXT, TEXT, NUMERIC) FROM anon;
GRANT EXECUTE ON FUNCTION purchase_box_atomic(TEXT, TEXT, TEXT, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION purchase_box_atomic(TEXT, TEXT, TEXT, TEXT, NUMERIC) TO service_role;

REVOKE EXECUTE ON FUNCTION open_box_atomic(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION open_box_atomic(TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION open_box_atomic(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION open_box_atomic(TEXT, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION claim_synthesis_and_burn_atomic(TEXT, TEXT, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION claim_synthesis_and_burn_atomic(TEXT, TEXT, NUMERIC) FROM anon;
GRANT EXECUTE ON FUNCTION claim_synthesis_and_burn_atomic(TEXT, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_synthesis_and_burn_atomic(TEXT, TEXT, NUMERIC) TO service_role;

REVOKE EXECUTE ON FUNCTION start_synthesis_atomic(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION start_synthesis_atomic(TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION start_synthesis_atomic(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION start_synthesis_atomic(TEXT, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION buy_marketplace_listing_atomic(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION buy_marketplace_listing_atomic(TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION buy_marketplace_listing_atomic(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION buy_marketplace_listing_atomic(TEXT, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION apply_battle_reward_atomic(TEXT, BOOLEAN, NUMERIC, NUMERIC, NUMERIC) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION apply_battle_reward_atomic(TEXT, BOOLEAN, NUMERIC, NUMERIC, NUMERIC) FROM anon;
GRANT EXECUTE ON FUNCTION apply_battle_reward_atomic(TEXT, BOOLEAN, NUMERIC, NUMERIC, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION apply_battle_reward_atomic(TEXT, BOOLEAN, NUMERIC, NUMERIC, NUMERIC) TO service_role;
