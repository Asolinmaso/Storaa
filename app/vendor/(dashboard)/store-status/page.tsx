import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import Store from "@/models/Store";
import { getSession } from "@/lib/auth";
import StoreStatusClient from "@/components/vendor/StoreStatusClient";

export const dynamic = "force-dynamic";

export default async function VendorStoreStatusPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();
  const store = await Store.findOne({ ownerId: session.userId }).select(
    "_id name status rejectionReason"
  );

  if (!store) redirect("/vendor/onboarding");

  const initialStore = {
    _id: store._id.toString(),
    name: store.name,
    status: store.status as "under_review" | "approved" | "rejected",
    rejectionReason: store.rejectionReason || "",
  };

  return <StoreStatusClient initialStore={initialStore} />;
}
