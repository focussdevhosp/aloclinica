-- View materializada-free para sinalizar atividades suspeitas.
-- A view roda em runtime; suficiente para um painel admin de até alguns
-- milhares de usuários. Migra para materialized view se ficar pesada.

CREATE OR REPLACE VIEW public.fraud_signals AS
WITH cpf_dup AS (
  SELECT cpf, COUNT(*) AS n
  FROM public.profiles
  WHERE cpf IS NOT NULL AND cpf <> ''
  GROUP BY cpf HAVING COUNT(*) > 1
),
recent_failures AS (
  SELECT email, COUNT(*) AS fails
  FROM public.failed_login_attempts
  WHERE created_at > now() - INTERVAL '24 hours'
  GROUP BY email
),
high_no_show AS (
  SELECT patient_id, COUNT(*) FILTER (WHERE status = 'no_show')::numeric / NULLIF(COUNT(*)::numeric, 0) AS rate, COUNT(*) AS total
  FROM public.appointments
  WHERE scheduled_at > now() - INTERVAL '6 months' AND patient_id IS NOT NULL
  GROUP BY patient_id
  HAVING COUNT(*) >= 3 AND COUNT(*) FILTER (WHERE status = 'no_show')::numeric / NULLIF(COUNT(*)::numeric, 0) >= 0.5
),
many_kyc_attempts AS (
  SELECT user_id, COUNT(*) AS attempts, COUNT(*) FILTER (WHERE status IN ('rejected','reprovado')) AS rejs
  FROM public.kyc_verificacoes
  WHERE created_at > now() - INTERVAL '30 days'
  GROUP BY user_id
  HAVING COUNT(*) >= 3
)
SELECT
  p.user_id,
  p.first_name,
  p.last_name,
  p.cpf,
  p.phone,
  /* sinal 1 — CPF compartilhado */
  (SELECT n FROM cpf_dup d WHERE d.cpf = p.cpf) AS cpf_compartilhado_por,
  /* sinal 2 — múltiplas falhas de login em 24h (match por email) */
  COALESCE(
    (SELECT rf.fails FROM recent_failures rf
       JOIN auth.users u ON u.email = rf.email AND u.id = p.user_id),
    0
  ) AS login_fails_24h,
  /* sinal 3 — alto índice de no-show (>=50% em 6m com 3+ consultas) */
  (SELECT rate FROM high_no_show ns WHERE ns.patient_id = p.user_id) AS no_show_rate,
  (SELECT total FROM high_no_show ns WHERE ns.patient_id = p.user_id) AS appointments_total,
  /* sinal 4 — muitas tentativas de KYC */
  (SELECT attempts FROM many_kyc_attempts mka WHERE mka.user_id = p.user_id) AS kyc_attempts,
  (SELECT rejs FROM many_kyc_attempts mka WHERE mka.user_id = p.user_id) AS kyc_rejs
FROM public.profiles p
WHERE
  p.cpf IN (SELECT cpf FROM cpf_dup)
  OR EXISTS (SELECT 1 FROM recent_failures rf
              JOIN auth.users u ON u.email = rf.email AND u.id = p.user_id
              WHERE rf.fails >= 5)
  OR EXISTS (SELECT 1 FROM high_no_show ns WHERE ns.patient_id = p.user_id)
  OR EXISTS (SELECT 1 FROM many_kyc_attempts mka WHERE mka.user_id = p.user_id AND mka.rejs >= 2);

GRANT SELECT ON public.fraud_signals TO authenticated;

NOTIFY pgrst, 'reload schema';
