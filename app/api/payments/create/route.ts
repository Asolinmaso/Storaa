import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createRazorpayOrder, paymentsEnabled, razorpayConfig } from "@/lib/razorpay";
import Hold from "@/models/Hold";

/** Starts an online payment for one of the signed-in customer's active holds. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  if (!paymentsEnabled()) {
    return NextResponse.json({ code: "PAYMENTS_DISABLED", message: "Online payment is not available." }, { status: 400 });
  }
  const { holdId } = (await req.json().catch(() => ({}))) as { holdId?: string };
  if (!holdId || !isValidObjectId(holdId)) {
    return NextResponse.json({ code: "VALIDATION_ERROR", message: "holdId is required." }, { status: 400 });
  }

  await connectDB();
  const hold = await Hold.findOne({ _id: holdId, userId: session.userId });
  if (!hold || hold.status !== "active") {
    return NextResponse.json({ code: "NOT_FOUND", message: "Active hold not found." }, { status: 404 });
  }
  if (hold.paymentStatus === "paid") {
    return NextResponse.json({ code: "ALREADY_PAID", message: "This hold is already paid." }, { status: 409 });
  }

  try {
    const order = await createRazorpayOrder(hold.total, `hold_${hold._id}`);
    hold.razorpayOrderId = order.id;
    await hold.save();
    return NextResponse.json({
      keyId: razorpayConfig().keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      holdId: String(hold._id),
    });
  } catch (err) {
    console.error("Create payment order failed:", err);
    return NextResponse.json({ code: "SERVER_ERROR", message: "Could not start the payment. Please try again." }, { status: 502 });
  }
}
