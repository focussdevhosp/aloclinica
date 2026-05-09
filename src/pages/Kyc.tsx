/**
 * Página /kyc — verificação biométrica direta (same-device).
 *
 * Diferente de /kyc-mobile (cross-device com QR token), esta é a versão
 * simples para quando o usuário está no celular ou tem câmera no desktop.
 *
 * Aceita ?return=/caminho para voltar ao fluxo original após aprovação
 * (usado por KycRequiredGate em BookAppointment, VideoRoom etc).
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import BiometricKYC from "@/components/kyc/BiometricKYC";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import SEOHead from "@/components/SEOHead";

export default function Kyc() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get("return") || "/dashboard";
  const [done, setDone] = useState(false);

  // Decide tipo (paciente vs medico) com base nos roles
  const isDoctor = roles.includes("doctor") || roles.includes("ophthalmologist");
  const tipo = isDoctor ? "medico" : "paciente";

  useEffect(() => {
    if (!loading && !user) {
      // Sem login → vai pra autenticação correspondente
      navigate(isDoctor ? "/medico" : "/paciente", { replace: true });
    }
  }, [user, loading, navigate, isDoctor]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-emerald-50 via-background to-emerald-50/50 dark:from-emerald-950/20 dark:to-background">
        <SEOHead title="Verificação concluída — AloClínica" />
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <CardTitle className="text-xl">Tudo certo!</CardTitle>
            <CardDescription>Sua identidade foi verificada com sucesso.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate(returnTo, { replace: true })}
              className="w-full"
              size="lg"
            >
              Continuar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 py-8 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <SEOHead title="Verificação de identidade — AloClínica" />
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center space-y-2 mb-6">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Verificação de identidade</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Para sua segurança e do profissional, precisamos confirmar que é você mesmo
            antes de prosseguir.
          </p>
        </div>

        <BiometricKYC
          tipo={tipo}
          onComplete={(result) => {
            if (result?.match && result.score >= 80) setDone(true);
          }}
        />
      </div>
    </div>
  );
}
