/**
 * CSV export helpers — UTF-8 with BOM para Excel reconhecer caracteres acentuados.
 */

const BOM = "﻿";

function escapeField(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; label: string }[],
): string {
  const header = columns.map((c) => escapeField(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escapeField(row[c.key])).join(","))
    .join("\n");
  return BOM + header + "\n" + body;
}

export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function exportToCSV<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns: { key: keyof T; label: string }[],
): void {
  downloadCSV(filename, toCSV(rows, columns));
}
