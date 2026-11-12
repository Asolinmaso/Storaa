import { syncSales } from "@/lib/pos/sync";
import { once, readPosBody, sourceOf, syncResponse, withPosStore } from "@/lib/pos/respond";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Bills rung up on the POS reduce stock: `{ billId: "INV-1042", items: [{ sku, quantity: 2 }] }`
 * (negative quantity = return). `billId` (or an `Idempotency-Key` header) makes the call safe to
 * retry: the same bill is never deducted twice.
 */
export async function POST(req: Request) {
  return withPosStore(req, async (store) => {
    const { items, key } = await readPosBody(req);
    return once(store, "sales", key, async () => syncResponse(await syncSales(store, items, sourceOf(req, store))));
  });
}
