/**
 * Studio — leitura e mutação de site_blocks.
 * Unifica seções/configs/tema do site num único modelo versionado.
 */
import { useEffect, useState, useCallback } from "react";
import { db } from "@/integrations/supabase/untyped";
import { warn } from "@/lib/logger";

export type BlockScope = "section" | "page" | "config" | "theme" | "email";

export type SiteBlock = {
  id: string;
  scope: BlockScope;
  page_slug: string | null;
  block_key: string;
  display_name: string;
  display_order: number;
  is_enabled: boolean;
  schema: { fields?: BlockField[] } & Record<string, any>;
  published: Record<string, any>;
  draft: Record<string, any> | null;
  has_draft: boolean;
  i18n: Record<string, Record<string, any>>;
  last_published_at: string | null;
  last_published_by: string | null;
  updated_at: string;
};

export type BlockField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "richtext" | "image" | "color" | "url" | "number" | "select" | "switch" | "list";
  options?: string[];
  item_schema?: { fields: BlockField[] };
  placeholder?: string;
};

export type BlockVersion = {
  id: string;
  block_id: string;
  version: number;
  locale: string | null;
  snapshot: Record<string, any>;
  change_note: string | null;
  published_at: string;
  published_by: string | null;
};

export async function fetchBlocks(scope?: BlockScope): Promise<SiteBlock[]> {
  let q = (db as any).from("site_blocks").select("*").order("scope").order("page_slug").order("display_order");
  if (scope) q = q.eq("scope", scope);
  const { data, error } = await q;
  if (error) { warn("[site-blocks] fetch", error); return []; }
  return (data ?? []) as SiteBlock[];
}

export async function saveBlockDraft(id: string, draft: Record<string, any>) {
  const { error } = await (db as any)
    .from("site_blocks")
    .update({ draft, has_draft: true })
    .eq("id", id);
  if (error) throw error;
}

export async function discardDraft(id: string) {
  const { error } = await (db as any)
    .from("site_blocks")
    .update({ draft: null, has_draft: false })
    .eq("id", id);
  if (error) throw error;
}

export async function publishBlock(id: string, note?: string) {
  const { data, error } = await (db as any).rpc("publish_site_block", {
    p_block_id: id,
    p_change_note: note ?? null,
  });
  if (error) throw error;
  return data;
}

export async function rollbackBlock(versionId: string) {
  const { data, error } = await (db as any).rpc("rollback_site_block", {
    p_version_id: versionId,
  });
  if (error) throw error;
  return data;
}

export async function fetchBlockVersions(blockId: string): Promise<BlockVersion[]> {
  const { data, error } = await (db as any)
    .from("site_block_versions")
    .select("*")
    .eq("block_id", blockId)
    .order("version", { ascending: false });
  if (error) { warn("[site-blocks] versions", error); return []; }
  return data as BlockVersion[];
}

export async function toggleBlock(id: string, enabled: boolean) {
  const { error } = await (db as any).from("site_blocks").update({ is_enabled: enabled }).eq("id", id);
  if (error) throw error;
}

export async function reorderBlock(id: string, display_order: number) {
  const { error } = await (db as any).from("site_blocks").update({ display_order }).eq("id", id);
  if (error) throw error;
}

export function useBlocks(scope?: BlockScope) {
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await fetchBlocks(scope);
    setBlocks(data);
    setLoading(false);
  }, [scope]);

  useEffect(() => { reload(); }, [reload]);

  return { blocks, loading, reload, setBlocks };
}

// ────────────────────────────────────────────────────────────
// Public-side helpers (Wave 4): leitura do `published` por (page_slug, block_key)
// Cache em memória + invalidação via invalidateBlocksCache().
// ────────────────────────────────────────────────────────────

type PublicBlock = {
  page_slug: string | null;
  block_key: string;
  is_enabled: boolean;
  published: Record<string, any>;
  i18n: Record<string, Record<string, any>>;
};

let _publicCache: PublicBlock[] | null = null;
let _publicPromise: Promise<PublicBlock[]> | null = null;

async function fetchPublicBlocks(): Promise<PublicBlock[]> {
  if (_publicCache) return _publicCache;
  if (_publicPromise) return _publicPromise;
  _publicPromise = (db as any)
    .from("site_blocks")
    .select("page_slug, block_key, is_enabled, published, i18n")
    .then(({ data, error }: any) => {
      if (error) { warn("[site-blocks] public fetch", error); return []; }
      _publicCache = (data ?? []) as PublicBlock[];
      return _publicCache!;
    });
  return _publicPromise!;
}

export function invalidateBlocksCache() {
  _publicCache = null;
  _publicPromise = null;
}

/**
 * usePublishedBlock — lê o conteúdo publicado de um bloco para uso público.
 * Retorna fallback enquanto carrega ou se o bloco não existir.
 *
 * @example
 *   const hero = usePublishedBlock("home", "hero", { title: "Bem-vindo" });
 */
export function usePublishedBlock<T extends Record<string, any>>(
  pageSlug: string | null,
  blockKey: string,
  fallback: T,
  locale?: string,
): T & { __enabled: boolean } {
  const [state, setState] = useState<T & { __enabled: boolean }>({ ...fallback, __enabled: true });

  useEffect(() => {
    let mounted = true;
    fetchPublicBlocks().then((blocks) => {
      if (!mounted) return;
      const b = blocks.find((x) => x.page_slug === pageSlug && x.block_key === blockKey);
      if (!b) return;
      const loc = locale && b.i18n?.[locale] ? b.i18n[locale] : null;
      const data = loc ?? b.published ?? {};
      setState({ ...fallback, ...(data as any), __enabled: b.is_enabled });
    });
    return () => { mounted = false; };
  }, [pageSlug, blockKey, locale]);

  return state;
}