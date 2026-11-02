"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Customer { id: string; name: string; email: string; contact: string; location: string; status: string; joinedAt: string }
interface HoldRow { id: string; storeName: string; items: string; total: number; status: string; createdAt: string }

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [holds, setHolds] = useState<HoldRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/customers/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) { setCustomer(d.customer); setHolds(d.holds ?? []); }
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  async function toggleBlock() {
    if (!customer) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/customers/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: customer.status === "Blocked" ? "unblock" : "block" }),
      });
      const d = await res.json();
      if (res.ok) setCustomer({ ...customer, status: d.status });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link href="/admin/customers" className="admin-back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back To Customers
      </Link>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : !customer ? (
        <p className="muted">Customer not found.</p>
      ) : (
        <>
          <div className="admin-profile-card">
            <div className="admin-profile-header">
              <h2 className="admin-profile-title">Profile Details</h2>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button className="admin-block-btn" onClick={toggleBlock} disabled={busy}>
                  {customer.status === "Blocked" ? "Unblock User" : "Block User"}
                </button>
              </div>
            </div>
            <div className="admin-profile-grid">
              <div className="admin-profile-col">
                <p className="admin-profile-field">Name : {customer.name}</p>
                <p className="admin-profile-field">Contact : {customer.contact}</p>
                <p className="admin-profile-field">E-mail : {customer.email}</p>
                <p className="admin-profile-field">Location : {customer.location}</p>
              </div>
              <div className="admin-profile-col">
                <p className="admin-profile-field">Account Status : {customer.status}</p>
                <p className="admin-profile-field">Joined On : {fmtDate(customer.joinedAt)}</p>
              </div>
            </div>
          </div>

          <hr className="admin-divider" />

          <div className="admin-tabs">
            <button className="admin-tab admin-tab-active">Holds ({holds.length})</button>
          </div>

          <div className="admin-table-card" style={{ marginTop: "1rem" }}>
            <table className="admin-table">
              <thead>
                <tr className="admin-table-head">
                  <th>Products</th>
                  <th>Store</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {holds.map((h) => (
                  <tr key={h.id} className="admin-table-row">
                    <td>{h.items}</td>
                    <td>{h.storeName}</td>
                    <td>₹{h.total}</td>
                    <td>{h.status}</td>
                    <td>{fmtDate(h.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
