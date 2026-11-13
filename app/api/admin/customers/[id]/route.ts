import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { isAdmin } from "@/lib/adminAuth";
import { connectDB } from "@/lib/db";
import Hold from "@/models/Hold";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin(req))) return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  if (!isValidObjectId(params.id)) return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
  await connectDB();
  const user = await User.findById(params.id).select("name email phone location isBlocked createdAt role").lean();
  if (!user || user.role !== "customer") return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
  const holds = await Hold.find({ userId: user._id }).sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({
    customer: {
      id: String(user._id),
      name: user.name || "—",
      email: user.email,
      contact: user.phone || "—",
      location: user.location || "—",
      status: user.isBlocked ? "Blocked" : "Active",
      joinedAt: user.createdAt,
    },
    holds: holds.map((h) => ({
      id: String(h._id),
      storeName: h.storeName,
      items: h.items.map((i) => `${i.name} × ${i.quantity}`).join(", "),
      total: h.total,
      status: h.status,
      createdAt: h.createdAt,
    })),
  });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin(req))) return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  if (!isValidObjectId(params.id)) return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  if (action !== "block" && action !== "unblock") {
    return NextResponse.json({ code: "VALIDATION_ERROR", message: "action must be block or unblock." }, { status: 400 });
  }
  await connectDB();
  const user = await User.findOneAndUpdate(
    { _id: params.id, role: "customer" },
    { isBlocked: action === "block" },
    { returnDocument: "after" }
  );
  if (!user) return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ status: user.isBlocked ? "Blocked" : "Active" });
}
