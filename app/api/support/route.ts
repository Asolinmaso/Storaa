import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import SupportTicket from "@/models/SupportTicket";
import User from "@/models/User";

const CATEGORIES = ["Payment", "Account", "Product", "Store", "Other"];

/** Customer or vendor reports an issue. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const subject = String(body.subject ?? "").trim();
  const message = String(body.message ?? "").trim();
  const category = CATEGORIES.includes(String(body.category)) ? String(body.category) : "Other";
  if (!subject || !message) {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Subject and message are required." },
      { status: 400 }
    );
  }
  if (subject.length > 150 || message.length > 3000) {
    return NextResponse.json({ code: "VALIDATION_ERROR", message: "Text is too long." }, { status: 400 });
  }

  await connectDB();
  const user = await User.findById(session.userId).select("name email phone role");
  if (!user) return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });

  const ticket = await SupportTicket.create({
    userId: user._id,
    raisedBy: user.name || user.email,
    type: user.role === "vendor" ? "Store" : "Customer",
    subject,
    category,
    message,
    contact: user.phone,
    email: user.email,
  });
  return NextResponse.json({ ticket: { id: String(ticket._id) } }, { status: 201 });
}
