
-- Neutralize functions referring to removed/non-existent tables and fix activity_logs column
CREATE OR REPLACE FUNCTION public.fn_notify_waitlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- waitlist table removed; no-op to keep trigger safe
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_waitlist_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- waitlist table removed; no-op to keep trigger safe
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_expire_discount_cards()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- discount_cards table removed; no-op
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_old_activity_logs()
RETURNS TABLE(archived_count bigint, deleted_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ := NOW() - INTERVAL '90 days';
  v_archived BIGINT := 0;
  v_deleted BIGINT := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='activity_logs_archive') THEN
    WITH moved AS (
      INSERT INTO public.activity_logs_archive
      SELECT * FROM public.activity_logs WHERE created_at < v_cutoff
      ON CONFLICT (id) DO NOTHING RETURNING id
    )
    SELECT count(*) INTO v_archived FROM moved;

    WITH deleted AS (
      DELETE FROM public.activity_logs WHERE created_at < v_cutoff RETURNING id
    )
    SELECT count(*) INTO v_deleted FROM deleted;
  END IF;

  BEGIN
    INSERT INTO public.activity_logs (action, entity_type, entity_id, metadata)
    VALUES ('archive_activity_logs_run', 'system', NULL,
      jsonb_build_object('cutoff', v_cutoff, 'archived', v_archived, 'deleted', v_deleted));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN QUERY SELECT v_archived, v_deleted;
END;
$$;
