import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getSession } from "@/lib/auth";
import { validateEmail } from "@/lib/validation";

const PROFILE_FIELDS = "email role name phone location addresses prefs createdAt";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(session.userId).select(PROFILE_FIELDS);
  if (!user) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }
  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json();
    const update: Record<string, unknown> = {};

    if (typeof body.name === "string") update.name = body.name.trim();
    if (typeof body.phone === "string") update.phone = body.phone.trim();
    if (typeof body.location === "string") update.location = body.location.trim();
    if (typeof body.email === "string" && body.email.trim()) {
      const emailError = validateEmail(body.email);
      if (emailError) {
        return NextResponse.json(
          { code: "VALIDATION_ERROR", message: emailError },
          { status: 400 }
        );
      }
      update.email = body.email.trim().toLowerCase();
    }
    if (body.prefs && typeof body.prefs === "object") {
      for (const key of ["holdUpdates", "offers", "newStores"]) {
        if (typeof body.prefs[key] === "boolean") {
          update[`prefs.${key}`] = body.prefs[key];
        }
      }
    }

    await connectDB();
    const user = await User.findByIdAndUpdate(session.userId, update, {
      new: true,
    }).select(PROFILE_FIELDS);
    if (!user) {
      return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
    }
    return NextResponse.json({ user });
  } catch (err) {
    if ((err as { code?: number })?.code === 11000) {
      return NextResponse.json(
        { code: "ACCOUNT_EXISTS", message: "That email is already in use." },
        { status: 409 }
      );
    }
    console.error("Profile update error:", err);
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
