/** CSV columns for product import/export, in order. */
export const CSV_COLUMNS = [
  "sku", "barcode", "name", "category", "brand", "price", "mrp", "unit", "stock",
  "lowStockThreshold", "gstRate", "hsnCode", "specifications", "images",
  "ondcListed", "returnable", "returnWindowDays", "cancellable", "timeToShipMinutes", "vegType",
  "countryOfOrigin", "manufacturer",
] as const;

const ONDC_COLUMNS: Record<string, string> = {
  ondcListed: "listed",
  returnable: "returnable",
  cancellable: "cancellable",
  vegType: "vegType",
  countryOfOrigin: "countryOfOrigin",
  manufacturer: "manufacturer",
  returnWindowDays: "returnWindowDays",
  timeToShipMinutes: "timeToShipMinutes",
};

const cell = (v: unknown) => {
  const s = v === undefined || v === null ? "" : String(v);
  // Neutralise spreadsheet formula injection, then quote if needed.
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCsv(columns: readonly string[], rows: Record<string, unknown>[]): string {
  return [columns.join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\r\n") + "\r\n";
}

/** RFC 4180 parser: quoted fields, escaped quotes, CRLF/LF, BOM. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const norm = (h: string) => h.trim().replace(/^'/, "").replace(/[\s_-]+/g, "").toLowerCase();

/** CSV text -> product rows for the import API (header names are matched loosely). */
export function csvToProductRows(text: string): { rows: Record<string, unknown>[]; error?: string } {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], error: "The file has no data rows." };
  const known = new Map(
    [...CSV_COLUMNS, "returnWindowDays", "timeToShipMinutes", "productId"].map((c) => [norm(c), c])
  );
  const header = table[0].map((h) => known.get(norm(h)) ?? null);
  if (!header.includes("name") && !header.includes("sku") && !header.includes("barcode")) {
    return { rows: [], error: "Header row must include at least name, sku or barcode." };
  }
  const rows = table.slice(1).map((cells) => {
    const row: Record<string, unknown> = {};
    const ondc: Record<string, unknown> = {};
    header.forEach((col, i) => {
      const raw = (cells[i] ?? "").trim().replace(/^'(?=[=+\-@])/, "");
      if (!col || raw === "") return;
      if (ONDC_COLUMNS[col]) ondc[ONDC_COLUMNS[col]] = raw;
      else row[col] = raw;
    });
    if (Object.keys(ondc).length) row.ondc = ondc;
    return row;
  });
  return { rows };
}
