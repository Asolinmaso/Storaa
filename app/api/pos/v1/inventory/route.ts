import { syncInventory } from "@/lib/pos/sync";
import { readItems, sourceOf, syncResponse, withPosStore } from "@/lib/pos/respond";

export const dynamic = "force-dynamic";

/** Stock / price updates: `{ items: [{ sku, stock }, { barcode, delta: -2 }, { sku, price, mrp }] }`. */
export async function POST(req: Request) {
  return withPosStore(req, async (store) =>
    syncResponse(await syncInventory(store, await readItems(req), sourceOf(req, store)))
  );
}
