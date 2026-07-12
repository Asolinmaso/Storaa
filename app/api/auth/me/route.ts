import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Not authenticated." },
      { status: 401 }
    );
  }

  await connectDB();
  const user = await User.findById(session.userId).select("email role isBlocked");
  if (!user || user.isBlocked) {
    return NextResponse.json(
      { code: "UNAUTHORIZED", message: "Not authenticated." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    user: { id: user._id.toString(), email: user.email, role: user.role },
  });
}
