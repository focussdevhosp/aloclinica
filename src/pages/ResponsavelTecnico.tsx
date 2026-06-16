import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Building2, UserCheck, FileText, Mail, MapPin } from "lucide-react";

const ResponsavelTecnico = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Responsável Técnico e CRM-PJ | AloClínica"
        description="Informações de transparência corporativa da AloClínica: razão social, CNPJ, CRM-PJ e Responsável Técnico médico, conforme exigências do Conselho Federal de Medicina."
        canonical="https://aloclinica.com.br/responsavel-tecnico"
      />
      <Header />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Responsável Técnico e CRM-PJ
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Em cumprimento à Resolução CFM nº 2.314/2022 e ao Código de Ética Médica, divulgamos publicamente os dados da empresa e do Responsável Técnico Médico desta plataforma de telemedicina.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-primary" />
                Pessoa Jurídica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Razão Social</p>
                <p className="font-medium text-foreground">AloClínica Telemedicina Ltda.</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">CNPJ</p>
                <p className="font-medium text-foreground">[a preencher]</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">CRM-PJ</p>
                <p className="font-medium text-foreground">[a preencher] / UF</p>
              </div>
              <div className="flex items-start gap-2 pt-2 border-t">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-muted-foreground">Sede em território brasileiro — endereço completo a preencher no painel administrativo.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCheck className="h-5 w-5 text-primary" />
                Responsável Técnico Médico
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Nome</p>
                <p className="font-medium text-foreground">[a preencher]</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">CRM ativo</p>
                <p className="font-medium text-foreground">[a preencher] / UF</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Especialidade</p>
                <p className="font-medium text-foreground">[a preencher]</p>
              </div>
              <div className="flex items-start gap-2 pt-2 border-t">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-muted-foreground">Contato técnico: rt@aloclinica.com.br</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Conformidade Legal e Regulatória
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>A AloClínica opera em conformidade com:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Resolução CFM nº 2.314/2022</strong> — Regulamentação da Telemedicina no Brasil.</li>
              <li><strong className="text-foreground">Lei nº 14.510/2022</strong> — Marco Legal da Telessaúde.</li>
              <li><strong className="text-foreground">Resolução CFM nº 2.299/2021</strong> — Prescrição eletrônica.</li>
              <li><strong className="text-foreground">Resolução CFM nº 1.821/2007</strong> — Prontuário eletrônico e retenção mínima de 20 anos.</li>
              <li><strong className="text-foreground">Lei nº 14.063/2020</strong> — Assinaturas eletrônicas em documentos médicos.</li>
              <li><strong className="text-foreground">Lei nº 13.709/2018 (LGPD)</strong> — Tratamento de dados pessoais sensíveis em saúde.</li>
              <li><strong className="text-foreground">MP 2.200-2/2001</strong> — ICP-Brasil (exigida para receitas de medicamentos controlados).</li>
            </ul>
            <p className="pt-2">
              Encarregado de Dados (DPO LGPD): <a href="mailto:dpo@aloclinica.com.br" className="text-primary hover:underline">dpo@aloclinica.com.br</a>
            </p>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Esta página é atualizada sempre que houver mudança de Responsável Técnico ou dados corporativos.
        </p>
      </main>

      <Footer />
    </div>
  );
};

export default ResponsavelTecnico;