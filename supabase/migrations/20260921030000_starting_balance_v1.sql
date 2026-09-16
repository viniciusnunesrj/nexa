BEGIN;

-- NEXA Economy V1
-- Novas contas continuam recebendo 1.000 NEX para adquirir
-- a primeira Caixa Básica.
-- NXA passa a ser obtido através da economia do jogo.
ALTER TABLE public.profiles
  ALTER COLUMN balance_nex SET DEFAULT 1000,
  ALTER COLUMN balance_nxa SET DEFAULT 0;

COMMIT;