import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { db } from "@/integrations/supabase/untyped";

/**
 * ContratoContext
 * Detecta se o usuário está acessando via subdomínio de parceiro/ação social
 * (ex: parceiros.aloclinica.com.br ou acoes.aloclinica.com.br) e carrega
 * o contrato vinculado. Componentes podem ler `isContratoMode` para pular
 * checkout do MercadoPago e marcar a consulta como paga-por-contrato.
 */

export type ContratoModo = "particular" | "contrato" | "voucher";

export interface ContratoAtivo {
  id: string;
  nome: string;
  tipo: "empresa" | "prefeitura" | "ong" | "plano_proprio";
  modelo_cobranca: "mensal" | "pacote_pre_pago" | "gratuito_patrocinado";
  especialidades_permitidas: string[];
  branding: Record<string, unknown>;
  status: "ativo" | "pausado" | "encerrado";
  subdominio: string | null;
}

interface ContratoCtxValue {
  modo: ContratoModo;
  isContratoMode: boolean;
  isVoucherMode: boolean;
  contratoAtivo: ContratoAtivo | null;
  loading: boolean;
  setVoucherContrato: (c: ContratoAtivo | null) => void;
}

const ContratoContext = createContext<ContratoCtxValue>({
  modo: "particular",
  isContratoMode: false,
  isVoucherMode: false,
  contratoAtivo: null,
  loading: false,
  setVoucherContrato: () => {},
});

function detectModoFromHost(): { modo: ContratoModo; sub: string | null } {
  if (typeof window === "undefined") return { modo: "particular", sub: null };
  const host = window.location.hostname;
  if (host === "localhost" || host.endsWith(".lovable.app")) {
    return { modo: "particular", sub: null };
  }
  const sub = host.split(".")[0];
  if (sub === "parceiros") return { modo: "contrato", sub };
  if (sub === "acoes") return { modo: "voucher", sub };
  return { modo: "particular", sub: null };
}

export function ContratoProvider({ children }: { children: ReactNode }) {
  const [{ modo, sub }] = useState(() => detectModoFromHost());
  const [contratoAtivo, setContratoAtivo] = useState<ContratoAtivo | null>(null);
  const [loading, setLoading] = useState(modo === "contrato");

  useEffect(() => {
    if (modo !== "contrato" || !sub) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await db
        .from("contratos")
        .select("id,nome,tipo,modelo_cobranca,especialidades_permitidas,branding,status,subdominio")
        .eq("subdominio", sub)
        .eq("status", "ativo")
        .maybeSingle();
      if (data) setContratoAtivo(data as ContratoAtivo);
      setLoading(false);
    })();
  }, [modo, sub]);

  return (
    <ContratoContext.Provider
      value={{
        modo,
        isContratoMode: modo === "contrato",
        isVoucherMode: modo === "voucher",
        contratoAtivo,
        loading,
        setVoucherContrato: setContratoAtivo,
      }}
    >
      {children}
    </ContratoContext.Provider>
  );
}

export const useContrato = () => useContext(ContratoContext);