import { NextResponse } from "next/server";
import { paymentsEnabled } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ enabled: paymentsEnabled() });
}
