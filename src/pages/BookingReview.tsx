import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { db } from "@/integrations/supabase/untyped";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/landing/Header";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays, Clock, Video, ShieldCheck, ArrowLeft, ArrowRight,
  CheckCircle2, Loader2, Lock, Stethoscope,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const BookingReview = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const doctorId = params.get("doctor");
  const dateStr = params.get("date"); // YYYY-MM-DD
  const timeStr = params.get("time"); // HH:mm

  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      if (!doctorId) { setLoading(false); return; }
      const [{ data: doc }, { data: session }] = await Promise.all([
        db.from("doctor_profiles_public").select("*").eq("id", doctorId).maybeSingle(),
        supabase.auth.getSession(),
      ]);
      setDoctor(doc);
      setAuthed(!!session.session?.user);
      setLoading(false);
    })();
  }, [doctorId]);

  const scheduled = useMemo(() => {
    if (!dateStr || !timeStr) return null;
    const d = new Date(`${dateStr}T${timeStr}:00`);
    return isNaN(d.getTime()) ? null : d;
  }, [dateStr, timeStr]);

  const continueUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (dateStr) sp.set("date", dateStr);
    if (timeStr) sp.set("time", timeStr);
    return `/dashboard/schedule/${doctorId}${sp.toString() ? `?${sp.toString()}` : ""}`;
  }, [doctorId, dateStr, timeStr]);

  const handleContinue = () => {
    if (authed) navigate(continueUrl);
    else navigate(`/paciente?redirect=${encodeURIComponent(continueUrl)}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!doctor || !scheduled) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-32 max-w-md mx-auto text-center px-4 space-y-4">
          <Stethoscope className="w-12 h-12 mx-auto text-muted-foreground/30" />
          <h1 className="text-xl font-bold">Não conseguimos carregar a revisão</h1>
          <p className="text-sm text-muted-foreground">
            O link parece estar incompleto ou expirado. Escolha um médico e horário novamente.
          </p>
          <Button onClick={() => navigate("/agendar")} className="rounded-xl">
            Voltar para agendamento
          </Button>
        </div>
      </div>
    );
  }

  const name = doctor.display_name || doctor.full_name || "Profissional";
  const price = Number(doctor.consultation_price ?? 0);
  const duration = doctor.consultation_duration_min ?? 30;

  return (
    <>
      <SEOHead
        title={`Revisão da consulta com ${name} | AloClínica`}
        description="Revise os detalhes da sua teleconsulta antes de confirmar e pagar."
      />
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-20 px-4">
          <div className="max-w-2xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="mb-3 text-muted-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              <div>
                <p className="text-xs uppercase tracking-wider text-primary font-bold">
                  Revisão da consulta
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-foreground mt-1">
                  Confirme os detalhes antes de seguir
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Você ainda não será cobrado. O pagamento acontece na próxima etapa.
                </p>
              </div>

              <Card className="border-border/60 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  {/* doctor row */}
                  <div className="p-5 sm:p-6 flex items-center gap-4 bg-gradient-to-br from-primary/5 to-secondary/5 border-b border-border/40">
                    <div className="w-16 h-16 rounded-2xl ring-2 ring-background shadow overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
                      {doctor.avatar_url ? (
                        <img src={doctor.avatar_url} alt={name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <Stethoscope className="w-7 h-7 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-bold text-foreground truncate">{name}</h2>
                        {doctor.crm_verified && (
                          <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1">
                            <ShieldCheck className="w-3 h-3" /> Verificado
                          </Badge>
                        )}
                      </div>
                      {(doctor.specialty_names?.length ?? 0) > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {doctor.specialty_names.join(" · ")}
                        </p>
                      )}
                      {doctor.crm && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          CRM {doctor.crm}{doctor.crm_state ? `/${doctor.crm_state}` : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* schedule */}
                  <div className="p-5 sm:p-6 grid sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <CalendarDays className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Data</p>
                        <p className="text-sm font-semibold text-foreground capitalize">
                          {format(scheduled, "EEE, dd 'de' MMM", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Horário</p>
                        <p className="text-sm font-semibold text-foreground">
                          {format(scheduled, "HH:mm", { locale: ptBR })}h · {duration}min
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Video className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Modalidade</p>
                        <p className="text-sm font-semibold text-foreground">Vídeo seguro</p>
                      </div>
                    </div>
                  </div>

                  {/* price */}
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                    <div className="rounded-xl bg-muted/40 border border-border/50 p-4 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Valor estimado</p>
                        <p className="text-2xl font-black text-foreground tabular-nums">
                          R$ {price.toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[11px]">Pagamento na próxima etapa</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* trust */}
              <ul className="grid sm:grid-cols-3 gap-2 text-[12px] text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cancelamento até 2h antes</li>
                <li className="flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> Consulta criptografada</li>
                <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Pagamento seguro MercadoPago</li>
              </ul>

              <Button
                size="lg"
                className="w-full h-12 rounded-xl font-bold shadow-md bg-gradient-to-r from-primary to-secondary"
                onClick={handleContinue}
              >
                {authed ? "Confirmar e seguir para pagamento" : "Entrar e confirmar consulta"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              {!authed && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Você precisa estar logado para finalizar — vamos te levar para o login.
                </p>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BookingReview;