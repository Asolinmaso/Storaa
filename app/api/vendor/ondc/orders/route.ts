import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import OndcOrder from "@/models/OndcOrder";
import Store from "@/models/Store";

/** ONDC orders placed against the signed-in vendor's store. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  await connectDB();
  const store = await Store.findOne({ ownerId: session.userId });
  if (!store) return NextResponse.json({ orders: [] });

  const orders = await OndcOrder.find({ storeId: store._id }).sort({ createdAt: -1 });
  return NextResponse.json({ orders });
}
