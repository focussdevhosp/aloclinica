
-- Add unique constraint on doctor_profiles.user_id
ALTER TABLE public.doctor_profiles
ADD CONSTRAINT doctor_profiles_user_id_unique UNIQUE (user_id);

-- Add unique constraint on clinic_profiles.user_id
ALTER TABLE public.clinic_profiles
ADD CONSTRAINT clinic_profiles_user_id_unique UNIQUE (user_id);
