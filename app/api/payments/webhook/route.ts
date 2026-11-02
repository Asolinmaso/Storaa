import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { recordPaidHold } from "@/lib/payments";
import { verifyWebhookSignature } from "@/lib/razorpay";
import Hold from "@/models/Hold";
import Order from "@/models/Order";
import User from "@/models/User";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Razorpay webhook (payment.captured / payment.failed). Set the same secret in RAZORPAY_WEBHOOK_SECRET. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature") ?? "")) {
    return NextResponse.json({ code: "INVALID_SIGNATURE" }, { status: 400 });
  }
  const event = JSON.parse(raw);
  const payment = event?.payload?.payment?.entity;
  if (!payment?.id || !payment?.order_id) return NextResponse.json({ ok: true });

  await connectDB();
  const hold = await Hold.findOne({ razorpayOrderId: payment.order_id });
  if (!hold) return NextResponse.json({ ok: true });

  if (event.event === "payment.captured") {
    await recordPaidHold(hold._id, payment.order_id, payment.id);
  } else if (event.event === "payment.failed" && !(await Order.exists({ paymentId: payment.id }))) {
    const user = await User.findById(hold.userId).select("name email phone");
    await Order.create({
      orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
      storeId: hold.storeId,
      customerName: user?.name || user?.email || "Customer",
      customerContact: user?.phone ?? "",
      customerEmail: user?.email ?? "",
      itemCount: hold.items.reduce((n, i) => n + i.quantity, 0),
      amount: hold.total,
      orderDate: new Date(),
      status: "failed",
      holdId: hold._id,
      razorpayOrderId: payment.order_id,
      paymentId: payment.id,
    });
  }
  return NextResponse.json({ ok: true });
}
