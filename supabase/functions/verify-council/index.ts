/**
 * verify-council — validação AUTOMÁTICA de registro em conselho de classe via
 * Infosimples (provedor unificado). Cobre múltiplos conselhos com UMA conta/token.
 *
 * Requer secret: INFOSIMPLES_TOKEN
 *
 * Modelo: cada conselho tem um "slug" de consulta na Infosimples. Conselhos
 * NACIONAIS usam o órgão federal (CFM p/ médicos, CFP p/ psicólogos...). Alguns
 * são POR ESTADO (o UF é anexado ao slug: coren-sp, cro-sp...).
 *
 * ⚠️ Os slugs abaixo são o mapa inicial — ao ativar o token, cada conselho é
 * testado ao vivo e os slugs são confirmados/ajustados contra a conta real.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getCaller } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const INFOSIMPLES_BASE = "https://api.infosimples.com/api/v2/consultas";

// council_type (sigla regional usada na plataforma) → consulta Infosimples.
// perState=true → o slug recebe o UF (ex.: coren-sp/cadastro).
const COUNCIL_ENDPOINTS: Record<string, { slug: string; perState?: boolean }> = {
  CRM:   { slug: "cfm" },                    // Medicina
  CRP:   { slug: "cfp" },                    // Psicologia
  CRF:   { slug: "cff" },                    // Farmácia (nacional; ou crf-<uf>)
  CRMV:  { slug: "cfmv" },                   // Medicina Veterinária
  CRBM:  { slug: "cfbm" },                   // Biomedicina
  CRC:   { slug: "cfc" },                    // Contabilidade
  CRO:   { slug: "cro", perState: true },    // Odontologia (por estado)
  COREN: { slug: "coren", perState: true },  // Enfermagem (por estado)
  // Aguardando confirmação de disponibilidade no Infosimples (senão → manual):
  // CRN (nutrição), CREFITO (fisio/TO), CRFa (fono), CREF (ed. física),
  // CRESS (serviço social), CREA (engenharia), CAU (arquitetura), OAB (advocacia).
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function buildUrl(type: string, uf: string): string | null {
  const cfg = COUNCIL_ENDPOINTS[type];
  if (!cfg) return null;
  const slug = cfg.perState ? `${cfg.slug}-${uf.toLowerCase()}` : cfg.slug;
  return `${INFOSIMPLES_BASE}/${slug}/cadastro`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const token = Deno.env.get("INFOSIMPLES_TOKEN");
    const body = await req.json().catch(() => ({}));
    const type = String(body.council_type ?? "").toUpperCase();
    const uf = String(body.uf ?? "").toUpperCase();
    const registro = body.registro ?? body.number ?? body.crm;
    const cpf = body.cpf;
    const doctor_profile_id = body.doctor_profile_id;

    if (!type || (!registro && !cpf)) {
      return json({ error: "council_type e (registro ou cpf) são obrigatórios" }, 400);
    }

    // Sem token → degrada para revisão manual (seguro).
    if (!token) {
      return json({ council_type: type, configured: false, found: false, valid: false, mode: "manual_review", message: "Validação automática indisponível (INFOSIMPLES_TOKEN não configurado). A equipe fará a conferência manual." }, 200);
    }

    const url = buildUrl(type, uf);
    if (!url) {
      return json({ council_type: type, found: false, valid: false, mode: "manual_review", message: `Conselho ${type} ainda sem validação automática — conferência manual pela equipe.` }, 200);
    }

    // Rate limit por IP (evita abuso/custo de consulta paga).
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!(await checkRateLimit(ip, "verify-council", 20, 10))) {
      return json({ error: "Muitas consultas. Tente novamente em instantes." }, 429);
    }

    const params = new URLSearchParams();
    params.set("token", token);
    if (registro) params.set("registro", String(registro).replace(/\D/g, ""));
    if (uf) params.set("uf", uf);
    if (cpf) params.set("cpf", String(cpf).replace(/\D/g, ""));
    params.set("timeout", "20");

    let apiJson: any = null;
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: params.toString(),
      });
      apiJson = await r.json();
    } catch (e) {
      console.warn("verify-council: falha ao consultar Infosimples:", (e as Error).message);
      return json({ council_type: type, found: false, valid: false, mode: "manual_review", upstream_error: true, message: "Não foi possível validar agora — conferência manual será feita." }, 200);
    }

    // Infosimples v2: code 200 = sucesso. Qualquer outro code é ERRO DO PROVEDOR
    // (ex.: 603 = conta sem saldo / token sem autorização ao serviço). Isso NÃO
    // é "registro não encontrado" — cai em revisão manual com a mensagem real,
    // pra o admin não rejeitar um profissional válido por engano.
    const code = apiJson?.code;
    if (code !== 200) {
      return json({
        council_type: type,
        found: false,
        valid: false,
        mode: "manual_review",
        upstream_error: true,
        infosimples_code: code,
        message: `Validação automática indisponível agora (${apiJson?.code_message ?? "erro do provedor Infosimples"}). Conferência manual pela equipe.`,
      }, 200);
    }

    // code === 200 → registros em data[].resultados[] (ou direto em data[]).
    const arr = apiJson?.data?.[0]?.resultados ?? apiJson?.data ?? [];
    const first = Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
    const situacao = String(first?.situacao ?? "").toLowerCase();
    const found = !!first;
    const valid = found && /ativ|regular/.test(situacao) && !/inativ|cancel|suspens|baixad|falec|irregular/.test(situacao);

    // Se valido + admin + doctor_profile_id → marca crm_verified (registro conferido).
    if (valid && doctor_profile_id) {
      const caller = await getCaller(req);
      if (caller.isAdmin) {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await admin.from("doctor_profiles").update({ crm_verified: true, crm_verified_at: new Date().toISOString() }).eq("id", doctor_profile_id);
      }
    }

    return json({
      council_type: type,
      found,
      valid,
      mode: "automatic",
      professional: first ? { nome: first.nome ?? null, registro: first.registro ?? registro, uf, situacao: first.situacao ?? null } : null,
      message: valid ? "Registro válido e situação regular" : found ? "Registro encontrado, mas situação irregular" : "Registro não encontrado no conselho",
      infosimples_code: apiJson?.code ?? null,
    }, 200);
  } catch (err: any) {
    console.error("verify-council error:", err?.message);
    return json({ error: err?.message ?? "Erro interno" }, 500);
  }
});
