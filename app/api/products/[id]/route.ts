import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";
import Store from "@/models/Store";
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
  const product = await Product.findById(params.id).catch(() => null);
  if (!product) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Product not found." },
      { status: 404 }
    );
  }

  const store = await Store.findOne({ _id: product.storeId, status: "approved" });
  if (!store) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Product not found." },
      { status: 404 }
    );
  }
  const moreProducts = await Product.find({
    storeId: product.storeId,
    _id: { $ne: product._id },
  }).limit(5);

  return NextResponse.json({ product, store, moreProducts });
}
