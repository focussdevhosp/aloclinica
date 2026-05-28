-- Token único para o feed iCal do médico (Google Calendar / Apple Calendar).
ALTER TABLE public.doctor_profiles
  ADD COLUMN IF NOT EXISTS ical_token uuid;
CREATE UNIQUE INDEX IF NOT EXISTS uq_doctor_profiles_ical_token
  ON public.doctor_profiles(ical_token) WHERE ical_token IS NOT NULL;

NOTIFY pgrst, 'reload schema';
