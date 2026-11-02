import { Types } from "mongoose";
import Hold from "@/models/Hold";
import Order from "@/models/Order";
import User from "@/models/User";

/** Records a successful payment for a hold. Idempotent per Razorpay payment id. */
export async function recordPaidHold(holdId: string | Types.ObjectId, razorpayOrderId: string, paymentId: string) {
  const existing = await Order.findOne({ paymentId });
  if (existing) return existing;

  const hold = await Hold.findById(holdId);
  if (!hold) return null;
  const user = await User.findById(hold.userId).select("name email phone");

  const order = await Order.create({
    orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
    storeId: hold.storeId,
    customerName: user?.name || user?.email || "Customer",
    customerContact: user?.phone ?? "",
    customerEmail: user?.email ?? "",
    itemCount: hold.items.reduce((n, i) => n + i.quantity, 0),
    amount: hold.total,
    orderDate: new Date(),
    status: "success",
    holdId: hold._id,
    razorpayOrderId,
    paymentId,
  });
  hold.paymentStatus = "paid";
  hold.paymentId = paymentId;
  await hold.save();
  return order;
}
