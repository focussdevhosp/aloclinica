/**
 * AuditTrailDrawer — Wave 5
 * Mostra logs recentes de site_block.* a partir de activity_logs.
 */
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { db } from "@/integrations/supabase/untyped";
import { warn } from "@/lib/logger";

type LogRow = {
  id: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  user_id: string | null;
};

const ACTION_LABEL: Record<string, string> = {
  "site_block.create":   "Criou bloco",
  "site_block.update":   "Atualizou bloco",
  "site_block.publish":  "Publicou bloco",
  "site_block.rollback": "Restaurou versão",
  "site_block.delete":   "Removeu bloco",
};

export function AuditTrailDrawer({
  open, onOpenChange, blockId,
}: { open: boolean; onOpenChange: (v: boolean) => void; blockId?: string | null }) {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    let q = (db as any).from("activity_logs")
      .select("id, action, resource_type, resource_id, metadata, created_at, user_id")
      .like("action", "site_block.%")
      .order("created_at", { ascending: false })
      .limit(100);
    if (blockId) q = q.eq("resource_id", blockId);
    q.then(({ data, error }: any) => {
      if (error) warn("[audit] load", error);
      setLogs((data ?? []) as LogRow[]);
      setLoading(false);
    });
  }, [open, blockId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>Auditoria do Studio</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2 max-h-[calc(100vh-120px)] overflow-y-auto">
          {loading && <p className="text-xs text-muted-foreground">Carregando…</p>}
          {!loading && logs.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhum registro ainda.</p>
          )}
          {logs.map((l) => (
            <div key={l.id} className="rounded-lg border p-3 text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {ACTION_LABEL[l.action] ?? l.action}
                </Badge>
                <span className="text-muted-foreground">
                  {new Date(l.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
              {l.metadata?.block_key && (
                <div className="font-mono text-[10px] text-muted-foreground truncate">
                  {l.metadata.page_slug ? `${l.metadata.page_slug}/` : ""}{l.metadata.block_key}
                </div>
              )}
              {l.metadata?.change_note && (
                <div className="text-muted-foreground italic">"{l.metadata.change_note}"</div>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}