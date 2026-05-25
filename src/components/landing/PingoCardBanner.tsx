import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck, Clock, Users, Pill, ArrowRight } from "lucide-react";
import pingoCartao from "@/assets/pingo-cartao.png";

const benefits = [
  { icon: Clock, label: "Consultas 24h" },
  { icon: Pill, label: "Desconto Farmácia" },
  { icon: Users, label: "Toda a família" },
  { icon: ShieldCheck, label: "Prioridade" },
];

const PingoCardBanner = () => {
  const navigate = useNavigate();

  return (
    <section
      aria-label="Pingo Card - Cartão de saúde digital"
      className="relative w-full px-4 sm:px-6 lg:px-8 py-12"
    >
      <div
        className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] md:rounded-[3rem] border border-white/10 shadow-2xl"
        style={{ background: "#050b1a" }}
      >
        {/* Atmospheric glows */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 right-0 w-2/3 h-full opacity-40"
          style={{ background: "radial-gradient(at 60% 40%, hsl(168, 70%, 45% / 0.20), transparent 60%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 w-[28rem] h-[28rem] rounded-full blur-[120px]"
          style={{ background: "hsl(220, 90%, 50% / 0.10)" }}
        />

        {/* Stardust texture */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.7) 0.6px, transparent 0.6px)",
            backgroundSize: "18px 18px",
          }}
        />

        {/* Corner accents */}
        <div aria-hidden className="absolute top-0 left-0 w-48 h-48 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        <div aria-hidden className="absolute bottom-0 right-0 w-48 h-48 pointer-events-none"
          style={{ background: "linear-gradient(to top left, hsl(168, 70%, 45% / 0.08), transparent)" }} />

        <div className="relative z-10 grid lg:grid-cols-12 items-center gap-8 lg:gap-6 p-8 md:p-12 lg:p-16">
          {/* Left content */}
          <div className="flex flex-col gap-7 lg:col-span-7">
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
                  background: "hsl(168, 70%, 55%)",
                  boxShadow: "0 0 10px hsl(168, 70%, 55%)",
                }}
              />
              <span className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: "hsl(168, 70%, 75%)" }}>
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
              <h2 className="text-5xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.05] tracking-tight">
                Seu cartão de
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, hsl(168, 70%, 70%) 0%, hsl(160, 65%, 70%) 50%, hsl(168, 70%, 55%) 100%)",
                  }}
                >
                  saúde digital.
                </span>
              </h2>
              <p className="text-base md:text-lg text-slate-400 max-w-lg leading-relaxed">
                Com o Pingo Card você e sua família têm acesso a consultas
                online 24h, descontos em farmácias e atendimento prioritário
                com especialistas — tudo em um único cartão digital.
              </p>
            </motion.div>

            {/* Benefit chips */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="grid grid-cols-2 gap-3 max-w-lg"
            >
              {benefits.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl transition-all hover:bg-white/10 hover:border-[hsl(168,70%,45%/0.4)]"
                >
                  <div
                    className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
                    style={{ background: "hsl(168, 70%, 45% / 0.12)" }}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{ color: "hsl(168, 70%, 60%)" }}
                      strokeWidth={2.5}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-200">
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
              className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-2"
            >
              <button
                type="button"
                onClick={() => navigate("/pingo-card")}
                className="group relative w-full sm:w-auto"
              >
                <div
                  aria-hidden
                  className="absolute -inset-1 rounded-2xl blur-lg opacity-30 group-hover:opacity-60 transition duration-500"
                  style={{ background: "hsl(168, 70%, 45%)" }}
                />
                <div
                  className="relative flex items-center justify-center gap-3 px-10 py-5 rounded-2xl text-white font-bold text-base md:text-lg transition-all"
                  style={{
                    background: "hsl(215, 80%, 45%)",
                    boxShadow: "0 10px 30px -10px hsl(215, 80%, 45% / 0.6)",
                  }}
                >
                  Assinar agora · R$ 29/mês
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
                </div>
              </button>
              <button
                type="button"
                onClick={() => navigate("/pingo-card")}
                className="text-slate-400 hover:text-white font-bold flex items-center gap-2 transition-colors tracking-wide text-sm"
              >
                Saber mais
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </motion.div>
          </div>

          {/* Right — mascot + floating card */}
          <div className="relative flex justify-center lg:justify-end items-end min-h-[360px] lg:min-h-[480px] lg:col-span-5">
            <div className="relative w-full max-w-[520px] h-full flex items-end">
              {/* Rim light */}
              <div
                aria-hidden
                className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[120%] h-[60%] rounded-full blur-[80px] opacity-50"
                style={{ background: "radial-gradient(at 50% 70%, hsl(168, 70%, 45% / 0.30), transparent 70%)" }}
              />
              <div
                aria-hidden
                className="absolute bottom-[15%] right-0 w-32 h-32 rounded-full blur-[60px]"
                style={{ background: "hsl(168, 70%, 55% / 0.20)" }}
              />

              {/* Mascot */}
              <motion.img
                src={pingoCartao}
                alt="Pingo segurando o Pingo Card"
                loading="lazy"
                className="relative z-10 w-full h-auto select-none drop-shadow-[0_30px_50px_rgba(0,0,0,0.55)]"
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 5, ease: "easeInOut", repeat: Infinity }}
                draggable={false}
              />

              {/* Floating realistic credit card */}
              <motion.div
                aria-hidden
                initial={{ opacity: 0, y: -10, rotate: -8 }}
                animate={{ opacity: 1, y: [0, -10, 0], rotate: [-12, -10, -12] }}
                transition={{
                  opacity: { duration: 0.6, delay: 0.3 },
                  y: { duration: 4.5, ease: "easeInOut", repeat: Infinity },
                  rotate: { duration: 4.5, ease: "easeInOut", repeat: Infinity },
                }}
                className="hidden md:flex absolute top-[8%] -left-4 lg:-left-12 z-30 w-64 aspect-[1.58/1] rounded-2xl border border-white/20 shadow-[0_30px_60px_-12px_rgba(0,0,0,0.8)] p-5 flex-col justify-between overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, #1e293b 0%, #0f172a 55%, #020617 100%)",
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="w-11 h-8 rounded-md bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 border border-white/10 shadow-inner" />
                  <div className="text-[10px] text-white font-black tracking-[0.18em] italic opacity-90 uppercase">
                    Pingo Card
                  </div>
                </div>
                <div className="text-white/90 font-mono tracking-[0.18em] text-[13px]">
                  •••• •••• •••• 4000
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-[8.5px] text-white/50 uppercase font-bold tracking-wider">
                    Exp 12/29
                  </div>
                  <div className="flex -space-x-3 opacity-90">
                    <div className="w-7 h-7 rounded-full backdrop-blur-sm" style={{ background: "hsl(168, 70%, 45% / 0.55)" }} />
                    <div className="w-7 h-7 rounded-full backdrop-blur-sm border border-white/10" style={{ background: "hsl(215, 80%, 50% / 0.55)" }} />
                  </div>
                </div>
                {/* shine */}
                <div aria-hidden className="absolute inset-0 pointer-events-none rounded-2xl"
                  style={{ background: "linear-gradient(to top right, rgba(255,255,255,0.10), transparent 60%)" }} />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PingoCardBanner;
