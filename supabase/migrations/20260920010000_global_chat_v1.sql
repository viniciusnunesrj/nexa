-- SETOR 13 — CHAT GLOBAL V1
-- Chat persistente para jogadores autenticados.
-- Identidade do autor sempre obtida pelo servidor.

BEGIN;

CREATE TABLE public.global_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  username text NOT NULL,
  avatar text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT global_chat_message_length
    CHECK (char_length(message) BETWEEN 1 AND 300)
);

CREATE INDEX global_chat_messages_created_at_idx
  ON public.global_chat_messages (created_at DESC);

CREATE INDEX global_chat_messages_user_created_idx
  ON public.global_chat_messages (user_id, created_at DESC);

ALTER TABLE public.global_chat_messages ENABLE ROW LEVEL SECURITY;

-- Nenhuma escrita direta pelo navegador.
REVOKE ALL ON TABLE public.global_chat_messages FROM PUBLIC;
REVOKE ALL ON TABLE public.global_chat_messages FROM anon;
REVOKE ALL ON TABLE public.global_chat_messages FROM authenticated;

-- Leitura somente para jogadores autenticados.
GRANT SELECT ON TABLE public.global_chat_messages TO authenticated;

CREATE POLICY global_chat_authenticated_read
ON public.global_chat_messages
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);


CREATE OR REPLACE FUNCTION public.send_global_chat_message_v1(
  p_message text
)
RETURNS public.global_chat_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid text;
  v_username text;
  v_avatar text;
  v_message text;
  v_last_message timestamptz;
  v_result public.global_chat_messages;
BEGIN
  v_uid := auth.uid()::text;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  v_message := btrim(COALESCE(p_message, ''));

  IF char_length(v_message) < 1 THEN
    RAISE EXCEPTION 'Mensagem vazia';
  END IF;

  IF char_length(v_message) > 300 THEN
    RAISE EXCEPTION 'Mensagem deve ter no máximo 300 caracteres';
  END IF;

  -- Username/avatar vêm do perfil oficial.
  SELECT p.username, p.avatar
  INTO v_username, v_avatar
  FROM public.profiles p
  WHERE p.id = v_uid;

  IF v_username IS NULL THEN
    RAISE EXCEPTION 'Perfil não encontrado';
  END IF;

  -- Anti-spam básico: no máximo uma mensagem a cada 2 segundos.
  SELECT m.created_at
  INTO v_last_message
  FROM public.global_chat_messages m
  WHERE m.user_id = v_uid
  ORDER BY m.created_at DESC
  LIMIT 1;

  IF v_last_message IS NOT NULL
     AND v_last_message > clock_timestamp() - interval '2 seconds' THEN
    RAISE EXCEPTION 'Aguarde um momento antes de enviar outra mensagem';
  END IF;

  INSERT INTO public.global_chat_messages (
    user_id,
    username,
    avatar,
    message
  )
  VALUES (
    v_uid,
    v_username,
    v_avatar,
    v_message
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;


CREATE OR REPLACE FUNCTION public.fetch_global_chat_messages_v1(
  p_limit integer DEFAULT 100
)
RETURNS SETOF public.global_chat_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_limit integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  v_limit := LEAST(GREATEST(COALESCE(p_limit, 100), 1), 100);

  RETURN QUERY
  SELECT m.*
  FROM public.global_chat_messages m
  ORDER BY m.created_at DESC
  LIMIT v_limit;
END;
$$;


REVOKE ALL ON FUNCTION public.send_global_chat_message_v1(text)
  FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.fetch_global_chat_messages_v1(integer)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.send_global_chat_message_v1(text)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.fetch_global_chat_messages_v1(integer)
  TO authenticated;

COMMIT;