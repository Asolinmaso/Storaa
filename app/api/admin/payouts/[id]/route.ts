import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { connectDB } from "@/lib/db";
import Payout from "@/models/Payout";
import Order from "@/models/Order";
import "@/models/Store";

export const dynamic = "force-dynamic";


export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin(req))) {
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
  if (!(await isAdmin(req))) {
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

  const body = (await req.json()) as { action: "initiate" | "retry" | "mark_paid" | "mark_failed"; reference?: string; reason?: string };

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

  if (body.action === "mark_paid") {
    if (payout.status !== "processing") {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Only processing payouts can be marked paid." },
        { status: 400 }
      );
    }
    if (!body.reference?.trim()) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "A bank transfer reference (UTR) is required." },
        { status: 400 }
      );
    }
    payout.status = "success";
    payout.completedOn = new Date();
    payout.transferReference = body.reference.trim();
    await payout.save();
    return NextResponse.json({ payout });
  }

  if (body.action === "mark_failed") {
    if (payout.status !== "processing") {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Only processing payouts can be marked failed." },
        { status: 400 }
      );
    }
    payout.status = "failed";
    payout.failureReason = body.reason?.trim() || "Bank transfer failed";
    await payout.save();
    return NextResponse.json({ payout });
  }

  return NextResponse.json(
    { code: "VALIDATION_ERROR", message: "Invalid action." },
    { status: 400 }
  );
}
