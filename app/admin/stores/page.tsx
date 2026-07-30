"use client";

import { useState } from "react";
import Link from "next/link";

const STORES = [
  { id: 1, storeName: "Fresh Mart", ownerName: "Rohan Mehta", email: "rohan@gmail.com", contact: "7845679870", location: "Chennai, TN", status: "Active", joinedDate: "20 May, 2026" },
  { id: 2, storeName: "Hari Om", ownerName: "Priya Sharma", email: "priya@gmail.com", contact: "7845679870", location: "Bangalore, KA", status: "Active", joinedDate: "20 May, 2026" },
  { id: 3, storeName: "Balagi Store", ownerName: "Amit Verma", email: "amit@gmail.com", contact: "7845679870", location: "Mumbai, MH", status: "Active", joinedDate: "20 May, 2026" },
  { id: 4, storeName: "Fresh Mart", ownerName: "Rohan Mehta", email: "rohan@gmail.com", contact: "7845679870", location: "Surat, GJ", status: "Blocked", joinedDate: "20 May, 2026" },
  { id: 5, storeName: "Fresh Mart", ownerName: "Rohan Mehta", email: "rohan@gmail.com", contact: "7845679870", location: "Amritsar, PN", status: "Inactive", joinedDate: "20 May, 2026" },
  { id: 6, storeName: "Fresh Mart", ownerName: "Rohan Mehta", email: "rohan@gmail.com", contact: "7845679870", location: "Bhopal, MP", status: "Active", joinedDate: "20 May, 2026" },
];

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
  if (status === "Active") return "admin-status-badge admin-status-active";
  if (status === "Blocked") return "admin-status-badge admin-status-blocked";
  return "admin-status-badge admin-status-inactive";
}

export default function StoresPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [date, setDate] = useState("");

  const filtered = STORES.filter(s => {
    const matchSearch = search === "" || s.storeName.toLowerCase().includes(search.toLowerCase()) || s.ownerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === "All" || s.status === status;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {/* Stat cards */}
      <div className="admin-stats-grid" style={{ marginBottom: "2rem" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><StoreIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Stores</span>
            <span className="admin-stat-value">12,345</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><StoreIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Active Stores</span>
            <span className="admin-stat-value">1,245</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><StoreIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Inactive Stores</span>
            <span className="admin-stat-value">1,245</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><StoreIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Pending Stores</span>
            <span className="admin-stat-value">8,965</span>
          </div>
        </div>
      </div>

      <hr className="admin-divider" style={{ marginTop: 0 }} />

      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-filter-group">
          <label className="admin-filter-label">Search Store</label>
          <input type="text" className="admin-filter-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="admin-filter-group">
          <label className="admin-filter-label">Filter By Status</label>
          <div className="admin-filter-select-wrap">
            <select className="admin-filter-select" value={status} onChange={e => setStatus(e.target.value)}>
              <option>All</option>
              <option>Active</option>
              <option>Blocked</option>
              <option>Inactive</option>
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
            {filtered.map((s, i) => (
              <tr key={`${s.id}-${i}`} className="admin-table-row">
                <td>{s.storeName}</td>
                <td>{s.ownerName}</td>
                <td>{s.email}</td>
                <td>{s.contact}</td>
                <td>{s.location}</td>
                <td><span className={statusClass(s.status)}>{s.status}</span></td>
                <td>{s.joinedDate}</td>
                <td>
                  <Link href={`/admin/stores/${s.id}`} className="admin-view-btn">View Details</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
