import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Hold from "@/models/Hold";
import Product from "@/models/Product";
import Store from "@/models/Store";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  await connectDB();
  const holds = await Hold.find({ userId: session.userId }).sort({
    createdAt: -1,
  });
  return NextResponse.json({ holds });
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }

    const { productId, quantity, visitDate, visitTime } = await req.json();
    const qty = Number(quantity) || 1;
    if (!productId || qty < 1 || !visitDate || !visitTime) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Product, quantity, visit date and time are required.",
        },
        { status: 400 }
      );
    }

    await connectDB();
    const product = await Product.findById(productId).catch(() => null);
    if (!product) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Product not found." },
        { status: 404 }
      );
    }
    const store = await Store.findById(product.storeId);
    if (!store) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Store not found." },
        { status: 404 }
      );
    }

    const hold = await Hold.create({
      userId: session.userId,
      storeId: store._id,
      storeName: store.name,
      storeEmoji: store.emoji,
      storeColor: store.color,
      items: [
        {
          productId: product._id,
          name: product.name,
          emoji: product.emoji,
          price: product.price,
          quantity: qty,
        },
      ],
      total: product.price * qty,
      visitDate,
      visitTime,
      status: "active",
    });

    return NextResponse.json({ hold }, { status: 201 });
  } catch (err) {
    console.error("Create hold error:", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
