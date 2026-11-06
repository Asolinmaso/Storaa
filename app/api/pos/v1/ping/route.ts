import { NextResponse } from "next/server";
import { withPosStore } from "@/lib/pos/respond";

export const dynamic = "force-dynamic";

/** Connection test: confirms the key and returns the store it belongs to. */
export async function GET(req: Request) {
  return withPosStore(req, async (store) =>
    NextResponse.json({
      ok: true,
      store: { id: String(store._id), name: store.name },
      provider: store.pos?.provider || "custom",
      settings: {
        autoCreateProducts: !!store.pos?.autoCreateProducts,
        syncPrice: store.pos?.syncPrice !== false,
      },
      serverTime: new Date().toISOString(),
    })
  );
}
