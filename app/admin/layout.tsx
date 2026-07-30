import AdminShell from "@/components/admin/AdminShell";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard - Storaa",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
