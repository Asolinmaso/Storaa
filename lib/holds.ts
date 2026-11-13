import type { Types } from "mongoose";
import Hold, { type IHold } from "@/models/Hold";
import Order from "@/models/Order";
import Product from "@/models/Product";
import { paymentsEnabled, refundRazorpayPayment } from "@/lib/razorpay";

/**
 * Days after the visit date before an unpaid hold nobody collected is released. Until a hold is
 * closed its units are "reserved": they are off `stock` and are also subtracted from every POS
 * shelf count, so a hold left open forever would make that stock unsellable.
 */
export const HOLD_GRACE_DAYS = 1;

export type HoldCloseError = { code: "NOT_ACTIVE" | "SETTLED" | "REFUND_FAILED"; message: string; status: number };

const releaseStock = (hold: IHold) =>
  Promise.all(hold.items.map((i) => Product.updateOne({ _id: i.productId }, { $inc: { stock: i.quantity } })));

/** Hold was collected at the store: close it. Stock is not returned (the customer took it). */
export async function markHoldCollected(filter: Record<string, unknown>): Promise<IHold | HoldCloseError> {
  const hold: IHold | null = await Hold.findOneAndUpdate(
    { ...filter, status: "active" },
    { status: "past" },
    { returnDocument: "after" }
  ).catch(() => null);
  return hold ?? { code: "NOT_ACTIVE", message: "This hold is already closed.", status: 409 };
}

/**
 * Cancels an active hold and puts its units back on sale. A paid hold is refunded first; if it
 * has already been paid out to the vendor it can't be cancelled here.
 */
export async function cancelHold(filter: Record<string, unknown>): Promise<IHold | HoldCloseError> {
  const current = await Hold.findOne({ ...filter, status: "active" }).catch(() => null);
  if (!current) return { code: "NOT_ACTIVE", message: "This hold is already closed.", status: 409 };

  if (current.paymentStatus === "paid") {
    const order = await Order.findOne({ paymentId: current.paymentId });
    if (order?.payoutId) {
      return { code: "SETTLED", message: "This payment has already been settled. Please contact support for a refund.", status: 409 };
    }
    try {
      if (!paymentsEnabled()) throw new Error("payments disabled");
      await refundRazorpayPayment(current.paymentId);
    } catch (err) {
      console.error("Refund failed:", err);
      return { code: "REFUND_FAILED", message: "Could not refund the payment. Please contact support.", status: 502 };
    }
    if (order) {
      order.status = "refunded";
      await order.save();
    }
  }

  // Only the request that actually flips the status returns stock, so a double-click can't add it twice.
  const hold = await Hold.findOneAndUpdate(
    { _id: current._id, status: "active" },
    { status: "cancelled" },
    { returnDocument: "after" }
  );
  if (!hold) return { code: "NOT_ACTIVE", message: "This hold is already closed.", status: 409 };
  await releaseStock(hold);
  return hold;
}

/**
 * Calendar date in India (YYYY-MM-DD, the format visit dates are stored in), `daysAgo` days back.
 * Servers run in UTC, which is still "yesterday" in India until 05:30 IST.
 */
export function indiaDate(daysAgo = 0, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(now.getTime() - daysAgo * 86400_000));
}

/**
 * Releases unpaid holds whose visit date is more than HOLD_GRACE_DAYS in the past. Paid holds are
 * left for the vendor (money is involved). Returns how many were released.
 */
export async function expireStaleHolds(opts: { storeId?: Types.ObjectId; limit?: number } = {}): Promise<number> {
  const cutoff = indiaDate(HOLD_GRACE_DAYS);
  const stale = await Hold.find({
    status: "active",
    paymentStatus: { $ne: "paid" },
    visitDate: { $lt: cutoff },
    ...(opts.storeId ? { storeId: opts.storeId } : {}),
  })
    .select("_id")
    .limit(opts.limit ?? 200);
  let released = 0;
  for (const h of stale) {
    const r = await cancelHold({ _id: h._id });
    if (!("code" in r)) released++;
  }
  return released;
}

export const isHoldError = (r: IHold | HoldCloseError): r is HoldCloseError => "code" in r && typeof (r as HoldCloseError).status === "number";
