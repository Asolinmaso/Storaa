import { NextResponse } from "next/server";
import Product from "@/models/Product";
import PosSyncLog from "@/models/PosSyncLog";
import { posProduct, upsertProducts } from "@/lib/pos/sync";
import { once, readPosBody, sourceOf, syncResponse, withPosStore } from "@/lib/pos/respond";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The store's catalog. `?updatedSince=ISO` for incremental pulls, `?sku=` for one item. */
export async function GET(req: Request) {
  return withPosStore(req, async (store) => {
    const url = new URL(req.url);
    const filter: Record<string, unknown> = { storeId: store._id };
    const since = url.searchParams.get("updatedSince");
    if (since) {
      const d = new Date(since);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ code: "VALIDATION_ERROR", message: "updatedSince must be an ISO date." }, { status: 400 });
      }
      filter.updatedAt = { $gt: d };
    }
    const sku = url.searchParams.get("sku");
    if (sku) filter.sku = sku;
    const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get("limit")) || 500));
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

    const [products, total] = await Promise.all([
      Product.find(filter).sort({ updatedAt: 1 }).skip((page - 1) * limit).limit(limit),
      Product.countDocuments(filter),
    ]);
    await PosSyncLog.create({
      storeId: store._id,
      kind: "catalog_pull",
      source: sourceOf(req, store),
      received: 0,
      updated: products.length,
    });
    return NextResponse.json({ products: products.map(posProduct), page, limit, total });
  });
}

/** Create / update products in bulk: `{ items: [{ sku, name, category, price, stock, … }] }`. */
export async function POST(req: Request) {
  return withPosStore(req, async (store) => {
    const { items, key } = await readPosBody(req);
    return once(store, "products", key, async () =>
      syncResponse(
        await upsertProducts(store, items, {
          kind: "products",
          source: sourceOf(req, store),
          allowCreate: !!store.pos?.autoCreateProducts,
          origin: "pos",
        })
      )
    );
  });
}
