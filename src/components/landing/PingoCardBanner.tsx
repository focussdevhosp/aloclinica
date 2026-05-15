import { useNavigate } from "react-router-dom";
import bannerImg from "@/assets/pingo-card-banner.png";

const PingoCardBanner = () => {
  const navigate = useNavigate();

  return (
    <section
      aria-label="Pingo Card - Cartão de saúde digital"
      className="relative w-full"
    >
      <button
        type="button"
        onClick={() => navigate("/pingo-card")}
        className="block w-full group focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
        aria-label="Conhecer o Pingo Card"
      >
        <img
          src={bannerImg}
          alt="Novo Pingo Card — Seu cartão de saúde digital. Consultas ilimitadas a partir de R$ 29/mês."
          className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.005]"
          loading="lazy"
        />
      </button>
    </section>
  );
};

export default PingoCardBanner;
