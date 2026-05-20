import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "@/integrations/supabase/untyped";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/dashboards/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Printer, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getPatientNav } from "./patientNav";

const nav = getPatientNav("appointments");

const formatBRL = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));

const maskCPF = (v?: string | null) => {
  if (!v) return "—";
  const d = v.replace(/\D/g, "");
  if (d.length !== 11) return v;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
};

interface ReceiptData {
  id: string;
  scheduled_at: string;
  appointment_type: string;
  price_at_booking: number | null;
  payment_status: string | null;
  payment_confirmed_at: string | null;
  doctor_name: string;
  doctor_crm: string | null;
  doctor_crm_state: string | null;
  doctor_specialty: string | null;
  patient_name: string;
  patient_cpf: string | null;
  patient_phone: string | null;
  created_at: string | null;
}

const AppointmentReceipt = () => {
  const { appointmentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      if (!appointmentId || !user) return;

      const { data: appt } = await db
        .from("appointments")
        .select("id, scheduled_at, appointment_type, price_at_booking, payment_status, payment_confirmed_at, doctor_id, patient_id, created_at")
        .eq("id", appointmentId)
        .maybeSingle();

      if (!appt) { setLoading(false); return; }

      const [docRes, patRes] = await Promise.all([
        db.from("doctor_profiles_public" as any)
          .select("display_name, full_name, crm, crm_state, specialty_names")
          .eq("id", appt.doctor_id).maybeSingle(),
        db.from("profiles")
          .select("first_name, last_name, cpf, phone")
          .eq("user_id", appt.patient_id).maybeSingle(),
      ]);

      const doc: any = docRes.data;
      const pat: any = patRes.data;

      setData({
        id: appt.id,
        scheduled_at: appt.scheduled_at,
        appointment_type: appt.appointment_type,
        price_at_booking: appt.price_at_booking,
        payment_status: appt.payment_status,
        payment_confirmed_at: appt.payment_confirmed_at,
        created_at: appt.created_at,
        doctor_name: doc?.display_name || doc?.full_name || "Médico AloClínica",
        doctor_crm: doc?.crm ?? null,
        doctor_crm_state: doc?.crm_state ?? null,
        doctor_specialty: doc?.specialty_names?.[0] ?? null,
        patient_name: [pat?.first_name, pat?.last_name].filter(Boolean).join(" ") || "Paciente",
        patient_cpf: pat?.cpf ?? null,
        patient_phone: pat?.phone ?? null,
      });
      setLoading(false);
    };
    fetchAll();
  }, [appointmentId, user]);

  if (loading) {
    return (
      <DashboardLayout title="Recibo" nav={nav}>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout title="Recibo" nav={nav}>
        <div className="text-center py-20">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">Recibo não encontrado.</p>
        </div>
      </DashboardLayout>
    );
  }

  const date = new Date(data.scheduled_at);
  const isPaid = ["approved", "confirmed", "received", "paid"].includes(String(data.payment_status));
  const paidAt = data.payment_confirmed_at ? new Date(data.payment_confirmed_at) : null;
  const issuedAt = paidAt ?? (data.created_at ? new Date(data.created_at) : new Date());

  return (
    <DashboardLayout title="Recibo" nav={nav}>
      <div className="w-full max-w-2xl mx-auto pb-24 md:pb-6">
        <div className="flex items-center justify-between mb-5 print:hidden">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <Button onClick={() => window.print()} className="rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground">
            <Printer className="w-4 h-4 mr-2" /> Imprimir / Salvar PDF
          </Button>
        </div>

        <Card className="overflow-hidden print:border-0 print:shadow-none">
          <CardContent className="p-8 print:p-6">
            {/* Cabeçalho */}
            <div className="flex items-start justify-between border-b border-border pb-5 mb-5">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-bold text-primary mb-1">Recibo de pagamento</p>
                <h1 className="text-2xl font-black text-foreground">AloClínica</h1>
                <p className="text-xs text-muted-foreground mt-1">Plataforma de Telemedicina</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">Nº do recibo</p>
                <p className="font-mono text-sm font-bold text-foreground">{data.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-[11px] text-muted-foreground mt-2">Emitido em</p>
                <p className="text-sm font-semibold text-foreground">{format(issuedAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              </div>
            </div>

            {/* Status */}
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl mb-6 ${isPaid ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"}`}>
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-semibold">
                {isPaid ? "Pagamento confirmado" : "Aguardando confirmação de pagamento"}
              </span>
            </div>

            {/* Paciente */}
            <section className="mb-5">
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Paciente</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[11px] text-muted-foreground">Nome</p>
                  <p className="font-semibold text-foreground">{data.patient_name}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">CPF</p>
                  <p className="font-semibold text-foreground">{maskCPF(data.patient_cpf)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] text-muted-foreground">Telefone</p>
                  <p className="font-semibold text-foreground">{data.patient_phone ?? "—"}</p>
                </div>
              </div>
            </section>

            {/* Profissional */}
            <section className="mb-5">
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Profissional</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="col-span-2">
                  <p className="text-[11px] text-muted-foreground">Médico(a)</p>
                  <p className="font-semibold text-foreground">{data.doctor_name}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">CRM</p>
                  <p className="font-semibold text-foreground">
                    {data.doctor_crm ? `${data.doctor_crm_state ?? ""} ${data.doctor_crm}`.trim() : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Especialidade</p>
                  <p className="font-semibold text-foreground">{data.doctor_specialty ?? "—"}</p>
                </div>
              </div>
            </section>

            {/* Serviço */}
            <section className="mb-5">
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Serviço prestado</p>
              <div className="rounded-xl border border-border/60 overflow-hidden text-sm">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                  <span className="font-medium text-foreground">Teleconsulta médica</span>
                  <span className="tabular-nums font-semibold text-foreground">{formatBRL(data.price_at_booking)}</span>
                </div>
                <div className="px-4 py-3 text-xs text-muted-foreground border-t border-border/60">
                  Agendada para {format(date, "dd 'de' MMMM 'de' yyyy, 'às' HH:mm", { locale: ptBR })} — modalidade vídeo criptografado.
                </div>
              </div>
            </section>

            {/* Total */}
            <div className="flex items-center justify-between border-t border-border pt-4 mt-6">
              <span className="text-sm font-semibold text-muted-foreground">Valor total</span>
              <span className="text-2xl font-black text-foreground tabular-nums">{formatBRL(data.price_at_booking)}</span>
            </div>

            <p className="text-[10px] text-muted-foreground mt-8 leading-relaxed">
              Este recibo é gerado automaticamente pela plataforma AloClínica e tem validade como comprovante de pagamento da teleconsulta indicada acima.
              Para reembolso junto ao seu plano de saúde, anexe este documento junto à nota fiscal emitida pelo profissional.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AppointmentReceipt;