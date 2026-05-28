-- API pública para parceiros: chaves (hash bcrypt-like via crypt), escopo
-- granular e rate-limit configurável por chave.

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  /** Owner do token (médico, clínica ou parceiro). */
  owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  /** Identificador legível ("Sistema X — produção"). */
  label text NOT NULL,
  /** Prefixo público (8 chars) usado para identificar a chave em logs sem expor o secret. */
  prefix text NOT NULL UNIQUE,
  /** Hash do secret completo (bcrypt via pgcrypto). */
  secret_hash text NOT NULL,
  /** Escopos permitidos: ["appointments:read","prescriptions:read",...] */
  scopes text[] NOT NULL DEFAULT '{}',
  /** Limite de requisições por minuto. */
  rate_limit_per_min integer NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON public.api_keys(prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_owner ON public.api_keys(owner_user_id);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner reads own keys" ON public.api_keys;
CREATE POLICY "owner reads own keys" ON public.api_keys FOR SELECT USING (auth.uid() = owner_user_id);
DROP POLICY IF EXISTS "owner manages own keys" ON public.api_keys;
CREATE POLICY "owner manages own keys" ON public.api_keys FOR ALL USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);
DROP POLICY IF EXISTS "admin reads all keys" ON public.api_keys;
CREATE POLICY "admin reads all keys" ON public.api_keys FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Tabela de log de chamadas (auditoria + rate limit).
CREATE TABLE IF NOT EXISTS public.api_request_log (
  id bigserial PRIMARY KEY,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  ip text,
  status_code integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_request_log_key_time ON public.api_request_log(api_key_id, created_at DESC);
ALTER TABLE public.api_request_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin reads all log" ON public.api_request_log;
CREATE POLICY "admin reads all log" ON public.api_request_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));

NOTIFY pgrst, 'reload schema';
