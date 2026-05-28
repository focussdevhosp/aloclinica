/**
 * Painel epidemiológico para gestores de contrato (órgãos públicos / empresas).
 *
 * Diferencial em licitação: o cliente não compra "consultas baratas" (commodity),
 * compra inteligência epidemiológica — top queixas, sazonalidade, severidade
 * média, distribuição por mês — derivada dos dados já existentes na plataforma.
 *
 * Dados:
 *   - consulta_contrato (apenas dos contratos que o usuário gerencia, via RLS)
 *   - pre_consultation_symptoms (queixa principal + severidade + sintomas)
 *   - appointments (datas, status)
 */
import { useEffect, useState } from "react";
import { db } from "@/integrations/supabase/untyped";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiCard } from "@/components/ui/kpi-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Activity, Stethoscope, TrendingUp, AlertCircle, BarChart3 } from "lucide-react";

interface Props {
  contratoIds: string[];
}

type SymRow = { main_complaint: string | null; severity: number | null; symptoms: string[] | null; created_at: string; appointment_id: string };

function topN(items: string[], n = 10) {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = (it || "").trim().toLowerCase();
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABEL: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr", "05": "Mai", "06": "Jun",
  "07": "Jul", "08": "Ago", "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

export default function OrgaoSaudeTab({ contratoIds }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rows, setRows] = useState<SymRow[]>([]);
  const [totalConsultas, setTotalConsultas] = useState(0);

  useEffect(() => {
    if (!contratoIds.length) { setLoading(false); return; }
    (async () => {
      setLoading(true); setError(false);
      try {
        const seisMeses = new Date(); seisMeses.setMonth(seisMeses.getMonth() - 6);
        // 1) Consultas custeadas pelos contratos nos últimos 6 meses
        const { data: cc, error: ccErr } = await db.from("consulta_contrato")
          .select("appointment_id, created_at")
          .in("contrato_id", contratoIds)
          .gte("created_at", seisMeses.toISOString())
          .limit(2000);
        if (ccErr) throw ccErr;
        const apptIds = [...new Set((cc ?? []).map((r: any) => r.appointment_id).filter(Boolean))] as string[];
        setTotalConsultas(apptIds.length);
        if (!apptIds.length) { setRows([]); setLoading(false); return; }
        // 2) Sintomas/queixas dessas consultas
        const { data: sym, error: symErr } = await db.from("pre_consultation_symptoms")
          .select("main_complaint, severity, symptoms, created_at, appointment_id")
          .in("appointment_id", apptIds);
        if (symErr) throw symErr;
        setRows((sym ?? []) as SymRow[]);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [contratoIds.join(",")]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    );
  }
  if (error) {
    return <EmptyState variant="error" icon={AlertCircle} title="Não foi possível carregar os indicadores"
      description="Tente novamente em alguns instantes." action={{ label: "Recarregar", onClick: () => window.location.reload() }} />;
  }
  if (!contratoIds.length || totalConsultas === 0) {
    return <EmptyState icon={BarChart3} title="Sem dados ainda"
      description="Os indicadores de saúde da população aparecem aqui após as primeiras consultas custeadas pelo contrato." />;
  }

  // Agregações
  const complaints = topN(rows.map((r) => r.main_complaint || ""));
  const symptomsAll: string[] = [];
  rows.forEach((r) => Array.isArray(r.symptoms) && symptomsAll.push(...r.symptoms));
  const topSymptoms = topN(symptomsAll, 8);
  const sevValid = rows.map((r) => r.severity).filter((s): s is number => typeof s === "number");
  const sevAvg = sevValid.length ? (sevValid.reduce((a, b) => a + b, 0) / sevValid.length) : 0;
  const sevHigh = sevValid.filter((s) => s >= 7).length;

  // Distribuição por mês (últimos 6 meses)
  const byMonth = new Map<string, number>();
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    byMonth.set(monthKey(d), 0);
  }
  rows.forEach((r) => {
    const k = monthKey(new Date(r.created_at));
    if (byMonth.has(k)) byMonth.set(k, (byMonth.get(k) ?? 0) + 1);
  });
  const monthly = [...byMonth.entries()];
  const maxMonth = Math.max(1, ...monthly.map(([, v]) => v));

  return (
    <div className="space-y-5">
      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Activity} label="Consultas (6m)" value={totalConsultas} />
        <KpiCard icon={Stethoscope} label="Queixas únicas" value={complaints.length} help="Distintas principais" />
        <KpiCard icon={TrendingUp} label="Severidade média" value={sevAvg ? sevAvg.toFixed(1) : "—"} help="0–10" />
        <KpiCard icon={AlertCircle} label="Casos severos" value={sevHigh} help="severidade ≥ 7" />
      </div>

      {/* Distribuição mensal */}
      <Card>
        <CardContent className="p-5">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">Volume de consultas por mês</p>
          <div className="flex items-end gap-2 h-32">
            {monthly.map(([k, v]) => {
              const month = k.split("-")[1];
              const pct = (v / maxMonth) * 100;
              return (
                <div key={k} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <div className="flex-1 w-full flex items-end">
                    <div className="w-full rounded-t-md bg-primary/80 transition-all hover:bg-primary"
                      style={{ height: `${pct}%`, minHeight: v > 0 ? 4 : 0 }}
                      role="img"
                      aria-label={`${MONTH_LABEL[month] || month}: ${v} consultas`} />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">{MONTH_LABEL[month] || month}</span>
                  <span className="text-[10px] tabular-nums text-foreground font-bold">{v}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top queixas e sintomas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">Top 10 queixas principais</p>
            {complaints.length === 0 ? (
              <p className="text-sm text-muted-foreground">Os pacientes ainda não preencheram a pré-consulta nessas consultas.</p>
            ) : (
              <ol className="space-y-2">
                {complaints.map(([name, count], i) => {
                  const pct = Math.round((count / complaints[0][1]) * 100);
                  return (
                    <li key={name} className="flex items-center gap-3">
                      <span className="w-6 text-xs font-bold text-muted-foreground tabular-nums">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground capitalize truncate pr-2">{name}</span>
                          <span className="text-muted-foreground tabular-nums">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                          <div className="h-full bg-primary/70" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">Sintomas mais relatados</p>
            {topSymptoms.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem sintomas estruturados registrados.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {topSymptoms.map(([s, c]) => (
                  <span key={s} className="text-xs px-2.5 py-1 rounded-full border border-border bg-card text-foreground">
                    {s} <span className="text-muted-foreground tabular-nums ml-1">·{c}</span>
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        Dados agregados, sem identificação individual — em conformidade com a LGPD.
      </p>
    </div>
  );
}
