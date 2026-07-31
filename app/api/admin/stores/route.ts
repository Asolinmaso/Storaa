import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Store from "@/models/Store";

export const dynamic = "force-dynamic";

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";

function isAdmin(req: Request): boolean {
  if (!ADMIN_SECRET) return true; // No secret configured – allow in dev
  return req.headers.get("x-admin-secret") === ADMIN_SECRET;
}

export async function GET(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q");

  const filter: Record<string, unknown> = {};
  if (status && status !== "all") filter.status = status;
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { owner: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ];
  }

  const [stores, totalCount, approvedCount, pendingCount, rejectedCount] =
    await Promise.all([
      Store.find(filter).sort({ createdAt: -1 }).lean(),
      Store.countDocuments({}),
      Store.countDocuments({ status: "approved" }),
      Store.countDocuments({ status: "under_review" }),
      Store.countDocuments({ status: "rejected" }),
    ]);

  return NextResponse.json({
    stores,
    counts: {
      total: totalCount,
      approved: approvedCount,
      pending: pendingCount,
      rejected: rejectedCount,
    },
  });
}
