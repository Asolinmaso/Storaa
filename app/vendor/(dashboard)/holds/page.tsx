"use client";

import { useEffect, useState } from "react";

interface HoldDTO {
  _id: string;
  items: { name: string; price: number; quantity: number }[];
  total: number;
  visitDate: string;
  visitTime: string;
  status: "active" | "cancelled" | "past";
  createdAt: string;
  customer: { name: string; email: string; phone: string };
}

export default function VendorHoldsPage() {
  const [holds, setHolds] = useState<HoldDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/vendor/holds")
      .then((r) => r.json())
      .then((d) => setHolds(d.holds ?? []))
      .catch(() => setError("Failed to load holds. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-stack">
      <div className="section-head">
        <h2 className="section-title">Customer Holds ({holds.length})</h2>
      </div>
      <p className="muted">
        Products customers have reserved. Keep the items ready for the visit time; customers pay at the store.
      </p>
      {error && <div className="form-banner form-banner-error">{error}</div>}
      {loading ? (
        <p className="muted">Loading holds…</p>
      ) : holds.length === 0 ? (
        <p className="muted">No holds yet.</p>
      ) : (
        <div className="vendor-product-list">
          {holds.map((h) => (
            <div className="vendor-product-card" key={h._id}>
              <div className="vendor-product-info">
                <div className="vendor-product-head">
                  <h3>{h.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}</h3>
                  <span className="badge">{h.status}</span>
                </div>
                <p>Visit : {h.visitDate} at {h.visitTime}</p>
                <p>
                  Customer : {h.customer.name || h.customer.email || "—"}
                  {h.customer.phone ? ` · ${h.customer.phone}` : ""}
                </p>
                <p>Total (pay at store) : ₹{h.total}</p>
                <p>Placed : {new Date(h.createdAt).toLocaleString("en-IN")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
