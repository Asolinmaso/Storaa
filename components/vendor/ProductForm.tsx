"use client";

import { useRef, useState } from "react";
import { CATEGORIES } from "@/lib/catalog";
import { CATEGORY_MAP } from "@/lib/ondc/mapping";
import { api, Drawer, Icon, Switch, VdButton } from "./ui";

export interface VendorProduct {
  _id: string;
  name: string;
  category: string;
  brand?: string;
  price: number;
  mrp?: number;
  unit: string;
  stock: number;
  sku?: string;
  barcode?: string;
  hsnCode?: string;
  gstRate?: number;
  lowStockThreshold?: number;
  specifications?: string[];
  images?: string[];
  emoji?: string;
  status?: "under_review" | "approved" | "rejected";
  rejectionReason?: string;
  source?: "manual" | "pos" | "csv";
  posSyncedAt?: string | null;
  updatedAt?: string;
  ondc?: {
    listed?: boolean;
    returnable?: boolean;
    cancellable?: boolean;
    returnWindowDays?: number;
    timeToShipMinutes?: number;
    vegType?: "veg" | "non_veg" | "egg" | "na";
    countryOfOrigin?: string;
    manufacturer?: string;
  };
  ondcIssues?: { errors: string[]; warnings: string[] };
}

const READY_TIMES = [
  { v: 15, l: "15 minutes" },
  { v: 30, l: "30 minutes" },
  { v: 60, l: "1 hour" },
  { v: 120, l: "2 hours" },
  { v: 240, l: "4 hours" },
  { v: 1440, l: "Next day" },
];

function initialForm(p?: VendorProduct | null) {
  return {
    name: p?.name ?? "",
    category: p?.category ?? "",
    brand: p?.brand ?? "",
    unit: p?.unit ?? "",
    price: p ? String(p.price) : "",
    mrp: p?.mrp ? String(p.mrp) : "",
    gstRate: String(p?.gstRate ?? 0),
    hsnCode: p?.hsnCode ?? "",
    stock: p ? String(p.stock ?? 0) : "",
    lowStockThreshold: String(p?.lowStockThreshold ?? 5),
    sku: p?.sku ?? "",
    barcode: p?.barcode ?? "",
    specs: (p?.specifications ?? []).join("\n"),
    images: p?.images ?? [],
    listed: p?.ondc?.listed !== false,
    returnable: !!p?.ondc?.returnable,
    returnWindowDays: String(p?.ondc?.returnWindowDays || 7),
    cancellable: p?.ondc?.cancellable !== false,
    timeToShipMinutes: String(p?.ondc?.timeToShipMinutes ?? 60),
    vegType: p?.ondc?.vegType ?? "na",
    countryOfOrigin: p?.ondc?.countryOfOrigin ?? "IND",
    manufacturer: p?.ondc?.manufacturer ?? "",
  };
}

export default function ProductForm({
  product,
  ondcAvailable,
  onClose,
  onSaved,
}: {
  product: VendorProduct | null;
  ondcAvailable: boolean;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [f, setF] = useState(() => initialForm(product));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const price = Number(f.price);
  const mrp = Number(f.mrp);
  const discount = mrp > 0 && price > 0 && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const ondcCat = f.category ? CATEGORY_MAP[f.category] : undefined;
  const isGrocery = ondcCat?.domain === "ONDC:RET10";

  async function pickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4 - f.images.length);
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      const urls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (res.ok) urls.push(data.url);
        else setError(data.message || `Could not upload ${file.name}.`);
      }
      setF((s) => ({ ...s, images: [...s.images, ...urls].slice(0, 4) }));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    if (!f.name.trim() || !f.category || !(price > 0)) {
      setError("Name, category and a price above 0 are required.");
      return;
    }
    if (mrp && mrp < price) {
      setError("Selling price cannot be higher than MRP.");
      return;
    }
    setError("");
    setSaving(true);
    const payload = {
      name: f.name,
      category: f.category,
      brand: f.brand,
      unit: f.unit,
      price,
      mrp: mrp || 0,
      gstRate: Number(f.gstRate),
      hsnCode: f.hsnCode,
      stock: Number(f.stock) || 0,
      lowStockThreshold: Number(f.lowStockThreshold) || 0,
      sku: f.sku,
      barcode: f.barcode,
      specifications: f.specs.split("\n").map((s) => s.trim()).filter(Boolean),
      images: f.images,
      ondc: {
        listed: f.listed,
        returnable: f.returnable,
        returnWindowDays: f.returnable ? Number(f.returnWindowDays) || 7 : 0,
        cancellable: f.cancellable,
        timeToShipMinutes: Number(f.timeToShipMinutes),
        vegType: f.vegType,
        countryOfOrigin: f.countryOfOrigin,
        manufacturer: f.manufacturer,
      },
    };
    try {
      if (product) await api(`/api/vendor/products/${product._id}`, { method: "PATCH", json: payload });
      else await api("/api/vendor/products", { method: "POST", json: payload });
      onSaved(product ? "Product updated" : "Product added — it will go live after admin approval");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer
      title={product ? "Edit product" : "Add product"}
      onClose={onClose}
      footer={
        <>
          <VdButton onClick={onClose}>Cancel</VdButton>
          <VdButton variant="primary" loading={saving} onClick={save}>
            {product ? "Save changes" : "Add product"}
          </VdButton>
        </>
      }
    >
      {product?.status === "rejected" && (
        <div className="vd-error">
          <strong>Rejected by admin:</strong> {product.rejectionReason || "No reason given."} Update the details and save.
        </div>
      )}

      <div className="vd-section-title">Basics</div>
      <div className="vd-form-grid">
        <div className="vd-field vd-span-2">
          <label htmlFor="pf-name">Product name *</label>
          <input id="pf-name" className="vd-input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Aashirvaad Whole Wheat Atta" autoFocus />
        </div>
        <div className="vd-field">
          <label htmlFor="pf-cat">Category *</label>
          <select id="pf-cat" className="vd-select" value={f.category} onChange={(e) => set("category", e.target.value)}>
            <option value="">Select a category</option>
            {CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.emoji} {c.name}
                {ondcAvailable && !CATEGORY_MAP[c.name] ? " (not on ONDC)" : ""}
              </option>
            ))}
          </select>
          {ondcAvailable && f.category && (
            <span className="vd-hint">{ondcCat ? `ONDC: ${ondcCat.domain} · ${ondcCat.categoryId}` : "This category isn't sold on ONDC yet."}</span>
          )}
        </div>
        <div className="vd-field">
          <label htmlFor="pf-brand">Brand</label>
          <input id="pf-brand" className="vd-input" value={f.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Aashirvaad" />
        </div>
        <div className="vd-field">
          <label htmlFor="pf-unit">Pack size / unit</label>
          <input id="pf-unit" className="vd-input" value={f.unit} onChange={(e) => set("unit", e.target.value)} placeholder="e.g. 5 kg, 500 ml, 1 piece" />
        </div>
        <div className="vd-field vd-span-2">
          <label htmlFor="pf-specs">Highlights / specifications</label>
          <textarea id="pf-specs" className="vd-textarea" value={f.specs} onChange={(e) => set("specs", e.target.value)} placeholder={"One per line, e.g.\n100% whole wheat\nNo maida"} />
        </div>
      </div>

      <div className="vd-section-title">Images</div>
      <div className="vd-images">
        {f.images.map((url, i) => (
          <span key={url} className={`vd-image${i === 0 ? " vd-image-main" : ""}`} style={{ backgroundImage: `url(${url})` }}>
            <button type="button" className="vd-image-remove" aria-label="Remove image" onClick={() => set("images", f.images.filter((u) => u !== url))}>×</button>
          </span>
        ))}
        {f.images.length < 4 && (
          <button type="button" className="vd-image-add" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <span className="spinner" style={{ borderColor: "#ccc", borderTopColor: "var(--purple)" }} /> : <Icon.Plus />}
            {uploading ? "Uploading" : "Add image"}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={pickImages} />
      </div>
      <p className="vd-sub">Up to 4 images. The first one is the main image. Square, well-lit photos on a plain background sell best.</p>

      <div className="vd-section-title">Pricing &amp; tax</div>
      <div className="vd-form-grid">
        <div className="vd-field">
          <label htmlFor="pf-price">Selling price *</label>
          <div className="vd-input-group">
            <span className="vd-prefix">₹</span>
            <input id="pf-price" className="vd-input" type="number" min="0" step="0.01" inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value)} />
          </div>
        </div>
        <div className="vd-field">
          <label htmlFor="pf-mrp">MRP</label>
          <div className="vd-input-group">
            <span className="vd-prefix">₹</span>
            <input id="pf-mrp" className="vd-input" type="number" min="0" step="0.01" inputMode="decimal" value={f.mrp} onChange={(e) => set("mrp", e.target.value)} />
          </div>
          <span className="vd-hint">{discount ? `${discount}% off MRP shown to buyers` : "Leave empty if same as selling price"}</span>
        </div>
        <div className="vd-field">
          <label htmlFor="pf-gst">GST rate</label>
          <select id="pf-gst" className="vd-select" value={f.gstRate} onChange={(e) => set("gstRate", e.target.value)}>
            {[0, 5, 12, 18, 28].map((r) => <option key={r} value={r}>{r}%</option>)}
          </select>
        </div>
        <div className="vd-field">
          <label htmlFor="pf-hsn">HSN code</label>
          <input id="pf-hsn" className="vd-input" inputMode="numeric" value={f.hsnCode} onChange={(e) => set("hsnCode", e.target.value.replace(/\D/g, ""))} placeholder="e.g. 1101" maxLength={8} />
        </div>
      </div>

      <div className="vd-section-title">Inventory</div>
      <div className="vd-form-grid">
        <div className="vd-field">
          <label htmlFor="pf-stock">Stock on hand</label>
          <input id="pf-stock" className="vd-input" type="number" min="0" step="1" inputMode="numeric" value={f.stock} onChange={(e) => set("stock", e.target.value)} />
        </div>
        <div className="vd-field">
          <label htmlFor="pf-low">Low-stock alert at</label>
          <input id="pf-low" className="vd-input" type="number" min="0" step="1" inputMode="numeric" value={f.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value)} />
        </div>
        <div className="vd-field">
          <label htmlFor="pf-sku">SKU</label>
          <input id="pf-sku" className="vd-input" value={f.sku} onChange={(e) => set("sku", e.target.value.trim())} placeholder="Same code as in your POS" />
          <span className="vd-hint">Your POS matches products on SKU or barcode.</span>
        </div>
        <div className="vd-field">
          <label htmlFor="pf-bc">Barcode (EAN / UPC)</label>
          <input id="pf-bc" className="vd-input" inputMode="numeric" value={f.barcode} onChange={(e) => set("barcode", e.target.value.replace(/\D/g, ""))} placeholder="e.g. 8901725181222" maxLength={14} />
        </div>
      </div>

      {ondcAvailable && (
        <>
          <div className="vd-section-title">ONDC listing</div>
          <div className="vd-form-grid">
            <div className="vd-span-all">
              <Switch checked={f.listed} onChange={(v) => set("listed", v)} label="Show this product on ONDC buyer apps" />
            </div>
            <div className="vd-field">
              <label htmlFor="pf-veg">Food type</label>
              <select id="pf-veg" className="vd-select" value={f.vegType} onChange={(e) => set("vegType", e.target.value as typeof f.vegType)}>
                <option value="na">Not a food item</option>
                <option value="veg">Veg</option>
                <option value="non_veg">Non-veg</option>
                <option value="egg">Contains egg</option>
              </select>
              {isGrocery && f.vegType === "na" && <span className="vd-hint" style={{ color: "var(--vd-warn)" }}>Recommended for grocery items</span>}
            </div>
            <div className="vd-field">
              <label htmlFor="pf-tts">Ready for pickup within</label>
              <select id="pf-tts" className="vd-select" value={f.timeToShipMinutes} onChange={(e) => set("timeToShipMinutes", e.target.value)}>
                {READY_TIMES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
            <div className="vd-field">
              <label htmlFor="pf-mfr">Manufacturer / packer</label>
              <input id="pf-mfr" className="vd-input" value={f.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} placeholder="Required for packaged goods" />
            </div>
            <div className="vd-field">
              <label htmlFor="pf-coo">Country of origin</label>
              <input id="pf-coo" className="vd-input" value={f.countryOfOrigin} onChange={(e) => set("countryOfOrigin", e.target.value.toUpperCase().slice(0, 3))} placeholder="IND" />
            </div>
            <div>
              <Switch checked={f.cancellable} onChange={(v) => set("cancellable", v)} label="Buyer can cancel" />
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
              <Switch checked={f.returnable} onChange={(v) => set("returnable", v)} label="Returnable" />
              {f.returnable && (
                <select className="vd-select" style={{ width: "auto" }} value={f.returnWindowDays} onChange={(e) => set("returnWindowDays", e.target.value)} aria-label="Return window">
                  {[1, 3, 7, 10, 15, 30].map((d) => <option key={d} value={d}>within {d} day{d > 1 ? "s" : ""}</option>)}
                </select>
              )}
            </div>
          </div>
        </>
      )}

      {error && <div className="vd-error" role="alert" style={{ marginTop: "0.75rem" }}>{error}</div>}
    </Drawer>
  );
}
