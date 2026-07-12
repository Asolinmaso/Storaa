import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import Store from "@/models/Store";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  await connectDB();
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q");

  const approvedStoreIds = await Store.find({ status: "approved" }).distinct("_id");

  const filter: Record<string, unknown> = { storeId: { $in: approvedStoreIds } };
  if (category) filter.category = category;
  if (q) filter.name = { $regex: q, $options: "i" };

  const products = await Product.find(filter)
    .populate("storeId", "name distanceKm hoursLabel isOpen emoji color")
    .sort({ price: -1 });

  return NextResponse.json({ products });
}
