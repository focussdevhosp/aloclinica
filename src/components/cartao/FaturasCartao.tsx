import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboards/DashboardLayout";
import { getCartaoNav } from "./cartaoNav";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/integrations/supabase/untyped";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, Download, ArrowSquareOut } from "@phosphor-icons/react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Invoice {
  id: string;
  amount: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  description: string | null;
  pdf_url: string | null;
  mp_payment_id: string | null;
  created_at: string;
}

interface Tx {
  id: string;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  category: string | null;
  description: string | null;
  created_at: string;
  partner?: { name: string } | null;
}

const formatBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  paid: { label: "Paga", variant: "default" },
  pending: { label: "Pendente", variant: "secondary" },
  failed: { label: "Falhou", variant: "destructive" },
  refunded: { label: "Estornada", variant: "outline" },
  cancelled: { label: "Cancelada", variant: "outline" },
};

const FaturasCartao = () => {
  const { user } = useAuth();
  const nav = getCartaoNav("faturas");
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [txs, setTxs] = useState<Tx[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: sub } = await db
        .from("pingo_card_subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!sub?.id) {
        setLoading(false);
        return;
      }
      const [{ data: inv }, { data: usage }] = await Promise.all([
        db.from("pingo_card_invoices")
          .select("*")
          .eq("subscription_id", sub.id)
          .order("created_at", { ascending: false })
          .limit(50),
        db.from("pingo_card_transactions")
          .select("*, partner:pingo_card_partners(name)")
          .eq("subscription_id", sub.id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      setInvoices((inv ?? []) as Invoice[]);
      setTxs((usage ?? []) as Tx[]);
      setLoading(false);
    })();
  }, [user]);

  const totalSavings = txs.reduce((sum, t) => sum + Number(t.discount_amount), 0);
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <DashboardLayout title="Faturas e Histórico" nav={nav} role="cartao_beneficios">
      <div className="space-y-5 max-w-4xl mx-auto pb-20">
        <div className="grid grid-cols-3 gap-3">
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold">Economia total</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600 tabular-nums">{formatBRL(totalSavings)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold">Mensalidades pagas</p>
              <p className="text-lg sm:text-2xl font-bold tabular-nums">{formatBRL(totalPaid)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="p-4 sm:p-5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold">Faturas</p>
              <p className="text-lg sm:text-2xl font-bold tabular-nums">{invoices.length}</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Skeleton className="h-72 rounded-2xl" />
        ) : invoices.length === 0 && txs.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-10 text-center text-muted-foreground space-y-2">
              <Receipt size={32} weight="fill" className="mx-auto opacity-50" />
              <p>Nenhuma fatura ou uso registrado ainda.</p>
              <p className="text-xs">Use seu cartão na rede credenciada para acompanhar o histórico aqui.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {invoices.length > 0 && (
              <Card className="rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 border-b font-semibold flex items-center gap-2">
                    <Receipt size={18} weight="fill" /> Faturas da assinatura
                  </div>
                  <div className="divide-y">
                    {invoices.map((i) => {
                      const s = statusLabel[i.status] ?? { label: i.status, variant: "secondary" as const };
                      const date = i.paid_at ?? i.due_date ?? i.created_at;
                      return (
                        <div key={i.id} className="p-4 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{i.description ?? "Mensalidade do plano"}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(date), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="font-bold tabular-nums">{formatBRL(Number(i.amount))}</p>
                              <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>
                            </div>
                            {i.pdf_url && (
                              <Button asChild size="icon" variant="ghost">
                                <a href={i.pdf_url} target="_blank" rel="noopener noreferrer" aria-label="Baixar PDF">
                                  <Download size={16} />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {txs.length > 0 && (
              <Card className="rounded-2xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 border-b font-semibold flex items-center gap-2">
                    <ArrowSquareOut size={18} weight="fill" /> Uso do cartão na rede
                  </div>
                  <div className="divide-y">
                    {txs.map((t) => (
                      <div key={t.id} className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{t.partner?.name ?? t.description ?? "Uso do cartão"}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(t.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                            {t.category ? ` · ${t.category}` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-emerald-600 font-bold">-{formatBRL(Number(t.discount_amount))}</p>
                          <p className="text-xs text-muted-foreground">de {formatBRL(Number(t.original_amount))}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FaturasCartao;