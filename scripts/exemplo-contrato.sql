-- =============================================================
-- Exemplo pronto: cria um contrato de demonstração para testar subdomínio/path.
-- Rode no SQL editor do Supabase (após aplicar 20260527000000_contratos_glue.sql).
-- Re-executável (ON CONFLICT no subdominio).
--
-- Depois: acesse https://aloclinica.com.br/p/prefeitura-demo  (sem DNS)
--   ou    https://prefeitura-demo.aloclinica.com.br           (com wildcard)
-- =============================================================

INSERT INTO public.contratos
  (nome, tipo, cnpj, modelo_cobranca, valor_consulta, cota_total,
   vigencia_inicio, vigencia_fim, especialidades_permitidas, subdominio, branding, status, observacoes)
VALUES
  ('Prefeitura Demo — Saúde', 'prefeitura', '00.000.000/0001-00', 'gratuito_patrocinado',
   80.00, 500, CURRENT_DATE, NULL, '{}', 'prefeitura-demo',
   '{"nome_exibicao":"Saúde Prefeitura Demo","logo_url":"https://aloclinica.com.br/favicon.ico","primary_hsl":"210 90% 45%"}'::jsonb,
   'ativo', 'Contrato de demonstração criado por script')
ON CONFLICT (subdominio) DO UPDATE
  SET status = 'ativo', branding = EXCLUDED.branding, updated_at = now();

-- Beneficiário de teste (troque pelo SEU CPF para conseguir agendar grátis).
INSERT INTO public.contrato_beneficiarios (contrato_id, cpf, nome, ativo)
SELECT c.id, '12345678909', 'Paciente Teste', true
FROM public.contratos c
WHERE c.subdominio = 'prefeitura-demo'
ON CONFLICT (contrato_id, cpf) DO NOTHING;

-- Verificação: deve retornar 1 linha com o branding.
SELECT * FROM public.resolve_tenant('prefeitura-demo.aloclinica.com.br', NULL);
