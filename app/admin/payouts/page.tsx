"use client";

import { useEffect, useState, useCallback } from "react";

interface StoreRef {
  _id: string;
  name: string;
  owner: string;
  ownerContact: string;
  email: string;
  bankName: string;
  accountHolderName: string;
  bankAccountNumber: string;
  bankIfsc: string;
}

interface PayoutRow {
  _id: string;
  payoutNumber: string;
  storeId: StoreRef | null;
  grossSales: number;
  platformFees: number;
  gstOnFees: number;
  netPayout: number;
  status: "pending" | "processing" | "success" | "failed";
  initiatedOn: string;
  completedOn: string | null;
  failureReason: string;
  orderCount: number;
}

interface OrderRow {
  _id: string;
  orderNumber: string;
  customerName: string;
  itemCount: number;
  amount: number;
  orderDate: string;
}

interface Counts {
  total: number;
  successful: number;
  failed: number;
  totalRevenue: number;
}

function PayoutsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
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
  if (status === "success") return "admin-status-badge admin-status-active";
  if (status === "failed") return "admin-status-badge admin-status-blocked";
  if (status === "processing") return "admin-status-badge admin-status-processing";
  return "admin-status-badge admin-status-pending";
}

function statusLabel(status: string) {
  if (status === "success") return "Success";
  if (status === "failed") return "Failed";
  if (status === "processing") return "Processing";
  return "Pending";
}

function fmtDate(dateStr: string | null) {
  if (!dateStr) return "—";
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

function fmtDateTime(dateStr: string | null) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function maskSensitive(v: string | undefined) {
  if (!v) return "—";
  if (v.length <= 4) return "****";
  return "*".repeat(v.length - 4) + v.slice(-4);
}

const STEPS = ["Payout Created", "Orders Verified", "Payout Initiated", "Bank Processing", "Completed"];

export default function PayoutsPage() {
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [counts, setCounts] = useState<Counts>({ total: 0, successful: 0, failed: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [date, setDate] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ payout: PayoutRow; orders: OrderRow[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("q", search);
    if (date) params.set("date", date);

    fetch(`/api/admin/payouts?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setRows(data.payouts ?? []);
        setCounts(data.counts ?? { total: 0, successful: 0, failed: 0, totalRevenue: 0 });
      })
      .catch(() => setError("Failed to load payouts. Please refresh."))
      .finally(() => setLoading(false));
  }, [statusFilter, search, date]);

  useEffect(() => {
    load();
  }, [load]);

  function openDetail(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    setDetail(null);
    fetch(`/api/admin/payouts/${id}`)
      .then((r) => r.json())
      .then((data) => setDetail({ payout: data.payout, orders: data.orders ?? [] }))
      .finally(() => setDetailLoading(false));
  }

  async function runAction(action: "initiate" | "retry") {
    if (!selectedId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/payouts/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        openDetail(selectedId);
        load();
      }
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div>
      {/* Stat cards */}
      <div className="admin-stats-grid" style={{ marginBottom: "2rem" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><PayoutsIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total</span>
            <span className="admin-stat-value">{loading ? "…" : counts.total.toLocaleString()}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><PayoutsIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Successful</span>
            <span className="admin-stat-value">{loading ? "…" : counts.successful.toLocaleString()}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><PayoutsIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Failed</span>
            <span className="admin-stat-value">{loading ? "…" : counts.failed.toLocaleString()}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><PayoutsIcon /></div>
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
          <label className="admin-filter-label">Search Store/ Payout ID</label>
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
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
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
          <p style={{ padding: "1rem", color: "#888" }}>Loading payouts…</p>
        ) : rows.length === 0 ? (
          <p style={{ padding: "1rem", color: "#888" }}>No payouts found.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr className="admin-table-head">
                <th>Payout-ID</th>
                <th>Store</th>
                <th>Gross Sales</th>
                <th>Fees &amp; Taxes</th>
                <th>Orders</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p._id} className="admin-table-row">
                  <td>{p.payoutNumber}</td>
                  <td>{p.storeId?.name ?? "—"}</td>
                  <td>₹{p.grossSales.toLocaleString()}</td>
                  <td>₹{(p.platformFees + p.gstOnFees).toLocaleString()}</td>
                  <td>{p.orderCount}</td>
                  <td><span className={statusClass(p.status)}>{statusLabel(p.status)}</span></td>
                  <td>{fmtDate(p.initiatedOn)}</td>
                  <td>
                    <button className="admin-view-btn" onClick={() => openDetail(p._id)}>View Details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedId && (
        <div className="payout-modal-overlay" onClick={() => setSelectedId(null)}>
          <div className="payout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="payout-modal-header">
              <h2 className="payout-modal-title">Payout Details</h2>
              <button className="payout-modal-close" onClick={() => setSelectedId(null)}>
                <CloseIcon />
              </button>
            </div>
            <hr className="payout-modal-divider" />

            {detailLoading || !detail ? (
              <p style={{ padding: "1.5rem 1.75rem", color: "#888" }}>Loading…</p>
            ) : (
              <>
                <div className="payout-modal-top">
                  <div className="payout-modal-top-field">
                    <span className="payout-modal-top-label">Store Name</span>
                    <span className="payout-modal-top-value">{detail.payout.storeId?.name ?? "—"}</span>
                  </div>
                  <div className="payout-modal-top-field">
                    <span className="payout-modal-top-label">Net Payout</span>
                    <span className="payout-modal-top-value">₹{detail.payout.netPayout.toLocaleString()}</span>
                  </div>
                  <div className="payout-modal-top-field">
                    <span className="payout-modal-top-label">Payout Status</span>
                    <span className={statusClass(detail.payout.status)}>{statusLabel(detail.payout.status)}</span>
                  </div>
                  {detail.payout.storeId && (
                    <a className="payout-modal-view-store-btn" href={`/admin/stores/${detail.payout.storeId._id}`}>
                      View Store
                    </a>
                  )}
                </div>

                {detail.payout.status === "failed" && (
                  <div className="payout-fail-banner">
                    <div className="payout-fail-title">⚠ Reason For Failure</div>
                    <p className="payout-fail-text">{detail.payout.failureReason || "The payout could not be processed."}</p>
                  </div>
                )}

                <hr className="payout-modal-divider" style={{ marginTop: "1.25rem" }} />

                <div className="payout-modal-info-grid">
                  <div>
                    <p className="payout-modal-section-title">Payout Details</p>
                    <p className="payout-modal-field">Payout ID : {detail.payout.payoutNumber}</p>
                    <p className="payout-modal-field">Initiated On : {fmtDateTime(detail.payout.initiatedOn)}</p>
                    <p className="payout-modal-field">Completed On : {fmtDateTime(detail.payout.completedOn)}</p>
                  </div>
                  <div>
                    <p className="payout-modal-section-title">Vendor Details</p>
                    <p className="payout-modal-field">Vendor Name : {detail.payout.storeId?.owner ?? "—"}</p>
                    <p className="payout-modal-field">Contact : {detail.payout.storeId?.ownerContact ?? "—"}</p>
                    <p className="payout-modal-field">Email : {detail.payout.storeId?.email ?? "—"}</p>
                  </div>
                </div>

                <hr className="payout-modal-divider" />

                <div className="payout-modal-info-grid">
                  <div>
                    <p className="payout-modal-section-title">Payout Summary</p>
                    <p className="payout-modal-field">Orders Included : {String(detail.orders.length).padStart(2, "0")}</p>
                    <p className="payout-modal-field">Gross Sales : ₹{detail.payout.grossSales.toLocaleString()}</p>
                    <p className="payout-modal-field">Platform Fees : ₹{detail.payout.platformFees.toLocaleString()}</p>
                    <p className="payout-modal-field">GST On Fees : ₹{detail.payout.gstOnFees.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="payout-modal-section-title">Bank Details</p>
                    <p className="payout-modal-field">Bank Name : {detail.payout.storeId?.bankName || "—"}</p>
                    <p className="payout-modal-field">Account Holder Name : {detail.payout.storeId?.accountHolderName || "—"}</p>
                    <p className="payout-modal-field">Bank Account Number : {maskSensitive(detail.payout.storeId?.bankAccountNumber)}</p>
                    <p className="payout-modal-field">Bank IFSC Code : {maskSensitive(detail.payout.storeId?.bankIfsc)}</p>
                  </div>
                </div>

                <hr className="payout-modal-divider" />

                <p className="payout-modal-orders-title" style={{ marginTop: "1.25rem" }}>Orders Included</p>
                <div className="payout-modal-order-table">
                  <div className="payout-modal-order-head">
                    <span>Order ID</span>
                    <span>Customer</span>
                    <span>Items</span>
                    <span>Order Date</span>
                    <span>Amount</span>
                  </div>
                  {detail.orders.map((o) => (
                    <div key={o._id} className="payout-modal-order-row">
                      <span>{o.orderNumber}</span>
                      <span>{o.customerName}</span>
                      <span>{String(o.itemCount).padStart(2, "0")}</span>
                      <span>{fmtDate(o.orderDate)}</span>
                      <span>₹{o.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <p className="payout-modal-note">
                  Note : Net payout amount is calculated after deducting the applicable platform fee (10%) and GST (18% on platform fees) from the total eligible order value.
                </p>

                {detail.payout.status === "processing" && (
                  <div className="payout-stepper">
                    {STEPS.map((label, i) => {
                      const currentIndex = 2; // Payout Initiated
                      const done = i < currentIndex;
                      const current = i === currentIndex;
                      return (
                        <div key={label} style={{ display: "flex", alignItems: "center", flex: i === STEPS.length - 1 ? "0 0 auto" : "1 1 auto" }}>
                          <div className="payout-stepper-step">
                            <span className={`payout-stepper-dot ${done ? "payout-stepper-dot-done" : current ? "payout-stepper-dot-current" : ""}`}>
                              {done ? "✓" : ""}
                            </span>
                            <span className="payout-stepper-label">{label}</span>
                          </div>
                          {i < STEPS.length - 1 && <span className="payout-stepper-line" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="payout-modal-footer">
                  {detail.payout.status === "pending" && (
                    <button className="payout-modal-action-btn" disabled={actionLoading} onClick={() => runAction("initiate")}>
                      {actionLoading ? "Initiating…" : "Initiate Payout"}
                    </button>
                  )}
                  {detail.payout.status === "failed" && (
                    <button className="payout-modal-action-btn" disabled={actionLoading} onClick={() => runAction("retry")}>
                      {actionLoading ? "Retrying…" : "Retry Payout"}
                    </button>
                  )}
                  {detail.payout.status === "success" && (
                    <button className="payout-modal-action-btn" onClick={() => window.print()}>
                      Download Receipt
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
