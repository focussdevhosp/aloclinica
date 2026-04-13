import { forwardRef, lazy, useState } from "react"
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, MagnifyingGlass, Clock } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import Header from "@/components/landing/Header";
import SEOHead from "@/components/SEOHead";

const Footer = lazy(() => import("@/components/landing/Footer"));

const articles = [
  {
    id: 1,
    title: "Guia Completo: Como Cuidar da Sua Saúde Mental",
    excerpt: "Dicas práticas de profissionais sobre meditação, exercício e autocuidado.",
    category: "Bem-estar",
    author: "Dra. Marina Silva",
    readTime: "8 min",
    image: "🧠",
    date: "15 Abr",
  },
  {
    id: 2,
    title: "Alimentação Saudável: O Que Você Realmente Precisa Saber",
    excerpt: "Nuticionista explica mitos sobre dieta e o que a ciência diz.",
    category: "Nutrição",
    author: "Dr. Carlos Costa",
    readTime: "6 min",
    image: "🥗",
    date: "12 Abr",
  },
  {
    id: 3,
    title: "Telemedicina: Revolucionando o Acesso à Saúde",
    excerpt: "Como a tecnologia está democratizando consultas médicas no Brasil.",
    category: "Tecnologia",
    author: "Jornalista Ana Santos",
    readTime: "7 min",
    image: "💻",
    date: "10 Abr",
  },
  {
    id: 4,
    title: "Sono de Qualidade: Dicas do Especialista em Medicina do Sono",
    excerpt: "Entenda sua privação de sono e técnicas para dormir melhor.",
    category: "Saúde",
    author: "Dr. Roberto Mendes",
    readTime: "5 min",
    image: "😴",
    date: "08 Abr",
  },
  {
    id: 5,
    title: "Exercício Físico e Longevidade: O Que Dizem os Estudos",
    excerpt: "Quanto exercício é necessário para viver mais e melhor?",
    category: "Bem-estar",
    author: "Dra. Juliana Oliveira",
    readTime: "9 min",
    image: "💪",
    date: "05 Abr",
  },
  {
    id: 6,
    title: "Dermatologia Moderna: Tratamentos Inovadores para Pele",
    excerpt: "Novas tecnologias e procedimentos que transformam a dermatologia.",
    category: "Saúde",
    author: "Dr. Pedro Alves",
    readTime: "7 min",
    image: "🔬",
    date: "02 Abr",
  },
];

const categories = ["Todos", "Bem-estar", "Nutrição", "Tecnologia", "Saúde"];

const Recursos = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Todos" || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div ref={ref} className="relative min-h-screen bg-background">
      <div className="absolute inset-0 -z-10 bg-[image:var(--landing-bg)] pointer-events-none" />

      <SEOHead
        title="Recursos e Artigos | AloClínica - Saúde e Bem-estar"
        description="Blog e recursos educativos sobre saúde, bem-estar, nutrição e tecnologia em medicina."
        canonical="https://aloclinica.com.br/recursos"
      />

      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-20 2xl:px-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full mb-4">
              Aprender & Crescer
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-6">
              Recursos Educativos <span className="text-primary">Confiáveis</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Artigos, guias e dicas de especialistas sobre saúde, bem-estar e tecnologia em medicina.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-20 2xl:px-28">
          <div className="max-w-2xl mx-auto mb-6">
            <div className="relative">
              <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" weight="bold" />
              <Input
                type="text"
                placeholder="Procure por artigo ou tópico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-12 rounded-xl text-base"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-20 px-4">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-20 2xl:px-28">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article, i) => (
              <motion.article
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i % 6) * 0.05 }}
                className="group flex flex-col rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all overflow-hidden cursor-pointer"
                onClick={() => navigate(`/artigo/${article.id}`)}
              >
                {/* Image/Icon */}
                <div className="h-40 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-6xl group-hover:scale-105 transition-transform">
                  {article.image}
                </div>

                {/* Content */}
                <div className="flex-1 p-6 flex flex-col">
                  {/* Category */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
                      {article.category}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" weight="bold" />
                      {article.readTime}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-sm text-muted-foreground mb-4 flex-1 line-clamp-2">
                    {article.excerpt}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="text-xs text-muted-foreground">
                      <div className="font-medium text-foreground">{article.author}</div>
                      <div>{article.date}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" weight="bold" />
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          {filteredArticles.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-muted-foreground text-lg">
                Nenhum artigo encontrado. Tente outra busca.
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
              Receba Artigos Novos
            </h2>
            <p className="text-muted-foreground text-lg mb-6">
              Se inscreva e receba novos conteúdos sobre saúde toda semana.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="seu@email.com"
                className="flex-1 h-12 rounded-xl"
              />
              <Button
                size="lg"
                className="bg-gradient-hero text-primary-foreground hover:opacity-90 rounded-xl px-8 h-12 font-semibold"
              >
                Inscrever
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

Recursos.displayName = "Recursos";
export default Recursos;
