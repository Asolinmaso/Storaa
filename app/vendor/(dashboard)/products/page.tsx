"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/lib/catalog";
import ProductForm, { type VendorProduct } from "@/components/vendor/ProductForm";
import ImportDialog from "@/components/vendor/ImportDialog";
import { api, Badge, Dialog, Empty, Icon, inr, Skeleton, timeAgo, useToast, VdButton } from "@/components/vendor/ui";

type StockFilter = "all" | "in" | "low" | "out";
type StatusFilter = "all" | "approved" | "under_review" | "rejected";
type OndcFilter = "all" | "ready" | "issues" | "hidden";

const isLow = (p: VendorProduct) => p.stock > 0 && p.stock <= (p.lowStockThreshold ?? 5);
const statusOf = (p: VendorProduct) => p.status ?? "approved";

const STATUS_BADGE = {
  approved: { tone: "ok", label: "Live" },
  under_review: { tone: "warn", label: "In review" },
  rejected: { tone: "err", label: "Rejected" },
} as const;

/** Inline stock editor: +/- buttons or type a number; saves on blur / Enter. */
function StockCell({ product, onSaved, onError }: { product: VendorProduct; onSaved: (stock: number) => void; onError: (m: string) => void }) {
  const [value, setValue] = useState(String(product.stock));
  const [busy, setBusy] = useState(false);
  useEffect(() => setValue(String(product.stock)), [product.stock]);

  async function commit(next: number) {
    if (!Number.isInteger(next) || next < 0) {
      setValue(String(product.stock));
      return;
    }
    if (next === product.stock) return;
    setBusy(true);
    setValue(String(next));
    try {
      await api(`/api/vendor/products/${product._id}`, { method: "PATCH", json: { stock: next } });
      onSaved(next);
    } catch (e) {
      setValue(String(product.stock));
      onError(e instanceof Error ? e.message : "Could not update stock");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vd-stepper" aria-busy={busy}>
      <button type="button" aria-label="Decrease stock" disabled={busy || product.stock <= 0} onClick={() => commit(product.stock - 1)}>−</button>
      <input
        aria-label={`Stock for ${product.name}`}
        inputMode="numeric"
        value={value}
        disabled={busy}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
        onBlur={() => commit(Number(value || 0))}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
      <button type="button" aria-label="Increase stock" disabled={busy} onClick={() => commit(product.stock + 1)}>+</button>
    </div>
  );
}

export default function VendorProductsPage() {
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [storeStatus, setStoreStatus] = useState<string | null>(null);
  const [ondcAvailable, setOndcAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState<StockFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [ondc, setOndc] = useState<OndcFilter>("all");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<VendorProduct | null | "new">(null);
  const [importing, setImporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [stockDialog, setStockDialog] = useState(false);
  const [bulkStock, setBulkStock] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast, node: toastNode } = useToast();

  const load = useCallback(async () => {
    const data = await api<{ products: VendorProduct[]; store: { status: string } | null; ondcAvailable?: boolean }>("/api/vendor/products");
    setProducts(data.products ?? []);
    setOndcAvailable(!!data.ondcAvailable);
    if (data.store?.status) setStoreStatus(data.store.status);
  }, []);

  useEffect(() => {
    // Deep links from the dashboard: ?stock=low, ?status=under_review, ?new=1
    const sp = new URLSearchParams(window.location.search);
    const s = sp.get("stock");
    if (s === "low" || s === "out" || s === "in") setStock(s);
    const st = sp.get("status");
    if (st === "under_review" || st === "approved" || st === "rejected") setStatus(st);
    if (sp.get("new")) setEditing("new");
    load()
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Failed to load products."))
      .finally(() => setLoading(false));
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      if (needle && ![p.name, p.sku, p.barcode, p.brand].some((v) => v?.toLowerCase().includes(needle))) return false;
      if (category !== "all" && p.category !== category) return false;
      if (stock === "in" && p.stock <= 0) return false;
      if (stock === "out" && p.stock > 0) return false;
      if (stock === "low" && !(isLow(p) || p.stock <= 0)) return false;
      if (status !== "all" && statusOf(p) !== status) return false;
      if (ondc === "hidden" && p.ondc?.listed !== false) return false;
      if (ondc === "ready" && (p.ondcIssues?.errors.length ?? 0) > 0) return false;
      if (ondc === "issues" && (p.ondcIssues?.errors.length ?? 0) === 0) return false;
      return true;
    });
  }, [products, q, category, stock, status, ondc]);

  const counts = useMemo(
    () => ({
      out: products.filter((p) => p.stock <= 0).length,
      low: products.filter(isLow).length,
      review: products.filter((p) => statusOf(p) === "under_review").length,
      value: products.reduce((s, p) => s + p.price * Math.max(0, p.stock), 0),
    }),
    [products]
  );

  const usedCategories = useMemo(() => CATEGORIES.filter((c) => products.some((p) => p.category === c.name)), [products]);
  const allSelected = filtered.length > 0 && filtered.every((p) => selected.has(p._id));
  const anyFilter = q || category !== "all" || stock !== "all" || status !== "all" || ondc !== "all";

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function bulk(action: string, value?: number) {
    const ids = Array.from(selected);
    setBusy(true);
    try {
      await api("/api/vendor/products/bulk", { method: "POST", json: { ids, action, value } });
      await load();
      setSelected(new Set());
      toast(
        action === "delete" ? `Deleted ${ids.length} products`
          : action === "ondc_list" ? `${ids.length} products shown on ONDC`
            : action === "ondc_unlist" ? `${ids.length} products hidden from ONDC`
              : `Stock updated for ${ids.length} products`
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Action failed", true);
    } finally {
      setBusy(false);
    }
  }

  async function deleteIds(ids: string[]) {
    setBusy(true);
    try {
      if (ids.length === 1) await api(`/api/vendor/products/${ids[0]}`, { method: "DELETE" });
      else await api("/api/vendor/products/bulk", { method: "POST", json: { ids, action: "delete" } });
      await load();
      setSelected(new Set());
      toast(ids.length === 1 ? "Product deleted" : `Deleted ${ids.length} products`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not delete", true);
    } finally {
      setBusy(false);
      setConfirmDelete(null);
    }
  }

  if (!loading && storeStatus && storeStatus !== "approved") {
    return (
      <div className="vd">
        <section className="vd-card">
          <Empty
            icon={<Icon.Shield size={24} />}
            title={storeStatus === "rejected" ? "Store application rejected" : "Store pending approval"}
            text={
              storeStatus === "rejected"
                ? "Update your details and resubmit for approval before managing products."
                : "Product management opens once an admin approves your store. This usually takes 12–24 hours."
            }
            action={
              <Link href={storeStatus === "rejected" ? "/vendor/onboarding" : "/vendor/store-status"} className="vd-btn vd-btn-primary">
                {storeStatus === "rejected" ? "Update & resubmit" : "View store status"}
              </Link>
            }
          />
        </section>
      </div>
    );
  }

  return (
    <div className="vd">
      <div className="vd-head">
        <div>
          <h2>Products</h2>
          <p>Manage your catalog, prices and stock. Changes appear for Storaa customers{ondcAvailable ? " and ONDC buyer apps" : ""} immediately.</p>
        </div>
        <div className="vd-head-actions">
          <VdButton icon={<Icon.Upload size={16} />} onClick={() => setImporting(true)}>Import</VdButton>
          <a className="vd-btn" href="/api/vendor/products/export" download>
            <Icon.Download size={16} /> Export
          </a>
          <VdButton variant="primary" icon={<Icon.Plus />} onClick={() => setEditing("new")}>Add product</VdButton>
        </div>
      </div>

      <div className="vd-stats">
        <div className="vd-stat">
          <span className="vd-stat-label">Total products</span>
          <span className="vd-stat-value">{loading ? "—" : products.length}</span>
        </div>
        <button type="button" className="vd-stat" style={{ cursor: "pointer", textAlign: "left", font: "inherit" }} onClick={() => setStock(stock === "low" ? "all" : "low")}>
          <span className="vd-stat-label">Low / out of stock</span>
          <span className="vd-stat-value">{loading ? "—" : counts.low + counts.out}</span>
          <span className={`vd-stat-foot${counts.out ? " vd-stat-foot-err" : ""}`}>{counts.out} out of stock</span>
        </button>
        <button type="button" className="vd-stat" style={{ cursor: "pointer", textAlign: "left", font: "inherit" }} onClick={() => setStatus(status === "under_review" ? "all" : "under_review")}>
          <span className="vd-stat-label">Awaiting approval</span>
          <span className="vd-stat-value">{loading ? "—" : counts.review}</span>
        </button>
        <div className="vd-stat">
          <span className="vd-stat-label">Inventory value</span>
          <span className="vd-stat-value">{loading ? "—" : inr(counts.value)}</span>
          <span className="vd-stat-foot">at selling price</span>
        </div>
      </div>

      <section className="vd-card vd-card-flush">
        <div style={{ padding: "1rem 1.1rem", borderBottom: "1px solid var(--vd-line)" }}>
          <div className="vd-toolbar">
            <div className="vd-input-group">
              <Icon.Search />
              <input className="vd-input" type="search" placeholder="Search name, SKU, barcode or brand" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
            </div>
            <select className="vd-select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
              <option value="all">All categories</option>
              {usedCategories.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <select className="vd-select" value={stock} onChange={(e) => setStock(e.target.value as StockFilter)} aria-label="Stock">
              <option value="all">All stock</option>
              <option value="in">In stock</option>
              <option value="low">Low &amp; out</option>
              <option value="out">Out of stock</option>
            </select>
            <select className="vd-select" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="Approval">
              <option value="all">Any status</option>
              <option value="approved">Live</option>
              <option value="under_review">In review</option>
              <option value="rejected">Rejected</option>
            </select>
            {ondcAvailable && (
              <select className="vd-select" value={ondc} onChange={(e) => setOndc(e.target.value as OndcFilter)} aria-label="ONDC">
                <option value="all">ONDC: all</option>
                <option value="ready">ONDC ready</option>
                <option value="issues">Not listable</option>
                <option value="hidden">Hidden by me</option>
              </select>
            )}
            {anyFilter && (
              <VdButton variant="ghost" small onClick={() => { setQ(""); setCategory("all"); setStock("all"); setStatus("all"); setOndc("all"); }}>
                Clear
              </VdButton>
            )}
          </div>
        </div>

        {loadError && <div className="vd-error" style={{ margin: "1rem" }}>{loadError}</div>}

        {loading ? (
          <div style={{ padding: "1.1rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} h={44} />)}
          </div>
        ) : products.length === 0 ? (
          <Empty
            icon={<Icon.Box size={24} />}
            title="No products yet"
            text="Add products one by one, import a CSV from your billing software, or connect your POS to sync automatically."
            action={
              <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", justifyContent: "center" }}>
                <VdButton variant="primary" icon={<Icon.Plus />} onClick={() => setEditing("new")}>Add product</VdButton>
                <VdButton icon={<Icon.Upload size={16} />} onClick={() => setImporting(true)}>Import CSV</VdButton>
                <Link href="/vendor/pos" className="vd-btn">Connect POS</Link>
              </div>
            }
          />
        ) : filtered.length === 0 ? (
          <Empty icon={<Icon.Search size={22} />} title="No matching products" text="Try a different search or clear the filters." />
        ) : (
          <div className="vd-table-wrap">
            <table className="vd-table">
              <thead>
                <tr>
                  <th style={{ width: "2.5rem" }}>
                    <input
                      type="checkbox"
                      className="vd-check"
                      aria-label="Select all"
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(filtered.map((p) => p._id)))}
                    />
                  </th>
                  <th>Product</th>
                  <th className="vd-hide-sm">Category</th>
                  <th className="vd-num">Price</th>
                  <th>Stock</th>
                  <th className="vd-hide-sm">Status</th>
                  {ondcAvailable && <th className="vd-hide-sm">ONDC</th>}
                  <th className="vd-num"><span className="vd-hide-sm">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const st = STATUS_BADGE[statusOf(p)];
                  const errs = p.ondcIssues?.errors ?? [];
                  const warns = p.ondcIssues?.warnings ?? [];
                  return (
                    <tr key={p._id} className={selected.has(p._id) ? "vd-row-selected" : undefined}>
                      <td>
                        <input type="checkbox" className="vd-check" aria-label={`Select ${p.name}`} checked={selected.has(p._id)} onChange={() => toggle(p._id)} />
                      </td>
                      <td>
                        <div className="vd-prod-cell">
                          <span className="vd-thumb" style={p.images?.[0] ? { backgroundImage: `url(${p.images[0]})` } : undefined}>
                            {!p.images?.[0] && (p.emoji || "📦")}
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <button type="button" className="vd-prod-name" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", font: "inherit", fontWeight: 600 }} onClick={() => setEditing(p)}>
                              {p.name}
                            </button>
                            <div className="vd-prod-meta">
                              {[p.brand, p.unit, p.sku && `SKU ${p.sku}`].filter(Boolean).join(" · ") || "—"}
                              {p.source === "pos" && p.posSyncedAt ? ` · POS ${timeAgo(p.posSyncedAt)}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="vd-hide-sm">{p.category}</td>
                      <td className="vd-num">
                        {inr(p.price)}
                        {p.mrp && p.mrp > p.price ? <span className="vd-strike">{inr(p.mrp)}</span> : null}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <StockCell
                            product={p}
                            onSaved={(n) => setProducts((list) => list.map((x) => (x._id === p._id ? { ...x, stock: n } : x)))}
                            onError={(m) => toast(m, true)}
                          />
                          {p.stock <= 0 ? <Badge tone="err">Out</Badge> : isLow(p) ? <Badge tone="warn">Low</Badge> : null}
                        </div>
                      </td>
                      <td className="vd-hide-sm">
                        <span title={p.status === "rejected" ? p.rejectionReason : undefined}>
                          <Badge tone={st.tone} dot>{st.label}</Badge>
                        </span>
                      </td>
                      {ondcAvailable && (
                        <td className="vd-hide-sm">
                          <span title={[...errs, ...warns].join("\n") || "Ready to list"}>
                            {p.ondc?.listed === false ? (
                              <Badge>Hidden</Badge>
                            ) : errs.length ? (
                              <Badge tone="err">{errs.length} issue{errs.length > 1 ? "s" : ""}</Badge>
                            ) : warns.length ? (
                              <Badge tone="warn">Ready · {warns.length} tip{warns.length > 1 ? "s" : ""}</Badge>
                            ) : (
                              <Badge tone="ok">Ready</Badge>
                            )}
                          </span>
                        </td>
                      )}
                      <td className="vd-num">
                        <div style={{ display: "inline-flex", gap: "0.3rem" }}>
                          <VdButton small className="vd-icon-btn" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}><Icon.Edit /></VdButton>
                          <VdButton small variant="danger" className="vd-icon-btn" aria-label={`Delete ${p.name}`} onClick={() => setConfirmDelete([p._id])}><Icon.Trash /></VdButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected.size > 0 && (
        <div className="vd-bulkbar" role="toolbar" aria-label="Bulk actions">
          <strong>{selected.size} selected</strong>
          {ondcAvailable && (
            <>
              <VdButton small disabled={busy} onClick={() => bulk("ondc_list")}>Show on ONDC</VdButton>
              <VdButton small disabled={busy} onClick={() => bulk("ondc_unlist")}>Hide from ONDC</VdButton>
            </>
          )}
          <VdButton small disabled={busy} onClick={() => { setBulkStock(""); setStockDialog(true); }}>Set stock</VdButton>
          <VdButton small disabled={busy} onClick={() => setConfirmDelete(Array.from(selected))}>Delete</VdButton>
          <VdButton small variant="ghost" onClick={() => setSelected(new Set())} aria-label="Clear selection"><Icon.X /></VdButton>
        </div>
      )}

      {editing && (
        <ProductForm
          product={editing === "new" ? null : editing}
          ondcAvailable={ondcAvailable}
          onClose={() => setEditing(null)}
          onSaved={async (msg) => {
            setEditing(null);
            toast(msg);
            await load();
          }}
        />
      )}

      {importing && <ImportDialog onClose={() => setImporting(false)} onDone={() => load()} />}

      {confirmDelete && (
        <Dialog
          title={confirmDelete.length === 1 ? "Delete this product?" : `Delete ${confirmDelete.length} products?`}
          onClose={() => setConfirmDelete(null)}
          actions={
            <>
              <VdButton onClick={() => setConfirmDelete(null)}>Cancel</VdButton>
              <VdButton variant="primary" style={{ background: "var(--vd-err)", borderColor: "var(--vd-err)" }} loading={busy} onClick={() => deleteIds(confirmDelete)}>
                Delete
              </VdButton>
            </>
          }
        >
          <p className="vd-sub">
            {confirmDelete.length === 1
              ? `"${products.find((p) => p._id === confirmDelete[0])?.name}" will be removed from Storaa${ondcAvailable ? " and ONDC" : ""}. This can't be undone.`
              : "They will be removed from your catalog everywhere. This can't be undone."}
          </p>
        </Dialog>
      )}

      {stockDialog && (
        <Dialog
          title={`Set stock for ${selected.size} products`}
          onClose={() => setStockDialog(false)}
          actions={
            <>
              <VdButton onClick={() => setStockDialog(false)}>Cancel</VdButton>
              <VdButton
                variant="primary"
                loading={busy}
                disabled={bulkStock === ""}
                onClick={async () => {
                  await bulk("set_stock", Number(bulkStock));
                  setStockDialog(false);
                }}
              >
                Apply
              </VdButton>
            </>
          }
        >
          <div className="vd-field">
            <label htmlFor="bulk-stock">New stock quantity</label>
            <input id="bulk-stock" className="vd-input" inputMode="numeric" autoFocus value={bulkStock} onChange={(e) => setBulkStock(e.target.value.replace(/\D/g, ""))} />
          </div>
        </Dialog>
      )}

      {toastNode}
    </div>
  );
}
