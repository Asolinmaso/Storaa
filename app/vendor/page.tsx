import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Store from "@/models/Store";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function VendorEntryPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();
  const user = await User.findById(session.userId).select("role isBlocked");
  if (!user || user.isBlocked) redirect("/login");
  if (!user.role) redirect("/select-role");
  if (user.role !== "vendor") redirect("/home");

  const store = await Store.findOne({ ownerId: session.userId });
  redirect(store ? "/vendor/store-status" : "/vendor/onboarding");
}
