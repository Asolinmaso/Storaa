import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Order from "@/models/Order";
import "@/models/Store";

export const dynamic = "force-dynamic";

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";

function isAdmin(req: Request): boolean {
  if (!ADMIN_SECRET) return true;
  return req.headers.get("x-admin-secret") === ADMIN_SECRET;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  if (!isAdmin(req)) {
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
