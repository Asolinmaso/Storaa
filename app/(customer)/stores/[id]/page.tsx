"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import SearchBar from "@/components/customer/SearchBar";
import { StoreProductCard } from "@/components/customer/ProductCard";
import HoldModal from "@/components/customer/HoldModal";
import { SAMPLE_REVIEWS } from "@/lib/reviews";
import type { ProductDTO, StoreDTO } from "@/lib/types";

export default function StoreDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [store, setStore] = useState<StoreDTO | null>(null);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [tab, setTab] = useState<"products" | "reviews">("products");
  const [search, setSearch] = useState("");
  const [holdProduct, setHoldProduct] = useState<ProductDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/stores/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.store) {
          setStore(data.store);
          setProducts(data.products ?? []);
        } else {
          setError(data.message ?? "Store not found.");
        }
      })
      .catch(() => setError("Failed to load store. Please refresh."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="muted">Loading store…</p>;
  if (error || !store)
    return <div className="form-banner form-banner-error">{error}</div>;

  const visible = products.filter((p) =>
    p.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="page-stack">
      <Link href="/stores" className="back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back To Stores
      </Link>

      <div className="store-detail-row">
        <div className="store-detail-card">
          <div
            className="store-detail-img"
            style={{ background: store.color }}
            aria-hidden="true"
          >
            {store.emoji}
          </div>
          <div className="store-detail-info">
            <div className="store-detail-head">
              <h2 className="store-detail-name">{store.name}</h2>
              {store.website && (
                <a
                  className="visit-website"
                  href={store.website}
                  target="_blank"
                  rel="noreferrer"
                >
                  Visit Website ↗
                </a>
              )}
            </div>
            <p className="store-detail-cat">{store.category}</p>
            <ul className="store-detail-list">
              <li>👤 {store.owner}</li>
              <li>🕒 {store.hoursLabel}</li>
              <li>📍 {store.address}</li>
              <li>📞 {store.phone}</li>
              <li>✉️ {store.email}</li>
            </ul>
          </div>
        </div>

        <div className="location-card">
          <h3 className="location-title">Store Location</h3>
          <div className="location-map" aria-hidden="true">
            <div className="home-map-grid" />
            <span className="map-pin" style={{ left: "45%", top: "40%" }}>
              📍
            </span>
          </div>
          <p className="location-addr">{store.shortAddress}</p>
          <button
            type="button"
            className="btn btn-primary btn-card"
            onClick={() => alert("Map view is coming soon.")}
          >
            View On Map
          </button>
        </div>
      </div>

      <hr className="divider" />

      <div className="tabs-row">
        <div className="pill-tabs">
          <button
            type="button"
            className={`pill-tab${tab === "products" ? " pill-tab-active" : ""}`}
            onClick={() => setTab("products")}
          >
            Products ({products.length})
          </button>
          <button
            type="button"
            className={`pill-tab${tab === "reviews" ? " pill-tab-active" : ""}`}
            onClick={() => setTab("reviews")}
          >
            Reviews ({store.reviewCount})
          </button>
        </div>
        <div className="tabs-search">
          <SearchBar placeholder="Search products..." value={search} onChange={setSearch} />
        </div>
      </div>

      {tab === "products" ? (
        visible.length === 0 ? (
          <p className="muted">No products match your search.</p>
        ) : (
          <div className="card-grid-5">
            {visible.map((p) => (
              <StoreProductCard key={p._id} product={p} onHold={setHoldProduct} />
            ))}
          </div>
        )
      ) : (
        <div className="review-list">
          {SAMPLE_REVIEWS.map((r, i) => (
            <div key={i} className="review-row">
              <span className="review-avatar">{r.initials}</span>
              <span className="review-name">{r.name}</span>
              <span className="review-stars" aria-label={`${r.stars} stars`}>
                {"★".repeat(r.stars)}
              </span>
              <p className="review-text">{r.text}</p>
            </div>
          ))}
        </div>
      )}

      {holdProduct && (
        <HoldModal
          product={holdProduct}
          onClose={() => setHoldProduct(null)}
          onSuccess={() => {
            setHoldProduct(null);
            router.push("/holds");
          }}
        />
      )}
    </div>
  );
}
