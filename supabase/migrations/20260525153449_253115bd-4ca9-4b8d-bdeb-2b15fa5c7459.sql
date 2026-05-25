
-- 1) Fix the FK that blocks user deletion
ALTER TABLE public.user_consents
  DROP CONSTRAINT IF EXISTS user_consents_user_id_fkey;

ALTER TABLE public.user_consents
  ADD CONSTRAINT user_consents_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2) Wipe all users (cascades through profiles, user_roles, etc.)
DELETE FROM auth.users;
