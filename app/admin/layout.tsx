import { redirect } from "next/navigation";
import { Metadata } from "next";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getSession } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin Dashboard - Storaa",
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  // Middleware checks the token's role; this re-checks the database so a
  // demoted or blocked admin loses access immediately.
  await connectDB();
  const user = await User.findById(session.userId).select("role isBlocked");
  if (!user || user.isBlocked) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  return <AdminShell>{children}</AdminShell>;
}
