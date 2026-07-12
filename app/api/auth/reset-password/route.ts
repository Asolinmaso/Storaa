import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { validateEmail, validatePassword } from "@/lib/validation";

export async function POST(req: Request) {
  try {
    const { email, code, newPassword } = await req.json();

    const error =
      validateEmail(email ?? "") || validatePassword(newPassword ?? "");
    if (error || !code) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: error ?? "Reset code is required." },
        { status: 400 }
      );
    }

    await connectDB();

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    const isValid =
      user &&
      user.resetCodeHash &&
      user.resetCodeExpiry &&
      user.resetCodeExpiry > new Date() &&
      (await bcrypt.compare(String(code), user.resetCodeHash));

    if (!isValid || !user) {
      return NextResponse.json(
        {
          code: "INVALID_CODE",
          message: "The reset code is invalid or has expired.",
        },
        { status: 400 }
      );
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.resetCodeHash = null;
    user.resetCodeExpiry = null;
    await user.save();

    return NextResponse.json({
      message: "Your password has been reset. Please log in.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
