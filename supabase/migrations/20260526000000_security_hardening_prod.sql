-- =============================================================
-- FINAL SECURITY HARDENING (production gate)
--
-- This migration is intentionally LAST and idempotent. The schema history
-- toggled several policies on and off (re-dumps reintroduced `USING (true)`),
-- so we re-assert the secure end-state here regardless of prior ordering.
--   1. document_verifications: no public table grant + no `USING(true)` policy.
--      Public validation goes ONLY through verify_document_public(text).
--   2. assign_admin_on_signup: kept as a no-op and trigger removed (no email backdoor).
--   3. prescription_signatures / prescription_validations: drop broad SELECT.
-- =============================================================

-- ── 1. document_verifications: lock down direct reads ──
DO $$
DECLARE pol RECORD;
BEGIN
  IF to_regclass('public.document_verifications') IS NOT NULL THEN
    -- Drop ALL existing SELECT policies (names varied across migrations).
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'document_verifications' AND cmd = 'SELECT'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.document_verifications', pol.policyname);
    END LOOP;

    -- Only admin/support may read rows directly; everyone else uses the RPC.
    EXECUTE $p$
      CREATE POLICY "doc_verif_admin_read" ON public.document_verifications
      FOR SELECT TO authenticated
      USING (public.is_admin() OR public.has_role(auth.uid(), 'support'))
    $p$;

    REVOKE ALL ON public.document_verifications FROM anon;
    REVOKE ALL ON public.document_verifications FROM PUBLIC;
  END IF;
END $$;

-- Public validation function (no CPF / no hash). Recreated to guarantee it exists.
CREATE OR REPLACE FUNCTION public.verify_document_public(p_code text)
RETURNS TABLE (
  verification_code text,
  document_type text,
  patient_name text,
  doctor_name text,
  doctor_crm text,
  issued_at timestamptz,
  details jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dv.verification_code, dv.document_type, dv.patient_name,
         dv.doctor_name, dv.doctor_crm, dv.issued_at,
         COALESCE(dv.details, '{}'::jsonb)
  FROM public.document_verifications dv
  WHERE dv.verification_code = p_code
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.verify_document_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_document_public(text) TO anon, authenticated;

-- ── 2. Remove the hardcoded-email admin escalation backdoor ──
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;

CREATE OR REPLACE FUNCTION public.assign_admin_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Disabled: admins are provisioned manually. No email-based escalation.
  RETURN NEW;
END;
$$;

-- ── 3. prescription_signatures / prescription_validations: drop broad SELECT ──
DO $$
DECLARE pol RECORD;
BEGIN
  IF to_regclass('public.prescription_signatures') IS NOT NULL THEN
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'prescription_signatures' AND cmd = 'SELECT'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.prescription_signatures', pol.policyname);
    END LOOP;
    -- Owner (patient/doctor of the prescription) or admin only.
    EXECUTE $p$
      CREATE POLICY "presc_sig_scoped_read" ON public.prescription_signatures
      FOR SELECT TO authenticated
      USING (
        public.is_admin()
        OR EXISTS (
          SELECT 1 FROM public.prescriptions pr
          LEFT JOIN public.doctor_profiles dp ON dp.id = pr.doctor_id
          WHERE pr.id = prescription_signatures.prescription_id
            AND (pr.patient_id = auth.uid() OR dp.user_id = auth.uid())
        )
      )
    $p$;
    REVOKE ALL ON public.prescription_signatures FROM anon, PUBLIC;
  END IF;

  IF to_regclass('public.prescription_validations') IS NOT NULL THEN
    FOR pol IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'prescription_validations' AND cmd = 'SELECT'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.prescription_validations', pol.policyname);
    END LOOP;
    -- Validation records are read via RPC; no broad direct SELECT.
    EXECUTE $p$
      CREATE POLICY "presc_val_admin_read" ON public.prescription_validations
      FOR SELECT TO authenticated
      USING (public.is_admin())
    $p$;
    REVOKE ALL ON public.prescription_validations FROM anon, PUBLIC;
  END IF;
END $$;
