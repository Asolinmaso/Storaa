import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Store, { type IStore } from "@/models/Store";

/** The signed-in vendor's store, or the error response to return. */
export async function vendorStore(
  opts: { approved?: boolean } = {}
): Promise<{ store: IStore; res?: undefined } | { store?: undefined; res: NextResponse }> {
  const session = await getSession();
  if (!session) return { res: NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 }) };
  await connectDB();
  const store = await Store.findOne({ ownerId: session.userId });
  if (!store) {
    return { res: NextResponse.json({ code: "NO_STORE", message: "Complete your store setup first." }, { status: 400 }) };
  }
  if (opts.approved && store.status !== "approved") {
    return { res: NextResponse.json({ code: "NOT_APPROVED", message: "Your store must be approved first." }, { status: 403 }) };
  }
  return { store };
}
