"use client";

import { useEffect, useState, useCallback } from "react";

interface StoreRef {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

interface TransactionRow {
  _id: string;
  orderNumber: string;
  storeId: StoreRef | null;
  customerName: string;
  customerContact: string;
  customerEmail: string;
  itemCount: number;
  amount: number;
  orderDate: string;
  status: "success" | "failed";
}

interface Counts {
  total: number;
  successful: number;
  failed: number;
  totalRevenue: number;
}

function TransactionIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" />
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

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function statusClass(status: string) {
  return status === "success"
    ? "admin-status-badge admin-status-active"
    : "admin-status-badge admin-status-blocked";
}

function statusLabel(status: string) {
  return status === "success" ? "Success" : "Failed";
}

function fmtDate(dateStr: string) {
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

export default function TransactionsPage() {
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, successful: 0, failed: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [date, setDate] = useState("");

  const [selected, setSelected] = useState<TransactionRow | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("q", search);
    if (date) params.set("date", date);

    fetch(`/api/admin/transactions?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.transactions ?? []);
        setCounts(data.counts ?? { total: 0, successful: 0, failed: 0, totalRevenue: 0 });
      })
      .catch(() => setError("Failed to load transactions. Please refresh."))
      .finally(() => setLoading(false));
  }, [statusFilter, search, date]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      {/* Stat cards */}
      <div className="admin-stats-grid" style={{ marginBottom: "2rem" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><TransactionIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total</span>
            <span className="admin-stat-value">{loading ? "…" : counts.total.toLocaleString()}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><TransactionIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Successful</span>
            <span className="admin-stat-value">{loading ? "…" : counts.successful.toLocaleString()}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><TransactionIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Failed</span>
            <span className="admin-stat-value">{loading ? "…" : counts.failed.toLocaleString()}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><TransactionIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Revenue</span>
            <span className="admin-stat-value">{loading ? "…" : `₹${counts.totalRevenue.toLocaleString()}`}</span>
          </div>
        </div>
      </div>

      <hr className="admin-divider" style={{ marginTop: 0 }} />

      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-filter-group">
          <label className="admin-filter-label">Search Customer/ Transaction ID</label>
          <input
            type="text"
            className="admin-filter-input"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="admin-filter-group">
          <label className="admin-filter-label">Filter By Status</label>
          <div className="admin-filter-select-wrap">
            <select className="admin-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
        <div className="admin-filter-group">
          <label className="admin-filter-label">Filter By Date</label>
          <div className="admin-filter-input-wrap">
            <input type="date" className="admin-filter-input" value={date} onChange={(e) => setDate(e.target.value)} />
            <span className="admin-filter-icon"><CalendarIcon /></span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-card">
        {error && <p style={{ padding: "1rem", color: "var(--error, #d00)" }}>{error}</p>}
        {loading ? (
          <p style={{ padding: "1rem", color: "#888" }}>Loading transactions…</p>
        ) : rows.length === 0 ? (
          <p style={{ padding: "1rem", color: "#888" }}>No transactions found.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr className="admin-table-head">
                <th>Tran-ID</th>
                <th>Customer</th>
                <th>Store</th>
                <th>Amount</th>
                <th>Products</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t._id} className="admin-table-row">
                  <td>{t.orderNumber}</td>
                  <td>{t.customerName}</td>
                  <td>{t.storeId?.name ?? "—"}</td>
                  <td>₹{t.amount.toLocaleString()}</td>
                  <td>{t.itemCount}</td>
                  <td><span className={statusClass(t.status)}>{statusLabel(t.status)}</span></td>
                  <td>{fmtDate(t.orderDate)}</td>
                  <td>
                    <button className="admin-view-btn" onClick={() => setSelected(t)}>View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="hold-modal-overlay" onClick={() => setSelected(null)}>
          <div className="hold-modal" onClick={(e) => e.stopPropagation()}>
            <div className="hold-modal-header">
              <h2 className="hold-modal-title">Transaction Details</h2>
              <button className="hold-modal-close" onClick={() => setSelected(null)}>
                <CloseIcon />
              </button>
            </div>

            <hr className="hold-modal-divider" />

            <div className="hold-modal-info-grid">
              <div>
                <p className="hold-modal-section-title">Customer Details</p>
                <p className="hold-modal-field">Name : {selected.customerName}</p>
                <p className="hold-modal-field">Contact : {selected.customerContact || "—"}</p>
                <p className="hold-modal-field">Email : {selected.customerEmail || "—"}</p>
              </div>
              <div>
                <p className="hold-modal-section-title">Transaction Details</p>
                <p className="hold-modal-field">Transaction ID : {selected.orderNumber}</p>
                <p className="hold-modal-field">Status : {statusLabel(selected.status)}</p>
                <p className="hold-modal-field">Date : {fmtDate(selected.orderDate)}</p>
              </div>
              <div>
                <p className="hold-modal-section-title">Store Details</p>
                <p className="hold-modal-field">Name : {selected.storeId?.name ?? "—"}</p>
                <p className="hold-modal-field">Contact : {selected.storeId?.phone || "—"}</p>
                <p className="hold-modal-field">Email : {selected.storeId?.email || "—"}</p>
              </div>
            </div>

            <hr className="hold-modal-divider" />

            <div style={{ padding: "1.25rem 1.5rem" }}>
              <p className="hold-modal-section-title" style={{ marginBottom: "0.75rem" }}>Order Summary</p>
              <div className="hold-modal-product-table">
                <div className="hold-modal-product-head">
                  <span>Products</span>
                  <span>Amount</span>
                  <span>Status</span>
                </div>
                <div className="hold-modal-product-row">
                  <span>{selected.itemCount} item{selected.itemCount === 1 ? "" : "s"}</span>
                  <span>₹{selected.amount.toLocaleString()}</span>
                  <span>{statusLabel(selected.status)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
