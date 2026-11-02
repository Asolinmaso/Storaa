import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Hold from "@/models/Hold";
import Product from "@/models/Product";
import Order from "@/models/Order";
import { paymentsEnabled, refundRazorpayPayment } from "@/lib/razorpay";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { action } = await req.json();
  if (action !== "cancel") {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Unsupported action." },
      { status: 400 }
    );
  }

  await connectDB();

  // A paid hold can only be cancelled while its payment has not been settled to the vendor; it is refunded.
  const current = await Hold.findOne({ _id: params.id, userId: session.userId, status: "active" }).catch(() => null);
  if (current?.paymentStatus === "paid") {
    const order = await Order.findOne({ paymentId: current.paymentId });
    if (order?.payoutId) {
      return NextResponse.json(
        { code: "SETTLED", message: "This payment has already been settled. Please contact support for a refund." },
        { status: 409 }
      );
    }
    try {
      if (!paymentsEnabled()) throw new Error("payments disabled");
      await refundRazorpayPayment(current.paymentId);
    } catch (err) {
      console.error("Refund failed:", err);
      return NextResponse.json(
        { code: "REFUND_FAILED", message: "Could not refund the payment. Please contact support." },
        { status: 502 }
      );
    }
    if (order) {
      order.status = "refunded";
      await order.save();
    }
  }

  const hold = await Hold.findOneAndUpdate(
    { _id: params.id, userId: session.userId, status: "active" },
    { status: "cancelled" },
    { new: true }
  ).catch(() => null);

  if (!hold) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Active hold not found." },
      { status: 404 }
    );
  }

  for (const item of hold.items) {
    await Product.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } });
  }

  return NextResponse.json({ hold });
}
