"use client";

import { useRef, useState } from "react";
import { CSV_COLUMNS, csvToProductRows, toCsv } from "@/lib/vendor/csv";
import { api, Dialog, Icon, VdButton } from "./ui";

interface Result {
  received: number;
  created: number;
  updated: number;
  failed: number;
  issues: string[];
}

const SAMPLE = [
  {
    sku: "ATTA-5KG", barcode: "8901725181222", name: "Whole Wheat Atta", category: "Groceries", brand: "Aashirvaad",
    price: 289, mrp: 315, unit: "5 kg", stock: 40, lowStockThreshold: 5, gstRate: 5, hsnCode: "1101",
    specifications: "100% whole wheat | No maida", images: "", ondcListed: "yes", returnable: "no",
    cancellable: "yes", vegType: "veg", countryOfOrigin: "IND", manufacturer: "ITC Ltd",
  },
];

function downloadTemplate() {
  const blob = new Blob([toCsv(CSV_COLUMNS, SAMPLE)], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "storaa-product-template.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ImportDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load(f: File | undefined) {
    if (!f) return;
    setResult(null);
    setError("");
    if (!/\.csv$/i.test(f.name) && f.type !== "text/csv") {
      setError("Please choose a .csv file. In Excel use File → Save As → CSV.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("The file is larger than 5 MB.");
      return;
    }
    const parsed = csvToProductRows(await f.text());
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    if (parsed.rows.length > 1000) {
      setError(`The file has ${parsed.rows.length} rows; import at most 1000 at a time.`);
      return;
    }
    setFile(f);
    setRows(parsed.rows);
  }

  async function run() {
    setBusy(true);
    setError("");
    try {
      const r = await api<Result>("/api/vendor/products/import", { method: "POST", json: { rows, fileName: file?.name } });
      setResult(r);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title="Import products from CSV"
      onClose={onClose}
      actions={
        result ? (
          <VdButton variant="primary" onClick={onClose}>Done</VdButton>
        ) : (
          <>
            <VdButton onClick={onClose}>Cancel</VdButton>
            <VdButton variant="primary" loading={busy} disabled={!rows.length} onClick={run}>
              Import {rows.length ? `${rows.length} rows` : ""}
            </VdButton>
          </>
        )
      }
    >
      {result ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div className="vd-stats" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            <div className="vd-stat"><span className="vd-stat-label">Created</span><span className="vd-stat-value">{result.created}</span></div>
            <div className="vd-stat"><span className="vd-stat-label">Updated</span><span className="vd-stat-value">{result.updated}</span></div>
            <div className="vd-stat"><span className="vd-stat-label">Failed</span><span className="vd-stat-value" style={{ color: result.failed ? "var(--vd-err)" : undefined }}>{result.failed}</span></div>
          </div>
          {result.created > 0 && <p className="vd-note">New products go live once an admin approves them.</p>}
          {result.issues.length > 0 && (
            <div className="vd-error" style={{ maxHeight: "10rem", overflowY: "auto" }}>
              {result.issues.map((i) => <div key={i}>{i}</div>)}
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="vd-sub">
            Rows are matched to existing products by <strong>SKU</strong> or <strong>barcode</strong> and updated; anything else is created.
            Export from Tally, BUSY, Vyapar or Excel, or start from our template.
          </p>
          <div
            className={`vd-dropzone${over ? " vd-dropzone-over" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); load(e.dataTransfer.files[0]); }}
          >
            <Icon.Upload size={24} />
            <strong>{file ? file.name : "Drop a CSV file here"}</strong>
            {file ? `${rows.length} product rows found` : "or click to browse · max 1000 rows"}
          </div>
          <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => load(e.target.files?.[0])} />
          <button type="button" className="vd-btn vd-btn-ghost vd-btn-sm" style={{ alignSelf: "flex-start" }} onClick={downloadTemplate}>
            <Icon.Download size={15} /> Download template
          </button>
          {error && <div className="vd-error">{error}</div>}
        </>
      )}
    </Dialog>
  );
}
