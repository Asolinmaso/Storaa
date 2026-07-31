import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Store from "@/models/Store";
import { getSession } from "@/lib/auth";
import VendorShell from "@/components/vendor/VendorShell";

export const dynamic = "force-dynamic";

export default async function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();
  const user = await User.findById(session.userId).select("role isBlocked location");
  if (!user || user.isBlocked) redirect("/login");
  if (!user.role) redirect("/select-role");
  if (user.role !== "vendor") redirect("/home");

  const store = await Store.findOne({ ownerId: session.userId }).select("_id status");
  if (!store) redirect("/vendor/onboarding");

  return (
    <VendorShell
      location={user.location || "Chennai, Tamilnadu"}
      storeStatus={store.status}
    >
      {children}
    </VendorShell>
  );
}

