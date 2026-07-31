"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Product {
  _id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  stock: number;
  status: "under_review" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: string;
}

interface Store {
  _id: string;
  name: string;
  owner: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  address: string;
  category: string;
  storeTime: string;
  weeklyOff: string;
  description: string;
  storePhotoUrl: string;
  bizRegDocUrl: string;
  bizRegDocName: string;
  ownerContact: string;
  ownerGovIdUrl: string;
  ownerGovIdName: string;
  bankName: string;
  accountHolderName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  gstNumber: string;
  panNumber: string;
  status: "under_review" | "approved" | "rejected";
  rejectionReason: string;
  createdAt: string;
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

function maskSensitive(v: string): string {
  if (!v) return "—";
  if (v.length <= 4) return "****";
  return "*".repeat(v.length - 4) + v.slice(-4);
}

function statusBadge(status: string) {
  if (status === "approved")
    return <span className="admin-status-badge admin-status-active">Approved</span>;
  if (status === "rejected")
    return <span className="admin-status-badge admin-status-blocked">Rejected</span>;
  return <span className="admin-status-badge admin-status-inactive">Pending Review</span>;
}

function productStatusBadge(status: string) {
  if (status === "approved")
    return <span className="admin-status-badge admin-status-active" style={{ fontSize: "0.72rem" }}>Approved</span>;
  if (status === "rejected")
    return <span className="admin-status-badge admin-status-blocked" style={{ fontSize: "0.72rem" }}>Rejected</span>;
  return <span className="admin-status-badge admin-status-inactive" style={{ fontSize: "0.72rem" }}>Pending</span>;
}

export default function StoreDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"products" | "documents">("products");

  // Approve/Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchStore = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/stores/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.code === "NOT_FOUND") {
          setError("Store not found.");
        } else {
          setStore(data.store);
          setProducts(data.products ?? []);
        }
      })
      .catch(() => setError("Failed to load store data. Please refresh."))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  async function handleApprove() {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/stores/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchStore();
      } else {
        setActionError(data.message ?? "Failed to approve store.");
      }
    } catch {
      setActionError("Unable to reach the server. Please try again.");
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
      const res = await fetch(`/api/admin/stores/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason: rejectReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowRejectModal(false);
        setRejectReason("");
        fetchStore();
      } else {
        setActionError(data.message ?? "Failed to reject store.");
      }
    } catch {
      setActionError("Unable to reach the server. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <Link href="/admin/stores" className="admin-back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Back To Stores &amp; Vendors
        </Link>
        <p style={{ padding: "2rem", color: "#888" }}>Loading store details…</p>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div>
        <Link href="/admin/stores" className="admin-back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Back To Stores &amp; Vendors
        </Link>
        <p style={{ padding: "2rem", color: "var(--error, #d00)" }}>
          {error ?? "Store not found."}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <Link href="/admin/stores" className="admin-back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back To Stores &amp; Vendors
      </Link>

      {/* Store & Vendor Details card */}
      <div
        className="admin-profile-card"
        style={{ borderRadius: "24px", boxShadow: "0px 0px 4px rgba(0,0,0,0.25)", border: "none" }}
      >
        <div className="admin-profile-header">
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <h2 className="admin-profile-title" style={{ fontSize: "1.5rem" }}>
              Store &amp; Vendor Details
            </h2>
            {statusBadge(store.status)}
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            {store.status === "under_review" && (
              <>
                <button
                  className="admin-block-btn"
                  style={{ fontSize: "1rem", padding: "0.65rem 1.25rem" }}
                  onClick={() => { setShowRejectModal(true); setActionError(null); }}
                  disabled={actionLoading}
                >
                  Reject
                </button>
                <button
                  className="admin-view-btn"
                  style={{ fontSize: "1rem", padding: "0.65rem 1.25rem", background: "#4B2080" }}
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Processing…" : "Approve"}
                </button>
              </>
            )}
            {store.status === "approved" && (
              <button
                className="admin-block-btn"
                style={{ fontSize: "1rem", padding: "0.65rem 1.25rem" }}
                onClick={() => { setShowRejectModal(true); setActionError(null); }}
                disabled={actionLoading}
              >
                Revoke Approval
              </button>
            )}
            {store.status === "rejected" && (
              <button
                className="admin-view-btn"
                style={{ fontSize: "1rem", padding: "0.65rem 1.25rem", background: "#4B2080" }}
                onClick={handleApprove}
                disabled={actionLoading}
              >
                {actionLoading ? "Processing…" : "Re-Approve"}
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <p style={{ color: "var(--error, #d00)", padding: "0.5rem 0", fontSize: "0.9rem" }}>
            {actionError}
          </p>
        )}

        {store.status === "rejected" && store.rejectionReason && (
          <div
            style={{
              background: "#fff0f0",
              border: "1px solid #fcc",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              fontSize: "0.9rem",
              color: "#b00",
            }}
          >
            <strong>Rejection Reason:</strong> {store.rejectionReason}
          </div>
        )}

        <hr style={{ border: "none", borderTop: "1px solid #D9D9D9", margin: "0 -1.5rem 1.25rem" }} />

        {/* Store photo */}
        {store.storePhotoUrl && (
          <div style={{ marginBottom: "1.25rem" }}>
            <img
              src={store.storePhotoUrl}
              alt={`${store.name} photo`}
              style={{
                width: "120px",
                height: "120px",
                objectFit: "cover",
                borderRadius: "12px",
                border: "1px solid #eee",
              }}
            />
          </div>
        )}

        <div className="admin-profile-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="admin-profile-col">
            <p className="admin-profile-field">Store Name : {store.name}</p>
            <p className="admin-profile-field">Category : {store.category}</p>
            <p className="admin-profile-field">Contact : {store.phone || "—"}</p>
            <p className="admin-profile-field">E-mail : {store.email || "—"}</p>
            <p className="admin-profile-field">Location : {store.city ? `${store.city}, ${store.state}` : store.address || "—"}</p>
          </div>
          <div className="admin-profile-col">
            <p className="admin-profile-field">Vendor Name : {store.owner || "—"}</p>
            <p className="admin-profile-field">Owner Contact : +91 {store.ownerContact || "—"}</p>
            <p className="admin-profile-field">Store Timing : {store.storeTime || "—"}</p>
            <p className="admin-profile-field">Weekly Off : {store.weeklyOff || "—"}</p>
            <p className="admin-profile-field">Description : {store.description || "—"}</p>
          </div>
          <div className="admin-profile-col">
            <p className="admin-profile-field">Products Listed : {products.length}</p>
            <p className="admin-profile-field">GST Number : {store.gstNumber || "—"}</p>
            <p className="admin-profile-field">PAN Number : {store.panNumber || "—"}</p>
            <p className="admin-profile-field">Bank : {store.bankName || "—"}</p>
            <p className="admin-profile-field">Account Holder : {store.accountHolderName || "—"}</p>
            <p className="admin-profile-field">IFSC : {maskSensitive(store.bankIfsc)}</p>
            <p className="admin-profile-field">Joined On : {fmt(store.createdAt)}</p>
          </div>
        </div>
      </div>

      <hr className="admin-divider" />

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab${activeTab === "products" ? " admin-tab-active" : ""}`}
          onClick={() => setActiveTab("products")}
        >
          Products ({products.length})
        </button>
        <button
          className={`admin-tab${activeTab === "documents" ? " admin-tab-active" : ""}`}
          onClick={() => setActiveTab("documents")}
        >
          Documents
        </button>
      </div>

      {/* Products tab */}
      {activeTab === "products" && (
        <div className="admin-table-card" style={{ marginTop: "1rem" }}>
          {products.length === 0 ? (
            <p style={{ padding: "1rem", color: "#888" }}>No products submitted.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr className="admin-table-head">
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Added Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p._id} className="admin-table-row">
                    <td>{p.name}</td>
                    <td>{p.category}</td>
                    <td>₹{p.price} {p.unit && `/ ${p.unit}`}</td>
                    <td>{p.stock}</td>
                    <td>{productStatusBadge(p.status)}</td>
                    <td>{fmt(p.createdAt)}</td>
                    <td>
                      <Link href={`/admin/products/${p._id}`} className="admin-view-btn">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Documents tab */}
      {activeTab === "documents" && (
        <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {store.bizRegDocUrl ? (
            <a
              href={store.bizRegDocUrl}
              target="_blank"
              rel="noreferrer"
              className="doc-chip doc-chip-link"
            >
              {store.bizRegDocName || "Business Registration Document"}
            </a>
          ) : (
            <p style={{ color: "#888", fontSize: "0.9rem" }}>No business registration document uploaded.</p>
          )}
          {store.ownerGovIdUrl ? (
            <a
              href={store.ownerGovIdUrl}
              target="_blank"
              rel="noreferrer"
              className="doc-chip doc-chip-link"
            >
              {store.ownerGovIdName || "Owner Government ID"}
            </a>
          ) : (
            <p style={{ color: "#888", fontSize: "0.9rem" }}>No government ID uploaded.</p>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "2rem",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ marginBottom: "0.5rem", fontSize: "1.2rem" }}>
              {store.status === "approved" ? "Revoke Approval" : "Reject Store Application"}
            </h3>
            <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              Please provide a reason. This will be shown to the vendor so they can fix and resubmit.
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
