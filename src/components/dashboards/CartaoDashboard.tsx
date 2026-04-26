import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/integrations/supabase/untyped";
import { getCartaoNav } from "@/components/cartao/cartaoNav";
import {
  Heart, IdentificationCard, Storefront, Sparkle, Crown,
  ArrowRight, QrCode, Receipt, Users, Headset,
} from "@phosphor-icons/react";

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 6) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
};

interface SubscriptionLite {
  id: string;
  card_number: string;
  status: string;
  current_period_end: string | null;
  total_savings: number | null;
  plan?: { name: string; tagline: string | null } | null;
}

/**
 * CartaoDashboard — painel de boas-vindas do titular do Cartão Benefícios.
 * Foco: carteirinha digital, rede credenciada, economia acumulada.
 * NÃO mostra agendamento de telemedicina (cliente diferente).
 */
const CartaoDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const nav = getCartaoNav("home");

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionLite | null>(null);
  const [partnersCount, setPartnersCount] = useState(0);
  const [usageCount, setUsageCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: sub }, { count: pc }] = await Promise.all([
        db
          .from("pingo_card_subscriptions")
          .select("id, card_number, status, current_period_end, total_savings, plan:pingo_card_plans(name, tagline)")
          .eq("user_id", user!.id)
          .maybeSingle(),
        db
          .from("pingo_card_partners")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),
      ]);
      setSubscription((sub as SubscriptionLite) ?? null);
      setPartnersCount(pc ?? 0);

      if (sub?.id) {
        const { count: uc } = await db
          .from("pingo_card_transactions")
          .select("id", { count: "exact", head: true })
          .eq("subscription_id", sub.id);
        setUsageCount(uc ?? 0);
      }
    } finally {
      setLoading(false);
    }
  };

  const firstName = profile?.first_name?.trim() || user?.email?.split("@")[0] || "titular";
  const isActive = subscription?.status === "active";
  const totalSavings = Number(subscription?.total_savings ?? 0);

  const quickActions = [
    { label: "Carteirinha", icon: IdentificationCard, path: "/dashboard/cartao/carteirinha?role=cartao_beneficios", color: "hsl(340,75%,50%)" },
    { label: "Rede", icon: Storefront, path: "/dashboard/cartao/rede?role=cartao_beneficios", color: "hsl(155,55%,40%)" },
    { label: "Faturas", icon: Receipt, path: "/dashboard/cartao/faturas?role=cartao_beneficios", color: "hsl(38,92%,50%)" },
    { label: "Dependentes", icon: Users, path: "/dashboard/cartao/dependentes?role=cartao_beneficios", color: "hsl(210,90%,50%)" },
  ];

  return (
    <DashboardLayout title="Cartão Benefícios" nav={nav} role="cartao_beneficios">
      <div className="space-y-6 max-w-6xl mx-auto pb-20">
        {/* Hero saudação */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-[hsl(340,75%,45%)] via-[hsl(345,70%,50%)] to-[hsl(355,65%,55%)] text-white shadow-xl">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Badge className="mb-3 bg-white/20 text-white border-0 backdrop-blur">
                    <Heart size={12} weight="fill" className="mr-1" /> CARTÃO BENEFÍCIOS
                  </Badge>
                  <h1 className="text-2xl md:text-3xl font-bold mb-1">
                    {getGreeting()}, {firstName}!
                  </h1>
                  <p className="text-white/85 text-sm md:text-base">
                    {isActive
                      ? `Seu plano ${subscription?.plan?.name ?? "Cartão"} está ativo. Use em ${partnersCount} parceiros credenciados.`
                      : "Ative um plano para começar a economizar em farmácias, exames e mais."}
                  </p>
                </div>
                <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-white/15 items-center justify-center shrink-0">
                  <Crown size={28} weight="fill" className="text-amber-200" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((a, i) => (
            <motion.button
              key={a.label}
              onClick={() => navigate(a.path)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border hover:shadow-lg transition-all"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                style={{ background: `${a.color}15`, color: a.color }}
              >
                <a.icon size={22} weight="fill" />
              </div>
              <span className="text-xs font-semibold text-center">{a.label}</span>
            </motion.button>
          ))}
        </div>

        {/* KPIs */}
        {loading ? (
          <div className="grid sm:grid-cols-3 gap-4">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="rounded-2xl">
              <CardContent className="p-5 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Sparkle size={22} weight="fill" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold">Economia</p>
                  <p className="text-xl font-bold">{formatBRL(totalSavings)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardContent className="p-5 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <QrCode size={22} weight="fill" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold">Usos</p>
                  <p className="text-xl font-bold">{usageCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardContent className="p-5 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Storefront size={22} weight="fill" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-bold">Parceiros</p>
                  <p className="text-xl font-bold">{partnersCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* CTA carteirinha / ativação */}
        <Card className="rounded-2xl">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shrink-0">
                <IdentificationCard size={24} weight="fill" />
              </div>
              <div>
                <p className="font-bold">
                  {isActive ? "Sua carteirinha digital está pronta" : "Ative sua carteirinha digital"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isActive
                    ? "Apresente o QR Code na rede credenciada e aproveite seus descontos."
                    : "Escolha um plano para gerar sua carteirinha com QR Code exclusivo."}
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate(isActive ? "/dashboard/cartao/carteirinha?role=cartao_beneficios" : "/dashboard/cartao/plano?role=cartao_beneficios")}
              className="rounded-xl gap-2"
            >
              {isActive ? "Ver carteirinha" : "Ativar plano"} <ArrowRight size={16} weight="bold" />
            </Button>
          </CardContent>
        </Card>

        {/* Suporte */}
        <Card className="rounded-2xl">
          <CardContent className="p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Headset size={20} weight="fill" />
              </div>
              <div>
                <p className="font-semibold">Precisa de ajuda?</p>
                <p className="text-sm text-muted-foreground">Nossa equipe atende pelo chat em horário comercial.</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/dashboard/cartao/suporte?role=cartao_beneficios")} className="rounded-xl">
              Abrir chat
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CartaoDashboard;