WITH attempts AS (
  SELECT 'fn_expire_available_now' AS name, (SELECT 'ok' FROM (SELECT public.fn_expire_available_now()) x) AS status
  UNION ALL SELECT 'fn_auto_close_resolved_tickets', (SELECT 'ok' FROM (SELECT public.fn_auto_close_resolved_tickets()) x)
  UNION ALL SELECT 'fn_expire_invite_codes', (SELECT 'ok' FROM (SELECT public.fn_expire_invite_codes()) x)
  UNION ALL SELECT 'fn_auto_pause_doctor_no_shows', (SELECT 'ok' FROM (SELECT public.fn_auto_pause_doctor_no_shows()) x)
  UNION ALL SELECT 'fn_release_doctor_payouts', (SELECT 'ok' FROM (SELECT public.fn_release_doctor_payouts()) x)
  UNION ALL SELECT 'fn_suggest_price_increase', (SELECT 'ok' FROM (SELECT public.fn_suggest_price_increase()) x)
)
SELECT * FROM attempts;
