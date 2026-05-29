/**
 * Máscaras e validadores BR — CPF, telefone, sugestão de typo em e-mail.
 * Tudo client-side, sem libs externas.
 */

/** Mantém só dígitos. */
export const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

/** Aplica máscara progressiva 000.000.000-00 conforme o usuário digita. */
export function maskCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  let out = d;
  if (d.length > 3)  out = `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length > 6)  out = `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  if (d.length > 9)  out = `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  return out;
}

/** Valida CPF com dígitos verificadores (não dispara em CPFs com 11 dígitos repetidos). */
export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  const calc = (slice: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < slice.length; i++) sum += parseInt(slice[i], 10) * (factor - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(cpf.slice(0, 9), 10) === parseInt(cpf[9], 10)
      && calc(cpf.slice(0, 10), 11) === parseInt(cpf[10], 10);
}

/** Aplica máscara (XX) XXXXX-XXXX para celular com DDD (11 dígitos). */
export function maskPhoneBR(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2)  return `(${d}`;
  if (d.length <= 6)  return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

/** Aplica máscara CEP 00000-000. */
export function maskCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d;
}

/** Aplica máscara CNPJ 00.000.000/0000-00. */
export function maskCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 2)  return d;
  if (d.length <= 5)  return `${d.slice(0,2)}.${d.slice(2)}`;
  if (d.length <= 8)  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`;
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
}

const COMMON_DOMAINS = [
  "gmail.com", "hotmail.com", "outlook.com", "icloud.com", "yahoo.com",
  "yahoo.com.br", "uol.com.br", "bol.com.br", "live.com", "msn.com",
  "terra.com.br", "ig.com.br",
];

/** Distância de Levenshtein simples (limit 3). */
function lev(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 3) return 99;
  const m = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) m[i][0] = i;
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      m[i][j] = Math.min(m[i-1][j] + 1, m[i][j-1] + 1, m[i-1][j-1] + cost);
    }
  }
  return m[a.length][b.length];
}

/**
 * Detecta typo em domínio do e-mail. Devolve sugestão de correção
 * (`gmail.com`) quando o domínio digitado está a ≤ 2 edits de um
 * domínio popular.
 */
export function suggestEmailFix(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;
  const domain = email.slice(at + 1).toLowerCase().trim();
  if (!domain || COMMON_DOMAINS.includes(domain)) return null;
  let best: { d: string; dist: number } | null = null;
  for (const d of COMMON_DOMAINS) {
    const dist = lev(domain, d);
    if (dist === 0) return null;
    if (dist <= 2 && (!best || dist < best.dist)) best = { d, dist };
  }
  return best ? `${email.slice(0, at + 1)}${best.d}` : null;
}

/** RFC-light. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").trim());
}
