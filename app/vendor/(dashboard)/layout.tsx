import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Store from "@/models/Store";
import { getSession } from "@/lib/auth";
import { ondcConfig } from "@/lib/ondc/config";
import VendorShell from "@/components/vendor/VendorShell";
import OndcOrder from "@/models/OndcOrder";
import Hold from "@/models/Hold";
import "@/app/vendor.css";

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

  const [ondcOpen, activeHolds] =
    store.status === "approved"
      ? await Promise.all([
          ondcConfig().enabled
            ? OndcOrder.countDocuments({ storeId: store._id, state: { $in: ["Accepted", "In-progress"] } })
            : 0,
          Hold.countDocuments({ storeId: store._id, status: "active" }),
        ])
      : [0, 0];

  return (
    <VendorShell
      location={user.location || "Chennai, Tamilnadu"}
      storeStatus={store.status}
      ondcAvailable={ondcConfig().enabled}
      counts={{ ondc: ondcOpen, holds: activeHolds }}
    >
      {children}
    </VendorShell>
  );
}

