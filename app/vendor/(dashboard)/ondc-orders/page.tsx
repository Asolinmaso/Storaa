"use client";

import { useEffect, useState } from "react";

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface OndcOrderDTO {
  _id: string;
  orderId: string;
  bapId: string;
  total: number;
  state: "Accepted" | "In-progress" | "Completed" | "Cancelled";
  fulfillmentState: "Pending" | "Packed" | "Order-picked-up" | "Cancelled";
  items: OrderItem[];
  billing?: { name?: string };
  fulfillment?: { end?: { contact?: { phone?: string } } };
  createdAt: string;
}

type SellerAction = "pack" | "picked_up" | "cancel";

const NEXT_ACTION: Partial<Record<OndcOrderDTO["fulfillmentState"], { action: SellerAction; label: string }>> = {
  Pending: { action: "pack", label: "Mark as Packed" },
  Packed: { action: "picked_up", label: "Mark as Picked Up" },
};

export default function VendorOndcOrdersPage() {
  const [orders, setOrders] = useState<OndcOrderDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/vendor/ondc/orders");
    const data = await res.json();
    setOrders(data.orders ?? []);
  }

  useEffect(() => {
    load()
      .catch(() => setError("Failed to load ONDC orders. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  async function act(id: string, action: SellerAction) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/vendor/ondc/orders/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "That action is not allowed right now.");
      }
      await load();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page-stack">
      <div className="section-head">
        <h2 className="section-title">ONDC Orders ({orders.length})</h2>
      </div>
      <p className="muted">
        Orders placed on the ONDC network. Customers pay at the store when they pick the order up.
      </p>

      {error && <div className="form-banner form-banner-error">{error}</div>}
      {loading ? (
        <p className="muted">Loading ONDC orders…</p>
      ) : orders.length === 0 ? (
        <p className="muted">No ONDC orders yet.</p>
      ) : (
        <div className="vendor-product-list">
          {orders.map((o) => {
            const next = NEXT_ACTION[o.fulfillmentState];
            const open = o.state === "Accepted" || o.state === "In-progress";
            const busy = busyId === o._id;
            return (
              <div className="vendor-product-card" key={o._id}>
                <div className="vendor-product-info">
                  <div className="vendor-product-head">
                    <h3>Order {o.orderId}</h3>
                    <div className="vendor-product-actions">
                      {open && next && (
                        <button
                          type="button"
                          className="btn btn-outline-purple btn-sm"
                          disabled={busy}
                          onClick={() => act(o._id, next.action)}
                        >
                          {busy ? "Updating…" : next.label}
                        </button>
                      )}
                      {open && (
                        <button
                          type="button"
                          className="btn-delete-outline"
                          disabled={busy}
                          onClick={() => act(o._id, "cancel")}
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                  <p>
                    Status : <span className="badge">{o.state}</span> · Fulfilment : {o.fulfillmentState}
                  </p>
                  <p>
                    Customer : {o.billing?.name || "—"}
                    {o.fulfillment?.end?.contact?.phone ? ` · ${o.fulfillment.end.contact.phone}` : ""}
                  </p>
                  <p>
                    Items : {o.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}
                  </p>
                  <p>Total (pay at store) : ₹{o.total}</p>
                  <p>
                    From : {o.bapId} · {new Date(o.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
