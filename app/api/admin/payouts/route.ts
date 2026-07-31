import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Payout from "@/models/Payout";
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
    filter.initiatedOn = { $gte: start, $lte: end };
  }

  let payouts = await Payout.find(filter)
    .sort({ initiatedOn: -1 })
    .populate("storeId", "name")
    .lean();

  if (q) {
    const needle = q.toLowerCase();
    payouts = payouts.filter((p) => {
      const storeName =
        p.storeId && typeof p.storeId === "object" && "name" in p.storeId
          ? String((p.storeId as { name: string }).name)
          : "";
      return (
        p.payoutNumber.toLowerCase().includes(needle) ||
        storeName.toLowerCase().includes(needle)
      );
    });
  }

  const orderCounts = await Order.aggregate([
    { $match: { payoutId: { $ne: null } } },
    { $group: { _id: "$payoutId", count: { $sum: 1 } } },
  ]);
  const orderCountByPayout = new Map(
    orderCounts.map((o) => [String(o._id), o.count])
  );

  const rows = payouts.map((p) => ({
    ...p,
    orderCount: orderCountByPayout.get(String(p._id)) ?? 0,
  }));

  const [total, successful, failed, revenueAgg] = await Promise.all([
    Payout.countDocuments({}),
    Payout.countDocuments({ status: "success" }),
    Payout.countDocuments({ status: "failed" }),
    Payout.aggregate([
      { $match: { status: "success" } },
      { $group: { _id: null, sum: { $sum: "$netPayout" } } },
    ]),
  ]);

  return NextResponse.json({
    payouts: rows,
    counts: {
      total,
      successful,
      failed,
      totalRevenue: revenueAgg[0]?.sum ?? 0,
    },
  });
}
