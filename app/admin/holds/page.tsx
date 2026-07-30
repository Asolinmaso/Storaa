"use client";

import { useState } from "react";

const HOLDS = [
  { id: 1, customer: "Rohan Mehta", store: "Fresh Mart", product: "Peanut Butter 500g", visitDateTime: "20 May, 2026 6 PM", status: "Active", heldOn: "20 May, 2026" },
  { id: 2, customer: "Priya Sharma", store: "Hari Om", product: "Ashirwad Atta 5 Kg", visitDateTime: "20 May, 2026 6 PM", status: "Active", heldOn: "20 May, 2026" },
  { id: 3, customer: "Amit Verma", store: "Balagi Store", product: "Peanut Butter 500g", visitDateTime: "20 May, 2026 6 PM", status: "Completed", heldOn: "20 May, 2026" },
  { id: 4, customer: "Rohan Mehta", store: "Fresh Mart", product: "Ashirwad Atta 5 Kg", visitDateTime: "20 May, 2026 6 PM", status: "Expired", heldOn: "20 May, 2026" },
  { id: 5, customer: "Rohan Mehta", store: "Fresh Mart", product: "Basamati Rice 10Kg", visitDateTime: "20 May, 2026 6 PM", status: "Expired", heldOn: "20 May, 2026" },
  { id: 6, customer: "Rohan Mehta", store: "Fresh Mart", product: "Peanut Butter 500g", visitDateTime: "20 May, 2026 6 PM", status: "Completed", heldOn: "20 May, 2026" },
];

const HOLD_DETAIL = {
  customer: { name: "Priya Tyagi", contact: "8967456789", email: "priya@gmail.com" },
  hold: { status: "Active", createdOn: "20 May, 2026", visitTime: "20 May, 2026, 10.30 AM" },
  store: { name: "Freshmart", contact: "8765456789", email: "frehmart@gmail.com" },
  products: [
    { name: "Amul Milk", quantity: "5 Liter", amount: "₹300" },
    { name: "Ashirwad Atta", quantity: "10 Kg", amount: "₹645" },
    { name: "Basamati Rice", quantity: "5 Kg", amount: "₹300" },
    { name: "Amul Milk", quantity: "5 Liter", amount: "₹300" },
  ],
  note: "Please reserve these products for me. I am interested in purchasing it and would like it to remain available until my visit.",
};

function HoldIcon() {
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

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function holdStatusClass(status: string) {
  if (status === "Active") return "admin-status-badge admin-status-hold-active";
  if (status === "Completed") return "admin-status-badge admin-status-active";
  if (status === "Expired") return "admin-status-badge admin-status-blocked";
  return "admin-status-badge";
}

export default function ProductHoldsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [storeFilter, setStoreFilter] = useState("All");
  const [date, setDate] = useState("");
  const [selectedHold, setSelectedHold] = useState<number | null>(null);

  const filtered = HOLDS.filter(h => {
    const matchSearch = search === "" ||
      h.customer.toLowerCase().includes(search.toLowerCase()) ||
      h.product.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === "All" || h.status === status;
    const matchStore = storeFilter === "All" || h.store === storeFilter;
    return matchSearch && matchStatus && matchStore;
  });

  const stores = ["All", ...Array.from(new Set(HOLDS.map(h => h.store)))];

  return (
    <div>
      {/* Stat cards */}
      <div className="admin-stats-grid" style={{ marginBottom: "2rem" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><HoldIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Holds</span>
            <span className="admin-stat-value">12,345</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><HoldIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Active Holds</span>
            <span className="admin-stat-value">1,245</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><HoldIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Completed Holds</span>
            <span className="admin-stat-value">1,245</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><HoldIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Expired Holds</span>
            <span className="admin-stat-value">8,965</span>
          </div>
        </div>
      </div>

      <hr className="admin-divider" style={{ marginTop: 0 }} />

      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-filter-group">
          <label className="admin-filter-label">Search Product / Customer</label>
          <input type="text" className="admin-filter-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="admin-filter-group">
          <label className="admin-filter-label">Filter By Status</label>
          <div className="admin-filter-select-wrap">
            <select className="admin-filter-select" value={status} onChange={e => setStatus(e.target.value)}>
              <option>All</option>
              <option>Active</option>
              <option>Completed</option>
              <option>Expired</option>
            </select>
          </div>
        </div>
        <div className="admin-filter-group">
          <label className="admin-filter-label">Filter By Store</label>
          <div className="admin-filter-select-wrap">
            <select className="admin-filter-select" value={storeFilter} onChange={e => setStoreFilter(e.target.value)}>
              {stores.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="admin-filter-group">
          <label className="admin-filter-label">Filter By Visit Date & Time</label>
          <div className="admin-filter-input-wrap">
            <input type="date" className="admin-filter-input" value={date} onChange={e => setDate(e.target.value)} />
            <span className="admin-filter-icon"><CalendarIcon /></span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr className="admin-table-head">
              <th>Customer</th>
              <th>Store</th>
              <th>Product</th>
              <th>Visit Date & Time</th>
              <th>Status</th>
              <th>Held On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h, i) => (
              <tr key={`${h.id}-${i}`} className="admin-table-row">
                <td>{h.customer}</td>
                <td>{h.store}</td>
                <td>{h.product}</td>
                <td>{h.visitDateTime}</td>
                <td><span className={holdStatusClass(h.status)}>{h.status}</span></td>
                <td>{h.heldOn}</td>
                <td>
                  <button className="admin-view-btn" onClick={() => setSelectedHold(h.id)}>View Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selectedHold !== null && (
        <div className="hold-modal-overlay" onClick={() => setSelectedHold(null)}>
          <div className="hold-modal" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="hold-modal-header">
              <h2 className="hold-modal-title">Product Holds Details</h2>
              <button className="hold-modal-close" onClick={() => setSelectedHold(null)}>
                <CloseIcon />
              </button>
            </div>

            <hr className="hold-modal-divider" />

            {/* Customer / Hold / Store Details */}
            <div className="hold-modal-info-grid">
              <div>
                <p className="hold-modal-section-title">Customer details</p>
                <p className="hold-modal-field">Name : {HOLD_DETAIL.customer.name}</p>
                <p className="hold-modal-field">Contact : {HOLD_DETAIL.customer.contact}</p>
                <p className="hold-modal-field">Email : {HOLD_DETAIL.customer.email}</p>
              </div>
              <div>
                <p className="hold-modal-section-title">Hold Details</p>
                <p className="hold-modal-field">Status : {HOLD_DETAIL.hold.status}</p>
                <p className="hold-modal-field">Created On : {HOLD_DETAIL.hold.createdOn}</p>
                <p className="hold-modal-field">Visit Time : {HOLD_DETAIL.hold.visitTime}</p>
              </div>
              <div>
                <p className="hold-modal-section-title">Store Details</p>
                <p className="hold-modal-field">Name : {HOLD_DETAIL.store.name}</p>
                <p className="hold-modal-field">Contact : {HOLD_DETAIL.store.contact}</p>
                <p className="hold-modal-field">Email : {HOLD_DETAIL.store.email}</p>
              </div>
            </div>

            <hr className="hold-modal-divider" />

            {/* Product Details */}
            <div style={{ padding: "1.25rem 1.5rem" }}>
              <p className="hold-modal-section-title" style={{ marginBottom: "0.75rem" }}>Product Details</p>
              <div className="hold-modal-product-table">
                <div className="hold-modal-product-head">
                  <span>Product</span>
                  <span>Quantity</span>
                  <span>Amount</span>
                </div>
                {HOLD_DETAIL.products.map((p, i) => (
                  <div key={i} className="hold-modal-product-row">
                    <span>{p.name}</span>
                    <span>{p.quantity}</span>
                    <span>{p.amount}</span>
                  </div>
                ))}
              </div>
            </div>

            <hr className="hold-modal-divider" />

            {/* Customer Note */}
            <div style={{ padding: "1.25rem 1.5rem" }}>
              <p className="hold-modal-section-title" style={{ marginBottom: "0.5rem" }}>Customer Note</p>
              <p className="hold-modal-note">{HOLD_DETAIL.note}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
