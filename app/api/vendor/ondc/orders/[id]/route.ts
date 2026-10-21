import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { applySellerAction, type SellerAction } from "@/lib/ondc/handlers";
import OndcOrder from "@/models/OndcOrder";
import Store from "@/models/Store";

const ACTIONS: SellerAction[] = ["pack", "picked_up", "cancel"];

/** Moves an ONDC order along (pack -> picked_up) or cancels it, and notifies the buyer app. */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { action } = (await req.json().catch(() => ({}))) as { action?: SellerAction };
  if (!action || !ACTIONS.includes(action)) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: `action must be one of ${ACTIONS.join(", ")}.` },
      { status: 400 }
    );
  }
  if (!isValidObjectId(params.id)) {
    return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
  }

  await connectDB();
  const store = await Store.findOne({ ownerId: session.userId });
  const order = store && (await OndcOrder.findOne({ _id: params.id, storeId: store._id }));
  if (!order) return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });

  const updated = await applySellerAction(order, action);
  if (!updated) {
    return NextResponse.json(
      {
        code: "INVALID_STATE",
        message: `Order is ${order.state} / ${order.fulfillmentState}; "${action}" is not allowed now.`,
      },
      { status: 409 }
    );
  }
  return NextResponse.json({ order: updated });
}
