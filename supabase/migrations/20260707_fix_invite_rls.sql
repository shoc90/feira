-- ═══════════════════════════════════════════════════════════════════
-- FIX DE SEGURANÇA — RLS de convites e membros (2026-07-07)
--
-- Fecha 3 vulnerabilidades críticas:
--   1. list_members INSERT permitia self-insert como qualquer role
--      (usuário logado virava "owner" de qualquer lista).
--   2. list_invites SELECT expunha TODOS os convites via
--      "OR (token IS NOT NULL)" — colheita de tokens.
--   3. list_invites UPDATE era USING(true) WITH CHECK(true) — qualquer
--      um editava qualquer convite.
--
-- A aceitação de convite passa a ser feita por funções SECURITY DEFINER
-- que validam token/expiração no servidor. O cliente não insere mais em
-- list_members diretamente nem lê a tabela de convites por token.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────
-- 1. list_members INSERT — remove o self-insert arbitrário.
-- Criação de membro passa a ocorrer apenas via:
--   • trigger handle_new_list (owner na criação da lista) — SECURITY DEFINER
--   • RPCs de convite abaixo — SECURITY DEFINER
-- Owners ainda podem adicionar membros diretamente (ex: gestão manual).
-- ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS list_members_insert ON public.list_members;
CREATE POLICY list_members_insert ON public.list_members
  FOR INSERT TO authenticated
  WITH CHECK (has_list_role(list_id, (SELECT auth.uid()), ARRAY['owner'::text]));

-- ─────────────────────────────────────────────────────────────────────
-- 2. list_invites SELECT — remove o vazamento por token.
-- Só veem convites: membros da lista (gestão) ou o próprio convidado
-- (match por email). A leitura por token do link é feita pela RPC
-- get_invite_by_token (definer), que não expõe a tabela inteira.
-- ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS list_invites_select ON public.list_invites;
CREATE POLICY list_invites_select ON public.list_invites
  FOR SELECT TO authenticated
  USING (
    is_list_member(list_id, (SELECT auth.uid()))
    OR email = (SELECT auth.email())
  );

-- ─────────────────────────────────────────────────────────────────────
-- 3. list_invites UPDATE — remove a política always-true.
-- Marcar como aceito é responsabilidade das RPCs (definer). Reversão de
-- estado por parte de terceiros deixa de ser possível.
-- ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS list_invites_update ON public.list_invites;
-- (nenhuma política de UPDATE para authenticated — bloqueado por padrão)

-- ─────────────────────────────────────────────────────────────────────
-- RPC: get_invite_by_token — preview seguro do convite pelo link.
-- Retorna só o necessário para a tela de aceite, sem expor a tabela.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token text)
RETURNS TABLE (list_id uuid, list_name text, list_icon text, role text, status text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inv public.list_invites%ROWTYPE;
  l   public.lists%ROWTYPE;
BEGIN
  SELECT * INTO inv FROM public.list_invites WHERE token = _token;
  IF inv.id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::text, 'not_found'::text;
    RETURN;
  END IF;
  IF inv.accepted_at IS NOT NULL THEN
    RETURN QUERY SELECT inv.list_id, NULL::text, NULL::text, inv.role, 'accepted'::text;
    RETURN;
  END IF;
  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    RETURN QUERY SELECT inv.list_id, NULL::text, NULL::text, inv.role, 'expired'::text;
    RETURN;
  END IF;
  SELECT * INTO l FROM public.lists WHERE id = inv.list_id;
  RETURN QUERY SELECT inv.list_id, l.name, l.icon, inv.role, 'ok'::text;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- RPC: accept_invite — aceita um convite por token, com validação
-- server-side. Idempotente: se já é membro, apenas confirma.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_invite(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inv public.list_invites%ROWTYPE;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO inv FROM public.list_invites WHERE token = _token FOR UPDATE;
  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'invite_not_found';
  END IF;
  IF inv.accepted_at IS NOT NULL AND inv.accepted_by IS DISTINCT FROM uid THEN
    RAISE EXCEPTION 'invite_already_used';
  END IF;
  IF inv.expires_at IS NOT NULL AND inv.expires_at < now() THEN
    RAISE EXCEPTION 'invite_expired';
  END IF;

  INSERT INTO public.list_members (list_id, user_id, role, invited_by)
  VALUES (inv.list_id, uid, inv.role, inv.invited_by)
  ON CONFLICT (list_id, user_id) DO NOTHING;

  UPDATE public.list_invites
  SET accepted_at = now(), accepted_by = uid
  WHERE id = inv.id AND accepted_at IS NULL;

  RETURN inv.list_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- RPC: accept_pending_email_invites — aceita todos os convites pendentes
-- endereçados ao email do usuário logado (fluxo pós-cadastro).
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.accept_pending_email_invites()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid   uuid := auth.uid();
  mail  text := auth.email();
  inv   public.list_invites%ROWTYPE;
  cnt   integer := 0;
BEGIN
  IF uid IS NULL OR mail IS NULL THEN
    RETURN 0;
  END IF;

  FOR inv IN
    SELECT * FROM public.list_invites
    WHERE lower(email) = lower(mail)
      AND accepted_at IS NULL
      AND (expires_at IS NULL OR expires_at >= now())
    FOR UPDATE
  LOOP
    INSERT INTO public.list_members (list_id, user_id, role, invited_by)
    VALUES (inv.list_id, uid, inv.role, inv.invited_by)
    ON CONFLICT (list_id, user_id) DO NOTHING;

    UPDATE public.list_invites
    SET accepted_at = now(), accepted_by = uid
    WHERE id = inv.id;

    cnt := cnt + 1;
  END LOOP;

  RETURN cnt;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- Permissões: as RPCs de convite são para usuários logados.
-- ─────────────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.get_invite_by_token(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_invite(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_pending_email_invites() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_pending_email_invites() TO authenticated;
