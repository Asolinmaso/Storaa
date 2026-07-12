"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StoreProductCard } from "@/components/customer/ProductCard";
import HoldModal from "@/components/customer/HoldModal";
import type { HoldDTO, ProductDTO } from "@/lib/types";

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return m ? `${hour}.${String(m).padStart(2, "0")} ${suffix}` : `${hour} ${suffix}`;
}

export default function HoldsPage() {
  const [holds, setHolds] = useState<HoldDTO[]>([]);
  const [suggested, setSuggested] = useState<ProductDTO[]>([]);
  const [tab, setTab] = useState<"active" | "past">("active");
  const [search, setSearch] = useState("");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [holdProduct, setHoldProduct] = useState<ProductDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadHolds() {
    return fetch("/api/holds")
      .then((r) => r.json())
      .then((data) => setHolds(data.holds ?? []));
  }

  useEffect(() => {
    Promise.all([
      loadHolds(),
      fetch("/api/products?category=Home%20Essentials")
        .then((r) => r.json())
        .then((data) => setSuggested((data.products ?? []).slice(0, 4))),
    ])
      .catch(() => setError("Failed to load holds. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  async function cancelHold(id: string) {
    setCancelling(id);
    try {
      const res = await fetch(`/api/holds/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (res.ok) await loadHolds();
    } finally {
      setCancelling(null);
    }
  }

  const active = holds.filter((h) => h.status === "active");
  const past = holds.filter((h) => h.status !== "active");
  const shown = (tab === "active" ? active : past).filter((h) =>
    `${h.storeName} ${h.items.map((i) => i.name).join(" ")}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  return (
    <div className="page-stack">
      <div className="holds-head">
        <div className="tab-links">
          <button
            type="button"
            className={`tab-link${tab === "active" ? " tab-link-active" : ""}`}
            onClick={() => setTab("active")}
          >
            Active Holds ({String(active.length).padStart(2, "0")})
          </button>
          <button
            type="button"
            className={`tab-link${tab === "past" ? " tab-link-active" : ""}`}
            onClick={() => setTab("past")}
          >
            Past Holds ({String(past.length).padStart(2, "0")})
          </button>
        </div>
        <div className="holds-search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            type="text"
            placeholder="Search product"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search holds"
          />
        </div>
      </div>

      {error && <div className="form-banner form-banner-error">{error}</div>}
      {loading ? (
        <p className="muted">Loading holds…</p>
      ) : shown.length === 0 ? (
        <p className="muted">
          {tab === "active"
            ? "No active holds yet. Hold a product from any store to see it here."
            : "No past holds yet."}
        </p>
      ) : (
        <div className="hold-list">
          {shown.map((h) => {
            const first = h.items[0];
            const extra = h.items.reduce((n, i) => n + i.quantity, 0) - 1;
            return (
              <div key={h._id} className="hold-card">
                <div
                  className="hold-store-img"
                  style={{ background: h.storeColor }}
                  aria-hidden="true"
                >
                  {h.storeEmoji}
                </div>
                <div className="hold-store">
                  <h3>{h.storeName}</h3>
                  <p className="hold-date">📅 {formatDate(h.visitDate)}</p>
                </div>
                <div className="hold-items">
                  <p className="hold-total">₹{h.total.toFixed(2)}</p>
                  <p className="hold-items-label">
                    {first?.name}
                    {extra > 0 ? ` + ${extra} items` : ""}
                  </p>
                  <div className="hold-thumbs" aria-hidden="true">
                    {h.items.slice(0, 3).map((i, idx) => (
                      <span key={idx} className="hold-thumb">
                        {i.emoji}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="hold-visit">
                  <h4>Visit Date &amp; Time</h4>
                  <p>📅 {formatDate(h.visitDate)}</p>
                  <p>🕕 {formatTime(h.visitTime)}</p>
                </div>
                <div className="hold-actions">
                  {h.status === "active" ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={cancelling === h._id}
                      onClick={() => cancelHold(h._id)}
                    >
                      {cancelling === h._id ? "Cancelling…" : "Cancel"}
                    </button>
                  ) : (
                    <span className="badge">{h.status}</span>
                  )}
                  <Link
                    href={`/stores/${h.storeId}`}
                    className="btn btn-outline-purple btn-sm"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {suggested.length > 0 && (
        <section>
          <h2 className="section-title">Suggested For You</h2>
          <div className="card-grid-5">
            {suggested.map((p) => {
              const store = typeof p.storeId === "object" ? p.storeId : null;
              return (
                <div key={p._id} className="product-card suggest-card">
                  <div className="product-card-img">
                    <span className="product-card-emoji" aria-hidden="true">
                      {p.emoji}
                    </span>
                  </div>
                  <div className="product-card-body">
                    <h3 className="product-card-name">{p.name}</h3>
                    {store && (
                      <>
                        <p className="suggest-meta">🏪 {store.name}</p>
                        <p className="suggest-meta">
                          📍 {store.distanceKm.toFixed(1)} km
                        </p>
                      </>
                    )}
                    <p className="suggest-meta">🛒 {p.unit}</p>
                    <Link
                      href={`/products/${p._id}`}
                      className="btn btn-primary btn-card"
                    >
                      View Product
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {holdProduct && (
        <HoldModal
          product={holdProduct}
          onClose={() => setHoldProduct(null)}
          onSuccess={() => {
            setHoldProduct(null);
            loadHolds();
          }}
        />
      )}
    </div>
  );
}
