import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Product from "@/models/Product";

export const dynamic = "force-dynamic";

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";

function isAdmin(req: Request): boolean {
  if (!ADMIN_SECRET) return true;
  return req.headers.get("x-admin-secret") === ADMIN_SECRET;
}

export async function GET(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const storeId = searchParams.get("storeId");
  const q = searchParams.get("q");

  const filter: Record<string, unknown> = {};
  if (status && status !== "all") filter.status = status;
  if (storeId) filter.storeId = storeId;
  if (q) filter.name = { $regex: q, $options: "i" };

  const [products, totalCount, approvedCount, pendingCount, rejectedCount] =
    await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .populate("storeId", "name owner email phone")
        .lean(),
      Product.countDocuments({}),
      Product.countDocuments({ status: "approved" }),
      Product.countDocuments({ status: "under_review" }),
      Product.countDocuments({ status: "rejected" }),
    ]);

  return NextResponse.json({
    products,
    counts: {
      total: totalCount,
      approved: approvedCount,
      pending: pendingCount,
      rejected: rejectedCount,
    },
  });
}
