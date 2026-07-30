"use client";

import { useState } from "react";
import Link from "next/link";

const PRODUCTS = [
  { id: 1, product: "Peanut Butter", store: "Fresh Mart", price: "₹62 / 500g", category: "Grocery", stock: "In Stock", status: "Pending", updatedOn: "20 May, 2026" },
  { id: 2, product: "Ashirwad Atta", store: "Hari Om", price: "₹62 / Kg", category: "Grocery", stock: "Low Stock", status: "Pending", updatedOn: "20 May, 2026" },
  { id: 3, product: "Peanut Butter", store: "Balagi Store", price: "₹62 / 500g", category: "Grocery", stock: "Out Of Stock", status: "Pending", updatedOn: "20 May, 2026" },
  { id: 4, product: "Ashirwad Atta", store: "Fresh Mart", price: "₹62 / Kg", category: "Grocery", stock: "In Stock", status: "Approved", updatedOn: "20 May, 2026" },
  { id: 5, product: "Basamati Rice", store: "Fresh Mart", price: "₹62 / Kg", category: "Grocery", stock: "In Stock", status: "Approved", updatedOn: "20 May, 2026" },
  { id: 6, product: "Peanut Butter", store: "Fresh Mart", price: "₹62 / 500g", category: "Grocery", stock: "In Stock", status: "Approved", updatedOn: "20 May, 2026" },
];

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

function productStatusClass(status: string) {
  if (status === "Approved") return "admin-status-badge admin-status-active";
  if (status === "Pending") return "admin-status-badge admin-status-hold-active";
  return "admin-status-badge admin-status-blocked";
}

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [storeFilter, setStoreFilter] = useState("All");
  const [date, setDate] = useState("");

  const filtered = PRODUCTS.filter(p => {
    const matchSearch = search === "" || p.product.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === "All" || p.status === status;
    const matchStore = storeFilter === "All" || p.store === storeFilter;
    return matchSearch && matchStatus && matchStore;
  });

  const stores = ["All", ...Array.from(new Set(PRODUCTS.map(p => p.store)))];

  return (
    <div>
      {/* Stat cards */}
      <div className="admin-stats-grid" style={{ marginBottom: "2rem" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><ProductIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Products</span>
            <span className="admin-stat-value">12,345</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><ProductIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Pending Products</span>
            <span className="admin-stat-value">1,245</span>
          </div>
        </div>
      </div>

      <hr className="admin-divider" style={{ marginTop: 0 }} />

      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-filter-group">
          <label className="admin-filter-label">Search Product</label>
          <input type="text" className="admin-filter-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="admin-filter-group">
          <label className="admin-filter-label">Filter By Status</label>
          <div className="admin-filter-select-wrap">
            <select className="admin-filter-select" value={status} onChange={e => setStatus(e.target.value)}>
              <option>All</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
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
          <label className="admin-filter-label">Filter By Date</label>
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
            {filtered.map((p, i) => (
              <tr key={`${p.id}-${i}`} className="admin-table-row">
                <td>{p.product}</td>
                <td>{p.store}</td>
                <td>{p.price}</td>
                <td>{p.category}</td>
                <td>{p.stock}</td>
                <td><span className={productStatusClass(p.status)}>{p.status}</span></td>
                <td>{p.updatedOn}</td>
                <td>
                  <Link href={`/admin/products/${p.id}`} className="admin-view-btn">View Details</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
