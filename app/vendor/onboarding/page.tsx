import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Store from "@/models/Store";
import { getSession } from "@/lib/auth";
import OnboardingWizard from "@/components/vendor/onboarding/OnboardingWizard";

export const dynamic = "force-dynamic";

export default async function VendorOnboardingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();
  const user = await User.findById(session.userId).select("role isBlocked");
  if (!user || user.isBlocked) redirect("/login");
  if (!user.role) redirect("/select-role");
  if (user.role !== "vendor") redirect("/home");

  const store = await Store.findOne({ ownerId: session.userId });
  if (store && store.status !== "rejected") redirect("/vendor/store-status");

  return <OnboardingWizard />;
}
