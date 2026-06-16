-- =========================================================
-- 1) Enum dos tipos de documento legal
-- =========================================================
DO $$ BEGIN
  CREATE TYPE public.legal_doc_kind AS ENUM (
    'platform_terms',      -- Termos de Uso da Plataforma + Política Paciente
    'telemed_scheduled',   -- Termo de Consentimento Telemedicina (agendada)
    'telemed_ondemand',    -- Termo de Pronto-Atendimento (on-demand/urgência)
    'telemed_contract'     -- Termo de Consulta via Contrato B2B/B2G
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- 2) Tabela de documentos legais (versionada)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         public.legal_doc_kind NOT NULL,
  version      integer NOT NULL,
  title        text NOT NULL,
  body_md      text NOT NULL,
  is_active    boolean NOT NULL DEFAULT false,
  effective_at timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, version)
);

CREATE INDEX IF NOT EXISTS idx_legal_documents_kind_active
  ON public.legal_documents (kind, is_active) WHERE is_active;

GRANT SELECT ON public.legal_documents TO anon, authenticated;
GRANT ALL    ON public.legal_documents TO service_role;

ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents FORCE ROW LEVEL SECURITY;

CREATE POLICY "legal_documents read active"
  ON public.legal_documents FOR SELECT
  USING (is_active OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "legal_documents admin manage"
  ON public.legal_documents FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public._touch_legal_documents()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_legal_documents_touch ON public.legal_documents;
CREATE TRIGGER trg_legal_documents_touch
  BEFORE UPDATE ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public._touch_legal_documents();

-- Garante apenas 1 versão ativa por kind
CREATE OR REPLACE FUNCTION public._ensure_single_active_legal()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_active THEN
    UPDATE public.legal_documents
      SET is_active = false
      WHERE kind = NEW.kind AND id <> NEW.id AND is_active;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_legal_single_active ON public.legal_documents;
CREATE TRIGGER trg_legal_single_active
  AFTER INSERT OR UPDATE OF is_active ON public.legal_documents
  FOR EACH ROW EXECUTE FUNCTION public._ensure_single_active_legal();

-- =========================================================
-- 3) Aceites por consulta (imutáveis)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.consultation_consents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind            public.legal_doc_kind NOT NULL,
  document_id     uuid NOT NULL REFERENCES public.legal_documents(id),
  document_version integer NOT NULL,
  body_snapshot   text NOT NULL,
  body_sha256     text NOT NULL,
  ip              text,
  user_agent      text,
  accepted_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consult_consents_user
  ON public.consultation_consents (user_id, accepted_at DESC);
CREATE INDEX IF NOT EXISTS idx_consult_consents_appt
  ON public.consultation_consents (appointment_id);

GRANT SELECT, INSERT ON public.consultation_consents TO authenticated;
GRANT ALL ON public.consultation_consents TO service_role;

ALTER TABLE public.consultation_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_consents FORCE ROW LEVEL SECURITY;

CREATE POLICY "consult_consents owner read"
  ON public.consultation_consents FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "consult_consents owner insert"
  ON public.consultation_consents FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Bloqueia UPDATE/DELETE (imutabilidade CFM/LGPD)
CREATE OR REPLACE FUNCTION public._block_consult_consent_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'consultation_consents é imutável'; END $$;

DROP TRIGGER IF EXISTS trg_consult_consents_no_update ON public.consultation_consents;
CREATE TRIGGER trg_consult_consents_no_update
  BEFORE UPDATE OR DELETE ON public.consultation_consents
  FOR EACH ROW EXECUTE FUNCTION public._block_consult_consent_mutation();

-- =========================================================
-- 4) Seed v1 dos 4 contratos
-- =========================================================
INSERT INTO public.legal_documents (kind, version, title, body_md, is_active) VALUES
('platform_terms', 1, 'Termos de Uso da AloClínica e Política do Paciente', $md$
# Termos de Uso da AloClínica

**Última atualização:** 16/06/2026 — versão 1

## 1. Aceitação
Ao criar conta, você concorda integralmente com estes Termos, com a Política de Privacidade (LGPD — Lei 13.709/2018) e com as normas do **CFM 2.314/2022** sobre telemedicina.

## 2. Quem somos
A **AloClínica** é uma plataforma de telemedicina que conecta pacientes a médicos regularmente inscritos em seus respectivos Conselhos Regionais (CRM ativo).

## 3. Cadastro
- Cadastro permitido apenas para pessoas com **16 anos ou mais**. Menores devem ser assistidos por responsável legal.
- A verificação de identidade (KYC com biometria facial) é **obrigatória** antes da primeira consulta.
- Você é responsável pela veracidade dos dados informados.

## 4. Natureza do serviço
A AloClínica fornece a **infraestrutura tecnológica**. O ato médico é praticado **pelo médico**, que é o único responsável clínico pela conduta, prescrições, atestados e laudos emitidos.

## 5. Limites da telemedicina
Telemedicina **não substitui** atendimento presencial em emergências (dor torácica intensa, AVC, trauma grave, perda de consciência). Em emergência ligue **192 (SAMU)** ou vá ao pronto-socorro mais próximo.

## 6. Pagamentos
- Pagamentos processados via **MercadoPago** (PIX, cartão, boleto).
- Reembolsos seguem a Política de Reembolso publicada.

## 7. LGPD
- Seus dados de saúde são **dados sensíveis** (art. 11 da LGPD).
- Base legal: execução de contrato, tutela da saúde e consentimento.
- Você pode exercer seus direitos (acesso, correção, anonimização, portabilidade, eliminação) em `/privacidade`.
- Retenção: **20 anos** para prontuário (Resolução CFM 1.821/2007).

## 8. Conta e segurança
Mantenha suas credenciais seguras. Não compartilhe sua senha. Atividades suspeitas devem ser reportadas a `suporte@aloclinica.com.br`.

## 9. Conduta proibida
- Falsidade ideológica.
- Tentativas de fraude ou engenharia social com médicos.
- Gravação não autorizada das consultas.

## 10. Encerramento de conta
Você pode encerrar sua conta a qualquer momento em **Perfil → Encerrar conta**. Dados clínicos permanecerão arquivados pelo prazo legal.

## 11. Alterações
Mudanças relevantes serão notificadas e exigirão novo aceite.

## 12. Foro
Foro da Comarca de São Paulo/SP.
$md$, true),

('telemed_scheduled', 1, 'Termo de Consentimento — Teleconsulta Agendada', $md$
# Termo de Consentimento Livre e Esclarecido — Teleconsulta Agendada

**Resolução CFM 2.314/2022 · Lei 14.510/2022 · LGPD**

Ao confirmar, declaro que:

1. **Compreendi a natureza** da teleconsulta: atendimento médico **a distância** por vídeo, com mesmas implicações éticas e legais de uma consulta presencial.
2. **Estou ciente das limitações**: o médico não pode realizar exame físico direto; eventualmente poderá solicitar exames, encaminhar para presencial ou indicar pronto-socorro.
3. **Autorizo o tratamento dos meus dados de saúde** pela AloClínica e pelo médico atendente para fins assistenciais, com base legal do art. 11, II, "a" e "f" da LGPD.
4. **Concordo com a gravação dos metadados** da chamada (data, hora, duração) — o vídeo NÃO é gravado, exceto se houver consentimento explícito e adicional.
5. **Reconheço a validade jurídica** da prescrição digital assinada com certificado **ICP-Brasil** (MP 2.200-2/2001).
6. Em **emergência**, devo ligar **192 (SAMU)** ou ir ao pronto-socorro mais próximo.
7. **Posso revogar** este consentimento a qualquer momento; revogação não invalida atos já praticados.

Aceito realizar a teleconsulta nas condições acima.
$md$, true),

('telemed_ondemand', 1, 'Termo de Pronto-Atendimento Digital', $md$
# Termo de Pronto-Atendimento Digital (On-Demand)

**Resolução CFM 2.314/2022 · Lei 14.510/2022**

Ao entrar na fila de pronto-atendimento, declaro que:

1. **Compreendo que é um atendimento de pronta resposta** com o **primeiro médico disponível** da especialidade selecionada, sem agendamento prévio.
2. **NÃO é serviço de emergência**. Em risco iminente de vida, devo ligar **192 (SAMU)** imediatamente.
3. **Aceito as limitações da telemedicina** descritas no termo de teleconsulta.
4. **Concordo com a triagem automatizada** por IA, cuja finalidade é apenas direcionar minha demanda — a decisão clínica é exclusiva do médico.
5. **Autorizo o tratamento dos meus dados de saúde** para fins assistenciais (LGPD art. 11).
6. **Reconheço a validade** da prescrição digital com assinatura ICP-Brasil.
7. **Tempo médio de espera** é informado em tela e pode variar; posso sair da fila sem custo até ser chamado.

Aceito entrar no pronto-atendimento nas condições acima.
$md$, true),

('telemed_contract', 1, 'Termo de Consulta via Contrato (B2B/B2G)', $md$
# Termo de Consulta via Contrato Corporativo, Público ou Patrocinado

**CFM 2.314/2022 · LGPD · Lei 14.510/2022**

Ao confirmar, declaro que:

1. **Sou beneficiário(a)** de um contrato (empresa, prefeitura, secretaria, ONG ou ação social) que custeia esta consulta, total ou parcialmente.
2. **Aceito as condições** do termo de teleconsulta padrão da AloClínica.
3. **Autorizo o compartilhamento mínimo necessário** com a entidade contratante:
   - **Dados de utilização**: data, especialidade, status (compareceu/não), valor repassado.
   - **Dados clínicos individuais NÃO são compartilhados** com a entidade — apenas dados anonimizados para painel epidemiológico.
4. **Estou ciente da cota** do contrato: ao se esgotar, novos atendimentos serão particulares (com aviso prévio em tela).
5. **A relação médico-paciente é direta** entre mim e o profissional — a entidade contratante **não interfere** na conduta clínica.
6. **Posso optar** por consulta particular fora do contrato a qualquer momento.

Aceito utilizar minha cota/voucher nesta consulta.
$md$, true);
