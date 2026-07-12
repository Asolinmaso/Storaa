import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Hold from "@/models/Hold";
import { getSession } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { action } = await req.json();
  if (action !== "cancel") {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Unsupported action." },
      { status: 400 }
    );
  }

  await connectDB();
  const hold = await Hold.findOneAndUpdate(
    { _id: params.id, userId: session.userId, status: "active" },
    { status: "cancelled" },
    { new: true }
  ).catch(() => null);

  if (!hold) {
    return NextResponse.json(
      { code: "NOT_FOUND", message: "Active hold not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ hold });
}
