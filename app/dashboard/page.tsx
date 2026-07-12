import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();
  const user = await User.findById(session.userId).select("role isBlocked");
  if (!user || user.isBlocked) redirect("/login");
  if (!user.role) redirect("/select-role");
  redirect(user.role === "customer" ? "/home" : "/vendor");
}
