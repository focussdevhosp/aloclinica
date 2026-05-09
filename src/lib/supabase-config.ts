// ⚠️ PRODUÇÃO: Configure as variáveis de ambiente abaixo
// .env.local ou .env.production devem conter:
// VITE_SUPABASE_URL=sua_url_supabase
// VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica
//
// Nota: o cliente Supabase em src/integrations/supabase/client.ts tem
// valores hardcoded (gerados pelo Lovable) e funciona mesmo sem env vars.
// Esta validação é apenas um aviso — não derruba o app.

const validateSupabaseEnv = () => {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !key) {
    const missing: string[] = [];
    if (!url) missing.push('VITE_SUPABASE_URL');
    if (!key) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');
    // Apenas warn — o cliente em supabase/client.ts cobre o caso com hardcoded.
    console.warn(`[AloClínica] Variáveis de ambiente Supabase ausentes: ${missing.join(', ')}. Usando defaults do client.ts.`);
  }
};

validateSupabaseEnv();

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || '';
export const SUPABASE_PROJECT_ID =
  SUPABASE_URL ? new URL(SUPABASE_URL).hostname.split(".")[0] : '';
export const SUPABASE_FUNCTIONS_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : '';
export const hasExplicitSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

if (!hasExplicitSupabaseEnv && import.meta.env.DEV) {
  console.warn('[AloClínica] ⚠️ Supabase não configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY em .env.local');
}
