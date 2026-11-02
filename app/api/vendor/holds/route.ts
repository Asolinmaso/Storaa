import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Hold from "@/models/Hold";
import Store from "@/models/Store";
import User from "@/models/User";

export const dynamic = "force-dynamic";

/** Customer holds placed against the signed-in vendor's store. */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }
  await connectDB();
  const store = await Store.findOne({ ownerId: session.userId }).select("_id");
  if (!store) return NextResponse.json({ holds: [] });

  const holds = await Hold.find({ storeId: store._id }).sort({ createdAt: -1 }).limit(200).lean();
  const users = await User.find({ _id: { $in: holds.map((h) => h.userId) } })
    .select("name email phone")
    .lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));

  return NextResponse.json({
    holds: holds.map((h) => {
      const u = byId.get(String(h.userId));
      return { ...h, customer: { name: u?.name || "", email: u?.email || "", phone: u?.phone || "" } };
    }),
  });
}
