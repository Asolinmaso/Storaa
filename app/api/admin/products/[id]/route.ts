import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";

export const dynamic = "force-dynamic";

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";

function isAdmin(req: Request): boolean {
  if (!ADMIN_SECRET) return true;
  return req.headers.get("x-admin-secret") === ADMIN_SECRET;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  await connectDB();

  const product = await Product.findById(params.id)
    .populate("storeId", "name owner email phone ownerContact")
    .catch(() => null);

  if (!product) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Product not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ product });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!isAdmin(req)) {
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

  const body = (await req.json()) as {
    action: "approve" | "reject";
    reason?: string;
  };

  if (body.action === "approve") {
    product.status = "approved";
    product.rejectionReason = "";
    await product.save();
    return NextResponse.json({ product });
  }

  if (body.action === "reject") {
    if (!body.reason?.trim()) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "A rejection reason is required." },
        { status: 400 }
      );
    }
    product.status = "rejected";
    product.rejectionReason = body.reason.trim();
    await product.save();
    return NextResponse.json({ product });
  }

  return NextResponse.json(
    { code: "VALIDATION_ERROR", message: "Invalid action. Use 'approve' or 'reject'." },
    { status: 400 }
  );
}
