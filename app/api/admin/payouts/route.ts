import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { isAdmin } from "@/lib/adminAuth";
import { connectDB } from "@/lib/db";
import Payout, { computePayoutAmounts } from "@/models/Payout";
import Order from "@/models/Order";
import "@/models/Store";

export const dynamic = "force-dynamic";


export async function GET(req: Request) {
  if (!(await isAdmin(req))) {
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

/** Groups each store's settled-able orders (successful, not yet in a payout) into one pending payout. */
export async function POST(req: Request) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  if (action !== "generate") {
    return NextResponse.json({ code: "VALIDATION_ERROR", message: "Use action 'generate'." }, { status: 400 });
  }
  await connectDB();

  const groups = await Order.aggregate<{ _id: Types.ObjectId; gross: number }>([
    { $match: { status: "success", payoutId: null } },
    { $group: { _id: "$storeId", gross: { $sum: "$amount" } } },
  ]);

  let created = 0;
  for (const g of groups) {
    // Claim the orders first so a concurrent run can't pay them twice.
    const payoutId = new Types.ObjectId();
    const claimed = await Order.updateMany(
      { storeId: g._id, status: "success", payoutId: null },
      { $set: { payoutId } }
    );
    if (!claimed.modifiedCount) continue;
    const orders = await Order.find({ payoutId }).select("amount").lean();
    const gross = orders.reduce((n, o) => n + o.amount, 0);
    const { platformFees, gstOnFees, netPayout } = computePayoutAmounts(gross);
    await Payout.create({
      _id: payoutId,
      payoutNumber: `PO-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      storeId: g._id,
      grossSales: gross,
      platformFees,
      gstOnFees,
      netPayout,
      status: "pending",
      initiatedOn: new Date(),
    });
    created++;
  }
  return NextResponse.json({ created });
}
