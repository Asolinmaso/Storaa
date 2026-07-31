"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface StoreRef {
  _id: string;
  name: string;
  owner: string;
  email: string;
  phone: string;
}

interface ProductRow {
  _id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  stock: number;
  status: "under_review" | "approved" | "rejected";
  storeId: StoreRef | null;
  createdAt: string;
  updatedAt: string;
}

interface Counts {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}

function ProductIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function statusClass(status: string) {
  if (status === "approved") return "admin-status-badge admin-status-active";
  if (status === "rejected") return "admin-status-badge admin-status-blocked";
  return "admin-status-badge admin-status-hold-active";
}

function statusLabel(status: string) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

function stockLabel(stock: number) {
  if (stock > 10) return "In Stock";
  if (stock > 0) return "Low Stock";
  return "Out of Stock";
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

export default function ProductsPage() {
  const [allProducts, setAllProducts] = useState<ProductRow[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, approved: 0, pending: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [date, setDate] = useState("");

  useEffect(() => {
    fetch("/api/admin/products")
      .then((r) => r.json())
      .then((data) => {
        setAllProducts(data.products ?? []);
        setCounts(data.counts ?? { total: 0, approved: 0, pending: 0, rejected: 0 });
      })
      .catch(() => setError("Failed to load products. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = allProducts.filter((p) => {
    const storeName =
      p.storeId && typeof p.storeId === "object" ? p.storeId.name : "";
    const matchSearch =
      search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      storeName.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchDate =
      !date || new Date(p.updatedAt).toISOString().startsWith(date);
    return matchSearch && matchStatus && matchDate;
  });

  return (
    <div>
      {/* Stat cards */}
      <div className="admin-stats-grid" style={{ marginBottom: "2rem" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><ProductIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Products</span>
            <span className="admin-stat-value">{loading ? "…" : counts.total.toLocaleString()}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><ProductIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Approved</span>
            <span className="admin-stat-value">{loading ? "…" : counts.approved.toLocaleString()}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><ProductIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Pending Review</span>
            <span className="admin-stat-value">{loading ? "…" : counts.pending.toLocaleString()}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><ProductIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Rejected</span>
            <span className="admin-stat-value">{loading ? "…" : counts.rejected.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <hr className="admin-divider" style={{ marginTop: 0 }} />

      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-filter-group">
          <label className="admin-filter-label">Search Product</label>
          <input
            type="text"
            className="admin-filter-input"
            placeholder="Search by name, category or store…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="admin-filter-group">
          <label className="admin-filter-label">Filter By Status</label>
          <div className="admin-filter-select-wrap">
            <select
              className="admin-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="under_review">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div className="admin-filter-group">
          <label className="admin-filter-label">Filter By Date</label>
          <div className="admin-filter-input-wrap">
            <input
              type="date"
              className="admin-filter-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <span className="admin-filter-icon"><CalendarIcon /></span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-card">
        {error && (
          <p style={{ padding: "1rem", color: "var(--error, #d00)" }}>{error}</p>
        )}
        {loading ? (
          <p style={{ padding: "1rem", color: "#888" }}>Loading products…</p>
        ) : filtered.length === 0 ? (
          <p style={{ padding: "1rem", color: "#888" }}>No products found.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr className="admin-table-head">
                <th>Product</th>
                <th>Store</th>
                <th>Price</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Updated On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const storeName =
                  p.storeId && typeof p.storeId === "object"
                    ? p.storeId.name
                    : "—";
                const storeId =
                  p.storeId && typeof p.storeId === "object"
                    ? p.storeId._id
                    : null;
                return (
                  <tr key={p._id} className="admin-table-row">
                    <td>{p.name}</td>
                    <td>
                      {storeId ? (
                        <Link href={`/admin/stores/${storeId}`} style={{ color: "#4B2080", textDecoration: "underline" }}>
                          {storeName}
                        </Link>
                      ) : (
                        storeName
                      )}
                    </td>
                    <td>₹{p.price}{p.unit ? ` / ${p.unit}` : ""}</td>
                    <td>{p.category}</td>
                    <td>{stockLabel(p.stock)}</td>
                    <td>
                      <span className={statusClass(p.status)}>
                        {statusLabel(p.status)}
                      </span>
                    </td>
                    <td>{fmt(p.updatedAt)}</td>
                    <td>
                      <Link href={`/admin/products/${p._id}`} className="admin-view-btn">
                        View Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
