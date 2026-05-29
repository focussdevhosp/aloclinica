/**
 * Barra de força de senha + checklist de critérios. Aparece quando o
 * usuário começa a digitar, some quando atinge 100%.
 */
import { useMemo } from "react";
import { Check, X } from "lucide-react";

interface Props {
  password: string;
  /** Mínimo de critérios atendidos para considerar OK (default 4). */
  minCriteria?: number;
}

const RULES = [
  { id: "len",     label: "Pelo menos 8 caracteres",   test: (s: string) => s.length >= 8 },
  { id: "upper",   label: "Uma letra maiúscula",        test: (s: string) => /[A-Z]/.test(s) },
  { id: "lower",   label: "Uma letra minúscula",        test: (s: string) => /[a-z]/.test(s) },
  { id: "digit",   label: "Um número",                  test: (s: string) => /\d/.test(s) },
  { id: "special", label: "Um caractere especial (recomendado)", test: (s: string) => /[^A-Za-z0-9]/.test(s) },
];

export default function PasswordStrength({ password, minCriteria = 4 }: Props) {
  const checks = useMemo(() => RULES.map((r) => ({ ...r, ok: r.test(password) })), [password]);
  const score = checks.filter((c) => c.ok).length;
  const pct = (score / RULES.length) * 100;
  const tone = score >= 5 ? "emerald" : score >= minCriteria ? "amber" : score >= 2 ? "orange" : "rose";
  const toneClass: Record<string, string> = {
    emerald: "bg-emerald-500", amber: "bg-amber-500", orange: "bg-orange-500", rose: "bg-rose-500",
  };
  const toneText: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber:   "text-amber-600 dark:text-amber-400",
    orange:  "text-orange-600 dark:text-orange-400",
    rose:    "text-rose-600 dark:text-rose-400",
  };
  const label = score >= 5 ? "Forte" : score >= minCriteria ? "Boa" : score >= 2 ? "Fraca" : "Muito fraca";

  if (!password) return null;

  return (
    <div className="space-y-2 mt-1.5" aria-live="polite">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${toneClass[tone]} transition-all duration-200`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-[10px] font-semibold ${toneText[tone]}`}>{label}</span>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
        {checks.map((c) => (
          <li key={c.id} className="flex items-center gap-1.5 text-[11px]">
            {c.ok
              ? <Check className="w-3 h-3 text-emerald-500 shrink-0" aria-hidden="true" />
              : <X className="w-3 h-3 text-muted-foreground/50 shrink-0" aria-hidden="true" />}
            <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
