import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Store from "@/models/Store";
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

  const store = await Store.findById(params.id).catch(() => null);
  if (!store) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Store not found." },
      { status: 404 }
    );
  }

  const products = await Product.find({ storeId: store._id })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ store, products });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  await connectDB();

  const store = await Store.findById(params.id).catch(() => null);
  if (!store) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Store not found." },
      { status: 404 }
    );
  }

  const body = (await req.json()) as {
    action: "approve" | "reject";
    reason?: string;
  };

  if (body.action === "approve") {
    store.status = "approved";
    store.rejectionReason = "";
    await store.save();

    // Approve all under_review products for this store
    await Product.updateMany(
      { storeId: store._id, status: "under_review" },
      { $set: { status: "approved", rejectionReason: "" } }
    );

    return NextResponse.json({ store });
  }

  if (body.action === "reject") {
    if (!body.reason?.trim()) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "A rejection reason is required." },
        { status: 400 }
      );
    }
    store.status = "rejected";
    store.rejectionReason = body.reason.trim();
    await store.save();
    return NextResponse.json({ store });
  }

  return NextResponse.json(
    { code: "VALIDATION_ERROR", message: "Invalid action. Use 'approve' or 'reject'." },
    { status: 400 }
  );
}
