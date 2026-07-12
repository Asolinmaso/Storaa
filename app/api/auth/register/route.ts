import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
} from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const { email, password, confirmPassword } = await req.json();

    const error =
      validateEmail(email ?? "") ||
      validatePassword(password ?? "") ||
      validateConfirmPassword(password ?? "", confirmPassword ?? "");
    if (error) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: error },
        { status: 400 }
      );
    }

    await connectDB();

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json(
        {
          code: "ACCOUNT_EXISTS",
          message:
            "An account with this email address already exists. Please log in to continue.",
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email: normalizedEmail, passwordHash });

    const token = await createSessionToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });
    setSessionCookie(token);

    return NextResponse.json(
      { user: { id: user._id.toString(), email: user.email, role: user.role } },
      { status: 201 }
    );
  } catch (err) {
    // Handle race on the unique email index
    if ((err as { code?: number })?.code === 11000) {
      return NextResponse.json(
        {
          code: "ACCOUNT_EXISTS",
          message:
            "An account with this email address already exists. Please log in to continue.",
        },
        { status: 409 }
      );
    }
    console.error("Register error:", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
