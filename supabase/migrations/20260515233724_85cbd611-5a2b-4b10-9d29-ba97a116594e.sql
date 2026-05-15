
-- ============== 1. Tabelas auxiliares ==============
CREATE TABLE IF NOT EXISTS public.appointment_reminders_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('24h','2h','15min')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, reminder_type)
);
ALTER TABLE public.appointment_reminders_sent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin reads reminders" ON public.appointment_reminders_sent
  FOR SELECT USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.medical_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  patient_id uuid NOT NULL,
  doctor_id uuid NOT NULL,
  days_off integer NOT NULL DEFAULT 1,
  cid_code text,
  reason text,
  pdf_url text,
  verification_code text UNIQUE,
  signature_hash text,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medical_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient reads own certificates" ON public.medical_certificates
  FOR SELECT USING (patient_id = auth.uid() OR public.is_admin());
CREATE POLICY "doctor manages own certificates" ON public.medical_certificates
  FOR ALL USING (
    doctor_id IN (SELECT id FROM public.doctor_profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );
CREATE TRIGGER trg_touch_certificates BEFORE UPDATE ON public.medical_certificates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============== 2. Novos campos ==============
ALTER TABLE public.doctor_profiles
  ADD COLUMN IF NOT EXISTS risk_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_score_updated_at timestamptz;

ALTER TABLE public.prescriptions
  ADD COLUMN IF NOT EXISTS is_continuous boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS continuous_duration_days integer,
  ADD COLUMN IF NOT EXISTS renewal_alerted_at timestamptz;

-- ============== 3. Lembretes automáticos ==============
CREATE OR REPLACE FUNCTION public.fn_send_appointment_reminders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a RECORD; phone text; pname text; msg text; rtype text; mins_until int;
BEGIN
  FOR a IN
    SELECT ap.id, ap.patient_id, ap.scheduled_at, ap.jitsi_link,
           EXTRACT(EPOCH FROM (ap.scheduled_at - now()))/60 AS mins
    FROM appointments ap
    WHERE ap.status IN ('scheduled','confirmed')
      AND ap.payment_status IN ('confirmed','approved','received')
      AND ap.patient_id IS NOT NULL
      AND ap.scheduled_at BETWEEN now() AND now() + interval '25 hours'
  LOOP
    mins_until := a.mins::int;
    rtype := CASE
      WHEN mins_until BETWEEN 1380 AND 1500 THEN '24h'
      WHEN mins_until BETWEEN 105 AND 135 THEN '2h'
      WHEN mins_until BETWEEN 10 AND 20 THEN '15min'
      ELSE NULL END;
    IF rtype IS NULL THEN CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM appointment_reminders_sent WHERE appointment_id = a.id AND reminder_type = rtype) THEN CONTINUE; END IF;

    SELECT p.phone, p.first_name INTO phone, pname FROM profiles p WHERE p.user_id = a.patient_id;
    msg := CASE rtype
      WHEN '24h' THEN '🩺 Lembrete: você tem consulta amanhã às ' || to_char(a.scheduled_at AT TIME ZONE 'America/Sao_Paulo','HH24:MI') || '. Não esqueça!'
      WHEN '2h' THEN '⏰ Sua consulta começa em 2 horas. Acesse: ' || COALESCE(a.jitsi_link,'')
      WHEN '15min' THEN '🚨 Sua consulta começa em 15 min! Entre agora: ' || COALESCE(a.jitsi_link,'')
    END;

    INSERT INTO notifications (user_id,title,message,type,link)
    VALUES (a.patient_id,'Lembrete de consulta', msg, 'reminder','/dashboard/appointments/'||a.id);

    IF phone IS NOT NULL AND phone <> '' THEN
      PERFORM public.invoke_edge_function('send-whatsapp',
        jsonb_build_object('phone', phone, 'message', msg));
    END IF;

    INSERT INTO appointment_reminders_sent(appointment_id, reminder_type) VALUES (a.id, rtype);
  END LOOP;
END $$;

-- ============== 4. Renovação de receitas contínuas ==============
CREATE OR REPLACE FUNCTION public.fn_prescription_renewal_alert()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT rx.id, rx.patient_id, rx.created_at, rx.continuous_duration_days, rx.doctor_id
    FROM prescriptions rx
    WHERE rx.is_continuous = true
      AND rx.renewal_alerted_at IS NULL
      AND rx.continuous_duration_days IS NOT NULL
      AND rx.created_at + (rx.continuous_duration_days || ' days')::interval BETWEEN now() AND now() + interval '7 days'
  LOOP
    INSERT INTO notifications (user_id,title,message,type,link)
    VALUES (r.patient_id,'💊 Sua receita está acabando',
      'Sua receita de uso contínuo termina em até 7 dias. Solicite renovação com 1 clique.',
      'prescription','/dashboard/paciente/prescriptions?renew=' || r.id);
    UPDATE prescriptions SET renewal_alerted_at = now() WHERE id = r.id;
  END LOOP;
END $$;

-- ============== 5. Detecção de fraude (trigger) ==============
CREATE OR REPLACE FUNCTION public.fn_detect_duplicate_cpf()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE dup_count int; admin_id uuid;
BEGIN
  IF NEW.cpf IS NULL OR NEW.cpf = '' THEN RETURN NEW; END IF;
  SELECT count(*) INTO dup_count FROM profiles WHERE cpf = NEW.cpf AND user_id <> NEW.user_id;
  IF dup_count > 0 THEN
    SELECT user_id INTO admin_id FROM user_roles WHERE role='admin' LIMIT 1;
    IF admin_id IS NOT NULL THEN
      INSERT INTO notifications(user_id,title,message,type,link)
      VALUES (admin_id,'🚨 CPF duplicado detectado',
        'CPF ' || NEW.cpf || ' aparece em ' || (dup_count+1) || ' contas. Investigue.',
        'warning','/dashboard/admin/users?cpf=' || NEW.cpf);
    END IF;
    INSERT INTO activity_logs(action,entity_type,entity_id,user_id,details)
    VALUES ('duplicate_cpf_detected','profile',NEW.user_id,NEW.user_id,
      jsonb_build_object('cpf', NEW.cpf, 'count', dup_count+1));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_detect_duplicate_cpf ON public.profiles;
CREATE TRIGGER trg_detect_duplicate_cpf AFTER INSERT OR UPDATE OF cpf ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_detect_duplicate_cpf();

-- ============== 6. Auto-resposta de tickets fora do horário ==============
CREATE OR REPLACE FUNCTION public.fn_ticket_after_hours_autoreply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_hour int;
BEGIN
  current_hour := EXTRACT(HOUR FROM now() AT TIME ZONE 'America/Sao_Paulo')::int;
  -- Fora do horário (antes das 8h ou depois das 20h)
  IF current_hour < 8 OR current_hour >= 20 THEN
    INSERT INTO notifications(user_id,title,message,type,link)
    VALUES (NEW.user_id,'🤖 Recebemos seu chamado',
      'Estamos fora do horário comercial (8h-20h). Sua mensagem será respondida em até 12h. Enquanto isso, consulte nossa FAQ.',
      'support','/dashboard/help');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_ticket_after_hours ON public.support_tickets;
CREATE TRIGGER trg_ticket_after_hours AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.fn_ticket_after_hours_autoreply();

-- ============== 7. Score de risco do médico ==============
CREATE OR REPLACE FUNCTION public.fn_calculate_doctor_risk_score()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d RECORD; v_score numeric; v_nps numeric; v_cancel int; v_noshow int; v_total int; admin_id uuid;
BEGIN
  SELECT user_id INTO admin_id FROM user_roles WHERE role='admin' LIMIT 1;
  FOR d IN SELECT id, user_id FROM doctor_profiles WHERE is_approved = true LOOP
    SELECT COUNT(*) INTO v_total FROM appointments
      WHERE doctor_id = d.id AND scheduled_at > now() - interval '90 days';
    IF v_total < 5 THEN CONTINUE; END IF;

    SELECT COUNT(*) INTO v_cancel FROM appointments
      WHERE doctor_id = d.id AND status='cancelled' AND cancelled_by = d.user_id::text
        AND scheduled_at > now() - interval '90 days';
    SELECT COUNT(*) INTO v_noshow FROM appointments
      WHERE doctor_id = d.id AND status='no_show' AND scheduled_at > now() - interval '90 days';
    SELECT COALESCE(AVG(nps_score),8) INTO v_nps FROM satisfaction_surveys
      WHERE doctor_id = d.id AND created_at > now() - interval '90 days';

    -- score 0-100 (maior = mais risco)
    v_score := LEAST(100,
      (v_cancel::numeric / v_total * 100 * 0.4) +
      (v_noshow::numeric / v_total * 100 * 0.4) +
      (GREATEST(0,(8 - v_nps)) * 12.5 * 0.2)
    );

    UPDATE doctor_profiles
      SET risk_score = ROUND(v_score,1), risk_score_updated_at = now()
    WHERE id = d.id;

    IF v_score >= 60 AND admin_id IS NOT NULL THEN
      INSERT INTO notifications(user_id,title,message,type,link)
      VALUES (admin_id,'⚠️ Médico com risco elevado',
        'Score ' || ROUND(v_score,1) || ' — revise performance.',
        'warning','/dashboard/admin/doctors/' || d.id);
    END IF;
  END LOOP;
END $$;

-- ============== 8. Cron jobs ==============
SELECT cron.unschedule('appointment-reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='appointment-reminders');
SELECT cron.unschedule('reengagement-inactive') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='reengagement-inactive');
SELECT cron.unschedule('prescription-renewal-alert') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='prescription-renewal-alert');
SELECT cron.unschedule('doctor-risk-score') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='doctor-risk-score');

SELECT cron.schedule('appointment-reminders','*/5 * * * *', $$SELECT public.fn_send_appointment_reminders();$$);
SELECT cron.schedule('reengagement-inactive','0 10 * * *', $$SELECT public.fn_reengagement_inactive();$$);
SELECT cron.schedule('prescription-renewal-alert','0 9 * * *', $$SELECT public.fn_prescription_renewal_alert();$$);
SELECT cron.schedule('doctor-risk-score','0 3 * * *', $$SELECT public.fn_calculate_doctor_risk_score();$$);
