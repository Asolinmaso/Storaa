"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "../Logo";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: DashboardIcon },
  { href: "/admin/customers", label: "Customers", icon: CustomersIcon },
  { href: "/admin/stores", label: "Stores & Vendors", icon: StoresIcon },
  { href: "/admin/products", label: "Products", icon: ProductsIcon },
  { href: "/admin/holds", label: "Product Holds", icon: HoldsIcon },
  { href: "/admin/transactions", label: "Transaction", icon: TransactionIcon },
  { href: "/admin/payouts", label: "Payouts", icon: PayoutsIcon },
  { href: "/admin/support", label: "Help & Support", icon: SupportIcon },
] as const;


function DashboardIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>
  );
}
function CustomersIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
  );
}
function StoresIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7l1-3h14l1 3" /><path d="M4 7a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" /><path d="M5 10v10h14V10" /><path d="M9 20v-5h6v5" /></svg>
  );
}
function ProductsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
  );
}
function HoldsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
  );
}
function TransactionIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
  );
}
function PayoutsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
  );
}
function SupportIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
  );
}

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/admin/customers")) return "Customers";
  if (pathname.startsWith("/admin/stores")) return "Stores & Vendors";
  if (pathname.startsWith("/admin/products")) return "Products";
  if (pathname.startsWith("/admin/holds")) return "Product Holds";
  if (pathname.startsWith("/admin/transactions")) return "Transaction";
  if (pathname.startsWith("/admin/payouts")) return "Payouts";
  if (pathname.startsWith("/admin/support")) return "Help & Support";
  return "Dashboard";
}

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="cust-shell">
      <aside className="cust-sidebar">
        <Logo variant="light" height={36} />
        <nav className="cust-nav">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`cust-nav-item${pathname.startsWith(href) ? " cust-nav-active" : ""}`}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="cust-body">
        <header className="cust-topbar">
          <h1 className="cust-page-title">{pageTitle(pathname)}</h1>
          <div className="cust-topbar-right">
            <button className="cust-icon-btn" aria-label="Notifications">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" /><path d="M10.3 20a2 2 0 0 0 3.4 0" /></svg>
            </button>
            <div className="cust-location" style={{gap: '8px'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              Admin
            </div>
            <button
              className="cust-icon-btn"
              aria-label="Log out"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v6" /><path d="M9.5 9.5 12 7l2.5 2.5" /></svg>
            </button>
          </div>
        </header>
        <main className="cust-main">{children}</main>
      </div>
    </div>
  );
}
