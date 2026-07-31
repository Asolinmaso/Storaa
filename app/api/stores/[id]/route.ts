import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Store from "@/models/Store";
import Product from "@/models/Product";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  await connectDB();
  const store = await Store.findOne({ _id: params.id, status: "approved" }).catch(
    () => null
  );
  if (!store) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Store not found." },
      { status: 404 }
    );
  }

  // Only return approved products (or pre-existing docs without the field)
  const products = await Product.find({
    storeId: store._id,
    $or: [{ status: "approved" }, { status: { $exists: false } }],
  }).sort({ name: 1 });

  // Reviews — placeholder until a Reviews collection is added
  const reviews: unknown[] = [];

  return NextResponse.json({ store, products, reviews });
}

