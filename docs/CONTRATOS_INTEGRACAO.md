# Contratos — integração da cola server-side

Complementa o modelo já existente (`contratos`, `contrato_beneficiarios`, `vouchers`,
`consulta_contrato`) com as funções que faltavam. Migration: `20260527000000_contratos_glue.sql`.

## Funções adicionadas
- **`resolve_tenant(host, slug)`** → `{contrato_id, nome, tipo, subdominio, branding}` (anon).
  Resolve por **path** (`/p/:slug`), **domínio próprio** (`contratos.dominio_proprio`, nova coluna) ou **subdomínio** (`<slug>.aloclinica.com.br`). Só dados públicos.
- **`fn_contrato_elegivel(contrato_id, cpf, user_id)`** → bool. Valida status/vigência, cota global e beneficiário ativo (lista de CPF) + limite individual.
- **`fn_consumir_contrato(contrato_id, appointment_id, patient_user_id, cpf, voucher_codigo)`** → jsonb `{ok, reason}`. Idempotente; grava `consulta_contrato` e debita `cota_utilizada`/`consultas_utilizadas`/voucher. **Só `service_role`** (chamar de edge function).

## Como ligar no agendamento (a fazer — depende do seu fluxo de booking)
No ponto onde a consulta é criada para um paciente autenticado:
1. Front lê `window.location.host` / `/p/:slug` → `db.rpc('resolve_tenant', { p_host, p_slug })` → aplica branding e guarda `contrato_id`.
2. Antes de cobrar: se há `contrato_id`, checar `db.rpc('fn_contrato_elegivel', { p_contrato_id, p_cpf })`.
   - elegível → criar o appointment normalmente, **pular o pagamento**, e chamar (server-side / edge function com service role) `fn_consumir_contrato(contrato_id, appointment_id, patient_id, cpf)`.
   - não elegível → cair no fluxo self-pay (Mercado Pago) ou recusar.
3. Sem `contrato_id` → fluxo atual inalterado.

> `fn_consumir_contrato` exige `service_role`, então deve ser chamada de uma edge function
> (ex.: estender o checkout/booking server-side), nunca direto do client.

## Faturamento / medição
`consulta_contrato` já é a base. Para a competência do mês:
`SELECT count(*), sum(valor_repassado) FROM consulta_contrato WHERE contrato_id=$1 AND created_at >= date_trunc('month', now())`.
O `AdminContratos.tsx` já exporta CSV de faturamento.
