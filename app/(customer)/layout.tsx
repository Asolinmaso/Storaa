import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getSession } from "@/lib/auth";
import CustomerShell from "@/components/customer/CustomerShell";

export const dynamic = "force-dynamic";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();
  const user = await User.findById(session.userId).select(
    "role isBlocked location"
  );
  if (!user || user.isBlocked) redirect("/login");
  if (!user.role) redirect("/select-role");
  if (user.role !== "customer") redirect("/dashboard");

  return (
    <CustomerShell location={user.location || "Chennai, Tamilnadu"}>
      {children}
    </CustomerShell>
  );
}
