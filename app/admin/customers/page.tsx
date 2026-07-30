"use client";

import { useState } from "react";
import Link from "next/link";

const CUSTOMERS = [
  { id: 1, name: "Rohan Mehta", email: "rohan@gmail.com", contact: "7845679870", status: "Active", joinedDate: "20 May, 2026" },
  { id: 2, name: "Priya Sharma", email: "priya@gmail.com", contact: "7845679870", status: "Active", joinedDate: "20 May, 2026" },
  { id: 3, name: "Amit Verma", email: "amit@gmail.com", contact: "7845679870", status: "Active", joinedDate: "20 May, 2026" },
  { id: 4, name: "Rohan Mehta", email: "rohan@gmail.com", contact: "7845679870", status: "Blocked", joinedDate: "20 May, 2026" },
  { id: 5, name: "Rohan Mehta", email: "rohan@gmail.com", contact: "7845679870", status: "Active", joinedDate: "20 May, 2026" },
  { id: 6, name: "Rohan Mehta", email: "rohan@gmail.com", contact: "7845679870", status: "Active", joinedDate: "20 May, 2026" },
];

function TotalCustomersIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function NewCustomersIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function BlockedIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <line x1="17" y1="11" x2="23" y2="11" />
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

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [date, setDate] = useState("");

  const filtered = CUSTOMERS.filter(c => {
    const matchSearch = search === "" || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === "All" || c.status === status;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {/* Stat cards */}
      <div className="admin-stats-grid" style={{ marginBottom: "2rem" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper">
            <TotalCustomersIcon />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Customers</span>
            <span className="admin-stat-value">12,345</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper">
            <NewCustomersIcon />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">New Customers</span>
            <span className="admin-stat-value">1,245</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper">
            <BlockedIcon />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Blocked Customers</span>
            <span className="admin-stat-value">8,965</span>
          </div>
        </div>
      </div>

      <hr className="admin-divider" style={{ marginTop: 0 }} />

      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-filter-group">
          <label className="admin-filter-label">Search Customer</label>
          <input
            type="text"
            className="admin-filter-input"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="admin-filter-group">
          <label className="admin-filter-label">Filter By Status</label>
          <div className="admin-filter-select-wrap">
            <select
              className="admin-filter-select"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option>All</option>
              <option>Active</option>
              <option>Blocked</option>
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
              onChange={e => setDate(e.target.value)}
            />
            <span className="admin-filter-icon"><CalendarIcon /></span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr className="admin-table-head">
              <th>Name</th>
              <th>Email</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Joined Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={`${c.id}-${i}`} className="admin-table-row">
                <td>{c.name}</td>
                <td>{c.email}</td>
                <td>{c.contact}</td>
                <td>
                  <span className={`admin-status-badge ${c.status === "Active" ? "admin-status-active" : "admin-status-blocked"}`}>
                    {c.status}
                  </span>
                </td>
                <td>{c.joinedDate}</td>
                <td>
                  <Link href={`/admin/customers/${c.id}`} className="admin-view-btn">
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
