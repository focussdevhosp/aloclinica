-- Extensões da plataforma — crescimento e completude (maio/2026)

-- pré-consulta ganha "queixa principal" estruturada (compatibilidade com IA Clínica)
ALTER TABLE public.pre_consultation_symptoms
  ADD COLUMN IF NOT EXISTS main_complaint text;

-- Templates do médico (snippets SOAP/receita reutilizáveis)
CREATE TABLE IF NOT EXISTS public.doctor_text_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('soap_subjective','soap_objective','soap_assessment','soap_plan','prescription','generic')),
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_doctor_text_templates_doctor
  ON public.doctor_text_templates(doctor_user_id, type);
ALTER TABLE public.doctor_text_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "doctor manages own templates" ON public.doctor_text_templates;
CREATE POLICY "doctor manages own templates" ON public.doctor_text_templates
  FOR ALL USING (auth.uid() = doctor_user_id) WITH CHECK (auth.uid() = doctor_user_id);

-- Marketplace de exames: laboratórios parceiros + pedidos do paciente
CREATE TABLE IF NOT EXISTS public.exam_labs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cnpj text,
  city text,
  state text,
  phone text,
  contact_email text,
  description text,
  exam_types text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exam_labs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone reads active labs" ON public.exam_labs;
CREATE POLICY "anyone reads active labs" ON public.exam_labs FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "admins manage labs" ON public.exam_labs;
CREATE POLICY "admins manage labs" ON public.exam_labs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE IF NOT EXISTS public.exam_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_request_id uuid REFERENCES public.exam_requests(id) ON DELETE SET NULL,
  patient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lab_id uuid NOT NULL REFERENCES public.exam_labs(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','completed','cancelled')),
  preferred_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exam_orders_patient ON public.exam_orders(patient_id);
ALTER TABLE public.exam_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "patient manages own exam order" ON public.exam_orders;
CREATE POLICY "patient manages own exam order" ON public.exam_orders
  FOR ALL USING (auth.uid() = patient_id) WITH CHECK (auth.uid() = patient_id);
DROP POLICY IF EXISTS "admin reads exam orders" ON public.exam_orders;
CREATE POLICY "admin reads exam orders" ON public.exam_orders
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Pacote família (dependentes do titular)
CREATE TABLE IF NOT EXISTS public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holder_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  birth_date date,
  cpf text,
  relationship text,
  phone text,
  email text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_family_members_holder ON public.family_members(holder_user_id);
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "holder manages family" ON public.family_members;
CREATE POLICY "holder manages family" ON public.family_members
  FOR ALL USING (auth.uid() = holder_user_id) WITH CHECK (auth.uid() = holder_user_id);
DROP POLICY IF EXISTS "member sees own row" ON public.family_members;
CREATE POLICY "member sees own row" ON public.family_members
  FOR SELECT USING (auth.uid() = user_id);

-- Frequência de repasse do médico (configurável; impl. financeira fica para Asaas)
ALTER TABLE public.doctor_profiles
  ADD COLUMN IF NOT EXISTS payout_frequency text
    DEFAULT 'monthly'
    CHECK (payout_frequency IN ('daily','weekly','monthly'));

-- Recarrega cache do PostgREST
NOTIFY pgrst, 'reload schema';
