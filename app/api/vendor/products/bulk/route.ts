import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import Product from "@/models/Product";
import { vendorStore } from "@/lib/vendor/session";

type BulkAction = "ondc_list" | "ondc_unlist" | "delete" | "set_stock" | "adjust_stock";

/** `{ ids: string[], action, value? }` applied to the vendor's own products only. */
export async function POST(req: Request) {
  const { store, res } = await vendorStore();
  if (res) return res;
  const body = (await req.json().catch(() => ({}))) as { ids?: unknown; action?: BulkAction; value?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === "string" && isValidObjectId(id)) : [];
  if (ids.length === 0 || ids.length > 500) {
    return NextResponse.json({ code: "VALIDATION_ERROR", message: "Select between 1 and 500 products." }, { status: 400 });
  }
  const filter = { _id: { $in: ids }, storeId: store._id };
  const value = Number(body.value);

  switch (body.action) {
    case "ondc_list":
    case "ondc_unlist": {
      const r = await Product.updateMany(filter, { "ondc.listed": body.action === "ondc_list" });
      return NextResponse.json({ updated: r.modifiedCount });
    }
    case "delete": {
      const r = await Product.deleteMany(filter);
      return NextResponse.json({ deleted: r.deletedCount });
    }
    case "set_stock": {
      if (!Number.isInteger(value) || value < 0) {
        return NextResponse.json({ code: "VALIDATION_ERROR", message: "Stock must be a whole number ≥ 0." }, { status: 400 });
      }
      const r = await Product.updateMany(filter, { stock: value });
      return NextResponse.json({ updated: r.modifiedCount });
    }
    case "adjust_stock": {
      if (!Number.isInteger(value) || value === 0) {
        return NextResponse.json({ code: "VALIDATION_ERROR", message: "Adjustment must be a non-zero whole number." }, { status: 400 });
      }
      const r = await Product.updateMany(filter, [
        { $set: { stock: { $max: [0, { $add: ["$stock", value] }] } } },
      ], { updatePipeline: true });
      return NextResponse.json({ updated: r.modifiedCount });
    }
    default:
      return NextResponse.json({ code: "VALIDATION_ERROR", message: "Unknown action." }, { status: 400 });
  }
}
