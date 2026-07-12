"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import SearchBar from "@/components/customer/SearchBar";
import { ProductListingCard } from "@/components/customer/ProductCard";
import { CATEGORIES } from "@/lib/catalog";
import type { ProductDTO } from "@/lib/types";

const FILTERS = ["Price", "Distance", "Availability", "Sort"];

function CategoriesContent() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("category") ?? "Groceries";
  const [selected, setSelected] = useState(initial);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/products?category=${encodeURIComponent(selected)}`)
      .then((r) => r.json())
      .then((data) => setProducts(data.products ?? []))
      .catch(() => setError("Failed to load products. Please refresh."))
      .finally(() => setLoading(false));
  }, [selected]);

  const visible = products.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="page-stack">
      <SearchBar value={search} onChange={setSearch} />

      <section>
        <h2 className="section-title">Shop By Category</h2>
        <div className="category-grid">
          {CATEGORIES.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setSelected(c.name)}
              className={`category-tile${selected === c.name ? " category-selected" : ""}`}
            >
              <span className="category-img" aria-hidden="true">
                {c.emoji}
              </span>
              <span className="category-name">{c.name}</span>
            </button>
          ))}
        </div>
      </section>

      <hr className="divider" />

      <section>
        <div className="section-head">
          <h2 className="section-title">
            {selected}{" "}
            <span className="muted-count">( {visible.length} Products )</span>
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
          <p className="muted">Loading products…</p>
        ) : visible.length === 0 ? (
          <p className="muted">No products found in {selected} yet.</p>
        ) : (
          <div className="card-grid-5">
            {visible.map((p) => (
              <ProductListingCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense>
      <CategoriesContent />
    </Suspense>
  );
}
