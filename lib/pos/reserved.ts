import type { Types } from "mongoose";
import Hold from "@/models/Hold";
import OndcOrder from "@/models/OndcOrder";

/**
 * Units of each product currently promised to customers but not yet handed over: active customer
 * holds plus open ONDC orders. Storaa has already taken these off `stock`.
 */
export async function reservedByProduct(
  storeId: Types.ObjectId,
  productIds: Types.ObjectId[]
): Promise<Map<string, number>> {
  const reserved = new Map<string, number>();
  if (productIds.length === 0) return reserved;
  const pipeline = (match: Record<string, unknown>) => [
    { $match: { storeId, ...match } },
    { $unwind: "$items" },
    { $match: { "items.productId": { $in: productIds } } },
    { $group: { _id: "$items.productId", qty: { $sum: "$items.quantity" } } },
  ];
  const [holds, ondc] = await Promise.all([
    Hold.aggregate<{ _id: Types.ObjectId; qty: number }>(pipeline({ status: "active" })),
    OndcOrder.aggregate<{ _id: Types.ObjectId; qty: number }>(pipeline({ state: { $in: ["Accepted", "In-progress"] } })),
  ]);
  for (const row of [...holds, ...ondc]) {
    reserved.set(String(row._id), (reserved.get(String(row._id)) ?? 0) + (row.qty || 0));
  }
  return reserved;
}
