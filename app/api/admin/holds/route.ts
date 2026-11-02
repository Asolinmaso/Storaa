import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { connectDB } from "@/lib/db";
import Hold from "@/models/Hold";
import Store from "@/models/Store";
import User from "@/models/User";

export const dynamic = "force-dynamic";

const LABEL = { active: "Active", past: "Completed", cancelled: "Cancelled" } as const;

export async function GET(req: Request) {
  if (!(await isAdmin(req))) return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  await connectDB();
  const holds = await Hold.find({}).sort({ createdAt: -1 }).limit(1000).lean();
  const [users, stores] = await Promise.all([
    User.find({ _id: { $in: holds.map((h) => h.userId) } }).select("name email phone").lean(),
    Store.find({ _id: { $in: holds.map((h) => h.storeId) } }).select("name phone email").lean(),
  ]);
  const uById = new Map(users.map((u) => [String(u._id), u]));
  const sById = new Map(stores.map((s) => [String(s._id), s]));

  const rows = holds.map((h) => {
    const u = uById.get(String(h.userId));
    const s = sById.get(String(h.storeId));
    return {
      id: String(h._id),
      customer: { name: u?.name || u?.email || "—", contact: u?.phone || "—", email: u?.email || "—" },
      store: { name: h.storeName, contact: s?.phone || "—", email: s?.email || "—" },
      items: h.items.map((i) => ({ name: i.name, quantity: i.quantity, amount: i.price * i.quantity })),
      total: h.total,
      visitDate: h.visitDate,
      visitTime: h.visitTime,
      status: LABEL[h.status] ?? h.status,
      createdAt: h.createdAt,
    };
  });
  const count = (l: string) => rows.filter((r) => r.status === l).length;
  return NextResponse.json({
    holds: rows,
    counts: { total: rows.length, active: count("Active"), completed: count("Completed"), cancelled: count("Cancelled") },
  });
}
