import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Store from "@/models/Store";
import Product from "@/models/Product";
import { getSession } from "@/lib/auth";

async function getOwnedStoreId(userId: string) {
  const store = await Store.findOne({ ownerId: userId });
  return store?._id ?? null;
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }

    await connectDB();
    const storeId = await getOwnedStoreId(session.userId);
    if (!storeId) {
      return NextResponse.json({ code: "NO_STORE" }, { status: 400 });
    }

    const body = await req.json();
    const update: Record<string, unknown> = {};
    for (const key of [
      "name",
      "category",
      "brand",
      "unit",
      "specifications",
      "images",
    ]) {
      if (body[key] !== undefined) update[key] = body[key];
    }
    if (body.price !== undefined) update.price = Number(body.price);
    if (body.stock !== undefined) update.stock = Number(body.stock);

    const product = await Product.findOneAndUpdate(
      { _id: params.id, storeId },
      update,
      { new: true }
    );
    if (!product) {
      return NextResponse.json(
        { code: "NOT_FOUND", message: "Product not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (err) {
    console.error("Vendor product update error:", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  await connectDB();
  const storeId = await getOwnedStoreId(session.userId);
  if (!storeId) {
    return NextResponse.json({ code: "NO_STORE" }, { status: 400 });
  }

  const product = await Product.findOneAndDelete({ _id: params.id, storeId });
  if (!product) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Product not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
