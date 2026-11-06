"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "../Logo";
import { Icon } from "./icons";

type NavItem = {
  href: string;
  label: string;
  icon: (p: { size?: number }) => JSX.Element;
  alwaysEnabled?: boolean;
  ondc?: boolean;
  badge?: "ondc" | "holds";
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Overview", items: [{ href: "/vendor/dashboard", label: "Dashboard", icon: Icon.Dashboard }] },
  {
    label: "Catalog",
    items: [
      { href: "/vendor/products", label: "Products", icon: Icon.Box },
      { href: "/vendor/pos", label: "POS & Sync", icon: Icon.Pos },
    ],
  },
  {
    label: "Orders",
    items: [
      { href: "/vendor/holds", label: "Holds", icon: Icon.Clock, badge: "holds" },
      { href: "/vendor/ondc-orders", label: "ONDC Orders", icon: Icon.Bag, ondc: true, badge: "ondc" },
    ],
  },
  { label: "Channels", items: [{ href: "/vendor/ondc", label: "ONDC Network", icon: Icon.Network, ondc: true }] },
  {
    label: "Store",
    items: [
      { href: "/vendor/store-details", label: "Store Details", icon: Icon.Store },
      { href: "/vendor/store-status", label: "Store Status", icon: Icon.Shield, alwaysEnabled: true },
    ],
  },
];

const TITLES: [string, string][] = [
  ["/vendor/dashboard", "Dashboard"],
  ["/vendor/store-status", "Store Status"],
  ["/vendor/store-details", "Store Details"],
  ["/vendor/products", "Products"],
  ["/vendor/pos", "POS & Sync"],
  ["/vendor/holds", "Holds"],
  ["/vendor/ondc-orders", "ONDC Orders"],
  ["/vendor/ondc", "ONDC Network"],
];

function pageTitle(pathname: string): string {
  return TITLES.find(([href]) => pathname === href || pathname.startsWith(href + "/"))?.[1] ?? "Storaa";
}

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

export default function VendorShell({
  location,
  storeStatus,
  ondcAvailable = false,
  counts = {},
  children,
}: {
  location: string;
  storeStatus?: string;
  ondcAvailable?: boolean;
  counts?: { ondc?: number; holds?: number };
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
        <nav className="cust-nav" aria-label="Vendor">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((n) => ondcAvailable || !n.ondc);
            if (items.length === 0) return null;
            return (
              <div key={group.label} style={{ display: "contents" }}>
                <span className="vd-nav-label">{group.label}</span>
                {items.map(({ href, label, icon: NavIcon, alwaysEnabled, badge }) => {
                  const disabled = !alwaysEnabled && storeStatus !== "approved";
                  const count = badge ? counts[badge] ?? 0 : 0;
                  const active = isActive(pathname, href);
                  return disabled ? (
                    <span
                      key={href}
                      className="cust-nav-item"
                      style={{ opacity: 0.45, cursor: "not-allowed" }}
                      title="Available after store approval"
                    >
                      <NavIcon size={22} />
                      <span>{label}</span>
                    </span>
                  ) : (
                    <Link
                      key={href}
                      href={href}
                      className={`cust-nav-item${active ? " cust-nav-active" : ""}`}
                      aria-current={active ? "page" : undefined}
                    >
                      <NavIcon size={22} />
                      <span>{label}</span>
                      {count > 0 && <em className="vd-nav-pill">{count > 99 ? "99+" : count}</em>}
                    </Link>
                  );
                })}
              </div>
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
