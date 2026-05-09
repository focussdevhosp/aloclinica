/**
 * KycRequiredGate — bloqueia acesso a fluxos críticos sem KYC aprovado.
 *
 * Uso:
 *   <KycRequiredGate>
 *     <BookAppointment />  // só renderiza se paciente passou KYC
 *   </KycRequiredGate>
 *
 * Comportamento:
 *   - loading → spinner
 *   - sem usuário → redireciona para /paciente
 *   - sem KYC aprovado → mostra UI de chamada para verificar (deep link para /kyc)
 *   - com KYC aprovado → renderiza children
 *
 * Aceita médico tb (verifica doctor_profiles.kyc_status).
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/integrations/supabase/untyped";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Loader2, AlertCircle, Camera, ArrowRight } from "lucide-react";
import { warn } from "@/lib/logger";

type Props = {
  children: React.ReactNode;
  /** Quando o paciente termina o KYC, para onde voltar (default = página atual) */
  returnTo?: string;
  /** Texto contextual: por que estamos pedindo KYC agora? */
  reason?: string;
};

type KycState = "loading" | "approved" | "missing" | "rejected" | "pending";

export function KycRequiredGate({ children, returnTo, reason }: Props) {
  const { user, roles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<KycState>("loading");
  const isDoctor = roles.includes("doctor") || roles.includes("admin");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setState("missing");
      return;
    }
    // Admin sempre passa (acesso operacional)
    if (roles.includes("admin")) {
      setState("approved");
      return;
    }

    const check = async () => {
      try {
        // 1. Buscar verificação biométrica mais recente
        const { data: verif } = await (db as any)
          .from("kyc_verificacoes")
          .select("status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (verif?.status === "approved" || verif?.status === "aprovado") {
          // 2. Para médico, validar também doctor_profiles.kyc_status
          if (isDoctor) {
            const { data: doc } = await db
              .from("doctor_profiles")
              .select("kyc_status")
              .eq("user_id", user.id)
              .maybeSingle();
            if (doc?.kyc_status === "approved" || doc?.kyc_status === "verified") {
              setState("approved");
              return;
            }
            setState("pending");
            return;
          }
          setState("approved");
          return;
        }

        if (verif?.status === "rejected" || verif?.status === "reprovado") {
          setState("rejected");
          return;
        }

        setState("missing");
      } catch (e) {
        warn("[KycRequiredGate] erro verificando KYC", e);
        setState("missing");
      }
    };

    check();
  }, [user, authLoading, roles, isDoctor]);

  if (authLoading || state === "loading") {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/paciente", { replace: true });
    return null;
  }

  if (state === "approved") {
    return <>{children}</>;
  }

  // Não aprovado → CTA para fazer KYC
  const target = returnTo ?? window.location.pathname;
  const goToKyc = () => navigate(`/kyc?return=${encodeURIComponent(target)}`);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Verificação obrigatória</CardTitle>
          <CardDescription className="mt-2">
            {reason ?? "Antes de prosseguir, precisamos confirmar sua identidade com um documento e uma selfie. É rápido (1 minuto) e protege você e o profissional."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "rejected" && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                Sua verificação anterior foi recusada. Tente novamente com boa iluminação,
                rosto centralizado e o documento legível.
              </div>
            </div>
          )}
          {state === "pending" && isDoctor && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                Sua biometria foi recebida e está em análise pelo nosso compliance.
                Você receberá um email assim que liberar.
              </div>
            </div>
          )}
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li className="flex items-center gap-2"><Camera className="w-4 h-4" /> Selfie ao vivo (não vale foto antiga)</li>
            <li className="flex items-center gap-2"><Camera className="w-4 h-4" /> Documento com foto (RG, CNH, passaporte)</li>
            <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Os dados são processados de forma criptografada</li>
          </ul>
          <Button onClick={goToKyc} className="w-full gap-2" size="lg">
            Iniciar verificação <ArrowRight className="w-4 h-4" />
          </Button>
          <Button onClick={() => navigate(-1)} variant="ghost" className="w-full">
            Voltar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default KycRequiredGate;
