import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Clock, Users, Pill, ArrowRight } from "lucide-react";
import pingoCartao from "@/assets/pingo-cartao.png";

const benefits = [
  { icon: Clock, label: "Consultas 24h" },
  { icon: Pill, label: "Desconto em farmácias" },
  { icon: Users, label: "Toda a família" },
  { icon: ShieldCheck, label: "Atendimento prioritário" },
];

const PingoCardBanner = () => {
  const navigate = useNavigate();

  return (
    <section
      aria-label="Pingo Card - Cartão de saúde digital"
      className="relative w-full px-4 sm:px-6 lg:px-8 py-10"
    >
      <div
        className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border border-white/5 shadow-2xl"
        style={{ background: "hsl(215, 75%, 12%)" }}
      >
        {/* Glows decorativos */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-1/2 -left-1/4 w-[80%] h-full rounded-full blur-[160px] opacity-25"
          style={{ background: "hsl(215, 75%, 32%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-1/2 -right-1/4 w-[80%] h-full rounded-full blur-[160px] opacity-20"
          style={{ background: "hsl(168, 50%, 40%)" }}
        />

        {/* Textura pontilhada sutil */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.6) 0.8px, transparent 0.8px)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative z-10 grid lg:grid-cols-2 items-center gap-8 lg:gap-12 p-8 md:p-12 lg:p-16">
          {/* Coluna esquerda — conteúdo */}
          <div className="flex flex-col gap-7">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md w-fit"
            >
              <span
                className="flex h-2 w-2 rounded-full animate-pulse"
                style={{
                  background: "hsl(168, 50%, 55%)",
                  boxShadow: "0 0 10px hsl(168, 50%, 55%)",
                }}
              />
              <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/90">
                Novo • Pingo Card
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="space-y-4"
            >
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.05] tracking-tight">
                Seu cartão de
                <br />
                <span
                  className="italic bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, #ffffff 0%, #ffffff 40%, hsl(168, 60%, 65%) 100%)",
                  }}
                >
                  saúde digital.
                </span>
              </h2>
              <p className="text-base md:text-lg text-white/60 max-w-lg leading-relaxed">
                Com o Pingo Card você e sua família têm acesso a consultas
                online 24h, descontos em farmácias e atendimento prioritário
                com especialistas — tudo em um único cartão digital.
              </p>
            </motion.div>

            {/* Chips de benefícios */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex flex-wrap gap-2.5"
            >
              {benefits.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
                >
                  <div
                    className="p-1.5 rounded-lg"
                    style={{ background: "hsl(168, 50%, 40% / 0.20)" }}
                  >
                    <Icon
                      className="w-3.5 h-3.5"
                      style={{ color: "hsl(168, 60%, 65%)" }}
                      strokeWidth={2.5}
                    />
                  </div>
                  <span className="text-xs md:text-sm font-semibold text-white/90">
                    {label}
                  </span>
                </div>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2"
            >
              <button
                type="button"
                onClick={() => navigate("/pingo-card")}
                className="group w-full sm:w-auto px-8 py-4 rounded-2xl text-white font-bold text-base md:text-lg transition-all flex items-center justify-center gap-2"
                style={{
                  background: "hsl(215, 75%, 32%)",
                  boxShadow: "0 20px 40px -10px rgba(23, 73, 124, 0.55)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "hsl(215, 75%, 40%)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "hsl(215, 75%, 32%)";
                }}
              >
                Assinar agora · R$ 29/mês
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => navigate("/pingo-card")}
                className="text-white/60 hover:text-white font-semibold flex items-center gap-1.5 transition-colors text-sm"
              >
                Saber mais
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </motion.div>
          </div>

          {/* Coluna direita — mascote + cartão flutuante */}
          <div className="relative flex justify-center lg:justify-end items-end min-h-[320px] lg:min-h-[440px]">
            <div className="relative w-full max-w-[520px]">
              {/* Glow inferior */}
              <div
                aria-hidden
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-24 rounded-full blur-[80px] opacity-40"
                style={{ background: "hsl(168, 50%, 40%)" }}
              />

              {/* Mascote */}
              <motion.img
                src={pingoCartao}
                alt="Pingo segurando o Pingo Card"
                loading="lazy"
                className="relative z-10 w-full h-auto select-none drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, ease: "easeInOut", repeat: Infinity }}
                draggable={false}
              />

              {/* Cartão flutuante decorativo */}
              <motion.div
                aria-hidden
                initial={{ opacity: 0, y: -10, rotate: -8 }}
                animate={{ opacity: 1, y: [0, -8, 0], rotate: [-12, -10, -12] }}
                transition={{
                  opacity: { duration: 0.6, delay: 0.3 },
                  y: { duration: 4, ease: "easeInOut", repeat: Infinity },
                  rotate: { duration: 4, ease: "easeInOut", repeat: Infinity },
                }}
                className="hidden md:flex absolute top-6 -left-4 lg:-left-10 z-20 w-56 h-32 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl p-4 flex-col justify-between overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, hsl(215, 75%, 18%) 0%, hsl(215, 75%, 10%) 100%)",
                }}
              >
                <div
                  aria-hidden
                  className="absolute -top-1/2 -right-1/2 w-full h-full bg-white/5 blur-3xl rounded-full"
                />
                <div className="flex justify-between items-start relative z-10">
                  <div className="w-9 h-7 rounded bg-gradient-to-r from-amber-400 to-amber-200 opacity-90" />
                  <div className="text-[10px] font-black text-white/90 tracking-tighter uppercase italic">
                    Pingo Card
                  </div>
                </div>
                <div className="flex justify-between items-end relative z-10">
                  <div className="space-y-1.5">
                    <div className="w-20 h-1.5 bg-white/25 rounded-full" />
                    <div className="w-14 h-1.5 bg-white/15 rounded-full" />
                  </div>
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center border border-white/20"
                    style={{ background: "hsl(168, 50%, 40%)" }}
                  >
                    <span className="text-white font-black text-xs">+</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PingoCardBanner;
