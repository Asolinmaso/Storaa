import { isValidObjectId, Types } from "mongoose";
import Product, { type IProduct } from "@/models/Product";
import PosSyncLog, { type PosSyncKind } from "@/models/PosSyncLog";
import Store, { type IStore } from "@/models/Store";
import { parseProductInput, reviewUpdate, toMongoUpdate } from "@/lib/vendor/productInput";
import { reservedByProduct } from "./reserved";
import { availableFromOnHand } from "./stockMath";

export const MAX_ROWS = 1000;
const MAX_LOGGED_ISSUES = 25;
const WRITE_CHUNK = 500;
const CONCURRENCY = 20;

type Raw = Record<string, unknown>;

export interface SyncResult {
  ok: boolean;
  received: number;
  updated: number;
  created: number;
  failed: number;
  issues: string[];
  /** Products sent back to admin review (and so hidden) by this sync. */
  sentForReview?: number;
  logId?: string;
}

const ref = (row: Raw, i: number) =>
  row.sku ? `SKU ${row.sku}` : row.barcode ? `Barcode ${row.barcode}` : row.productId ? `Product ${row.productId}` : `Row ${i + 1}`;

/** The store's products that a batch of POS rows refer to, loaded in one query. */
interface Catalog {
  byId: Map<string, IProduct>;
  bySku: Map<string, IProduct>;
  byBarcode: Map<string, IProduct>;
}

async function loadCatalog(storeId: IStore["_id"], rows: Raw[]): Promise<Catalog> {
  const ids = new Set<string>();
  const skus = new Set<string>();
  const barcodes = new Set<string>();
  for (const row of rows) {
    const id = row.productId ?? row.id;
    if (id && isValidObjectId(id)) ids.add(String(id));
    if (row.sku) skus.add(String(row.sku).trim());
    if (row.barcode) barcodes.add(String(row.barcode).trim());
  }
  const or: Record<string, unknown>[] = [];
  if (ids.size) or.push({ _id: { $in: Array.from(ids) } });
  if (skus.size) or.push({ sku: { $in: Array.from(skus) } });
  if (barcodes.size) or.push({ barcode: { $in: Array.from(barcodes) } });
  const catalog: Catalog = { byId: new Map(), bySku: new Map(), byBarcode: new Map() };
  if (or.length === 0) return catalog;
  const products = await Product.find({ storeId, $or: or });
  for (const p of products) {
    catalog.byId.set(String(p._id), p);
    if (p.sku) catalog.bySku.set(p.sku, p);
    if (p.barcode && !catalog.byBarcode.has(p.barcode)) catalog.byBarcode.set(p.barcode, p);
  }
  return catalog;
}

/** Finds the store's product a POS row refers to: productId, then SKU, then barcode. */
function findProduct(catalog: Catalog, row: Raw): IProduct | null {
  const id = row.productId ?? row.id;
  if (id && isValidObjectId(id)) {
    const p = catalog.byId.get(String(id));
    if (p) return p;
  }
  const sku = row.sku ? String(row.sku).trim() : "";
  if (sku) {
    const p = catalog.bySku.get(sku);
    if (p) return p;
  }
  const barcode = row.barcode ? String(row.barcode).trim() : "";
  return barcode ? catalog.byBarcode.get(barcode) ?? null : null;
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

/** One pipeline-style update, applied atomically in the database (so concurrent sales never race). */
interface StockOp {
  productId: Types.ObjectId;
  /** Stock expression: absolute value, or "$stock + delta" clamped at zero. */
  stock?: unknown;
  price?: number;
  mrp?: number;
}

/** Writes all ops in a few bulk calls. Returns how many ops could not be confirmed written. */
async function applyStockOps(ops: StockOp[], issues: string[]): Promise<number> {
  let unconfirmed = 0;
  for (let i = 0; i < ops.length; i += WRITE_CHUNK) {
    const chunk = ops.slice(i, i + WRITE_CHUNK);
    try {
      await Product.collection.bulkWrite(
        chunk.map((o) => ({
          updateOne: {
            filter: { _id: o.productId },
            update: [
              {
                $set: {
                  posSyncedAt: "$$NOW",
                  updatedAt: "$$NOW",
                  ...(o.stock !== undefined ? { stock: o.stock } : {}),
                  ...(o.price !== undefined ? { price: { $literal: o.price } } : {}),
                  ...(o.mrp !== undefined ? { mrp: { $literal: o.mrp } } : {}),
                },
              },
            ],
          },
        })),
        { ordered: false }
      );
    } catch (err) {
      console.error("[POS] bulk write failed:", err);
      unconfirmed += chunk.length;
      issues.push("Database error while saving some rows — they may not have been applied. Retry the request.");
    }
  }
  return unconfirmed;
}

/**
 * Stock / price updates. Each row: { sku | barcode | productId, stock?, delta?, price?, mrp? }.
 * `stock` is what is on your shelf: units already promised to customers (holds, ONDC orders) are
 * subtracted so they are not sold twice. `delta` adjusts the available count (never below 0).
 */
export async function syncInventory(store: IStore, input: unknown, source: string) {
  const rows = checkRows(input);
  if (typeof rows === "string") return { error: rows };
  const r = { received: rows.length, updated: 0, created: 0, failed: 0, issues: [] as string[] };

  const catalog = await loadCatalog(store._id, rows);
  const needsReserved = rows.some((row) => row.stock !== undefined);
  const reserved = needsReserved
    ? await reservedByProduct(store._id, Array.from(catalog.byId.values(), (p) => p._id))
    : new Map<string, number>();

  const ops: StockOp[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const product = findProduct(catalog, row);
    if (!product) {
      r.failed++;
      r.issues.push(`${ref(row, i)}: not found`);
      continue;
    }
    const op: StockOp = { productId: product._id };
    if (row.stock !== undefined) {
      const s = Number(row.stock);
      if (!Number.isFinite(s)) {
        r.failed++;
        r.issues.push(`${ref(row, i)}: stock must be a number`);
        continue;
      }
      op.stock = { $literal: availableFromOnHand(s, reserved.get(String(product._id)) ?? 0) };
    } else if (row.delta !== undefined) {
      const d = Number(row.delta);
      if (!Number.isFinite(d)) {
        r.failed++;
        r.issues.push(`${ref(row, i)}: delta must be a number`);
        continue;
      }
      op.stock = { $max: [0, { $add: ["$stock", Math.floor(d)] }] };
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
      if (parsed.data.price !== undefined) op.price = parsed.data.price;
      if (parsed.data.mrp !== undefined) op.mrp = parsed.data.mrp;
    }
    if (op.stock === undefined && op.price === undefined && op.mrp === undefined) {
      r.failed++;
      r.issues.push(`${ref(row, i)}: nothing to update (send stock, delta, price or mrp)`);
      continue;
    }
    ops.push(op);
  }

  const unconfirmed = await applyStockOps(ops, r.issues);
  r.updated = ops.length - unconfirmed;
  r.failed += unconfirmed;
  return finish(store, "inventory", source, r);
}

/** Sales rung up on the POS: each row { sku | barcode | productId, quantity } reduces stock. */
export async function syncSales(store: IStore, input: unknown, source: string) {
  const rows = checkRows(input);
  if (typeof rows === "string") return { error: rows };
  const r = { received: rows.length, updated: 0, created: 0, failed: 0, issues: [] as string[] };

  const catalog = await loadCatalog(store._id, rows);
  const ops: StockOp[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const qty = Number(row.quantity);
    if (!Number.isInteger(qty) || qty === 0) {
      r.failed++;
      r.issues.push(`${ref(row, i)}: quantity must be a non-zero whole number`);
      continue;
    }
    const product = findProduct(catalog, row);
    if (!product) {
      r.failed++;
      r.issues.push(`${ref(row, i)}: not found`);
      continue;
    }
    // Negative quantity = return/refund on the POS; stock never goes below 0.
    ops.push({ productId: product._id, stock: { $max: [0, { $subtract: ["$stock", qty] }] } });
  }
  const unconfirmed = await applyStockOps(ops, r.issues);
  r.updated = ops.length - unconfirmed;
  r.failed += unconfirmed;
  return finish(store, "sales", source, r);
}

/** Runs `fn` over `items` with a small concurrency limit (keeps big syncs inside the time limit). */
async function inBatches<T>(items: T[], fn: (item: T, index: number) => Promise<void>) {
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    await Promise.all(items.slice(i, i + CONCURRENCY).map((item, j) => fn(item, i + j)));
  }
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
  const r = { received: rows.length, updated: 0, created: 0, failed: 0, issues: [] as string[], sentForReview: 0 };

  const catalog = await loadCatalog(store._id, rows);
  const reserved = await reservedByProduct(store._id, Array.from(catalog.byId.values(), (p) => p._id));

  await inBatches(rows, async (row, i) => {
    try {
      const existing = findProduct(catalog, row);
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
        const owner = data.sku ? catalog.bySku.get(data.sku) : undefined;
        if (owner && String(owner._id) !== String(existing._id)) throw new Error("SKU already used by another product");
        // Incoming stock is what is on the shelf; keep units promised to customers out of it.
        if (data.stock !== undefined) data.stock = availableFromOnHand(data.stock, reserved.get(String(existing._id)) ?? 0);
        const review = reviewUpdate(existing, data);
        if (review.status) r.sentForReview++;
        await Product.updateOne(
          { _id: existing._id },
          {
            ...toMongoUpdate(data),
            ...review,
            ...(opts.origin === "pos" ? { posSyncedAt: new Date() } : {}),
          }
        );
        r.updated++;
      } else {
        if (!opts.allowCreate) throw new Error("not found (creating products from the POS is turned off)");
        const parsed = parseProductInput(row);
        if (!parsed.ok) throw new Error(parsed.error);
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
  });

  if (r.sentForReview > 0) {
    // First in the list so the 25-line log cap never drops it.
    r.issues.unshift(
      `Note: ${r.sentForReview} product${r.sentForReview > 1 ? "s were" : " was"} sent back to admin review because the name, category, brand, images or description changed. ` +
        `They stay hidden from customers and ONDC until approved.`
    );
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
