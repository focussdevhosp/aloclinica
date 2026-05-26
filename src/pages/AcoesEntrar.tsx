import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import { Heart } from "lucide-react";

/**
 * Página de entrada para ações sociais.
 * Paciente entra um código de voucher fornecido pelo patrocinador
 * (prefeitura, ONG, etc). Voucher dá direito a N consultas gratuitas
 * em especialidades específicas.
 */
const AcoesEntrar = () => {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleValidar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("validate-voucher", {
      body: { codigo: codigo.trim() },
    });
    setSubmitting(false);

    if (error || !data?.valid) {
      toast.error(data?.error ?? error?.message ?? "Voucher inválido");
      return;
    }

    // Guarda voucher na sessão para o fluxo de agendamento usar
    sessionStorage.setItem("aloclinica_voucher", JSON.stringify(data));
    toast.success(`Voucher validado! Programa: ${data.contrato.nome}`);
    navigate("/paciente?voucher=1");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <SEOHead title="Ações Sociais | AloClínica" description="Use seu voucher de campanha de saúde" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Heart className="text-primary" />
            <CardTitle>Ações Sociais</CardTitle>
          </div>
          <CardDescription>
            Insira o código do voucher fornecido pelo patrocinador da campanha para
            agendar sua consulta gratuita.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleValidar}>
            <div className="space-y-2">
              <Label htmlFor="codigo">Código do voucher</Label>
              <Input
                id="codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="EX: SAUDE2026"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Validando..." : "Validar e continuar"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Não tem voucher? Volte para o site e use o agendamento normal.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcoesEntrar;