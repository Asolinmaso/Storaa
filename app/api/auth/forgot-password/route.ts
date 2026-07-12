import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { validateEmail } from "@/lib/validation";

const RESET_CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    const emailError = validateEmail(email ?? "");
    if (emailError) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: emailError },
        { status: 400 }
      );
    }

    await connectDB();

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (user && !user.isBlocked) {
      const code = crypto.randomInt(100000, 999999).toString();
      user.resetCodeHash = await bcrypt.hash(code, 10);
      user.resetCodeExpiry = new Date(Date.now() + RESET_CODE_TTL_MS);
      await user.save();

      // TODO: deliver via an email provider. Logged for development.
      console.log(`[Storaa] Password reset code for ${user.email}: ${code}`);
    }

    // Always respond success so account existence isn't leaked
    return NextResponse.json({
      message:
        "If an account exists for this email, a reset code has been sent.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
