import { Star } from "lucide-react";
import { useMemo } from "react";

const FIRST_NAMES = [
  "Maria", "João", "Ana", "Pedro", "Carla", "Lucas", "Beatriz", "Rafael", "Juliana", "Bruno",
  "Camila", "Felipe", "Larissa", "Gustavo", "Patrícia", "Thiago", "Fernanda", "Diego", "Aline", "Rodrigo",
  "Sabrina", "Marcelo", "Vanessa", "Eduardo", "Renata", "André", "Priscila", "Vinícius", "Tatiana", "Leonardo",
  "Mariana", "Henrique", "Bianca", "Caio", "Daniela", "Igor", "Letícia", "Ricardo", "Natália", "Fábio",
  "Amanda", "Murilo", "Isabela", "Otávio", "Carolina", "Matheus", "Gabriela", "Renan", "Sophia", "Yuri",
];
const LAST_NAMES = ["Silva","Souza","Oliveira","Santos","Lima","Costa","Pereira","Almeida","Rodrigues","Ferreira","Carvalho","Gomes","Martins","Araújo","Ribeiro","Barbosa","Cardoso","Teixeira","Moreira","Nascimento"];
const CITIES = [
  "São Paulo, SP","Rio de Janeiro, RJ","Belo Horizonte, MG","Curitiba, PR","Porto Alegre, RS","Recife, PE",
  "Salvador, BA","Fortaleza, CE","Brasília, DF","Manaus, AM","Goiânia, GO","Florianópolis, SC",
  "Vitória, ES","Natal, RN","João Pessoa, PB","Maceió, AL","Belém, PA","Campinas, SP","Santos, SP","Niterói, RJ",
  "Uberlândia, MG","Londrina, PR","Joinville, SC","Ribeirão Preto, SP","Sorocaba, SP","São Luís, MA","Teresina, PI",
  "Cuiabá, MT","Campo Grande, MS","Aracaju, SE",
];
const SPECIALTIES = ["Cardiologia","Dermatologia","Clínico Geral","Pediatria","Ginecologia","Psiquiatria","Endocrinologia","Ortopedia","Neurologia","Nutrição","Urologia","Reumatologia","Otorrino","Gastroenterologia","Pneumologia"];
const TEMPLATES = [
  "Atendimento rápido e médico super atencioso. Recomendo demais!",
  "Consegui consultar sem sair de casa, economizei tempo e dinheiro.",
  "A plataforma é simples e o médico foi excelente, tirou todas as dúvidas.",
  "Receita digital chegou no mesmo instante. Funcionou perfeitamente!",
  "Moro no interior e finalmente tive acesso a um bom especialista.",
  "Atendimento humano e profissional. Voltarei a usar com certeza.",
  "Marquei e fui atendida em menos de 30 minutos. Surreal!",
  "Médica muito qualificada, explicou tudo com calma e clareza.",
  "Preço justo, qualidade impecável. Indiquei para toda família.",
  "Resolveu meu problema sem precisar ir ao pronto-socorro. Salvou minha noite.",
  "Experiência incrível, do agendamento à consulta. Nota 10!",
  "Atendimento humanizado e tecnologia de ponta. Adorei!",
  "Pingo é fofo e o serviço é sério. Combinação perfeita.",
  "Consulta produtiva, recebi receita e pedido de exames no app.",
  "Profissional excelente, consulta tranquila e objetiva.",
];

function seeded(i: number, len: number) { return Math.abs(Math.sin(i * 9301 + 49297)) * len | 0; }

function genReviews(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const first = FIRST_NAMES[seeded(i + 1, FIRST_NAMES.length)];
    const last = LAST_NAMES[seeded(i + 7, LAST_NAMES.length)];
    return {
      name: `${first} ${last}`,
      city: CITIES[seeded(i + 13, CITIES.length)],
      specialty: SPECIALTIES[seeded(i + 23, SPECIALTIES.length)],
      text: TEMPLATES[seeded(i + 41, TEMPLATES.length)],
    };
  });
}

type Review = ReturnType<typeof genReviews>[number];

const ReviewCard = ({ r }: { r: Review }) => (
  <div className="shrink-0 w-[320px] md:w-[360px] mx-3 p-5 rounded-2xl bg-card border border-border/60 shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.15)]">
    <div className="flex items-center gap-2 mb-2">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <span className="text-[9px] font-bold uppercase tracking-wider text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full">
        {r.specialty}
      </span>
    </div>
    <p className="text-sm text-foreground/85 leading-snug mb-3 line-clamp-3 font-medium">"{r.text}"</p>
    <div className="flex items-center gap-2.5 pt-3 border-t border-border/50">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-extrabold text-primary-foreground text-xs">
        {r.name[0]}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-foreground leading-tight truncate">{r.name}</p>
        <p className="text-[10px] text-muted-foreground font-medium truncate">{r.city}</p>
      </div>
    </div>
  </div>
);

const MarqueeRow = ({ items, reverse = false, duration = 90 }: { items: Review[]; reverse?: boolean; duration?: number }) => {
  const doubled = [...items, ...items];
  return (
    <div className="relative overflow-hidden">
      <div
        className="flex w-max"
        style={{
          animation: `${reverse ? "marquee-rtl" : "marquee-ltr"} ${duration}s linear infinite`,
        }}
      >
        {doubled.map((r, i) => (
          <ReviewCard key={i} r={r} />
        ))}
      </div>
    </div>
  );
};

export default function TestimonialsMarquee() {
  const reviews = useMemo(() => genReviews(200), []);
  const half = reviews.length / 2;
  const row1 = reviews.slice(0, half);
  const row2 = reviews.slice(half);

  return (
    <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 space-y-5">
      <style>{`
        @keyframes marquee-ltr { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes marquee-rtl { from { transform: translateX(-50%); } to { transform: translateX(0); } }
      `}</style>
      <MarqueeRow items={row1} duration={120} />
      <MarqueeRow items={row2} reverse duration={140} />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}