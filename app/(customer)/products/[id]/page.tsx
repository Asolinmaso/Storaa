"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { StoreProductCard } from "@/components/customer/ProductCard";
import HoldModal from "@/components/customer/HoldModal";
import { SAMPLE_REVIEWS } from "@/lib/reviews";
import type { ProductDTO, StoreDTO } from "@/lib/types";

export default function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [store, setStore] = useState<StoreDTO | null>(null);
  const [moreProducts, setMoreProducts] = useState<ProductDTO[]>([]);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"info" | "reviews">("reviews");
  const [holding, setHolding] = useState(false);
  const [holdMore, setHoldMore] = useState<ProductDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/products/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.product) {
          setProduct(data.product);
          setStore(data.store ?? null);
          setMoreProducts(data.moreProducts ?? []);
        } else {
          setError(data.message ?? "Product not found.");
        }
      })
      .catch(() => setError("Failed to load product. Please refresh."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="muted">Loading product…</p>;
  if (error || !product || !store)
    return <div className="form-banner form-banner-error">{error}</div>;

  return (
    <div className="page-stack">
      <p className="breadcrumbs">
        <Link href="/stores">Stores</Link> &gt;{" "}
        <Link href={`/stores/${store._id}`}>{store.name}</Link> &gt;{" "}
        {product.name}
      </p>
      <Link href={`/stores/${store._id}`} className="back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back To Stores
      </Link>

      <div className="store-detail-row">
        <div className="product-detail-card">
          <div className="product-detail-media">
            <div className="product-detail-img" aria-hidden="true">
              {product.emoji}
            </div>
            <div className="product-thumbs" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className="product-thumb">
                  {product.emoji}
                </span>
              ))}
            </div>
          </div>
          <div className="store-detail-info">
            <div className="store-detail-head">
              <h2 className="store-detail-name">{product.name}</h2>
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
            <p className="store-detail-cat">{store.name}</p>
            <p className="product-rating">
              <span className="rating-star">★</span> {product.rating.toFixed(1)}
            </p>
            <p className="product-addr">📍 {store.address}</p>
            <p className="product-price-lg">
              ₹{product.price} / {product.unit}
            </p>
            <div className="product-buy-row">
              <div className="qty-stepper">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  −
                </button>
                <span>{qty}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => setQty((q) => q + 1)}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-hold"
                onClick={() => setHolding(true)}
              >
                Hold Product
              </button>
            </div>
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

      <div className="pill-tabs">
        <button
          type="button"
          className={`pill-tab${tab === "info" ? " pill-tab-active" : ""}`}
          onClick={() => setTab("info")}
        >
          Product Information
        </button>
        <button
          type="button"
          className={`pill-tab${tab === "reviews" ? " pill-tab-active" : ""}`}
          onClick={() => setTab("reviews")}
        >
          Reviews (03)
        </button>
      </div>

      {tab === "info" ? (
        <p className="muted">
          {product.name} from {store.name} — ₹{product.price} per {product.unit}.
          Category: {product.category}. Rated {product.rating.toFixed(1)} by{" "}
          {product.reviewCount} customers.
        </p>
      ) : (
        <>
          <p className="review-summary">
            <span className="review-stars">★★★★★</span>{" "}
            <strong>{product.rating.toFixed(1)}</strong>{" "}
            <span className="muted">({product.reviewCount} Reviews)</span>
          </p>
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
            <div className="review-more">
              <button type="button" className="btn btn-primary btn-sm">
                Load More Reviews
              </button>
            </div>
          </div>
        </>
      )}

      {moreProducts.length > 0 && (
        <section>
          <div className="section-head">
            <h2 className="section-title">More Products From {store.name}</h2>
            <Link href={`/stores/${store._id}`} className="view-all">
              View All
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </Link>
          </div>
          <div className="card-grid-5">
            {moreProducts.map((p) => (
              <StoreProductCard key={p._id} product={p} onHold={setHoldMore} />
            ))}
          </div>
        </section>
      )}

      {holding && (
        <HoldModal
          product={product}
          quantity={qty}
          onClose={() => setHolding(false)}
          onSuccess={() => {
            setHolding(false);
            router.push("/holds");
          }}
        />
      )}
      {holdMore && (
        <HoldModal
          product={holdMore}
          onClose={() => setHoldMore(null)}
          onSuccess={() => {
            setHoldMore(null);
            router.push("/holds");
          }}
        />
      )}
    </div>
  );
}
