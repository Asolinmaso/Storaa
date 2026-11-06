import { vendorStore } from "@/lib/vendor/session";
import { upsertProducts } from "@/lib/pos/sync";
import { syncResponse } from "@/lib/pos/respond";

/** Bulk create/update from a CSV the browser has parsed into rows. Matches on SKU / barcode. */
export async function POST(req: Request) {
  const { store, res } = await vendorStore();
  if (res) return res;
  const body = (await req.json().catch(() => ({}))) as { rows?: unknown; fileName?: string };
  const result = await upsertProducts(store, body.rows, {
    kind: "csv_import",
    source: (body.fileName || "CSV upload").slice(0, 40),
    allowCreate: true,
    origin: "csv",
  });
  return syncResponse(result);
}
