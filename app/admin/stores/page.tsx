"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface StoreRow {
  _id: string;
  name: string;
  owner: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  status: "under_review" | "approved" | "rejected";
  createdAt: string;
}

interface Counts {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}

function StoreIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
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
  return "admin-status-badge admin-status-inactive";
}

function statusLabel(status: string) {
  if (status === "approved") return "Active";
  if (status === "rejected") return "Rejected";
  return "Pending";
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

export default function StoresPage() {
  const [allStores, setAllStores] = useState<StoreRow[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, approved: 0, pending: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [date, setDate] = useState("");

  useEffect(() => {
    fetch("/api/admin/stores")
      .then((r) => r.json())
      .then((data) => {
        setAllStores(data.stores ?? []);
        setCounts(data.counts ?? { total: 0, approved: 0, pending: 0, rejected: 0 });
      })
      .catch(() => setError("Failed to load stores. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = allStores.filter((s) => {
    const matchSearch =
      search === "" ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.owner.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const matchDate =
      !date || new Date(s.createdAt).toISOString().startsWith(date);
    return matchSearch && matchStatus && matchDate;
  });

  return (
    <div>
      {/* Stat cards */}
      <div className="admin-stats-grid" style={{ marginBottom: "2rem" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><StoreIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Stores</span>
            <span className="admin-stat-value">{loading ? "…" : counts.total.toLocaleString()}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><StoreIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Active Stores</span>
            <span className="admin-stat-value">{loading ? "…" : counts.approved.toLocaleString()}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><StoreIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Pending Review</span>
            <span className="admin-stat-value">{loading ? "…" : counts.pending.toLocaleString()}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><StoreIcon /></div>
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
          <label className="admin-filter-label">Search Store</label>
          <input
            type="text"
            className="admin-filter-input"
            placeholder="Search by name, owner or email…"
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
              <option value="approved">Active</option>
              <option value="under_review">Pending</option>
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
          <p style={{ padding: "1rem", color: "#888" }}>Loading stores…</p>
        ) : filtered.length === 0 ? (
          <p style={{ padding: "1rem", color: "#888" }}>No stores found.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr className="admin-table-head">
                <th>Store Name</th>
                <th>Owner Name</th>
                <th>Email</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Status</th>
                <th>Joined Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s._id} className="admin-table-row">
                  <td>{s.name}</td>
                  <td>{s.owner || "—"}</td>
                  <td>{s.email || "—"}</td>
                  <td>{s.phone || "—"}</td>
                  <td>{s.city ? `${s.city}, ${s.state}` : "—"}</td>
                  <td>
                    <span className={statusClass(s.status)}>
                      {statusLabel(s.status)}
                    </span>
                  </td>
                  <td>{fmt(s.createdAt)}</td>
                  <td>
                    <Link href={`/admin/stores/${s._id}`} className="admin-view-btn">
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
