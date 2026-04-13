# 🚀 Deployment Guide - Oftalmologia

## Pré-requisitos
- ✅ Projeto Supabase criado
- ✅ Credenciais: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
- ✅ Node.js v18+

## Passo 1: Executar Migrations

### Opção A: Via Supabase Console (Recomendado)
1. Acesse https://app.supabase.com
2. Vá para seu projeto → SQL Editor
3. Crie uma nova query
4. Cole o conteúdo de cada migration (na ordem):
   - `supabase/migrations/20260413160000_ophthalmology_complete.sql`
   - `supabase/migrations/20260413170000_ophthalmology_notification_column.sql`
   - `supabase/migrations/20260413180000_ophthalmology_prescription_review.sql`
5. Execute cada uma e confira se passou (sem errors)

### Opção B: Via CLI Local
```bash
# Instale Supabase CLI (se não tiver)
brew install supabase/tap/supabase  # macOS
# ou
choco install supabase  # Windows

# No diretório do projeto
supabase db push
```

### Opção C: Via Script TypeScript
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

npx ts-node scripts/deploy-oftalmology.ts
```

## Passo 2: Deploy Edge Functions

```bash
# Instale CLI se não tiver
npm install -g supabase

# Faça login
supabase login

# Deploy as funções
supabase functions deploy generate-ophthalmology-prescription --project-id your-project-id
supabase functions deploy notify-expired-prescriptions --project-id your-project-id
```

## Passo 3: Configurar Cron Job

1. Supabase Console → seu projeto → Database → Cron
2. Clique "New Cron Job"
3. Configure:
   - **Name:** notify-expired-prescriptions
   - **Schedule:** `0 9 * * *` (9am diário)
   - **Function:** notify-expired-prescriptions
   - **Timezone:** America/Sao_Paulo

## Passo 4: Validar Email Template

1. Supabase Console → seu projeto → Email Templates
2. Confira se template `prescription_expiring` está disponível
3. (Template foi adicionado ao `send-email` function automaticamente)

## Passo 5: Teste Básicos

### Teste 1: Agendamento
```bash
curl -X POST https://your-project.supabase.co/rest/v1/appointments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": "user-uuid",
    "doctor_id": "doctor-uuid",
    "scheduled_at": "2026-04-20T14:00:00Z",
    "appointment_type": "oftalmologia",
    "status": "scheduled"
  }'
```

### Teste 2: Exame
```bash
curl -X POST https://your-project.supabase.co/rest/v1/ophthalmology_exams \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "appointment_id": "apt-uuid",
    "patient_id": "user-uuid",
    "doctor_id": "doctor-uuid",
    "od_sphere": -1.5,
    "od_cylinder": -0.5,
    "od_axis": 180,
    "va_od": "20/20"
  }'
```

### Teste 3: Prescrição
```bash
curl -X POST https://your-project.supabase.co/rest/v1/ophthalmology_prescriptions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "exam_id": "exam-uuid",
    "patient_id": "user-uuid",
    "doctor_id": "doctor-uuid",
    "prescription_type": "glasses",
    "od_sphere": -1.5,
    "od_cylinder": -0.5,
    "od_axis": 180,
    "recommended_use": "Uso geral",
    "expiry_date": "2027-04-13"
  }'
```

### Teste 4: PDF Generation
```bash
curl -X POST https://your-project.supabase.co/functions/v1/generate-ophthalmology-prescription \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prescription_id": "presc-uuid"}'
```

## Passo 6: Verificar RLS Policies

1. Supabase Console → seu projeto → Authentication → Policies
2. Confirme que as policies estão ativas:
   - `exams_doctor_read` ✅
   - `exams_doctor_write` ✅
   - `prescriptions_patient_read` ✅
   - `prescriptions_doctor_write` ✅

## Troubleshooting

### Migration falha com "column already exists"
- ✅ Normal se rodar 2x
- Verifique no editor SQL se as colunas foram criadas

### Edge function retorna 404
- Deploy novamente: `supabase functions deploy`
- Confira projeto_id: `supabase projects list`

### Cron job não executa
- Verifique timezone
- Confira logs em Supabase → Functions → Executions
- Tente executar manualmente via API

### PDF não gera
- Verifique se html2pdf.js está instalado: `npm ls html2pdf.js`
- Confirme edge function foi deployed
- Teste generate-ophthalmology-prescription manualmente

## Monitoramento

### Logs de Edge Functions
```bash
supabase functions list
supabase functions download generate-ophthalmology-prescription --project-id your-project-id
```

### Verificar Banco
```sql
-- Verificar oftalmologia_exams
SELECT COUNT(*) FROM public.ophthalmology_exams;

-- Verificar prescrições
SELECT COUNT(*) FROM public.ophthalmology_prescriptions;

-- Verificar notificadas
SELECT COUNT(*) FROM public.ophthalmology_prescriptions 
WHERE notified = true;
```

## Próximas Tarefas (Futuro)
- [ ] Integração com Stripe para pagamento de lentes
- [ ] Webhook de prescrição aprovada → notificação SMS
- [ ] Dashboard KPI para médico
- [ ] Agendamento automático de check-up (30 dias após prescrição)

---

**Status:** ✅ Ready to deploy
**Last Updated:** 2026-04-13
