/**
 * AdminFraudSignals — painel de sinais de fraude para o admin.
 *
 * Consulta a view public.fraud_signals (heurística composta: CPF compartilhado,
 * falhas de login em 24h, alto índice de no-show, múltiplas tentativas de KYC).
 * Cada linha tem severidade visual; admin clica e abre o EMR para investigar.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/integrations/supabase/untyped";
import DashboardLayout from "@/components/dashboards/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { getAdminNav } from "./adminNav";
import { ShieldAlert, AlertTriangle, Eye, Users, KeyRound, CalendarX } from "lucide-react";
import { logError } from "@/lib/logger";

interface Signal {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  cpf: string | null;
  phone: string | null;
  cpf_compartilhado_por: number | null;
  login_fails_24h: number | null;
  no_show_rate: number | null;
  appointments_total: number | null;
  kyc_attempts: number | null;
  kyc_rejs: number | null;
}

function severityOf(s: Signal): { score: number; label: string; color: string } {
  let score = 0;
  if ((s.cpf_compartilhado_por ?? 0) >= 3) score += 3;
  else if ((s.cpf_compartilhado_por ?? 0) >= 2) score += 2;
  if ((s.login_fails_24h ?? 0) >= 10) score += 2; else if ((s.login_fails_24h ?? 0) >= 5) score += 1;
  if ((s.no_show_rate ?? 0) >= 0.7) score += 2; else if ((s.no_show_rate ?? 0) >= 0.5) score += 1;
  if ((s.kyc_rejs ?? 0) >= 3) score += 2; else if ((s.kyc_rejs ?? 0) >= 2) score += 1;
  if (score >= 5) return { score, label: "Crítico", color: "bg-destructive/10 text-destructive border-destructive/40" };
  if (score >= 3) return { score, label: "Alto", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/40" };
  return { score, label: "Atenção", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/40" };
}

const AdminFraudSignals = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await db.from("fraud_signals").select("*").limit(200);
        if (error) throw error;
        const list = (data ?? []) as Signal[];
        list.sort((a, b) => severityOf(b).score - severityOf(a).score);
        setSignals(list);
      } catch (e) {
        logError("AdminFraudSignals load", e);
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <DashboardLayout title="Sinais de fraude" nav={getAdminNav("fraud-signals")} role="admin">
      <div className="max-w-5xl mx-auto space-y-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-destructive" /> Sinais de fraude</h1>
          <p className="text-sm text-muted-foreground">
            Heurística composta — CPF duplicado, falhas de login em 24h, alto no-show, múltiplas tentativas de KYC.
            Os sinais são listados por severidade decrescente.
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : signals.length === 0 ? (
          <EmptyState icon={ShieldAlert} title="Tudo limpo por agora"
            description="Não foram detectados sinais relevantes nos últimos 30 dias." variant="subtle" />
        ) : (
          <div className="space-y-2">
            {signals.map((s) => {
              const sev = severityOf(s);
              const name = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "(sem nome)";
              return (
                <Card key={s.user_id} className={`border-l-4 ${sev.color.split(" ").find(c => c.startsWith("border-"))}`}>
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground truncate">{name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sev.color}`}>{sev.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {s.cpf ? `CPF ${s.cpf}` : "Sem CPF"}{s.phone ? ` · ${s.phone}` : ""}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px]">
                        {(s.cpf_compartilhado_por ?? 0) >= 2 && (
                          <span className="inline-flex items-center gap-1 text-foreground"><Users className="w-3 h-3 text-destructive" /> CPF em {s.cpf_compartilhado_por} contas</span>
                        )}
                        {(s.login_fails_24h ?? 0) >= 3 && (
                          <span className="inline-flex items-center gap-1 text-foreground"><KeyRound className="w-3 h-3 text-amber-600" /> {s.login_fails_24h} falhas de login 24h</span>
                        )}
                        {(s.no_show_rate ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 text-foreground"><CalendarX className="w-3 h-3 text-amber-600" /> {Math.round((s.no_show_rate ?? 0) * 100)}% no-show ({s.appointments_total} consultas)</span>
                        )}
                        {(s.kyc_attempts ?? 0) >= 3 && (
                          <span className="inline-flex items-center gap-1 text-foreground"><AlertTriangle className="w-3 h-3 text-amber-600" /> {s.kyc_attempts} tentativas KYC ({s.kyc_rejs} rejeitadas)</span>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="rounded-xl gap-1.5" onClick={() => navigate(`/dashboard/patients/${s.user_id}/emr`)}>
                      <Eye className="w-3.5 h-3.5" /> Inspecionar
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminFraudSignals;
