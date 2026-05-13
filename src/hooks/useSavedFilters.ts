import { useCallback, useEffect, useState } from "react";

/**
 * useSavedFilters — persiste conjuntos nomeados de filtros por escopo
 * (ex.: "admin_users", "admin_appointments") no localStorage.
 *
 * Quem usa:
 *   const { saved, save, remove, apply } = useSavedFilters<MyFilters>("admin_users");
 *   save("Médicos pendentes", { role: "doctor", status: "pending" });
 *   apply("Médicos pendentes"); // retorna o objeto pra hidratar estado
 *
 * Estrutura no storage: `aloclinica:saved-filters:<scope>` = Record<string, T>
 */

const PREFIX = "aloclinica:saved-filters:";

export function useSavedFilters<T extends Record<string, unknown>>(scope: string) {
  const key = `${PREFIX}${scope}`;
  const [saved, setSaved] = useState<Record<string, T>>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(saved)); } catch { /* ignore */ }
  }, [key, saved]);

  const save = useCallback((name: string, filters: T) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaved(prev => ({ ...prev, [trimmed]: filters }));
  }, []);

  const remove = useCallback((name: string) => {
    setSaved(prev => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const apply = useCallback((name: string): T | undefined => saved[name], [saved]);

  const names = Object.keys(saved);

  return { saved, names, save, remove, apply };
}
