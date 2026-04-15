
-- ============================================================
-- 1. ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin','doctor','patient','clinic','reception','support','partner','laudista','ophthalmologist');
CREATE TYPE public.appointment_status AS ENUM ('scheduled','waiting','in_progress','completed','cancelled','no_show','payment_pending');
CREATE TYPE public.appointment_type AS ENUM ('first_visit','return','urgency');
CREATE TYPE public.approval_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.ticket_status AS ENUM ('open','in_progress','resolved','closed');
CREATE TYPE public.ticket_priority AS ENUM ('low','medium','high','critical');

-- ============================================================
-- 2. HELPER FUNCTION (no dependency)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- 3. user_roles TABLE FIRST (has_role depends on it)
-- ============================================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. has_role SECURITY DEFINER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- RLS for user_roles (now has_role exists)
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. CORE TABLES
-- ============================================================

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  first_name text,
  last_name text,
  phone text,
  cpf text UNIQUE,
  avatar_url text,
  date_of_birth date,
  gender text,
  address_street text,
  address_city text,
  address_state text,
  address_zip text,
  social_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text UNIQUE,
  description text,
  icon text,
  min_price numeric DEFAULT 0,
  max_price numeric DEFAULT 9999,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view specialties" ON public.specialties FOR SELECT USING (true);
CREATE POLICY "Admins manage specialties" ON public.specialties FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.doctor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  crm text, crm_state text, crm_verified boolean DEFAULT false, crm_verified_at timestamptz,
  bio text, price numeric DEFAULT 0, return_price numeric DEFAULT 0,
  consultation_duration integer DEFAULT 30,
  is_approved boolean DEFAULT false, is_active boolean DEFAULT true, is_on_duty boolean DEFAULT false,
  slug text UNIQUE, professional_photo_url text, areas_of_expertise text[], social_name text,
  kyc_status text DEFAULT 'pending', kyc_face_match_score numeric, kyc_verified_at timestamptz,
  pix_key text, pix_key_type text,
  rating_avg numeric DEFAULT 0, rating_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_doctor_profiles_updated_at BEFORE UPDATE ON public.doctor_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Public view approved doctors" ON public.doctor_profiles FOR SELECT USING (is_approved = true OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Doctors update own profile" ON public.doctor_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Doctors insert own profile" ON public.doctor_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage doctor profiles" ON public.doctor_profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.doctor_specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid REFERENCES public.doctor_profiles(id) ON DELETE CASCADE NOT NULL,
  specialty_id uuid REFERENCES public.specialties(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(doctor_id, specialty_id)
);
ALTER TABLE public.doctor_specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view doctor specialties" ON public.doctor_specialties FOR SELECT USING (true);
CREATE POLICY "Doctors manage own specialties" ON public.doctor_specialties FOR ALL USING (
  EXISTS (SELECT 1 FROM public.doctor_profiles dp WHERE dp.id = doctor_id AND dp.user_id = auth.uid())
);
CREATE POLICY "Admins manage doctor specialties" ON public.doctor_specialties FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.clinic_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name text, cnpj text UNIQUE, phone text, address text, city text, state text,
  is_approved boolean DEFAULT false, logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.clinic_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_clinic_profiles_updated_at BEFORE UPDATE ON public.clinic_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Clinics view own profile" ON public.clinic_profiles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clinics update own profile" ON public.clinic_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Clinics insert own profile" ON public.clinic_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage clinic profiles" ON public.clinic_profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.partner_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name text, is_approved boolean DEFAULT false, commission_rate numeric DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_partner_profiles_updated_at BEFORE UPDATE ON public.partner_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Partners view own" ON public.partner_profiles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Partners update own" ON public.partner_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Partners insert own" ON public.partner_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage partners" ON public.partner_profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.clinic_affiliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinic_profiles(id) ON DELETE CASCADE NOT NULL,
  doctor_id uuid REFERENCES public.doctor_profiles(id) ON DELETE CASCADE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(clinic_id, doctor_id)
);
ALTER TABLE public.clinic_affiliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View affiliations" ON public.clinic_affiliations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.clinic_profiles cp WHERE cp.id = clinic_id AND cp.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.doctor_profiles dp WHERE dp.id = doctor_id AND dp.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Manage affiliations" ON public.clinic_affiliations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.clinic_profiles cp WHERE cp.id = clinic_id AND cp.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- ============================================================
-- 6. APPOINTMENTS & SCHEDULING
-- ============================================================

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES auth.users(id),
  doctor_id uuid REFERENCES public.doctor_profiles(id) NOT NULL,
  clinic_id uuid REFERENCES public.clinic_profiles(id),
  scheduled_at timestamptz NOT NULL,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  appointment_type appointment_type DEFAULT 'first_visit',
  duration_minutes integer DEFAULT 30, price numeric DEFAULT 0, notes text,
  cancellation_reason text, cancelled_by uuid, jitsi_room_id text,
  payment_id text, payment_status text DEFAULT 'pending',
  started_at timestamptz, ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_scheduled ON public.appointments(scheduled_at);

CREATE POLICY "Patients view own appointments" ON public.appointments FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Doctors view own appointments" ON public.appointments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.doctor_profiles dp WHERE dp.id = doctor_id AND dp.user_id = auth.uid())
);
CREATE POLICY "Admins view all appointments" ON public.appointments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Patients create appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Doctors update own appointments" ON public.appointments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.doctor_profiles dp WHERE dp.id = doctor_id AND dp.user_id = auth.uid())
);
CREATE POLICY "Patients update own appointments" ON public.appointments FOR UPDATE USING (auth.uid() = patient_id);
CREATE POLICY "Admins manage all appointments" ON public.appointments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid REFERENCES public.doctor_profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL, end_time time NOT NULL, is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view slots" ON public.availability_slots FOR SELECT USING (true);
CREATE POLICY "Doctors manage own slots" ON public.availability_slots FOR ALL USING (
  EXISTS (SELECT 1 FROM public.doctor_profiles dp WHERE dp.id = doctor_id AND dp.user_id = auth.uid())
);
CREATE POLICY "Admins manage slots" ON public.availability_slots FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.doctor_absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid REFERENCES public.doctor_profiles(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL, end_date date NOT NULL, reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.doctor_absences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors manage own absences" ON public.doctor_absences FOR ALL USING (
  EXISTS (SELECT 1 FROM public.doctor_profiles dp WHERE dp.id = doctor_id AND dp.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TABLE public.appointment_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES auth.users(id) NOT NULL,
  doctor_id uuid REFERENCES public.doctor_profiles(id),
  specialty_id uuid REFERENCES public.specialties(id),
  preferred_date date, notes text, is_notified boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.appointment_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients manage own waitlist" ON public.appointment_waitlist FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "Admins manage waitlist" ON public.appointment_waitlist FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.on_demand_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES auth.users(id) NOT NULL,
  specialty_id uuid REFERENCES public.specialties(id),
  status text DEFAULT 'waiting', priority integer DEFAULT 0,
  assigned_doctor_id uuid REFERENCES public.doctor_profiles(id),
  symptoms text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.on_demand_queue ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_on_demand_queue_updated_at BEFORE UPDATE ON public.on_demand_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Patients manage own queue" ON public.on_demand_queue FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "Doctors view queue" ON public.on_demand_queue FOR SELECT USING (public.has_role(auth.uid(), 'doctor'));
CREATE POLICY "Admins manage queue" ON public.on_demand_queue FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 7. MEDICAL RECORDS & DOCUMENTS
-- ============================================================

CREATE TABLE public.medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES auth.users(id) NOT NULL,
  doctor_id uuid REFERENCES public.doctor_profiles(id),
  appointment_id uuid REFERENCES public.appointments(id),
  record_type text DEFAULT 'consultation',
  chief_complaint text, history_present_illness text, physical_exam text,
  assessment text, plan text, icd_codes text[], vitals jsonb,
  soap_subjective text, soap_objective text, soap_assessment text, soap_plan text,
  is_draft boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON public.medical_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_medical_records_patient ON public.medical_records(patient_id);
CREATE POLICY "Patients view own records" ON public.medical_records FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Doctors manage records" ON public.medical_records FOR ALL USING (
  EXISTS (SELECT 1 FROM public.doctor_profiles dp WHERE dp.id = doctor_id AND dp.user_id = auth.uid())
);
CREATE POLICY "Admins view records" ON public.medical_records FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.consultation_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  doctor_id uuid REFERENCES public.doctor_profiles(id) NOT NULL,
  patient_id uuid REFERENCES auth.users(id) NOT NULL,
  content text, note_type text DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.consultation_notes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_consultation_notes_updated_at BEFORE UPDATE ON public.consultation_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Doctors manage own notes" ON public.consultation_notes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.doctor_profiles dp WHERE dp.id = doctor_id AND dp.user_id = auth.uid())
);
CREATE POLICY "Patients view own notes" ON public.consultation_notes FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Admins view notes" ON public.consultation_notes FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES auth.users(id) NOT NULL,
  doctor_id uuid REFERENCES public.doctor_profiles(id) NOT NULL,
  appointment_id uuid REFERENCES public.appointments(id),
  prescription_type text DEFAULT 'simple',
  medications jsonb, instructions text, diagnosis text,
  is_signed boolean DEFAULT false, signature_hash text, signed_at timestamptz,
  valid_until date, pdf_url text, verification_code text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Patients view own prescriptions" ON public.prescriptions FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Doctors manage prescriptions" ON public.prescriptions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.doctor_profiles dp WHERE dp.id = doctor_id AND dp.user_id = auth.uid())
);
CREATE POLICY "Admins view prescriptions" ON public.prescriptions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.prescription_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid REFERENCES public.prescriptions(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES auth.users(id) NOT NULL,
  doctor_id uuid REFERENCES public.doctor_profiles(id) NOT NULL,
  status text DEFAULT 'pending', notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prescription_renewals ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_prescription_renewals_updated_at BEFORE UPDATE ON public.prescription_renewals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Patients manage own renewals" ON public.prescription_renewals FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "Doctors manage renewals" ON public.prescription_renewals FOR ALL USING (
  EXISTS (SELECT 1 FROM public.doctor_profiles dp WHERE dp.id = doctor_id AND dp.user_id = auth.uid())
);

CREATE TABLE public.prescription_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid REFERENCES public.prescriptions(id),
  verification_code text, validated_at timestamptz DEFAULT now(),
  validator_ip text, validator_user_agent text, is_valid boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prescription_validations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can validate" ON public.prescription_validations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view validations" ON public.prescription_validations FOR SELECT USING (true);

CREATE TABLE public.patient_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES auth.users(id) NOT NULL,
  doctor_id uuid REFERENCES public.doctor_profiles(id),
  document_type text NOT NULL, title text, file_url text, file_name text, mime_type text, notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients view own docs" ON public.patient_documents FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Patients insert own docs" ON public.patient_documents FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Doctors view patient docs" ON public.patient_documents FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.doctor_profiles dp WHERE dp.id = doctor_id AND dp.user_id = auth.uid())
);
CREATE POLICY "Admins view docs" ON public.patient_documents FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.document_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_hash text NOT NULL, document_type text,
  signer_id uuid REFERENCES auth.users(id),
  verification_method text, is_valid boolean DEFAULT true,
  verified_at timestamptz DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.document_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can verify" ON public.document_verifications FOR SELECT USING (true);
CREATE POLICY "Signers create verifications" ON public.document_verifications FOR INSERT WITH CHECK (auth.uid() = signer_id);

-- ============================================================
-- 8. EXAMS & LAUDOS
-- ============================================================

CREATE TABLE public.aloc_exames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES auth.users(id),
  clinic_id uuid REFERENCES public.clinic_profiles(id),
  doctor_id uuid REFERENCES public.doctor_profiles(id),
  exam_type text, title text, status text DEFAULT 'pending',
  file_url text, orthanc_study_id text, notes text, priority text DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.aloc_exames ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_aloc_exames_updated_at BEFORE UPDATE ON public.aloc_exames FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Patients view own exams" ON public.aloc_exames FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Clinics manage exams" ON public.aloc_exames FOR ALL USING (
  EXISTS (SELECT 1 FROM public.clinic_profiles cp WHERE cp.id = clinic_id AND cp.user_id = auth.uid())
);
CREATE POLICY "Doctors view exams" ON public.aloc_exames FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.doctor_profiles dp WHERE dp.id = doctor_id AND dp.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'laudista')
);
CREATE POLICY "Admins manage exams" ON public.aloc_exames FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.aloc_laudos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid REFERENCES public.aloc_exames(id) ON DELETE CASCADE,
  laudista_id uuid REFERENCES auth.users(id),
  doctor_id uuid REFERENCES public.doctor_profiles(id),
  content text, html_content text, status text DEFAULT 'pending',
  priority text DEFAULT 'normal', signature_hash text, signed_at timestamptz,
  pdf_url text, sla_deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.aloc_laudos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_aloc_laudos_updated_at BEFORE UPDATE ON public.aloc_laudos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Laudistas manage own laudos" ON public.aloc_laudos FOR ALL USING (auth.uid() = laudista_id OR public.has_role(auth.uid(), 'laudista'));
CREATE POLICY "Doctors view laudos" ON public.aloc_laudos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.doctor_profiles dp WHERE dp.id = doctor_id AND dp.user_id = auth.uid())
);
CREATE POLICY "Admins manage laudos" ON public.aloc_laudos FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.exam_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid REFERENCES public.aloc_exames(id),
  doctor_id uuid REFERENCES public.doctor_profiles(id),
  report_content text, status text DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exam_reports ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_exam_reports_updated_at BEFORE UPDATE ON public.exam_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Doctors manage own reports" ON public.exam_reports FOR ALL USING (
  EXISTS (SELECT 1 FROM public.doctor_profiles dp WHERE dp.id = doctor_id AND dp.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TABLE public.exam_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES auth.users(id) NOT NULL,
  doctor_id uuid REFERENCES public.doctor_profiles(id) NOT NULL,
  appointment_id uuid REFERENCES public.appointments(id),
  exam_types text[], clinical_indication text, notes text, status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exam_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients view own requests" ON public.exam_requests FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Doctors manage requests" ON public.exam_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM public.doctor_profiles dp WHERE dp.id = doctor_id AND dp.user_id = auth.uid())
);
CREATE POLICY "Admins view requests" ON public.exam_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 9. OPHTHALMOLOGY
-- ============================================================

CREATE TABLE public.ophthalmology_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES auth.users(id) NOT NULL,
  doctor_id uuid REFERENCES public.doctor_profiles(id),
  exam_type text, eye text, results jsonb,
  visual_acuity_od text, visual_acuity_os text,
  intraocular_pressure_od numeric, intraocular_pressure_os numeric,
  notes text, status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ophthalmology_exams ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_ophthalmology_exams_updated_at BEFORE UPDATE ON public.ophthalmology_exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Patients view own ophtho exams" ON public.ophthalmology_exams FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Doctors manage ophtho exams" ON public.ophthalmology_exams FOR ALL USING (
  EXISTS (SELECT 1 FROM public.doctor_profiles dp WHERE dp.id = doctor_id AND dp.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'ophthalmologist') OR public.has_role(auth.uid(), 'admin')
);

CREATE TABLE public.ophthalmology_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES auth.users(id) NOT NULL,
  doctor_id uuid REFERENCES public.doctor_profiles(id) NOT NULL,
  exam_id uuid REFERENCES public.ophthalmology_exams(id),
  prescription_data jsonb, notes text, pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ophthalmology_prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients view own ophtho rx" ON public.ophthalmology_prescriptions FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Doctors manage ophtho rx" ON public.ophthalmology_prescriptions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.doctor_profiles dp WHERE dp.id = doctor_id AND dp.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- ============================================================
-- 10. FINANCIAL
-- ============================================================

CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  amount numeric NOT NULL, type text NOT NULL, description text,
  reference_id uuid, balance_after numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_wallet_transactions_user ON public.wallet_transactions(user_id);
CREATE POLICY "Users view own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all transactions" ON public.wallet_transactions FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System inserts transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  amount numeric NOT NULL, pix_key text, pix_key_type text,
  status text DEFAULT 'pending', processed_at timestamptz, admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_withdrawal_requests_updated_at BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Users view own withdrawals" ON public.withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create withdrawals" ON public.withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage withdrawals" ON public.withdrawal_requests FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE, discount_type text DEFAULT 'percentage',
  discount_value numeric NOT NULL, max_uses integer, current_uses integer DEFAULT 0,
  valid_from timestamptz DEFAULT now(), valid_until timestamptz, is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active coupons" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage coupons" ON public.coupons FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, description text, price numeric NOT NULL,
  interval text DEFAULT 'monthly', features jsonb,
  is_active boolean DEFAULT true, display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Admins manage plans" ON public.plans FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  plan_id uuid REFERENCES public.plans(id),
  status text DEFAULT 'active', payment_id text,
  started_at timestamptz DEFAULT now(), expires_at timestamptz, cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 11. COMMUNICATION & NOTIFICATIONS
-- ============================================================

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL, body text, type text DEFAULT 'info',
  is_read boolean DEFAULT false, action_url text, metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System creates notifications" ON public.notifications FOR INSERT WITH CHECK (true);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) NOT NULL,
  receiver_id uuid REFERENCES auth.users(id),
  content text, message_type text DEFAULT 'text', file_url text, is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_messages_appointment ON public.messages(appointment_id);
CREATE POLICY "Participants view messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL, p256dh text, auth_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push subs" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 12. SUPPORT
-- ============================================================

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  assigned_to uuid REFERENCES auth.users(id),
  subject text NOT NULL, description text,
  status ticket_status DEFAULT 'open', priority ticket_priority DEFAULT 'medium',
  category text, resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Users view own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Support manages tickets" ON public.support_tickets FOR ALL USING (
  public.has_role(auth.uid(), 'support') OR public.has_role(auth.uid(), 'admin')
);

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES auth.users(id) NOT NULL,
  content text NOT NULL, is_internal boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ticket participants view messages" ON public.support_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.support_tickets st WHERE st.id = ticket_id AND (st.user_id = auth.uid() OR st.assigned_to = auth.uid()))
  OR public.has_role(auth.uid(), 'support') OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Users send support messages" ON public.support_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE TABLE public.support_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  agent_id uuid REFERENCES auth.users(id),
  content text NOT NULL, is_from_agent boolean DEFAULT false, session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own chat" ON public.support_chat_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users send chat" ON public.support_chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Support views chat" ON public.support_chat_messages FOR ALL USING (
  public.has_role(auth.uid(), 'support') OR public.has_role(auth.uid(), 'admin')
);

-- ============================================================
-- 13. PATIENT HEALTH
-- ============================================================

CREATE TABLE public.dependents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid REFERENCES auth.users(id) NOT NULL,
  first_name text NOT NULL, last_name text, cpf text, date_of_birth date, relationship text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_dependents_updated_at BEFORE UPDATE ON public.dependents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Guardians manage dependents" ON public.dependents FOR ALL USING (auth.uid() = guardian_id);

CREATE TABLE public.health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES auth.users(id) NOT NULL,
  metric_type text NOT NULL, value numeric, unit text, notes text,
  measured_at timestamptz DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients manage own metrics" ON public.health_metrics FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "Doctors view patient metrics" ON public.health_metrics FOR SELECT USING (public.has_role(auth.uid(), 'doctor'));

CREATE TABLE public.symptom_diary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES auth.users(id) NOT NULL,
  symptom text NOT NULL, severity integer DEFAULT 5, notes text,
  recorded_at timestamptz DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.symptom_diary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients manage own diary" ON public.symptom_diary FOR ALL USING (auth.uid() = patient_id);

CREATE TABLE public.pre_consultation_symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  patient_id uuid REFERENCES auth.users(id) NOT NULL,
  symptoms text[], duration text, severity integer, additional_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pre_consultation_symptoms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients manage own symptoms" ON public.pre_consultation_symptoms FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "Doctors view symptoms" ON public.pre_consultation_symptoms FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.appointments a WHERE a.id = appointment_id AND EXISTS (
    SELECT 1 FROM public.doctor_profiles dp WHERE dp.id = a.doctor_id AND dp.user_id = auth.uid()
  ))
);

CREATE TABLE public.favorite_doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES auth.users(id) NOT NULL,
  doctor_id uuid REFERENCES public.doctor_profiles(id) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(patient_id, doctor_id)
);
ALTER TABLE public.favorite_doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients manage favorites" ON public.favorite_doctors FOR ALL USING (auth.uid() = patient_id);

-- ============================================================
-- 14. CONSENT & COMPLIANCE
-- ============================================================

CREATE TABLE public.patient_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES auth.users(id) NOT NULL,
  consent_type text NOT NULL, version text,
  accepted boolean DEFAULT false, accepted_at timestamptz,
  ip_address text, user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients manage own consents" ON public.patient_consents FOR ALL USING (auth.uid() = patient_id);
CREATE POLICY "Admins view consents" ON public.patient_consents FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  consent_type text NOT NULL, version text,
  accepted boolean DEFAULT false, accepted_at timestamptz,
  ip_address text, user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own consents" ON public.user_consents FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- 15. SATISFACTION
-- ============================================================

CREATE TABLE public.satisfaction_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id),
  patient_id uuid REFERENCES auth.users(id) NOT NULL,
  doctor_id uuid REFERENCES public.doctor_profiles(id),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text, nps_score integer CHECK (nps_score BETWEEN 0 AND 10), would_recommend boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.satisfaction_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Patients create surveys" ON public.satisfaction_surveys FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Patients view own surveys" ON public.satisfaction_surveys FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Doctors view own surveys" ON public.satisfaction_surveys FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.doctor_profiles dp WHERE dp.id = doctor_id AND dp.user_id = auth.uid())
);
CREATE POLICY "Admins view all surveys" ON public.satisfaction_surveys FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 16. SITE CONFIG & CMS
-- ============================================================

CREATE TABLE public.site_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE, value jsonb,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_site_config_updated_at BEFORE UPDATE ON public.site_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Anyone can read config" ON public.site_config FOR SELECT USING (true);
CREATE POLICY "Admins manage config" ON public.site_config FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL, answer text NOT NULL, category text,
  display_order integer DEFAULT 0, is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view FAQs" ON public.faq_items FOR SELECT USING (true);
CREATE POLICY "Admins manage FAQs" ON public.faq_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, role text, content text NOT NULL, avatar_url text,
  rating integer DEFAULT 5, is_active boolean DEFAULT true, display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view testimonials" ON public.testimonials FOR SELECT USING (true);
CREATE POLICY "Admins manage testimonials" ON public.testimonials FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE, is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view subscribers" ON public.newsletter_subscribers FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE, value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Anyone can read settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage settings" ON public.app_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 17. ACTIVITY & MONITORING
-- ============================================================

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id), action text NOT NULL,
  entity_type text, entity_id uuid, metadata jsonb, ip_address text, user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON public.activity_logs(action);
CREATE POLICY "Users view own logs" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System creates logs" ON public.activity_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view all logs" ON public.activity_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.user_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
  status text DEFAULT 'offline', last_seen_at timestamptz DEFAULT now(), current_page text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_user_presence_updated_at BEFORE UPDATE ON public.user_presence FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Anyone can view presence" ON public.user_presence FOR SELECT USING (true);
CREATE POLICY "Users update own presence" ON public.user_presence FOR ALL USING (auth.uid() = user_id);

CREATE TABLE public.video_presence_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  event_type text NOT NULL, metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.video_presence_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users create own logs" ON public.video_presence_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view logs" ON public.video_presence_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 18. INVITE CODES & GUESTS
-- ============================================================

CREATE TABLE public.doctor_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid REFERENCES public.doctor_profiles(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL UNIQUE, max_uses integer DEFAULT 1, current_uses integer DEFAULT 0,
  is_active boolean DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.doctor_invite_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors manage own codes" ON public.doctor_invite_codes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.doctor_profiles dp WHERE dp.id = doctor_id AND dp.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TABLE public.guest_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL, cpf text, phone text, email text, date_of_birth date,
  created_by uuid REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guest_patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators manage guests" ON public.guest_patients FOR ALL USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 19. B2B & CMS
-- ============================================================

CREATE TABLE public.b2b_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL, contact_name text, email text, phone text,
  message text, status text DEFAULT 'new', created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.b2b_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit lead" ON public.b2b_leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view leads" ON public.b2b_leads FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.site_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE, title text, content jsonb,
  is_visible boolean DEFAULT true, display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_sections ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_site_sections_updated_at BEFORE UPDATE ON public.site_sections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Anyone can view sections" ON public.site_sections FOR SELECT USING (true);
CREATE POLICY "Admins manage sections" ON public.site_sections FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.site_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL, path text, name text, mime_type text, size_bytes bigint, alt_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view media" ON public.site_media FOR SELECT USING (true);
CREATE POLICY "Admins manage media" ON public.site_media FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 20. RPC FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_public_doctor_profile(p_doctor_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', dp.id, 'slug', dp.slug, 'bio', dp.bio, 'price', dp.price,
    'return_price', dp.return_price, 'consultation_duration', dp.consultation_duration,
    'professional_photo_url', dp.professional_photo_url, 'rating_avg', dp.rating_avg,
    'rating_count', dp.rating_count, 'crm', dp.crm, 'crm_state', dp.crm_state,
    'crm_verified', dp.crm_verified, 'areas_of_expertise', dp.areas_of_expertise,
    'first_name', p.first_name, 'last_name', p.last_name, 'avatar_url', p.avatar_url
  ) INTO result
  FROM doctor_profiles dp JOIN profiles p ON p.user_id = dp.user_id
  WHERE dp.id = p_doctor_id AND dp.is_approved = true;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_doctor_slug(p_slug text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM doctor_profiles WHERE slug = p_slug AND is_approved = true LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.search_doctor_by_name(p_query text)
RETURNS SETOF jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id', dp.id, 'slug', dp.slug, 'price', dp.price,
    'first_name', p.first_name, 'last_name', p.last_name,
    'avatar_url', p.avatar_url, 'crm_verified', dp.crm_verified
  )
  FROM doctor_profiles dp JOIN profiles p ON p.user_id = dp.user_id
  WHERE dp.is_approved = true
    AND (p.first_name ILIKE '%' || p_query || '%' OR p.last_name ILIKE '%' || p_query || '%')
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.fn_admin_doctor_kyc_list()
RETURNS SETOF jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'doctor_id', id, 'kyc_status', kyc_status,
    'kyc_face_match_score', kyc_face_match_score, 'kyc_verified_at', kyc_verified_at
  ) FROM doctor_profiles;
$$;

CREATE OR REPLACE FUNCTION public.fn_admin_set_doctor_kyc(p_doctor_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE doctor_profiles SET kyc_status = p_status,
    kyc_verified_at = CASE WHEN p_status = 'approved' THEN now() ELSE NULL END
  WHERE id = p_doctor_id;
END;
$$;

-- ============================================================
-- 21. STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('patient-documents', 'patient-documents', false),
  ('prescriptions', 'prescriptions', false),
  ('exam-files', 'exam-files', false),
  ('recordings', 'recordings', false),
  ('site-media', 'site-media', true),
  ('chat-attachments', 'chat-attachments', false),
  ('exames', 'exames', false),
  ('laudos-assinados', 'laudos-assinados', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users view own patient docs" ON storage.objects FOR SELECT USING (bucket_id = 'patient-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own patient docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'patient-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users view own prescriptions" ON storage.objects FOR SELECT USING (bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Doctors upload prescriptions" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'prescriptions' AND public.has_role(auth.uid(), 'doctor'));
CREATE POLICY "Users view own exam files" ON storage.objects FOR SELECT USING (bucket_id = 'exam-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Clinics upload exam files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'exam-files' AND (public.has_role(auth.uid(), 'clinic') OR public.has_role(auth.uid(), 'doctor')));
CREATE POLICY "Public site media" ON storage.objects FOR SELECT USING (bucket_id = 'site-media');
CREATE POLICY "Admins upload site media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete site media" ON storage.objects FOR DELETE USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Chat participants view attachments" ON storage.objects FOR SELECT USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload chat attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Clinics upload exames" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'exames' AND public.has_role(auth.uid(), 'clinic'));
CREATE POLICY "Authorized view exames" ON storage.objects FOR SELECT USING (bucket_id = 'exames' AND (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'laudista') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Laudistas upload laudos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'laudos-assinados' AND (public.has_role(auth.uid(), 'laudista') OR public.has_role(auth.uid(), 'doctor')));
CREATE POLICY "Authorized view laudos" ON storage.objects FOR SELECT USING (bucket_id = 'laudos-assinados' AND (public.has_role(auth.uid(), 'doctor') OR public.has_role(auth.uid(), 'laudista') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Doctors view recordings" ON storage.objects FOR SELECT USING (bucket_id = 'recordings' AND public.has_role(auth.uid(), 'doctor'));
CREATE POLICY "System upload recordings" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'recordings');

-- ============================================================
-- 22. REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.on_demand_queue;

-- ============================================================
-- 23. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
