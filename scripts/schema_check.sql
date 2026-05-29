SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema='public'
AND (
  (table_name='doctor_profiles' AND column_name IN ('available_now','available_now_since','is_on_duty','rating','rating_avg','auto_paused_at'))
  OR (table_name='support_tickets' AND column_name IN ('closed_at','status','updated_at'))
  OR (table_name='doctor_invite_codes' AND column_name IN ('is_used','used_at','expires_at'))
  OR (table_name='subscription_transactions' AND column_name IN ('related_appointment_id','appointment_id'))
  OR (table_name='doctor_payouts' AND column_name IN ('appointment_id','status','release_at'))
)
ORDER BY 1,2;
