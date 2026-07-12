import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { validateEmail } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    const emailError = validateEmail(email ?? "");
    if (emailError || !password) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: emailError ?? "Password is required.",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json(
        {
          code: "ACCOUNT_NOT_FOUND",
          message:
            "No account is associated with this email address. Please sign up to create new account.",
        },
        { status: 404 }
      );
    }

    if (user.isBlocked) {
      return NextResponse.json(
        {
          code: "ACCOUNT_BLOCKED",
          message:
            "Your account has been restricted from accessing Storaa. Please contact support for assistance.",
        },
        { status: 403 }
      );
    }

    const passwordMatches = user.passwordHash
      ? await bcrypt.compare(password, user.passwordHash)
      : false;
    if (!passwordMatches) {
      return NextResponse.json(
        { code: "INVALID_CREDENTIALS", message: "Incorrect email or password." },
        { status: 401 }
      );
    }

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
    console.error("Login error:", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
