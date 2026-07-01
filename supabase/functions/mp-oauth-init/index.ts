/**
 * mp-oauth-init — inicia o fluxo OAuth do Mercado Pago (marketplace) para um
 * médico conectar a própria conta MP (para receber repasses).
 *
 * SECURITY: só um usuário autenticado (médico) pode iniciar. Gera um `state`
 * aleatório e opaco, guarda em mp_oauth_states LIGADO a esse usuário (single-use,
 * TTL curto) e devolve a URL de autorização do MP. O mp-oauth-callback valida o
 * state contra essa tabela — impedindo o sequestro de vínculo de conta (CSRF).
 *
 * Requer env: MERCADOPAGO_APP_ID (mesmo do callback).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCaller } from "../_shared/auth.ts";

const REDIRECT_URI = "https://pwxvvimdtmvziynbspgx.supabase.co/functions/v1/mp-oauth-callback";
const AUTH_BASE = "https://auth.mercadopago.com.br/authorization";
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutos

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    // Só usuário autenticado inicia; o state fica ligado a ELE no servidor.
    const caller = await getCaller(req);
    if (!caller.user) return json({ error: "Unauthorized" }, 401);

    const appId = Deno.env.get("MERCADOPAGO_APP_ID");
    if (!appId) return json({ error: "Marketplace não configurado (MERCADOPAGO_APP_ID ausente)" }, 500);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Apenas médicos conectam conta MP (recebem repasses).
    const { data: doc } = await sb
      .from("doctor_profiles")
      .select("id")
      .eq("user_id", caller.user.id)
      .maybeSingle();
    if (!doc) return json({ error: "Apenas médicos podem conectar uma conta Mercado Pago" }, 403);

    // state opaco de alta entropia, ligado ao usuário, single-use e com TTL curto.
    const state = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
    const expiresAt = new Date(Date.now() + STATE_TTL_MS).toISOString();
    const { error: insErr } = await sb
      .from("mp_oauth_states")
      .insert({ state, user_id: caller.user.id, expires_at: expiresAt });
    if (insErr) return json({ error: "Falha ao iniciar OAuth", detail: insErr.message }, 500);

    const authUrl =
      `${AUTH_BASE}?client_id=${encodeURIComponent(appId)}` +
      `&response_type=code&platform_id=mp` +
      `&state=${encodeURIComponent(state)}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

    return json({ url: authUrl });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
