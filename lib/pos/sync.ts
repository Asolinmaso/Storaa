import { isValidObjectId } from "mongoose";
import Product, { type IProduct } from "@/models/Product";
import PosSyncLog, { type PosSyncKind } from "@/models/PosSyncLog";
import Store, { type IStore } from "@/models/Store";
import { parseProductInput, toMongoUpdate } from "@/lib/vendor/productInput";
import { skuTaken } from "@/lib/vendor/sku";

export const MAX_ROWS = 1000;
const MAX_LOGGED_ISSUES = 25;

type Raw = Record<string, unknown>;

export interface SyncResult {
  ok: boolean;
  received: number;
  updated: number;
  created: number;
  failed: number;
  issues: string[];
  logId?: string;
}

const ref = (row: Raw, i: number) =>
  row.sku ? `SKU ${row.sku}` : row.barcode ? `Barcode ${row.barcode}` : row.productId ? `Product ${row.productId}` : `Row ${i + 1}`;

/** Finds the store's product a POS row refers to: productId, then SKU, then barcode. */
async function findProduct(storeId: IStore["_id"], row: Raw): Promise<IProduct | null> {
  const id = row.productId ?? row.id;
  if (id && isValidObjectId(id)) {
    const p = await Product.findOne({ _id: id, storeId });
    if (p) return p;
  }
  const sku = row.sku ? String(row.sku).trim() : "";
  if (sku) {
    const p = await Product.findOne({ storeId, sku });
    if (p) return p;
  }
  const barcode = row.barcode ? String(row.barcode).trim() : "";
  if (barcode) return Product.findOne({ storeId, barcode });
  return null;
}

async function finish(
  store: IStore,
  kind: PosSyncKind,
  source: string,
  r: Omit<SyncResult, "ok">
): Promise<SyncResult> {
  const ok = r.failed === 0;
  const log = await PosSyncLog.create({
    storeId: store._id,
    kind,
    source,
    ok,
    received: r.received,
    updated: r.updated,
    created: r.created,
    failed: r.failed,
    issues: r.issues.slice(0, MAX_LOGGED_ISSUES),
  });
  if (kind !== "csv_import") {
    await Store.updateOne({ _id: store._id }, { "pos.lastSyncAt": new Date() });
  }
  return { ok, ...r, issues: r.issues.slice(0, MAX_LOGGED_ISSUES), logId: String(log._id) };
}

function checkRows(rows: unknown): Raw[] | string {
  if (!Array.isArray(rows)) return "Body must contain an array of items.";
  if (rows.length === 0) return "No items to sync.";
  if (rows.length > MAX_ROWS) return `At most ${MAX_ROWS} items per request.`;
  return rows.map((r) => (r && typeof r === "object" ? (r as Raw) : {}));
}

/**
 * Stock / price updates. Each row: { sku | barcode | productId, stock?, delta?, price?, mrp? }.
 * `stock` sets the level, `delta` adjusts it (never below 0).
 */
export async function syncInventory(store: IStore, input: unknown, source: string) {
  const rows = checkRows(input);
  if (typeof rows === "string") return { error: rows };
  const r = { received: rows.length, updated: 0, created: 0, failed: 0, issues: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const product = await findProduct(store._id, row);
    if (!product) {
      r.failed++;
      r.issues.push(`${ref(row, i)}: not found`);
      continue;
    }
    const set: Record<string, unknown> = { posSyncedAt: new Date() };
    if (row.stock !== undefined) {
      const s = Number(row.stock);
      if (!Number.isFinite(s)) {
        r.failed++;
        r.issues.push(`${ref(row, i)}: stock must be a number`);
        continue;
      }
      set.stock = Math.max(0, Math.floor(s));
    } else if (row.delta !== undefined) {
      const d = Number(row.delta);
      if (!Number.isFinite(d)) {
        r.failed++;
        r.issues.push(`${ref(row, i)}: delta must be a number`);
        continue;
      }
      set.stock = Math.max(0, Math.floor(product.stock + d));
    }
    if (store.pos?.syncPrice !== false && (row.price !== undefined || row.mrp !== undefined)) {
      const parsed = parseProductInput(
        { price: row.price ?? product.price, mrp: row.mrp ?? product.mrp },
        { partial: true }
      );
      if (!parsed.ok) {
        r.failed++;
        r.issues.push(`${ref(row, i)}: ${parsed.error}`);
        continue;
      }
      Object.assign(set, parsed.data);
    }
    if (set.stock === undefined && set.price === undefined && set.mrp === undefined) {
      r.failed++;
      r.issues.push(`${ref(row, i)}: nothing to update (send stock, delta, price or mrp)`);
      continue;
    }
    await Product.updateOne({ _id: product._id }, set);
    r.updated++;
  }
  return finish(store, "inventory", source, r);
}

/** Sales rung up on the POS: each row { sku | barcode | productId, quantity } reduces stock. */
export async function syncSales(store: IStore, input: unknown, source: string) {
  const rows = checkRows(input);
  if (typeof rows === "string") return { error: rows };
  const r = { received: rows.length, updated: 0, created: 0, failed: 0, issues: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const qty = Number(row.quantity);
    if (!Number.isInteger(qty) || qty === 0) {
      r.failed++;
      r.issues.push(`${ref(row, i)}: quantity must be a non-zero whole number`);
      continue;
    }
    const product = await findProduct(store._id, row);
    if (!product) {
      r.failed++;
      r.issues.push(`${ref(row, i)}: not found`);
      continue;
    }
    // Negative quantity = return/refund on the POS; stock never goes below 0.
    await Product.updateOne({ _id: product._id }, [
      { $set: { stock: { $max: [0, { $subtract: ["$stock", qty] }] }, posSyncedAt: new Date() } },
    ], { updatePipeline: true });
    r.updated++;
  }
  return finish(store, "sales", source, r);
}

/**
 * Creates or updates full product records, matched by SKU / barcode / productId.
 * New products start "under_review" and need admin approval before customers see them.
 */
export async function upsertProducts(
  store: IStore,
  input: unknown,
  opts: { kind: PosSyncKind; source: string; allowCreate: boolean; origin: "pos" | "csv" }
) {
  const rows = checkRows(input);
  if (typeof rows === "string") return { error: rows };
  const r = { received: rows.length, updated: 0, created: 0, failed: 0, issues: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const existing = await findProduct(store._id, row);
      if (existing) {
        const parsed = parseProductInput(row, { partial: true });
        if (!parsed.ok) throw new Error(parsed.error);
        const data = parsed.data;
        if (store.pos?.syncPrice === false && opts.origin === "pos") {
          delete data.price;
          delete data.mrp;
        }
        const price = data.price ?? existing.price;
        const mrp = data.mrp ?? existing.mrp;
        if (mrp && mrp < price) throw new Error("Selling price cannot be higher than MRP.");
        if (await skuTaken(store._id, data.sku, existing._id)) throw new Error("SKU already used by another product");
        await Product.updateOne(
          { _id: existing._id },
          { ...toMongoUpdate(data), ...(opts.origin === "pos" ? { posSyncedAt: new Date() } : {}) }
        );
        r.updated++;
      } else {
        if (!opts.allowCreate) throw new Error("not found (creating products from the POS is turned off)");
        const parsed = parseProductInput(row);
        if (!parsed.ok) throw new Error(parsed.error);
        if (await skuTaken(store._id, parsed.data.sku)) throw new Error("SKU already used by another product");
        const { ondc, ...rest } = parsed.data;
        await Product.create({
          ...rest,
          ...(ondc ? { ondc } : {}),
          storeId: store._id,
          rating: 0,
          reviewCount: 0,
          source: opts.origin,
          posSyncedAt: opts.origin === "pos" ? new Date() : null,
        });
        r.created++;
      }
    } catch (err) {
      r.failed++;
      const msg = (err as { code?: number }).code === 11000
        ? "SKU already used by another product"
        : err instanceof Error ? err.message : "could not be saved";
      r.issues.push(`${ref(row, i)}: ${msg}`);
    }
  }
  return finish(store, opts.kind, opts.source, r);
}

/** Catalog shape returned to POS systems. */
export const posProduct = (p: IProduct) => ({
  productId: String(p._id),
  sku: p.sku || null,
  barcode: p.barcode || null,
  name: p.name,
  category: p.category,
  brand: p.brand,
  unit: p.unit,
  price: p.price,
  mrp: p.mrp || p.price,
  gstRate: p.gstRate,
  hsnCode: p.hsnCode || null,
  stock: p.stock,
  status: p.status ?? "approved",
  updatedAt: p.updatedAt,
});
