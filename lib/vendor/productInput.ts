import { CATEGORIES } from "@/lib/catalog";

export const GST_RATES = [0, 5, 12, 18, 28] as const;
export const VEG_TYPES = ["veg", "non_veg", "egg", "na"] as const;
const CATEGORY_NAMES = new Set(CATEGORIES.map((c) => c.name));

/** Fields a vendor, CSV import or POS may set on a product. */
export interface ProductInput {
  name?: string;
  category?: string;
  brand?: string;
  price?: number;
  mrp?: number;
  unit?: string;
  stock?: number;
  sku?: string;
  barcode?: string;
  hsnCode?: string;
  gstRate?: number;
  lowStockThreshold?: number;
  specifications?: string[];
  images?: string[];
  ondc?: Partial<{
    listed: boolean;
    returnable: boolean;
    cancellable: boolean;
    returnWindowDays: number;
    timeToShipMinutes: number;
    vegType: (typeof VEG_TYPES)[number];
    countryOfOrigin: string;
    manufacturer: string;
  }>;
}

type Raw = Record<string, unknown>;
export type ParseResult = { ok: true; data: ProductInput } | { ok: false; error: string };

const str = (v: unknown, max = 200) =>
  v === undefined || v === null ? undefined : String(v).trim().slice(0, max);

function num(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function bool(v: unknown): boolean | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(s)) return true;
  if (["false", "no", "n", "0"].includes(s)) return false;
  return undefined;
}

/** Case-insensitive match against the platform category list. */
export function normaliseCategory(v: string): string | null {
  if (CATEGORY_NAMES.has(v)) return v;
  const hit = CATEGORIES.find((c) => c.name.toLowerCase() === v.toLowerCase());
  return hit?.name ?? null;
}

/**
 * Validates and normalises product fields. With `partial`, only the fields present are
 * returned (for updates); otherwise name, category and price are required.
 */
export function parseProductInput(
  raw: Raw,
  { partial = false }: { partial?: boolean } = {}
): ParseResult {
  const data: ProductInput = {};

  const name = str(raw.name, 160);
  if (name !== undefined) {
    if (!name) return { ok: false, error: "Name cannot be empty." };
    data.name = name;
  } else if (!partial) return { ok: false, error: "Name is required." };

  const category = str(raw.category, 80);
  if (category !== undefined) {
    const c = normaliseCategory(category);
    if (!c) return { ok: false, error: `Unknown category "${category}".` };
    data.category = c;
  } else if (!partial) return { ok: false, error: "Category is required." };

  const price = num(raw.price);
  if (price !== undefined) {
    if (!(price > 0)) return { ok: false, error: "Price must be greater than 0." };
    data.price = Math.round(price * 100) / 100;
  } else if (!partial) return { ok: false, error: "Price is required." };

  const mrp = num(raw.mrp);
  if (mrp !== undefined) {
    if (!(mrp >= 0)) return { ok: false, error: "MRP must be a positive number." };
    data.mrp = Math.round(mrp * 100) / 100;
  }
  const effPrice = data.price;
  if (effPrice !== undefined && data.mrp && data.mrp < effPrice) {
    return { ok: false, error: "Selling price cannot be higher than MRP." };
  }

  const stock = num(raw.stock);
  if (stock !== undefined) {
    if (!Number.isInteger(stock) || stock < 0) return { ok: false, error: "Stock must be a whole number ≥ 0." };
    data.stock = stock;
  }

  const low = num(raw.lowStockThreshold);
  if (low !== undefined) {
    if (!Number.isInteger(low) || low < 0) return { ok: false, error: "Low-stock alert must be a whole number ≥ 0." };
    data.lowStockThreshold = low;
  }

  const gst = num(raw.gstRate);
  if (gst !== undefined) {
    if (!(GST_RATES as readonly number[]).includes(gst)) return { ok: false, error: "GST rate must be 0, 5, 12, 18 or 28." };
    data.gstRate = gst;
  }

  for (const key of ["brand", "unit", "hsnCode"] as const) {
    const v = str(raw[key], 80);
    if (v !== undefined) data[key] = v;
  }
  const sku = str(raw.sku, 64);
  if (sku !== undefined) {
    if (sku && !/^[A-Za-z0-9._\-/]+$/.test(sku)) return { ok: false, error: "SKU may only contain letters, numbers and . _ - /" };
    data.sku = sku;
  }
  const barcode = str(raw.barcode, 32);
  if (barcode !== undefined) {
    if (barcode && !/^\d{6,14}$/.test(barcode)) return { ok: false, error: "Barcode must be 6–14 digits (EAN/UPC/GTIN)." };
    data.barcode = barcode;
  }
  if (data.hsnCode && !/^\d{4,8}$/.test(data.hsnCode)) return { ok: false, error: "HSN code must be 4–8 digits." };

  if (raw.specifications !== undefined) {
    const list = Array.isArray(raw.specifications)
      ? raw.specifications
      : String(raw.specifications).split(/\n|\|/);
    data.specifications = list.map((s) => String(s).trim()).filter(Boolean).slice(0, 30);
  }
  if (raw.images !== undefined) {
    const list = Array.isArray(raw.images) ? raw.images : String(raw.images).split(/\s*\|\s*/);
    data.images = list.map((s) => String(s).trim()).filter(Boolean).slice(0, 4);
  }

  const o = (raw.ondc && typeof raw.ondc === "object" ? raw.ondc : {}) as Raw;
  const ondc: NonNullable<ProductInput["ondc"]> = {};
  for (const key of ["listed", "returnable", "cancellable"] as const) {
    const v = bool(o[key]);
    if (v !== undefined) ondc[key] = v;
  }
  const rw = num(o.returnWindowDays);
  if (rw !== undefined) {
    if (!Number.isInteger(rw) || rw < 0 || rw > 30) return { ok: false, error: "Return window must be 0–30 days." };
    ondc.returnWindowDays = rw;
  }
  const tts = num(o.timeToShipMinutes);
  if (tts !== undefined) {
    if (!Number.isInteger(tts) || tts < 5 || tts > 7 * 24 * 60) return { ok: false, error: "Ready-for-pickup time must be between 5 minutes and 7 days." };
    ondc.timeToShipMinutes = tts;
  }
  const veg = str(o.vegType, 10);
  if (veg !== undefined) {
    if (!(VEG_TYPES as readonly string[]).includes(veg)) return { ok: false, error: "Food type must be veg, non_veg, egg or na." };
    ondc.vegType = veg as (typeof VEG_TYPES)[number];
  }
  // Validate before trimming to 3 so "INDONESIA" is rejected rather than stored as "IND".
  const coo = str(o.countryOfOrigin, 10);
  if (coo !== undefined) {
    if (coo && !/^[A-Za-z]{3}$/.test(coo)) return { ok: false, error: "Country of origin must be a 3-letter code, e.g. IND." };
    ondc.countryOfOrigin = coo.toUpperCase();
  }
  const mfr = str(o.manufacturer, 160);
  if (mfr !== undefined) ondc.manufacturer = mfr;
  if (Object.keys(ondc).length) data.ondc = ondc;

  return { ok: true, data };
}

/** Flattens `ondc` into dotted keys so a partial update doesn't wipe sibling fields. */
export function toMongoUpdate(data: ProductInput): Record<string, unknown> {
  const { ondc, ...rest } = data;
  const out: Record<string, unknown> = { ...rest };
  for (const [k, v] of Object.entries(ondc ?? {})) out[`ondc.${k}`] = v;
  return out;
}

/** Fields whose change means an admin must re-approve the product. */
export const REVIEWED_FIELDS = ["name", "category", "images", "specifications", "brand"] as const;

/**
 * Status change implied by an update: an approved product whose customer-facing details
 * (REVIEWED_FIELDS) change goes back to review, and any content edit to a rejected product resubmits it.
 * Returns {} when the status should stay as it is.
 */
export function reviewUpdate(current: { status?: string }, data: ProductInput): { status?: "under_review"; rejectionReason?: string } {
  const status = current.status ?? "approved";
  if (status === "under_review") return {};
  const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const fields = current as Record<string, unknown>;
  const reviewedChange = REVIEWED_FIELDS.some((k) => data[k] !== undefined && !same(data[k], fields[k]));
  // Stock-only updates (POS, inline stock edits) never resubmit a rejected product.
  const contentChange = Object.keys(data).some((k) => k !== "stock" && k !== "lowStockThreshold");
  if (status === "rejected" ? contentChange : reviewedChange) {
    return { status: "under_review", rejectionReason: "" };
  }
  return {};
}
