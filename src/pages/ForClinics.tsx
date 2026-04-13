import { forwardRef, lazy } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Building, CheckCircle, Clock, FileText, Lock, Lightning, ArrowRight, Users } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/landing/Header";
import SEOHead from "@/components/SEOHead";

const Footer = lazy(() => import("@/components/landing/Footer"));

const stats = [
  { value: "100+", label: "Clínicas parceiras" },
  { value: "50k+", label: "Laudos/mês" },
  { value: "24h", label: "SLA padrão" },
  { value: "99.9%", label: "Uptime" },
];

const features = [
  {
    icon: Lightning,
    title: "Fila inteligente",
    desc: "Priorize laudos por especialidade e urgência com IA.",
  },
  {
    icon: FileText,
    title: "Assinatura digital",
    desc: "Laudos assinados digitalmente, válidos e seguros.",
  },
  {
    icon: Lock,
    title: "Conformidade total",
    desc: "LGPD, CFM e certificações de segurança ISO inclusos.",
  },
  {
    icon: Clock,
    title: "Entrega rápida",
    desc: "Laudos prontos em poucas horas, não dias.",
  },
  {
    icon: Users,
    title: "Gestão integrada",
    desc: "Painel com relatórios, analytics e faturamento.",
  },
  {
    icon: CheckCircle,
    title: "Suporte dedicado",
    desc: "Time técnico disponível 24/7 para sua clínica.",
  },
];

const howItWorks = [
  {
    step: "1",
    title: "Configure a plataforma",
    desc: "Integre seus sistemas ou use nosso painel web de upload.",
  },
  {
    step: "2",
    title: "Envie exames",
    desc: "Upload de imagens, PDFs e outros arquivos de forma segura.",
  },
  {
    step: "3",
    title: "Receba laudos",
    desc: "Laudos assinados digitalmente, prontos para entrega.",
  },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

const ForClinics = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();

  return (
    <div ref={ref} className="relative min-h-screen bg-background">
      <div className="absolute inset-0 -z-10 bg-[image:var(--landing-bg)] pointer-events-none" />

      <SEOHead
        title="Telelaudo para Clínicas | AloClínica B2B"
        description="Solução B2B de telelaudo com IA, assinatura digital e SLA. 100+ clínicas parceiras."
        canonical="https://aloclinica.com.br/para-clinicas"
      />

      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-20 2xl:px-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -32 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full mb-4">
                Para Clínicas
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight tracking-tight mb-4">
                Telelaudo{" "}
                <span className="text-primary">inteligente e rápido</span>
              </h1>
              <p className="text-muted-foreground text-lg sm:text-xl leading-relaxed mb-8 max-w-lg">
                Solução B2B completa para clínicas e centros diagnósticos. Laudos a distância com IA, assinatura digital e SLA garantido.
              </p>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {stats.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.08, type: "spring", stiffness: 200, damping: 18 }}
                    className="text-center rounded-xl border border-border bg-card p-3"
                  >
                    <p className="text-xl sm:text-2xl font-extrabold text-primary tabular-nums">{s.value}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  className="bg-gradient-hero text-primary-foreground hover:opacity-90 rounded-xl px-8 gap-2 font-semibold shadow-lg shadow-primary/20 h-12"
                  onClick={() => navigate("/clinica/cadastro")}
                >
                  <Building className="w-5 h-5" weight="fill" />
                  Começar Agora
                  <ArrowRight className="w-4 h-4" weight="bold" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-xl px-8 gap-2 font-semibold h-12"
                  onClick={() => navigate("/clinica")}
                >
                  Saiba mais
                </Button>
              </div>
            </motion.div>

            {/* Right: features grid */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {features.map((f) => (
                <motion.div
                  key={f.title}
                  variants={itemVariants}
                  className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                    <f.icon className="w-5 h-5 text-primary" weight="fill" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground mb-0.5">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-muted/20">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-20 2xl:px-28">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full mb-4">
              Como Funciona
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
              3 passos simples
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Integre em minutos, comece a enviar laudos imediatamente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorks.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative p-8 rounded-2xl border border-border bg-card hover:shadow-elevated transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 font-extrabold text-lg text-primary">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
                {i < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-muted-foreground/30" weight="bold" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-20 2xl:px-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden bg-gradient-hero shadow-elevated"
          >
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary-foreground)/0.22),transparent_38%),radial-gradient(circle_at_bottom_right,hsl(var(--primary-foreground)/0.14),transparent_34%)]" />
            <div className="relative z-10 flex flex-col items-center justify-center gap-6 px-6 sm:px-10 py-16 sm:py-20 text-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-primary-foreground mb-2">
                  Pronto para transformar seus laudos?
                </h2>
                <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto">
                  Comece agora. Suporte dedicado durante toda a integração.
                </p>
              </div>
              <Button
                size="lg"
                className="bg-background text-primary hover:bg-background/95 rounded-2xl px-8 gap-2.5 shadow-lg shadow-foreground/10 font-extrabold"
                onClick={() => navigate("/clinica/cadastro")}
              >
                <CheckCircle className="w-5 h-5" weight="fill" />
                Agendar Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
});

ForClinics.displayName = "ForClinics";
export default ForClinics;
