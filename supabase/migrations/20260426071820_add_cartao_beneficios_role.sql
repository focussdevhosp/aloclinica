-- Add 'cartao_beneficios' value to app_role enum so users can have a dedicated
-- benefits-card panel (separate from telemedicine 'patient' role).
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cartao_beneficios';
