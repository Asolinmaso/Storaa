import type { Types } from "mongoose";
import Product from "@/models/Product";

/**
 * True if another product in the store already uses `sku`. The unique index on
 * (storeId, sku) is the backstop; this check gives a clean error even when that
 * index hasn't been built (e.g. existing duplicate data).
 */
export async function skuTaken(storeId: Types.ObjectId, sku: string | undefined, excludeId?: Types.ObjectId) {
  if (!sku) return false;
  return !!(await Product.exists({ storeId, sku, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }));
}
