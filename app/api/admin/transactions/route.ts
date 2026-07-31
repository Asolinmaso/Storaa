import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import "@/models/Store";

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
  const date = searchParams.get("date");

  const filter: Record<string, unknown> = {};
  if (status && status !== "all") filter.status = status;
  if (date) {
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    filter.orderDate = { $gte: start, $lte: end };
  }
  if (q) {
    filter.$or = [
      { orderNumber: { $regex: q, $options: "i" } },
      { customerName: { $regex: q, $options: "i" } },
    ];
  }

  const [orders, total, successful, failed, revenueAgg] = await Promise.all([
    Order.find(filter).sort({ orderDate: -1 }).populate("storeId", "name email phone").lean(),
    Order.countDocuments({}),
    Order.countDocuments({ status: "success" }),
    Order.countDocuments({ status: "failed" }),
    Order.aggregate([
      { $match: { status: "success" } },
      { $group: { _id: null, sum: { $sum: "$amount" } } },
    ]),
  ]);

  return NextResponse.json({
    transactions: orders,
    counts: {
      total,
      successful,
      failed,
      totalRevenue: revenueAgg[0]?.sum ?? 0,
    },
  });
}
