import { syncSales } from "@/lib/pos/sync";
import { readItems, sourceOf, syncResponse, withPosStore } from "@/lib/pos/respond";

export const dynamic = "force-dynamic";

/** Bills rung up on the POS reduce stock: `{ items: [{ sku, quantity: 2 }] }` (negative = return). */
export async function POST(req: Request) {
  return withPosStore(req, async (store) =>
    syncResponse(await syncSales(store, await readItems(req), sourceOf(req, store)))
  );
}
