import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * validate-council — wrapper genérico de validação de conselho profissional.
 *
 * Hoje só CRM tem API automatizada (consultacrm via edge `verify-crm`).
 * Para os demais conselhos retornamos `manual_review` — a equipe AloClínica
 * confere o documento enviado no upload de cadastro.
 */

type CouncilType =
  | "CRM" | "CRP" | "CRN" | "CRFa" | "CREFITO" | "COREN"
  | "CRO" | "CRBM" | "CRF" | "CREF" | "CRESS" | "CRTR" | "OUTRO";

const COUNCIL_NAMES: Record<CouncilType, string> = {
  CRM: "Conselho Federal de Medicina",
  CRP: "Conselho Federal de Psicologia",
  CRN: "Conselho Federal de Nutricionistas",
  CRFa: "Conselho Federal de Fonoaudiologia",
  CREFITO: "Conselho Federal de Fisioterapia e Terapia Ocupacional",
  COREN: "Conselho Federal de Enfermagem",
  CRO: "Conselho Federal de Odontologia",
  CRBM: "Conselho Federal de Biomedicina",
  CRF: "Conselho Federal de Farmácia",
  CREF: "Conselho Federal de Educação Física",
  CRESS: "Conselho Federal de Serviço Social",
  CRTR: "Conselho Federal de Terapia",
  OUTRO: "Outro conselho",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { council_type, number, uf } = await req.json();

    if (!council_type || !number || !uf) {
      return new Response(
        JSON.stringify({ error: "council_type, number e uf são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const type = String(council_type).toUpperCase() as CouncilType;
    const cleanNumber = String(number).replace(/\D/g, "");
    const cleanUf = String(uf).toUpperCase();

    const projectRef = Deno.env.get("SUPABASE_URL")?.match(/https?:\/\/([^.]+)/)?.[1];
    const fnBase = `https://${projectRef}.functions.supabase.co`;
    const fwdAuth = {
      Authorization: req.headers.get("Authorization") ?? "",
      apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    };
    const respond = (obj: unknown) =>
      new Response(JSON.stringify(obj), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // 1) Provedor unificado (Infosimples) via verify-council — cobre TODOS os
    //    conselhos habilitados. Se voltar mode:"automatic", usamos o resultado.
    const info = await fetch(`${fnBase}/verify-council`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...fwdAuth },
      body: JSON.stringify({ council_type: type, registro: cleanNumber, uf: cleanUf }),
    }).then((r) => r.json()).catch(() => null);

    if (info && info.mode === "automatic") {
      return respond({ council_name: COUNCIL_NAMES[type] ?? "Conselho profissional", ...info });
    }

    // 2) Fallback do CRM → consultacrm (verify-crm), que já está ativo/funcionando.
    if (type === "CRM") {
      const r = await fetch(`${fnBase}/verify-crm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...fwdAuth },
        body: JSON.stringify({ crm: cleanNumber, uf: cleanUf }),
      });
      const data = await r.json().catch(() => ({}));
      return respond({ council_type: type, council_name: COUNCIL_NAMES[type], ...data, mode: "automatic" });
    }

    // 3) Demais conselhos sem provedor automático → revisão manual pela equipe.
    return respond({
      council_type: type,
      council_name: COUNCIL_NAMES[type] ?? "Conselho profissional",
      found: false,
      valid: false,
      mode: "manual_review",
      message: `Validação automática indisponível para ${type}. Configure a Infosimples (INFOSIMPLES_TOKEN) para ativar — enquanto isso a equipe faz a conferência manual em até 24h.`,
    });
  } catch (err: any) {
    console.error("validate-council error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});