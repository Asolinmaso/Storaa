import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { ondcConfig } from "@/lib/ondc/config";
import { expireStaleOrders } from "@/lib/ondc/handlers";
import OndcOrder from "@/models/OndcOrder";
import Store from "@/models/Store";

/** ONDC orders placed against the signed-in vendor's store. */
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

export async function GET(req: Request) {
  if (!ondcConfig().enabled) {
    return NextResponse.json({ code: "ONDC_DISABLED", orders: [] }, { status: 404 });
  }
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  await connectDB();
  const store = await Store.findOne({ ownerId: session.userId });
  if (!store) return NextResponse.json({ orders: [] });

  // Abandoned orders free their stock the next time the vendor looks, even between cron runs.
  await expireStaleOrders({ storeId: store._id }).catch((err) => console.error("[ONDC] expiry sweep failed:", err));

  const asked = Number(new URL(req.url).searchParams.get("limit"));
  const limit = Number.isFinite(asked) && asked > 0 ? Math.min(MAX_LIMIT, Math.floor(asked)) : DEFAULT_LIMIT;
  const [orders, total] = await Promise.all([
    OndcOrder.find({ storeId: store._id }).sort({ createdAt: -1 }).limit(limit).lean(),
    OndcOrder.countDocuments({ storeId: store._id }),
  ]);
  return NextResponse.json({ orders, total, truncated: total > orders.length });
}
