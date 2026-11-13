import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { vendorStore } from "@/lib/vendor/session";
import Hold from "@/models/Hold";
import { cancelHold, isHoldError, markHoldCollected } from "@/lib/holds";

export const dynamic = "force-dynamic";

/**
 * Vendor closes a customer hold: `{ action: "collected" }` when the customer picked it up, or
 * `{ action: "cancel" }` when they didn't come (units go back on sale; a paid hold is refunded).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { store, res } = await vendorStore();
  if (res) return res;
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  if (action !== "collected" && action !== "cancel") {
    return NextResponse.json({ code: "VALIDATION_ERROR", message: "action must be collected or cancel." }, { status: 400 });
  }
  if (!isValidObjectId(params.id)) return NextResponse.json({ code: "NOT_FOUND", message: "Hold not found." }, { status: 404 });

  const filter = { _id: params.id, storeId: store._id };
  if (!(await Hold.exists(filter))) return NextResponse.json({ code: "NOT_FOUND", message: "Hold not found." }, { status: 404 });

  const result = action === "collected" ? await markHoldCollected(filter) : await cancelHold(filter);
  if (isHoldError(result)) return NextResponse.json({ code: result.code, message: result.message }, { status: result.status });
  return NextResponse.json({ hold: result });
}
