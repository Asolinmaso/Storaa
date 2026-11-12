import { syncInventory } from "@/lib/pos/sync";
import { once, readPosBody, sourceOf, syncResponse, withPosStore } from "@/lib/pos/respond";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Stock / price updates: `{ items: [{ sku, stock }, { barcode, delta: -2 }, { sku, price, mrp }] }`.
 * `stock` = units on your shelf (units reserved for customers are subtracted automatically).
 * Send an `Idempotency-Key` header (or `requestId`) so a retried request is not applied twice.
 */
export async function POST(req: Request) {
  return withPosStore(req, async (store) => {
    const { items, key } = await readPosBody(req);
    return once(store, "inventory", key, async () => syncResponse(await syncInventory(store, items, sourceOf(req, store))));
  });
}
