import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/integrations/supabase/untyped";
import DashboardLayout from "@/components/dashboards/DashboardLayout";
import { getPatientNav } from "./patientNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock,
  FileSearch,
  FlaskConical,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { logError } from "@/lib/logger";

type ExamReq = {
  id: string;
  exam_name: string | null;
  reason: string | null;
  created_at: string;
  appointment_id: string | null;
};

type Lab = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  description: string | null;
  exam_types: string[];
};

type Order = {
  id: string;
  exam_request_id: string | null;
  lab_id: string;
  status: string;
  preferred_date: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "Aguardando confirmacao", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  confirmed: { label: "Confirmado", color: "bg-primary/10 text-primary" },
  completed: { label: "Concluido", color: "bg-success/10 text-success" },
  cancelled: { label: "Cancelado", color: "bg-destructive/10 text-destructive" },
};

const ExamMarketplace = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ExamReq[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookingFor, setBookingFor] = useState<ExamReq | null>(null);
  const [labChosen, setLabChosen] = useState<string>("");
  const [preferredDate, setPreferredDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [reqRes, labsRes, ordersRes] = await Promise.all([
        db.from("exam_requests").select("id, exam_name, reason, created_at, appointment_id")
          .eq("patient_id", user.id).order("created_at", { ascending: false }).limit(50),
        db.from("exam_labs").select("id, name, city, state, phone, description, exam_types").eq("is_active", true).limit(50),
        db.from("exam_orders").select("id, exam_request_id, lab_id, status, preferred_date, created_at")
          .eq("patient_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);
      setRequests((reqRes.data ?? []) as ExamReq[]);
      setLabs((labsRes.data ?? []) as Lab[]);
      setOrders((ordersRes.data ?? []) as Order[]);
    } catch (e) {
      logError("ExamMarketplace load", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const openBook = (req: ExamReq) => {
    setBookingFor(req);
    setLabChosen(labs[0]?.id ?? "");
    setPreferredDate("");
  };

  const submitBooking = async () => {
    if (!user || !bookingFor || !labChosen) {
      toast.info("Escolha um laboratorio.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await db.from("exam_orders").insert({
        exam_request_id: bookingFor.id,
        patient_id: user.id,
        lab_id: labChosen,
        status: "pending",
        preferred_date: preferredDate || null,
      } as any);
      if (error) throw error;
      toast.success("Pedido enviado ao laboratorio", { description: "A equipe parceira entra em contato para confirmar o horario." });
      setBookingFor(null);
      load();
    } catch (e: any) {
      toast.error("Erro ao agendar", { description: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const orderByRequest = new Map<string, Order>(orders.map((o) => [o.exam_request_id ?? "", o]));
  const pendingRequests = requests.filter((r) => !orderByRequest.get(r.id)).length;

  return (
    <DashboardLayout title="Exames" nav={getPatientNav("exams")} role="patient">
      <div className="mx-auto w-full max-w-5xl space-y-5 pb-24 md:pb-8">
        <section className="relative overflow-hidden rounded-[34px] border border-white/60 bg-[linear-gradient(135deg,#ecfbff_0%,#ffffff_48%,#f6fff4_100%)] p-5 shadow-[0_26px_80px_-50px_rgba(8,47,73,.7)] md:p-6">
          <div className="pointer-events-none absolute -right-14 -top-16 h-56 w-56 rounded-full bg-cyan-400/18 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-20 h-44 w-44 rounded-full bg-emerald-300/16 blur-3xl" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/75 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Rede parceira
              </div>
              <h1 className="font-[Manrope] text-2xl font-black text-foreground md:text-3xl">Central de Exames</h1>
              <p className="mt-1 text-sm text-muted-foreground">Agende exames solicitados pelo medico em laboratorios parceiros e acompanhe cada etapa.</p>
            </div>
            <Button className="h-11 rounded-full bg-[hsl(var(--p-primary))] px-5 font-bold text-white shadow-[var(--p-shadow-btn)]" onClick={() => window.location.href = "/dashboard/patient/documents?role=patient"}>
              Ver documentos <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Solicitados", value: requests.length, icon: FlaskConical },
            { label: "Pendentes", value: pendingRequests, icon: Clock },
            { label: "Laboratorios", value: labs.length, icon: Building2 },
          ].map((item) => (
            <Card key={item.label} className="rounded-[26px] border-border/40 bg-card/95 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
                  <p className="text-xl font-black text-foreground">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-[26px]" />)}</div>
        ) : requests.length === 0 ? (
          <div className="relative overflow-hidden rounded-[30px] border border-dashed border-border/45 bg-card px-5 py-14 text-center shadow-sm">
            <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-cyan-400/10 blur-3xl" />
            <FileSearch className="relative mx-auto mb-3 h-12 w-12 text-primary/45" />
            <h2 className="relative text-base font-black text-foreground">Nenhum exame solicitado</h2>
            <p className="relative mx-auto mt-1 max-w-md text-sm text-muted-foreground">Quando o medico solicitar exames durante a consulta, eles aparecem aqui para voce agendar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const ord = orderByRequest.get(r.id);
              return (
                <Card key={r.id} className="card-interactive rounded-[28px] border-border/40 bg-card/95 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[var(--p-shadow-card)]">
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-600">
                      <FlaskConical className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-foreground">{r.exam_name || "Exame"}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {r.reason || `Solicitado em ${format(new Date(r.created_at), "dd/MM/yyyy")}`}
                      </p>
                    </div>
                    {ord ? (
                      <Badge className={`${STATUS_LABEL[ord.status]?.color ?? "bg-muted"} w-fit gap-1.5 rounded-full border-0 px-3 py-1.5 font-bold`}>
                        {ord.status === "confirmed" || ord.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                        {STATUS_LABEL[ord.status]?.label || ord.status}
                      </Badge>
                    ) : (
                      <Button size="sm" className="h-10 rounded-full bg-[hsl(var(--p-primary))] px-4 font-bold text-white" onClick={() => openBook(r)}>
                        <CalendarPlus className="mr-1 h-4 w-4" /> Agendar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={!!bookingFor} onOpenChange={(o) => !o && setBookingFor(null)}>
          <DialogContent className="rounded-[28px] sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="font-[Manrope] text-xl font-black">Agendar {bookingFor?.exam_name || "exame"}</DialogTitle>
            </DialogHeader>
            {labs.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-border/45 bg-muted/20 px-5 py-10 text-center">
                <Building2 className="mx-auto mb-3 h-10 w-10 text-primary/45" />
                <p className="text-sm font-black text-foreground">Sem laboratorios disponiveis ainda</p>
                <p className="mt-1 text-xs text-muted-foreground">Estamos expandindo a rede de parceiros para sua regiao.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground">Escolha o laboratorio</p>
                  <div className="max-h-72 space-y-2 overflow-auto pr-1">
                    {labs.map((l) => (
                      <button key={l.id} type="button" onClick={() => setLabChosen(l.id)}
                        className={`w-full rounded-[22px] border p-3 text-left transition-all ${labChosen === l.id ? "border-primary bg-primary/5 shadow-sm" : "border-border/55 hover:border-primary/50 hover:bg-muted/25"}`}>
                        <p className="text-sm font-black text-foreground">{l.name}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          {l.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {l.city}{l.state ? `/${l.state}` : ""}</span>}
                          {l.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {l.phone}</span>}
                        </p>
                        {l.description && <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{l.description}</p>}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground">Data preferida</p>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} className="h-11 rounded-2xl pl-9" />
                  </div>
                </div>
                <Button onClick={submitBooking} disabled={submitting || !labChosen} className="h-12 w-full rounded-full bg-[hsl(var(--p-primary))] font-bold text-white shadow-[var(--p-shadow-btn)]">
                  {submitting ? "Enviando..." : <>Confirmar pedido <ArrowRight className="ml-1 h-4 w-4" /></>}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">O laboratorio entra em contato para confirmar horario e valor.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ExamMarketplace;
