import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { recordPaidHold } from "@/lib/payments";
import { verifyPaymentSignature } from "@/lib/razorpay";
import Hold from "@/models/Hold";

/** Called by the browser after Razorpay Checkout succeeds; verifies the signature then records the order. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Record<string, string>;
  const { holdId, razorpay_order_id: oid, razorpay_payment_id: pid, razorpay_signature: sig } = b;
  if (!holdId || !isValidObjectId(holdId) || !oid || !pid || !sig) {
    return NextResponse.json({ code: "VALIDATION_ERROR", message: "Missing payment details." }, { status: 400 });
  }
  if (!verifyPaymentSignature(oid, pid, sig)) {
    return NextResponse.json({ code: "INVALID_SIGNATURE", message: "Payment could not be verified." }, { status: 400 });
  }
  await connectDB();
  const hold = await Hold.findOne({ _id: holdId, userId: session.userId });
  if (!hold) return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });

  await recordPaidHold(hold._id, oid, pid);
  return NextResponse.json({ ok: true });
}
