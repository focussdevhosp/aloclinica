import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Stethoscope, Pill, Heart } from "lucide-react";
import pingoCartao from "@/assets/pingo-cartao.png";

const PingoCardBanner = () => {
  const navigate = useNavigate();

  return (
    <section
      aria-label="Pingo Card - Cartão de benefícios"
      className="relative w-full overflow-hidden"
    >
      {/* Faixa colorida full-bleed */}
      <div className="relative bg-gradient-to-br from-[hsl(215,75%,28%)] via-[hsl(215,80%,22%)] to-[hsl(168,55%,30%)]">
        {/* Glow decorativos */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-secondary/30 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-primary/40 blur-[140px]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 py-14 md:py-20">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">
            {/* Conteúdo */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 mb-5">
                <Sparkles className="w-4 h-4 text-[hsl(168,70%,75%)]" />
                <span className="text-white text-xs font-bold uppercase tracking-[0.18em]">
                  Novo · Pingo Card
                </span>
              </div>

              <h2 className="text-white text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.05] mb-5">
                Seu cartão de saúde digital.{" "}
                <span className="text-[hsl(168,75%,70%)]">
                  Consultas ilimitadas
                </span>{" "}
                a partir de R$ 29/mês.
              </h2>

              <p className="text-white/85 text-base md:text-lg max-w-2xl mb-8 leading-relaxed">
                Com o Pingo Card você e sua família têm acesso a consultas
                online 24h, descontos em farmácias e exames, e atendimento
                prioritário com especialistas — tudo em um único cartão digital.
              </p>

              {/* Benefícios rápidos */}
              <div className="flex flex-wrap gap-3 mb-8">
                {[
                  { icon: Stethoscope, label: "Consultas 24h" },
                  { icon: Pill, label: "Desconto em farmácias" },
                  { icon: Heart, label: "Cobre toda família" },
                ].map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15"
                  >
                    <b.icon className="w-4 h-4 text-[hsl(168,70%,75%)]" />
                    <span className="text-white text-sm font-semibold">
                      {b.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => navigate("/pingo-card")}
                  className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-white text-primary font-bold text-base shadow-2xl shadow-black/30 hover:scale-[1.03] transition-transform"
                >
                  Conhecer o Pingo Card
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate("/pingo-card")}
                  className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/30 text-white font-semibold text-base hover:bg-white/20 transition-colors"
                >
                  Ver planos
                </button>
              </div>
            </motion.div>

            {/* Pingo com cartão */}
            <motion.div
              className="relative flex justify-center lg:justify-end"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.15 }}
            >
              <div className="absolute inset-0 bg-white/15 rounded-full blur-[80px] scale-75" />
              <motion.img
                src={pingoCartao}
                alt="Pingo segurando o Pingo Card"
                className="relative z-10 w-[280px] sm:w-[340px] lg:w-[420px] h-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)] select-none"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
                draggable={false}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PingoCardBanner;
