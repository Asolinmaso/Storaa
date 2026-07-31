"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import SearchBar from "@/components/customer/SearchBar";
import { StoreProductCard } from "@/components/customer/ProductCard";
import HoldModal from "@/components/customer/HoldModal";
import type { ProductDTO, StoreDTO } from "@/lib/types";

interface ReviewItem {
  _id: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} stars`} className="review-stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} style={{ color: i <= Math.round(rating) ? "#f4b400" : "#ddd" }}>★</span>
      ))}
    </span>
  );
}

function fmt(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function StoreDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [store, setStore] = useState<StoreDTO | null>(null);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
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
          setReviews(data.reviews ?? []);
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
            style={
              store.storePhotoUrl
                ? { backgroundImage: `url(${store.storePhotoUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                : { background: store.color }
            }
            aria-hidden="true"
          >
            {!store.storePhotoUrl && store.emoji}
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
              {store.owner && <li>👤 {store.owner}</li>}
              {store.hoursLabel && <li>🕒 {store.hoursLabel}</li>}
              {store.address && <li>📍 {store.address}</li>}
              {store.phone && <li>📞 {store.phone}</li>}
              {store.email && <li>✉️ {store.email}</li>}
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
          <p className="location-addr">{store.shortAddress || store.address}</p>
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
            Reviews ({store.reviewCount || reviews.length})
          </button>
        </div>
        <div className="tabs-search">
          <SearchBar placeholder="Search products..." value={search} onChange={setSearch} />
        </div>
      </div>

      {tab === "products" ? (
        visible.length === 0 ? (
          <p className="muted">
            {search.trim()
              ? `No products match "${search}".`
              : "No products available in this store yet."}
          </p>
        ) : (
          <div className="card-grid-5">
            {visible.map((p) => (
              <StoreProductCard key={p._id} product={p} onHold={setHoldProduct} />
            ))}
          </div>
        )
      ) : (
        <div className="review-list">
          {reviews.length === 0 ? (
            <p className="muted">No reviews yet for this store.</p>
          ) : (
            reviews.map((r) => (
              <div key={r._id} className="review-row">
                <span className="review-avatar">
                  {r.userName.slice(0, 2).toUpperCase()}
                </span>
                <span className="review-name">{r.userName}</span>
                <StarDisplay rating={r.rating} />
                <p className="review-text">{r.comment}</p>
                {r.createdAt && (
                  <span style={{ fontSize: "0.78rem", color: "#999" }}>{fmt(r.createdAt)}</span>
                )}
              </div>
            ))
          )}
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
