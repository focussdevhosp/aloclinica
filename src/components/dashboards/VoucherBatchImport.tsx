/**
 * VoucherBatchImport — gestor cola/envia CSV com vouchers e a gente cria
 * em batch. Reduz horas de operação para órgãos com centenas de cupons.
 *
 * Formato CSV (cabeçalho obrigatório):
 *   codigo,usos_maximos,validade_fim,descricao
 *   SAUDE2026A,1,2026-12-31,Campanha junho
 *   SAUDE2026B,3,,Sem validade
 *
 * - `validade_fim` vazio = sem validade.
 * - `usos_maximos` default = 1 se vazio.
 * - Insere em lotes de 100 com ON CONFLICT DO NOTHING (idempotente por código).
 */
import { useRef, useState } from "react";
import { db } from "@/integrations/supabase/untyped";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";

interface Props {
  contratoId: string;
  contratoNome?: string;
  /** Especialidades padrão do contrato (herdadas pelos vouchers se ausentes). */
  defaultEspecialidades?: string[];
  onImported?: (count: number) => void;
}

interface Row {
  codigo: string;
  usos_maximos: number;
  validade_fim: string | null;
  descricao: string | null;
}

function parseCsv(raw: string): { ok: Row[]; errors: string[] } {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { ok: [], errors: ["CSV vazio"] };

  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const idx = {
    codigo: header.indexOf("codigo"),
    usos_maximos: header.indexOf("usos_maximos"),
    validade_fim: header.indexOf("validade_fim"),
    descricao: header.indexOf("descricao"),
  };
  if (idx.codigo === -1) return { ok: [], errors: ["Coluna obrigatória 'codigo' não encontrada no cabeçalho"] };

  const ok: Row[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim());
    const codigo = (cells[idx.codigo] || "").toUpperCase();
    if (!codigo) { errors.push(`Linha ${i + 1}: código vazio`); continue; }
    if (seen.has(codigo)) { errors.push(`Linha ${i + 1}: código "${codigo}" duplicado no CSV`); continue; }
    seen.add(codigo);
    const usosRaw = idx.usos_maximos >= 0 ? cells[idx.usos_maximos] : "";
    const usos = usosRaw ? Number(usosRaw) : 1;
    if (!Number.isFinite(usos) || usos < 1) { errors.push(`Linha ${i + 1}: usos_maximos inválido`); continue; }
    const validade = idx.validade_fim >= 0 ? (cells[idx.validade_fim] || "") : "";
    const desc = idx.descricao >= 0 ? (cells[idx.descricao] || "") : "";
    ok.push({
      codigo,
      usos_maximos: usos,
      validade_fim: validade && /^\d{4}-\d{2}-\d{2}$/.test(validade) ? validade : null,
      descricao: desc || null,
    });
  }
  return { ok, errors };
}

export default function VoucherBatchImport({ contratoId, contratoNome, defaultEspecialidades, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [previewOk, setPreviewOk] = useState<Row[]>([]);
  const [previewErr, setPreviewErr] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [imported, setImported] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRaw(""); setPreviewOk([]); setPreviewErr([]); setImported(null);
  };

  const parse = (text: string) => {
    setRaw(text);
    const { ok, errors } = parseCsv(text);
    setPreviewOk(ok); setPreviewErr(errors); setImported(null);
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/csv|text/.test(f.type) && !/\.csv$/i.test(f.name)) {
      toast.info("Envie um arquivo CSV (.csv)"); return;
    }
    const reader = new FileReader();
    reader.onload = () => parse(String(reader.result || ""));
    reader.readAsText(f, "utf-8");
  };

  const submit = async () => {
    if (!previewOk.length) return;
    setSubmitting(true);
    try {
      const today = new Date();
      const inicio = today.toISOString().slice(0, 10);
      const payload = previewOk.map((r) => ({
        contrato_id: contratoId,
        codigo: r.codigo,
        usos_maximos: r.usos_maximos,
        usos_atuais: 0,
        validade_inicio: inicio,
        validade_fim: r.validade_fim,
        descricao: r.descricao,
        especialidades_permitidas: defaultEspecialidades ?? null,
        ativo: true,
      }));
      // Insere em lotes de 100
      let total = 0;
      for (let i = 0; i < payload.length; i += 100) {
        const slice = payload.slice(i, i + 100);
        const { error } = await db.from("vouchers").insert(slice as any);
        if (error) {
          // Tolerância: violação de unique (codigo) → pula esse batch e tenta os próximos
          if ((error as any).code !== "23505") throw error;
          // Re-insere um a um para o batch que falhou
          for (const row of slice) {
            const { error: e2 } = await db.from("vouchers").insert(row as any);
            if (!e2) total++;
          }
          continue;
        }
        total += slice.length;
      }
      setImported(total);
      toast.success(`${total} voucher${total !== 1 ? "s" : ""} criado${total !== 1 ? "s" : ""}`);
      onImported?.(total);
    } catch (e: any) {
      logError("VoucherBatchImport submit", e);
      toast.error("Falha ao importar", { description: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-8 text-xs">
          <Upload className="w-3.5 h-3.5" /> Importar vouchers
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar vouchers em lote {contratoNome ? `— ${contratoNome}` : ""}</DialogTitle>
        </DialogHeader>
        {imported != null ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-success/15 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-success" />
            </div>
            <p className="font-semibold text-foreground">{imported} voucher{imported !== 1 ? "s" : ""} importado{imported !== 1 ? "s" : ""}</p>
            <Button onClick={() => { reset(); }} variant="outline" className="rounded-xl">Importar outro lote</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
              Formato CSV com cabeçalho:<br />
              <code className="text-[11px]">codigo,usos_maximos,validade_fim,descricao</code><br />
              <span className="opacity-70">Ex.: <code>SAUDE2026A,1,2026-12-31,Campanha junho</code></span>
            </div>
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onPickFile} />
              <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => fileRef.current?.click()}>
                <FileText className="w-3.5 h-3.5" /> Anexar CSV
              </Button>
              <span className="text-[11px] text-muted-foreground">ou cole o CSV abaixo</span>
            </div>
            <Textarea value={raw} onChange={(e) => parse(e.target.value)} rows={8}
              placeholder="codigo,usos_maximos,validade_fim,descricao&#10;SAUDE2026A,1,2026-12-31,..."
              className="font-mono text-xs resize-none" />
            {previewErr.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive max-h-24 overflow-auto">
                <p className="font-semibold mb-1">{previewErr.length} erro(s) — linhas serão ignoradas:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {previewErr.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                  {previewErr.length > 5 && <li>… e mais {previewErr.length - 5}</li>}
                </ul>
              </div>
            )}
            {previewOk.length > 0 && (
              <div className="text-xs text-muted-foreground">
                <strong className="text-success">{previewOk.length}</strong> voucher{previewOk.length !== 1 ? "s" : ""} pronto{previewOk.length !== 1 ? "s" : ""} para importar.
              </div>
            )}
            <Button onClick={submit} disabled={submitting || previewOk.length === 0} className="w-full rounded-xl gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {submitting ? "Importando…" : `Importar ${previewOk.length} voucher${previewOk.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
