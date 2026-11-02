import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import User from "@/models/User";

export const dynamic = "force-dynamic";

/** Finishes Google sign-in: signs in the existing account with that verified email, or creates one. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const fail = () => NextResponse.redirect(new URL("/login", origin));

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = cookies().get("g_state")?.value;
  cookies().delete("g_state");
  if (!code || !state || !expected || state !== expected) return fail();

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail();

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return fail();
    const { access_token } = await tokenRes.json();
    const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!infoRes.ok) return fail();
    const info = (await infoRes.json()) as { email?: string; email_verified?: boolean; name?: string };
    if (!info.email || !info.email_verified) return fail();

    await connectDB();
    const email = info.email.trim().toLowerCase();
    let user = await User.findOne({ email });
    if (user?.isBlocked) return fail();
    if (!user) {
      user = await User.create({
        email,
        name: info.name ?? "",
        // Google accounts have no password; store an unguessable one so password login stays impossible.
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
        role: null,
      });
    }

    setSessionCookie(
      await createSessionToken({ userId: user._id.toString(), email: user.email, role: user.role })
    );
    return NextResponse.redirect(new URL("/dashboard", origin));
  } catch (err) {
    console.error("Google sign-in failed:", err);
    return fail();
  }
}
