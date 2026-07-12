"use client";

import { useEffect, useState } from "react";
import SearchBar from "@/components/customer/SearchBar";
import StoreCard from "@/components/customer/StoreCard";
import type { StoreDTO } from "@/lib/types";

const FILTERS = ["Categories", "Distance", "Availability", "Offers", "Ratings"];

export default function StoresPage() {
  const [search, setSearch] = useState("");
  const [stores, setStores] = useState<StoreDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((data) => setStores(data.stores ?? []))
      .catch(() => setError("Failed to load stores. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  const visible = stores.filter((s) =>
    s.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="page-stack">
      <SearchBar value={search} onChange={setSearch} />

      <section>
        <div className="section-head">
          <h2 className="section-title">
            Stores Near You{" "}
            <span className="muted-count">( {visible.length} Stores )</span>
          </h2>
          <div className="filter-row">
            {FILTERS.map((f) => (
              <button key={f} type="button" className="filter-chip">
                {f}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="form-banner form-banner-error">{error}</div>}
        {loading ? (
          <p className="muted">Loading stores…</p>
        ) : visible.length === 0 ? (
          <p className="muted">No stores match your search.</p>
        ) : (
          <div className="card-grid-5">
            {visible.map((s) => (
              <StoreCard key={s._id} store={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
