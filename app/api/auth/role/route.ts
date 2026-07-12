import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { createSessionToken, getSession, setSessionCookie } from "@/lib/auth";

const VALID_ROLES = ["customer", "vendor"] as const;

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated." },
        { status: 401 }
      );
    }

    const { role } = await req.json();
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Please select a valid role." },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findByIdAndUpdate(
      session.userId,
      { role },
      { new: true }
    );
    if (!user) {
      return NextResponse.json(
        { code: "UNAUTHORIZED", message: "Not authenticated." },
        { status: 401 }
      );
    }

    // Refresh the session so the token carries the new role
    const token = await createSessionToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });
    setSessionCookie(token);

    return NextResponse.json({
      user: { id: user._id.toString(), email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Role error:", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
