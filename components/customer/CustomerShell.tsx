"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "../Logo";

const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/categories", label: "Categories", icon: CategoriesIcon },
  { href: "/stores", label: "Stores", icon: StoresIcon },
  { href: "/holds", label: "My Holds", icon: HoldsIcon },
  { href: "/profile", label: "My Profile", icon: ProfileIcon },
] as const;

function pageTitle(pathname: string): string {
  if (pathname.startsWith("/home")) return "Home";
  if (pathname.startsWith("/categories")) return "Categories";
  if (pathname.startsWith("/stores/")) return "Store Details";
  if (pathname.startsWith("/stores")) return "Stores";
  if (pathname.startsWith("/products")) return "Product Details";
  if (pathname.startsWith("/holds")) return "My Holds";
  if (pathname.startsWith("/profile")) return "My Profile";
  return "Storaa";
}

function HomeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M10 21v-6h4v6" /></svg>
  );
}
function CategoriesIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="4" y="4" width="6.5" height="6.5" rx="2" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="2" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="2" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2" /></svg>
  );
}
function StoresIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7l1-3h14l1 3" /><path d="M4 7a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" /><path d="M5 10v10h14V10" /><path d="M9 20v-5h6v5" /></svg>
  );
}
function HoldsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M9 11h6" /></svg>
  );
}
function ProfileIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.5 3.5-5.5 7-5.5s6.2 2 7 5.5" /></svg>
  );
}

export default function CustomerShell({
  location,
  children,
}: {
  location: string;
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
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              pathname.startsWith(href) ||
              (href === "/stores" && pathname.startsWith("/products"));
            return (
              <Link
                key={href}
                href={href}
                className={`cust-nav-item${active ? " cust-nav-active" : ""}`}
              >
                <Icon />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="cust-body">
        <header className="cust-topbar">
          <h1 className="cust-page-title">{pageTitle(pathname)}</h1>
          <div className="cust-topbar-right">
            <span className="cust-location">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
              {location}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
            </span>
            <button className="cust-icon-btn" aria-label="Notifications">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" /><path d="M10.3 20a2 2 0 0 0 3.4 0" /></svg>
            </button>
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
