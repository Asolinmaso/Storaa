"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SearchBar from "@/components/customer/SearchBar";
import StoreCard from "@/components/customer/StoreCard";
import { CATEGORIES, HOME_CATEGORY_COUNT } from "@/lib/catalog";
import type { StoreDTO } from "@/lib/types";

const BENEFITS = [
  {
    icon: "🗂️",
    title: "Wide Range Of Products",
    text: "Everything you need in one place",
  },
  {
    icon: "🏪",
    title: "Local Store Discovery",
    text: "Find products from nearby stores",
  },
  { icon: "🛡️", title: "Secure Payments", text: "100% safe & secure" },
  { icon: "🎧", title: "24X7 Support", text: "We are here to help you" },
];

export default function HomePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [stores, setStores] = useState<StoreDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stores?featured=true")
      .then((r) => r.json())
      .then((data) => setStores(data.stores ?? []))
      .catch(() => setError("Failed to load stores. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-stack">
      <div className="home-hero">
        <div className="home-map" aria-hidden="true">
          <div className="home-map-grid" />
          {["25%,30%", "55%,18%", "40%,60%", "70%,45%", "18%,72%", "82%,70%"].map(
            (pos) => {
              const [left, top] = pos.split(",");
              return (
                <span key={pos} className="map-pin" style={{ left, top }}>
                  🏪
                </span>
              );
            }
          )}
          <span className="home-map-label">Chennai · T. Nagar · Egmore · Marina Beach</span>
        </div>
        <div className="why-card">
          <h2 className="section-title">Why shop with Storaa?</h2>
          <ul className="why-list">
            {BENEFITS.map((b) => (
              <li key={b.title}>
                <span className="why-icon" aria-hidden="true">
                  {b.icon}
                </span>
                <div>
                  <p className="why-title">{b.title}</p>
                  <p className="why-text">{b.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <SearchBar value={search} onChange={setSearch} />

      <section>
        <div className="section-head">
          <h2 className="section-title">Shop By Category</h2>
          <Link href="/categories" className="view-all">
            View All
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
        </div>
        <div className="category-row">
          {CATEGORIES.slice(0, HOME_CATEGORY_COUNT).map((c) => (
            <Link
              key={c.name}
              href={`/categories?category=${encodeURIComponent(c.name)}`}
              className="category-tile"
            >
              <span className="category-img" aria-hidden="true">
                {c.emoji}
              </span>
              <span className="category-name">{c.name}</span>
            </Link>
          ))}
          <Link href="/categories" className="category-tile">
            <span className="category-img category-more" aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
            </span>
            <span className="category-name">More</span>
          </Link>
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2 className="section-title">Featured Stores</h2>
          <Link href="/stores" className="view-all">
            View All
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
        </div>
        {error && <div className="form-banner form-banner-error">{error}</div>}
        {loading ? (
          <p className="muted">Loading stores…</p>
        ) : (
          <div className="card-grid-5">
            {stores
              .filter((s) =>
                s.name.toLowerCase().includes(search.trim().toLowerCase())
              )
              .map((s) => (
                <StoreCard key={s._id} store={s} />
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
