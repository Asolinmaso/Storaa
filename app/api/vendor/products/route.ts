import { NextResponse } from "next/server";
import Product from "@/models/Product";
import { vendorStore } from "@/lib/vendor/session";
import { parseProductInput } from "@/lib/vendor/productInput";
import { productIssues } from "@/lib/ondc/readiness";
import { ondcConfig } from "@/lib/ondc/config";
import { skuTaken } from "@/lib/vendor/sku";

export const dynamic = "force-dynamic";

export async function GET() {
  const { store, res } = await vendorStore();
  if (res) {
    return res.status === 400 ? NextResponse.json({ products: [], store: null }) : res;
  }
  const products = await Product.find({ storeId: store._id }).sort({ createdAt: -1 });
  return NextResponse.json({
    products: products.map((p) => ({ ...p.toObject(), ondcIssues: productIssues(p) })),
    store: { _id: store._id, status: store.status, ondcEnabled: store.ondcEnabled, name: store.name },
    ondcAvailable: ondcConfig().enabled,
  });
}

export async function POST(req: Request) {
  try {
    const { store, res } = await vendorStore();
    if (res) return res;
    const parsed = parseProductInput(await req.json().catch(() => ({})));
    if (!parsed.ok) {
      return NextResponse.json({ code: "VALIDATION_ERROR", message: parsed.error }, { status: 400 });
    }
    if (await skuTaken(store._id, parsed.data.sku)) {
      return NextResponse.json({ code: "DUPLICATE_SKU", message: "Another product already uses this SKU." }, { status: 409 });
    }
    const { ondc, ...rest } = parsed.data;
    const product = await Product.create({
      ...rest,
      ...(ondc ? { ondc } : {}),
      storeId: store._id,
      rating: 0,
      reviewCount: 0,
      source: "manual",
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return NextResponse.json({ code: "DUPLICATE_SKU", message: "Another product already uses this SKU." }, { status: 409 });
    }
    console.error("Vendor product create error:", err);
    return NextResponse.json({ code: "SERVER_ERROR", message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
