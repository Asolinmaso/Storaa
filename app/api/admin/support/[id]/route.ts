import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { isAdmin } from "@/lib/adminAuth";
import { connectDB } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import SupportTicket from "@/models/SupportTicket";

const STATUSES = ["Pending", "In progress", "Resolved"];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin(req))) return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  if (!isValidObjectId(params.id)) return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  await connectDB();
  const ticket = await SupportTicket.findById(params.id);
  if (!ticket) return NextResponse.json({ code: "NOT_FOUND" }, { status: 404 });

  if (typeof body.status === "string") {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ code: "VALIDATION_ERROR", message: "Invalid status." }, { status: 400 });
    }
    ticket.status = body.status as typeof ticket.status;
  }
  if (typeof body.adminNotes === "string") ticket.adminNotes = body.adminNotes.trim();
  const response = typeof body.response === "string" ? body.response.trim() : "";
  if (response) ticket.response = response;
  await ticket.save();

  if (response && ticket.email) {
    void sendEmail(ticket.email, `Re: ${ticket.subject}`, response).catch((e) =>
      console.error("Support reply email failed:", e)
    );
  }
  return NextResponse.json({ ok: true });
}
