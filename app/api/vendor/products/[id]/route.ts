import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import Product from "@/models/Product";
import { vendorStore } from "@/lib/vendor/session";
import { parseProductInput, toMongoUpdate } from "@/lib/vendor/productInput";
import { skuTaken } from "@/lib/vendor/sku";

const notFound = () => NextResponse.json({ code: "NOT_FOUND", message: "Product not found." }, { status: 404 });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { store, res } = await vendorStore();
    if (res) return res;
    if (!isValidObjectId(params.id)) return notFound();

    const parsed = parseProductInput(await req.json().catch(() => ({})), { partial: true });
    if (!parsed.ok) {
      return NextResponse.json({ code: "VALIDATION_ERROR", message: parsed.error }, { status: 400 });
    }
    const current = await Product.findOne({ _id: params.id, storeId: store._id });
    if (!current) return notFound();
    const price = parsed.data.price ?? current.price;
    const mrp = parsed.data.mrp ?? current.mrp;
    if (mrp && mrp < price) {
      return NextResponse.json({ code: "VALIDATION_ERROR", message: "Selling price cannot be higher than MRP." }, { status: 400 });
    }
    if (await skuTaken(store._id, parsed.data.sku, current._id)) {
      return NextResponse.json({ code: "DUPLICATE_SKU", message: "Another product already uses this SKU." }, { status: 409 });
    }
    const product = await Product.findOneAndUpdate(
      { _id: params.id, storeId: store._id },
      toMongoUpdate(parsed.data),
      { new: true }
    );
    if (!product) return notFound();
    return NextResponse.json({ product });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json({ code: "DUPLICATE_SKU", message: "Another product already uses this SKU." }, { status: 409 });
    }
    console.error("Vendor product update error:", err);
    return NextResponse.json({ code: "SERVER_ERROR", message: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { store, res } = await vendorStore();
  if (res) return res;
  if (!isValidObjectId(params.id)) return notFound();
  const product = await Product.findOneAndDelete({ _id: params.id, storeId: store._id });
  if (!product) return notFound();
  return NextResponse.json({ ok: true });
}
