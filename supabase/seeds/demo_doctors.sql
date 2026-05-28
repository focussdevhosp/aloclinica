-- Seed de médicos demo (idempotente)
-- Login: Teste123! para todos.
-- IDs de especialidades vêm do schema atual.

DO $$
DECLARE
  v_pwd_hash text;
  v_user_id uuid;
  v_doctor_id uuid;
  d RECORD;
BEGIN
  -- Hash de "Teste123!" via crypt (bcrypt) — extension `pgcrypto` já habilitada em Supabase
  v_pwd_hash := crypt('Teste123!', gen_salt('bf'));

  FOR d IN
    SELECT * FROM (VALUES
      ('cardio.demo@aloclinica.com.br',  'Ana',   'Silva',   '12345', 'SP', 'Cardiologia',  120.00, 'Cardiologista clínica com 12 anos de experiência em hipertensão e arritmias.'),
      ('pedi.demo@aloclinica.com.br',    'Bruno', 'Lima',    '54321', 'SP', 'Pediatria',     90.00, 'Pediatra com foco em crescimento e desenvolvimento, vacinação e puericultura.'),
      ('psi.demo@aloclinica.com.br',     'Carla', 'Santos',  '67890', 'SP', 'Psiquiatria',  180.00, 'Psiquiatra com atuação em transtornos de ansiedade e depressão.'),
      ('clinico.demo@aloclinica.com.br', 'Diego', 'Rocha',   '24680', 'RJ', 'Clínica Geral', 80.00, 'Clínico geral, atendimento de adultos com foco em medicina preventiva.'),
      ('derma.demo@aloclinica.com.br',   'Eduarda', 'Mendes','13579', 'MG', 'Dermatologia', 150.00, 'Dermatologista clínica — acne, psoríase, dermatites e teledermatologia.')
    ) AS t(email, first_name, last_name, crm, crm_state, specialty_name, price, bio)
  LOOP
    -- Se já existe, pular
    SELECT id INTO v_user_id FROM auth.users WHERE email = d.email;
    IF v_user_id IS NOT NULL THEN
      RAISE NOTICE 'Médico já existe: %', d.email;
      CONTINUE;
    END IF;

    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      d.email, v_pwd_hash, now(),
      jsonb_build_object('provider','email','providers',jsonb_build_array('email')),
      jsonb_build_object('first_name', d.first_name, 'last_name', d.last_name),
      now(), now(), '', '', '', '', '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', d.email, 'email_verified', true),
      'email', d.email, now(), now(), now()
    );

    -- profile
    INSERT INTO public.profiles (user_id, first_name, last_name, kyc_status)
    VALUES (v_user_id, d.first_name, d.last_name, 'approved')
    ON CONFLICT (user_id) DO NOTHING;

    -- role doctor
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'doctor'::public.app_role)
    ON CONFLICT DO NOTHING;

    -- doctor_profile aprovado + verificado
    INSERT INTO public.doctor_profiles (
      user_id, crm, crm_state, crm_verified, crm_verified_at,
      bio, price, return_price, consultation_duration,
      is_approved, is_active, kyc_status, kyc_verified_at,
      doctor_type, council_type, council_number, council_state
    ) VALUES (
      v_user_id, d.crm, d.crm_state, true, now(),
      d.bio, d.price, ROUND(d.price * 0.5, 2), 30,
      true, true, 'approved', now(),
      'telemedicina', 'CRM', d.crm, d.crm_state
    )
    RETURNING id INTO v_doctor_id;

    -- vínculo da especialidade
    INSERT INTO public.doctor_specialties (doctor_id, specialty_id)
    SELECT v_doctor_id, s.id FROM public.specialties s WHERE s.name = d.specialty_name
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Criado: % — % %', d.email, d.first_name, d.last_name;
  END LOOP;
END$$;

SELECT u.email, p.first_name, p.last_name, dp.crm || '/' || dp.crm_state AS crm, s.name AS specialty, dp.price
FROM auth.users u
JOIN public.profiles p ON p.user_id = u.id
JOIN public.doctor_profiles dp ON dp.user_id = u.id
LEFT JOIN public.doctor_specialties ds ON ds.doctor_id = dp.id
LEFT JOIN public.specialties s ON s.id = ds.specialty_id
WHERE u.email LIKE '%.demo@aloclinica.com.br'
ORDER BY u.email;
