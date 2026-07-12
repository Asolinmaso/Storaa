import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Store from "@/models/Store";
import Product from "@/models/Product";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  await connectDB();
  const store = await Store.findOne({ ownerId: session.userId });
  if (!store) {
    return NextResponse.json({ products: [], store: null });
  }

  const products = await Product.find({ storeId: store._id }).sort({
    createdAt: -1,
  });
  return NextResponse.json({ products, store });
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }

    await connectDB();
    const store = await Store.findOne({ ownerId: session.userId });
    if (!store) {
      return NextResponse.json(
        {
          code: "NO_STORE",
          message: "Complete your store setup before adding products.",
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    if (!body.name?.trim() || !body.category?.trim() || !(Number(body.price) > 0)) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Name, category and price are required.",
        },
        { status: 400 }
      );
    }

    const product = await Product.create({
      storeId: store._id,
      name: body.name.trim(),
      category: body.category.trim(),
      brand: body.brand?.trim() ?? "",
      price: Number(body.price),
      unit: body.unit?.trim() ?? "",
      stock: Number(body.stock) || 0,
      specifications: body.specifications ?? [],
      images: body.images ?? [],
      rating: 0,
      reviewCount: 0,
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    console.error("Vendor product create error:", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
