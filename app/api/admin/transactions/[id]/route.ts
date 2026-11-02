import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import "@/models/Store";

export const dynamic = "force-dynamic";


export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  await connectDB();

  const transaction = await Order.findById(params.id)
    .populate("storeId")
    .lean()
    .catch(() => null);

  if (!transaction) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Transaction not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ transaction });
}
