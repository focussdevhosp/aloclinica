-- Conserta 6 funções de cron com schema drift legado. Cada uma usava colunas
-- que não existem mais; sem isso elas falhavam silenciosamente todo dia.

-- 1) fn_expire_available_now: doctor_profiles.available_now → is_on_duty
CREATE OR REPLACE FUNCTION public.fn_expire_available_now()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.doctor_profiles
     SET is_on_duty = false
   WHERE is_on_duty = true
     AND auto_paused_at IS NULL
     AND updated_at < now() - INTERVAL '4 hours';
END;
$$;

-- 2) fn_auto_close_resolved_tickets: support_tickets sem closed_at — usa status+updated_at
CREATE OR REPLACE FUNCTION public.fn_auto_close_resolved_tickets()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.support_tickets
     SET status = 'closed',
         updated_at = now()
   WHERE status = 'resolved'
     AND updated_at < now() - INTERVAL '48 hours';
END;
$$;

-- 3) fn_expire_invite_codes: doctor_invite_codes sem is_used — desabilita corpo
--    (a tabela parece ter sido removida/renomeada; cron vira no-op)
CREATE OR REPLACE FUNCTION public.fn_expire_invite_codes()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  /* schema atual não comporta esta limpeza — função preservada como no-op
     até que a tabela doctor_invite_codes seja redesenhada. */
  RETURN;
END;
$$;

-- 4) fn_auto_pause_doctor_no_shows: cancelled_by é uuid, era comparado com text
CREATE OR REPLACE FUNCTION public.fn_auto_pause_doctor_no_shows()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT a.doctor_id, dp.user_id, COUNT(*) AS ns_count
      FROM public.appointments a
      JOIN public.doctor_profiles dp ON dp.id = a.doctor_id
     WHERE a.status = 'no_show'
       AND a.cancelled_by = dp.user_id    -- ambos uuid, sem cast text
       AND a.scheduled_at > now() - INTERVAL '30 days'
     GROUP BY a.doctor_id, dp.user_id
    HAVING COUNT(*) >= 3
  LOOP
    UPDATE public.doctor_profiles
       SET is_on_duty = false,
           auto_paused_at = now(),
           auto_pause_reason = 'no_show_3plus_in_30d'
     WHERE id = r.doctor_id;
  END LOOP;
END;
$$;

-- 5) fn_release_doctor_payouts: tinha join em coluna fantasma; libera direto por release_at
CREATE OR REPLACE FUNCTION public.fn_release_doctor_payouts()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.doctor_payouts
     SET status = 'ready',
         updated_at = now()
   WHERE status = 'pending'
     AND release_at < now();
END;
$$;

-- 6) fn_suggest_price_increase: doctor_profiles.rating → rating_avg
CREATE OR REPLACE FUNCTION public.fn_suggest_price_increase()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT dp.id, dp.user_id, dp.price, dp.rating_avg
      FROM public.doctor_profiles dp
     WHERE dp.is_approved = true
       AND dp.rating_avg >= 4.8
       AND dp.price IS NOT NULL
       AND (dp.price_suggestion_sent_at IS NULL OR dp.price_suggestion_sent_at < now() - INTERVAL '90 days')
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (r.user_id,
            '💡 Sugestão da plataforma',
            'Sua avaliação está em ' || r.rating_avg::text || ' ⭐. Considere reajustar o preço da consulta.',
            'info');
    UPDATE public.doctor_profiles SET price_suggestion_sent_at = now() WHERE id = r.id;
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
