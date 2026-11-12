import { NextResponse } from "next/server";
import PosSyncLog from "@/models/PosSyncLog";
import Product from "@/models/Product";
import type { PosProvider } from "@/models/Store";
import { vendorStore } from "@/lib/vendor/session";
import { generateKey } from "@/lib/pos/keys";
import { POS_PROVIDERS } from "@/lib/pos/providers";

export const dynamic = "force-dynamic";

function status(store: Awaited<ReturnType<typeof vendorStore>>["store"]) {
  const pos = store!.pos ?? ({} as NonNullable<typeof store>["pos"]);
  return {
    connected: !!pos.apiKeyHash,
    provider: pos.provider || "",
    apiKeyPrefix: pos.apiKeyPrefix || "",
    connectedAt: pos.connectedAt,
    lastSyncAt: pos.lastSyncAt,
    autoCreateProducts: !!pos.autoCreateProducts,
    syncPrice: pos.syncPrice !== false,
  };
}

export async function GET() {
  const { store, res } = await vendorStore({ approved: true });
  if (res) return res;
  const [logs, total, withSku, synced] = await Promise.all([
    PosSyncLog.find({ storeId: store._id }).sort({ createdAt: -1 }).limit(50).lean(),
    Product.countDocuments({ storeId: store._id }),
    Product.countDocuments({ storeId: store._id, sku: { $gt: "" } }),
    Product.countDocuments({ storeId: store._id, posSyncedAt: { $ne: null } }),
  ]);
  return NextResponse.json({ pos: status(store), storeName: store.name, logs, coverage: { total, withSku, synced } });
}

/** `{ action: "connect" | "rotate", provider }` — returns a new API key, shown once. */
export async function POST(req: Request) {
  const { store, res } = await vendorStore({ approved: true });
  if (res) return res;
  const body = (await req.json().catch(() => ({}))) as { action?: string; provider?: string };
  const provider = (body.provider || store.pos?.provider || "custom") as PosProvider;
  if (!POS_PROVIDERS.some((p) => p.id === provider)) {
    return NextResponse.json({ code: "VALIDATION_ERROR", message: "Unknown POS provider." }, { status: 400 });
  }
  if (body.action !== "connect" && body.action !== "rotate") {
    return NextResponse.json({ code: "VALIDATION_ERROR", message: "action must be connect or rotate." }, { status: 400 });
  }
  const { key, hash, prefix } = generateKey();
  store.pos = {
    ...(store.pos ?? {}),
    provider,
    apiKeyHash: hash,
    apiKeyPrefix: prefix,
    connectedAt: body.action === "connect" || !store.pos?.connectedAt ? new Date() : store.pos.connectedAt,
    lastSyncAt: store.pos?.lastSyncAt ?? null,
    autoCreateProducts: store.pos?.autoCreateProducts ?? false,
    syncPrice: store.pos?.syncPrice ?? true,
  };
  store.markModified("pos");
  await store.save();
  return NextResponse.json({ apiKey: key, pos: status(store) });
}

/** Sync settings: `{ autoCreateProducts?, syncPrice?, provider? }`. */
export async function PATCH(req: Request) {
  const { store, res } = await vendorStore({ approved: true });
  if (res) return res;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (typeof body.autoCreateProducts === "boolean") store.pos.autoCreateProducts = body.autoCreateProducts;
  if (typeof body.syncPrice === "boolean") store.pos.syncPrice = body.syncPrice;
  if (typeof body.provider === "string" && POS_PROVIDERS.some((p) => p.id === body.provider)) {
    store.pos.provider = body.provider as PosProvider;
  }
  store.markModified("pos");
  await store.save();
  return NextResponse.json({ pos: status(store) });
}

/** Disconnects the POS: the key stops working immediately. */
export async function DELETE() {
  const { store, res } = await vendorStore({ approved: true });
  if (res) return res;
  store.pos.apiKeyHash = "";
  store.pos.apiKeyPrefix = "";
  store.pos.connectedAt = null;
  store.markModified("pos");
  await store.save();
  return NextResponse.json({ pos: status(store) });
}
