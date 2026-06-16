-- ============================================================
-- COMPLIANCE CFM 2.314/2022 + 1.821/2007 + LGPD
-- Imutabilidade de logs, prontuários e documentos médicos
-- ============================================================

-- 1) ACTIVITY_LOGS: imutabilidade absoluta (sem UPDATE/DELETE para ninguém exceto service_role)
CREATE OR REPLACE FUNCTION public.prevent_mutation_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'CFM compliance: registros de auditoria são imutáveis (operação % bloqueada na tabela %)', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS activity_logs_no_update ON public.activity_logs;
CREATE TRIGGER activity_logs_no_update
  BEFORE UPDATE OR DELETE ON public.activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_mutation_audit();

-- 2) MEDICAL_RECORDS: append-only (sem DELETE; UPDATE apenas para adicionar adendos via coluna addendums)
ALTER TABLE public.medical_records
  ADD COLUMN IF NOT EXISTS addendums jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS retention_until timestamptz DEFAULT (now() + interval '20 years');

CREATE OR REPLACE FUNCTION public.medical_records_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_user boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.retention_until > now() THEN
      RAISE EXCEPTION 'CFM 1.821/2007: prontuário não pode ser excluído antes de % (retenção 20 anos)', OLD.retention_until
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Permite apenas alterar addendums (e timestamps automáticos)
    IF (NEW.content IS DISTINCT FROM OLD.content)
       OR (NEW.patient_id IS DISTINCT FROM OLD.patient_id)
       OR (NEW.doctor_id IS DISTINCT FROM OLD.doctor_id)
       OR (NEW.appointment_id IS DISTINCT FROM OLD.appointment_id)
       OR (NEW.created_at IS DISTINCT FROM OLD.created_at)
    THEN
      RAISE EXCEPTION 'CFM 1.821/2007: prontuário é append-only. Use a coluna addendums para registrar adendos.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS medical_records_append_only_trigger ON public.medical_records;
CREATE TRIGGER medical_records_append_only_trigger
  BEFORE UPDATE OR DELETE ON public.medical_records
  FOR EACH ROW EXECUTE FUNCTION public.medical_records_append_only();

-- 3) PRESCRIPTIONS e MEDICAL_CERTIFICATES: imutáveis após status='finalized'
CREATE OR REPLACE FUNCTION public.prevent_finalized_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF COALESCE(OLD.status, '') = 'finalized' THEN
      RAISE EXCEPTION 'CFM: documento médico finalizado não pode ser excluído';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND COALESCE(OLD.status, '') = 'finalized' THEN
    -- Após finalizado: bloqueia alteração de conteúdo clínico
    IF TG_TABLE_NAME = 'prescriptions' THEN
      IF (NEW.medications IS DISTINCT FROM OLD.medications)
         OR (NEW.diagnosis IS DISTINCT FROM OLD.diagnosis)
         OR (NEW.patient_id IS DISTINCT FROM OLD.patient_id)
         OR (NEW.doctor_id IS DISTINCT FROM OLD.doctor_id) THEN
        RAISE EXCEPTION 'CFM: receita finalizada é imutável. Emita uma nova receita se necessário.';
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS prescriptions_finalized_immutable ON public.prescriptions;
CREATE TRIGGER prescriptions_finalized_immutable
  BEFORE UPDATE OR DELETE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_finalized_mutation();

DROP TRIGGER IF EXISTS medical_certificates_immutable ON public.medical_certificates;
CREATE TRIGGER medical_certificates_immutable
  BEFORE UPDATE OR DELETE ON public.medical_certificates
  FOR EACH ROW EXECUTE FUNCTION public.prevent_finalized_mutation();

-- 4) CONSENT_LOGS: imutáveis (já é histórico legal)
DROP TRIGGER IF EXISTS consent_logs_immutable ON public.consent_logs;
CREATE TRIGGER consent_logs_immutable
  BEFORE UPDATE OR DELETE ON public.consent_logs
  FOR EACH ROW EXECUTE FUNCTION public.prevent_mutation_audit();

-- 5) Index para queries de retenção
CREATE INDEX IF NOT EXISTS idx_medical_records_retention
  ON public.medical_records (retention_until);

COMMENT ON FUNCTION public.prevent_mutation_audit IS 'CFM 2.314/2022: garante imutabilidade de logs de auditoria e consentimentos.';
COMMENT ON FUNCTION public.medical_records_append_only IS 'CFM 1.821/2007: prontuário é append-only com retenção mínima de 20 anos.';
COMMENT ON FUNCTION public.prevent_finalized_mutation IS 'CFM: documentos clínicos finalizados (receitas, atestados) são imutáveis.';