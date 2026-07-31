"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface StoreRef {
  _id: string;
  name: string;
  owner: string;
  email: string;
  phone: string;
  ownerContact: string;
}

interface Product {
  _id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  unit: string;
  stock: number;
  specifications: string[];
  images: string[];
  rating: number;
  reviewCount: number;
  status: "under_review" | "approved" | "rejected";
  rejectionReason: string;
  storeId: StoreRef | null;
  createdAt: string;
  updatedAt: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="admin-star-rating">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.floor(rating);
        const half = !filled && i === Math.ceil(rating) && rating % 1 !== 0;
        return (
          <span
            key={i}
            className={
              filled
                ? "admin-star admin-star-filled"
                : half
                ? "admin-star admin-star-half"
                : "admin-star admin-star-empty"
            }
          >
            ★
          </span>
        );
      })}
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
    return dateStr;
  }
}

function statusBadge(status: string) {
  if (status === "approved")
    return <span className="admin-status-badge admin-status-active">Approved</span>;
  if (status === "rejected")
    return <span className="admin-status-badge admin-status-blocked">Rejected</span>;
  return <span className="admin-status-badge admin-status-inactive">Pending Review</span>;
}

export default function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"info" | "reviews">("info");

  // Approve/Reject state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchProduct = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/products/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.code === "NOT_FOUND") {
          setError("Product not found.");
        } else {
          setProduct(data.product);
        }
      })
      .catch(() => setError("Failed to load product. Please refresh."))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  async function handleApprove() {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/products/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchProduct();
      } else {
        setActionError(data.message ?? "Failed to approve product.");
      }
    } catch {
      setActionError("Unable to reach the server.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      setActionError("Please enter a rejection reason.");
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/products/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason: rejectReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowRejectModal(false);
        setRejectReason("");
        fetchProduct();
      } else {
        setActionError(data.message ?? "Failed to reject product.");
      }
    } catch {
      setActionError("Unable to reach the server.");
    } finally {
      setActionLoading(false);
    }
  }

  const store =
    product?.storeId && typeof product.storeId === "object"
      ? product.storeId
      : null;

  if (loading) {
    return (
      <div>
        <Link href="/admin/products" className="admin-back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Back To Products
        </Link>
        <p style={{ padding: "2rem", color: "#888" }}>Loading product…</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div>
        <Link href="/admin/products" className="admin-back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Back To Products
        </Link>
        <p style={{ padding: "2rem", color: "var(--error, #d00)" }}>
          {error ?? "Product not found."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <Link href="/admin/products" className="admin-back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back To Products
      </Link>

      {/* Product Details card */}
      <div className="admin-profile-card">
        <div className="admin-profile-header">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <h2 className="admin-profile-title">Product Details</h2>
            {statusBadge(product.status)}
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            {store && (
              <Link
                href={`/admin/stores/${store._id}`}
                className="admin-tab"
                style={{ borderRadius: "8px", padding: "0.6rem 1.1rem" }}
              >
                View Store
              </Link>
            )}
            {product.status === "under_review" && (
              <>
                <button
                  className="admin-block-btn"
                  style={{ borderRadius: "8px", padding: "0.6rem 1.1rem", fontSize: "0.9rem" }}
                  onClick={() => { setShowRejectModal(true); setActionError(null); }}
                  disabled={actionLoading}
                >
                  Reject
                </button>
                <button
                  className="admin-view-btn"
                  style={{ borderRadius: "8px", padding: "0.6rem 1.1rem", fontSize: "0.9rem", background: "#4B2080" }}
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Processing…" : "Approve"}
                </button>
              </>
            )}
            {product.status === "approved" && (
              <button
                className="admin-block-btn"
                style={{ borderRadius: "8px", padding: "0.6rem 1.1rem", fontSize: "0.9rem" }}
                onClick={() => { setShowRejectModal(true); setActionError(null); }}
                disabled={actionLoading}
              >
                Revoke
              </button>
            )}
            {product.status === "rejected" && (
              <button
                className="admin-view-btn"
                style={{ borderRadius: "8px", padding: "0.6rem 1.1rem", fontSize: "0.9rem", background: "#4B2080" }}
                onClick={handleApprove}
                disabled={actionLoading}
              >
                {actionLoading ? "Processing…" : "Re-Approve"}
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <p style={{ color: "var(--error, #d00)", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
            {actionError}
          </p>
        )}

        {product.status === "rejected" && product.rejectionReason && (
          <div style={{
            background: "#fff0f0",
            border: "1px solid #fcc",
            borderRadius: "8px",
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            fontSize: "0.9rem",
            color: "#b00",
          }}>
            <strong>Rejection Reason:</strong> {product.rejectionReason}
          </div>
        )}

        <div className="product-detail-body">
          {/* Images */}
          {product.images && product.images.length > 0 ? (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {product.images.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`${product.name} image ${i + 1}`}
                  style={{
                    width: i === 0 ? "160px" : "72px",
                    height: i === 0 ? "160px" : "72px",
                    objectFit: "cover",
                    borderRadius: "10px",
                    border: "1px solid #eee",
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="product-img-placeholder" />
          )}

          {/* Info columns */}
          <div className="product-detail-grid">
            <div className="admin-profile-col">
              <p className="admin-profile-field">Product Name : {product.name}</p>
              <p className="admin-profile-field">Category : {product.category}</p>
              <p className="admin-profile-field">Price : ₹{product.price}</p>
              <p className="admin-profile-field">Unit : {product.unit || "—"}</p>
            </div>
            <div className="admin-profile-col">
              <p className="admin-profile-field">Stock : {product.stock}</p>
              <p className="admin-profile-field">Brand : {product.brand || "—"}</p>
              <p className="admin-profile-field">Added On : {fmt(product.createdAt)}</p>
              <p className="admin-profile-field">Last Updated : {fmt(product.updatedAt)}</p>
            </div>
            <div className="admin-profile-col">
              <p className="admin-profile-field">Store : {store?.name ?? "—"}</p>
              <p className="admin-profile-field">Vendor : {store?.owner ?? "—"}</p>
              <p className="admin-profile-field">Contact : {store?.ownerContact || store?.phone || "—"}</p>
              <p className="admin-profile-field">Email : {store?.email ?? "—"}</p>
            </div>
          </div>
        </div>
      </div>

      <hr className="admin-divider" />

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab${activeTab === "info" ? " admin-tab-active" : ""}`}
          onClick={() => setActiveTab("info")}
        >
          Product Information
        </button>
        <button
          className={`admin-tab${activeTab === "reviews" ? " admin-tab-active" : ""}`}
          onClick={() => setActiveTab("reviews")}
        >
          Ratings ({product.reviewCount})
        </button>
      </div>

      {/* Product Information tab */}
      {activeTab === "info" && (
        <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {product.specifications && product.specifications.length > 0 ? (
            product.specifications.map((spec, i) => (
              <p key={i} className="admin-profile-field">• {spec}</p>
            ))
          ) : (
            <p className="admin-profile-field" style={{ color: "#888" }}>No specifications provided.</p>
          )}
        </div>
      )}

      {/* Reviews tab */}
      {activeTab === "reviews" && (
        <div style={{ marginTop: "1.25rem" }}>
          {product.reviewCount === 0 ? (
            <p style={{ color: "#888" }}>No reviews yet.</p>
          ) : (
            <p style={{ color: "#888" }}>
              Average rating: {product.rating} / 5 &nbsp;
              <StarRating rating={product.rating} />
              &nbsp;({product.reviewCount} reviews)
            </p>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "2rem",
            width: "100%",
            maxWidth: "480px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
          }}>
            <h3 style={{ marginBottom: "0.5rem", fontSize: "1.2rem" }}>
              {product.status === "approved" ? "Revoke Product Approval" : "Reject Product"}
            </h3>
            <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              Provide a reason so the vendor knows what to fix.
            </p>
            <textarea
              style={{
                width: "100%",
                minHeight: "100px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                padding: "0.75rem",
                fontSize: "0.95rem",
                resize: "vertical",
                boxSizing: "border-box",
              }}
              placeholder="Enter rejection reason…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            {actionError && (
              <p style={{ color: "var(--error, #d00)", fontSize: "0.88rem", marginTop: "0.5rem" }}>
                {actionError}
              </p>
            )}
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem", justifyContent: "flex-end" }}>
              <button
                className="admin-view-btn"
                style={{ background: "#f0f0f0", color: "#333" }}
                onClick={() => { setShowRejectModal(false); setRejectReason(""); setActionError(null); }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="admin-block-btn"
                style={{ fontSize: "0.95rem" }}
                onClick={handleReject}
                disabled={actionLoading}
              >
                {actionLoading ? "Processing…" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
