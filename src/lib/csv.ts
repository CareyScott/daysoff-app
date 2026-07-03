type CsvValue = string | number | boolean | null | undefined;

function escapeCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: CsvValue[][]): string {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, content: string): void {
  // BOM so Excel opens it as UTF-8.
  const blob = new Blob(["﻿", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
