import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { connectDB } from "@/lib/db";
import { expireStaleOrders } from "@/lib/ondc/handlers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${secret}`);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

/**
 * Cancels ONDC orders nobody collected and returns their stock. Vercel Cron calls this daily
 * (vercel.json) and sends `Authorization: Bearer $CRON_SECRET`; vendors' order lists also sweep
 * their own store, so expiry still happens promptly between runs.
 */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ code: "NOT_CONFIGURED", message: "Set CRON_SECRET to enable this job." }, { status: 503 });
  }
  if (!authorised(req)) return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  await connectDB();
  const expired = await expireStaleOrders({ limit: 500 });
  return NextResponse.json({ ok: true, expired });
}
