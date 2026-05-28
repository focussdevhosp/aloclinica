-- Protocolos clínicos: regras simples que a IA consulta para enriquecer
-- triagem e sugerir conduta. Cada protocolo tem condições (queixa/sintomas/
-- severidade) e ações (especialidade, urgência, observação).

CREATE TABLE IF NOT EXISTS public.clinical_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  /** Quem criou: médico ou clínica; admin pode criar global (created_by NULL). */
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  /** Condições: { "complaint_contains": ["dor de cabeça"], "min_severity": 7, "symptoms_any": ["febre"] } */
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  /** Ações: { "suggested_specialty": "neurologia", "urgency": "alta", "note": "Verificar sinais de meningite" } */
  actions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clinical_protocols_active
  ON public.clinical_protocols(is_active) WHERE is_active = true;

ALTER TABLE public.clinical_protocols ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone authenticated reads active protocols" ON public.clinical_protocols;
CREATE POLICY "anyone authenticated reads active protocols" ON public.clinical_protocols
  FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "doctor or admin manages own protocols" ON public.clinical_protocols;
CREATE POLICY "doctor or admin manages own protocols" ON public.clinical_protocols
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'doctor'::public.app_role)
    OR auth.uid() = created_by
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'doctor'::public.app_role)
    OR auth.uid() = created_by
  );

NOTIFY pgrst, 'reload schema';
