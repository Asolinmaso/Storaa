import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Store from "@/models/Store";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  await connectDB();
  const { searchParams } = new URL(req.url);
  const featured = searchParams.get("featured");
  const q = searchParams.get("q");

  const filter: Record<string, unknown> = { status: "approved" };
  if (featured === "true") filter.featured = true;
  if (q) filter.name = { $regex: q, $options: "i" };

  const stores = await Store.find(filter).sort({ distanceKm: 1 });
  return NextResponse.json({ stores });
}
