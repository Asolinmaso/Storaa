"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Customer { id: string; name: string; email: string; contact: string; status: string; joinedAt: string }
const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

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
  const [CUSTOMERS, setCustomers] = useState<Customer[]>([]);
  const [counts, setCounts] = useState({ total: 0, newLast30Days: 0, blocked: 0 });
  useEffect(() => {
    fetch("/api/admin/customers").then((r) => r.json()).then((d) => {
      setCustomers(d.customers ?? []);
      if (d.counts) setCounts(d.counts);
    }).catch(() => {});
  }, []);

  const filtered = CUSTOMERS.filter(c => {
    const matchSearch = search === "" || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === "All" || c.status === status;
    const matchDate = !date || c.joinedAt.slice(0, 10) === date;
    return matchSearch && matchStatus && matchDate;
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
            <span className="admin-stat-value">{counts.total}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper">
            <NewCustomersIcon />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">New (Last 30 Days)</span>
            <span className="admin-stat-value">{counts.newLast30Days}</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper">
            <BlockedIcon />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Blocked Customers</span>
            <span className="admin-stat-value">{counts.blocked}</span>
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
            {filtered.map((c) => (
              <tr key={c.id} className="admin-table-row">
                <td>{c.name}</td>
                <td>{c.email}</td>
                <td>{c.contact}</td>
                <td>
                  <span className={`admin-status-badge ${c.status === "Active" ? "admin-status-active" : "admin-status-blocked"}`}>
                    {c.status}
                  </span>
                </td>
                <td>{fmtDate(c.joinedAt)}</td>
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
