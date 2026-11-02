import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { connectDB } from "@/lib/db";
import SupportTicket from "@/models/SupportTicket";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await isAdmin(req))) return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  await connectDB();
  const tickets = await SupportTicket.find({}).sort({ createdAt: -1 }).limit(1000).lean();
  return NextResponse.json({
    tickets: tickets.map((t) => ({ ...t, id: String(t._id), _id: undefined, userId: undefined })),
  });
}
