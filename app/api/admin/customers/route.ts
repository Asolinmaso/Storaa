import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAdmin(req))) return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  await connectDB();
  const users = await User.find({ role: "customer" })
    .select("name email phone isBlocked createdAt")
    .sort({ createdAt: -1 })
    .lean();
  const monthAgo = Date.now() - 30 * 24 * 3600 * 1000;
  const customers = users.map((u) => ({
    id: String(u._id),
    name: u.name || "—",
    email: u.email,
    contact: u.phone || "—",
    status: u.isBlocked ? "Blocked" : "Active",
    joinedAt: u.createdAt,
  }));
  return NextResponse.json({
    customers,
    counts: {
      total: customers.length,
      newLast30Days: users.filter((u) => new Date(u.createdAt).getTime() >= monthAgo).length,
      blocked: customers.filter((c) => c.status === "Blocked").length,
    },
  });
}
