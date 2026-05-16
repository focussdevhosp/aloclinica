
-- Fix notification column names (body, action_url) and activity_logs (metadata) used by signup-time triggers

CREATE OR REPLACE FUNCTION public.fn_detect_duplicate_cpf()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE dup_count int; admin_id uuid;
BEGIN
  IF NEW.cpf IS NULL OR NEW.cpf = '' THEN RETURN NEW; END IF;
  SELECT count(*) INTO dup_count FROM profiles WHERE cpf = NEW.cpf AND user_id <> NEW.user_id;
  IF dup_count > 0 THEN
    SELECT user_id INTO admin_id FROM user_roles WHERE role='admin' LIMIT 1;
    IF admin_id IS NOT NULL THEN
      BEGIN
        INSERT INTO notifications(user_id,title,body,type,action_url)
        VALUES (admin_id,'🚨 CPF duplicado detectado',
          'CPF ' || NEW.cpf || ' aparece em ' || (dup_count+1) || ' contas. Investigue.',
          'warning','/dashboard/admin/users?cpf=' || NEW.cpf);
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
    BEGIN
      INSERT INTO activity_logs(action,entity_type,entity_id,user_id,metadata)
      VALUES ('duplicate_cpf_detected','profile',NEW.user_id,NEW.user_id,
        jsonb_build_object('cpf', NEW.cpf, 'count', dup_count+1));
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.fn_auto_approve_doctor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_user_id UUID;
BEGIN
  IF COALESCE(NEW.is_approved, false) = false
     AND COALESCE(NEW.crm_verified, false) = true
     AND NEW.kyc_status = 'approved'
  THEN
    NEW.is_approved := true;

    BEGIN
      INSERT INTO public.notifications (user_id, title, body, type, action_url)
      VALUES (
        NEW.user_id,
        '✅ Cadastro aprovado!',
        'Seu CRM foi verificado e seu cadastro foi aprovado automaticamente. Você já pode atender.',
        'success',
        '/dashboard'
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    SELECT user_id INTO admin_user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
    IF admin_user_id IS NOT NULL THEN
      BEGIN
        INSERT INTO public.notifications (user_id, title, body, type, action_url)
        VALUES (
          admin_user_id,
          '🩺 Médico aprovado automaticamente',
          'O médico (CRM ' || NEW.crm || '/' || NEW.crm_state || ') passou na verificação de CRM e KYC.',
          'info',
          '/dashboard/admin/doctors'
        );
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;

    BEGIN
      INSERT INTO public.activity_logs (action, entity_type, entity_id, user_id, metadata)
      VALUES (
        'doctor_auto_approved',
        'doctor_profile',
        NEW.id,
        NEW.user_id,
        jsonb_build_object(
          'crm', NEW.crm,
          'crm_state', NEW.crm_state,
          'kyc_score', NEW.kyc_face_match_score
        )
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_auto_assign_on_demand()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  queue_item RECORD;
BEGIN
  IF NEW.available_now = true AND (OLD.available_now IS DISTINCT FROM true) THEN
    SELECT * INTO queue_item
    FROM public.on_demand_queue
    WHERE status = 'waiting' AND assigned_doctor_id IS NULL
    ORDER BY position ASC, created_at ASC
    LIMIT 1;
    
    IF FOUND THEN
      UPDATE public.on_demand_queue
      SET assigned_doctor_id = NEW.id,
          assigned_at = now(),
          status = 'assigned'
      WHERE id = queue_item.id;
      
      BEGIN
        INSERT INTO public.notifications (user_id, title, body, type, action_url)
        VALUES (
          queue_item.patient_id,
          'Médico disponível!',
          'Um médico está pronto para sua consulta. Entre agora!',
          'urgent',
          '/dashboard/consultation'
        );
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
