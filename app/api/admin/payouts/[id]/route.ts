import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Payout from "@/models/Payout";
import Order from "@/models/Order";
import "@/models/Store";

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

  const payout = await Payout.findById(params.id)
    .populate("storeId")
    .lean()
    .catch(() => null);

  if (!payout) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Payout not found." },
      { status: 404 }
    );
  }

  const orders = await Order.find({ payoutId: payout._id })
    .sort({ orderDate: 1 })
    .lean();

  return NextResponse.json({ payout, orders });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  await connectDB();

  const payout = await Payout.findById(params.id).catch(() => null);
  if (!payout) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Payout not found." },
      { status: 404 }
    );
  }

  const body = (await req.json()) as { action: "initiate" | "retry" };

  if (body.action === "initiate") {
    if (payout.status !== "pending") {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Only pending payouts can be initiated." },
        { status: 400 }
      );
    }
    payout.status = "processing";
    payout.initiatedOn = new Date();
    await payout.save();
    return NextResponse.json({ payout });
  }

  if (body.action === "retry") {
    if (payout.status !== "failed") {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Only failed payouts can be retried." },
        { status: 400 }
      );
    }
    payout.status = "processing";
    payout.initiatedOn = new Date();
    payout.completedOn = null;
    payout.failureReason = "";
    await payout.save();
    return NextResponse.json({ payout });
  }

  return NextResponse.json(
    { code: "VALIDATION_ERROR", message: "Invalid action. Use 'initiate' or 'retry'." },
    { status: 400 }
  );
}
