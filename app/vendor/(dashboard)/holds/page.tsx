"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Empty, Icon, inr, Skeleton, timeAgo } from "@/components/vendor/ui";

interface HoldDTO {
  _id: string;
  items: { name: string; price: number; quantity: number }[];
  total: number;
  visitDate: string;
  visitTime: string;
  status: "active" | "cancelled" | "past";
  paymentStatus?: "unpaid" | "paid";
  createdAt: string;
  customer: { name: string; email: string; phone: string };
}

type Tab = "today" | "active" | "past" | "cancelled" | "all";
const todayStr = () => new Date().toISOString().slice(0, 10);

export default function VendorHoldsPage() {
  const [holds, setHolds] = useState<HoldDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("active");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/vendor/holds")
      .then((r) => r.json())
      .then((d) => {
        const list: HoldDTO[] = d.holds ?? [];
        setHolds(list);
        if (list.some((h) => h.status === "active" && h.visitDate === todayStr())) setTab("today");
      })
      .catch(() => setError("Failed to load holds. Please refresh."));
  }, []);

  const groups = useMemo(() => {
    const list = holds ?? [];
    const t = todayStr();
    return {
      today: list.filter((h) => h.status === "active" && h.visitDate === t),
      active: list.filter((h) => h.status === "active"),
      past: list.filter((h) => h.status === "past"),
      cancelled: list.filter((h) => h.status === "cancelled"),
      all: list,
    };
  }, [holds]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = [...groups[tab]].sort((a, b) =>
      tab === "active" || tab === "today"
        ? `${a.visitDate} ${a.visitTime}`.localeCompare(`${b.visitDate} ${b.visitTime}`)
        : b.createdAt.localeCompare(a.createdAt)
    );
    if (!needle) return list;
    return list.filter((h) =>
      [h.customer.name, h.customer.email, h.customer.phone, ...h.items.map((i) => i.name)].some((v) => v?.toLowerCase().includes(needle))
    );
  }, [groups, tab, q]);

  return (
    <div className="vd">
      <div className="vd-head">
        <div>
          <h2>Customer holds</h2>
          <p>Products customers have reserved on Storaa. Keep them ready for the visit time — stock is already set aside.</p>
        </div>
      </div>

      <div className="vd-toolbar">
        <div className="vd-tabs" role="tablist">
          {(["today", "active", "past", "cancelled", "all"] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={`vd-tab${tab === t ? " vd-tab-active" : ""}`} onClick={() => setTab(t)}>
              {{ today: "Visiting today", active: "Upcoming", past: "Completed", cancelled: "Cancelled", all: "All" }[t]}
              <span className="vd-tab-count">{groups[t].length}</span>
            </button>
          ))}
        </div>
        <div className="vd-input-group">
          <Icon.Search />
          <input className="vd-input" type="search" placeholder="Customer, phone or product" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search holds" />
        </div>
      </div>

      {error && <div className="vd-error">{error}</div>}

      {holds === null && !error ? (
        <div className="vd-orders">{[0, 1, 2].map((i) => <Skeleton key={i} h={150} />)}</div>
      ) : shown.length === 0 ? (
        <section className="vd-card">
          <Empty icon={<Icon.Clock size={24} />} title={holds?.length ? "No holds here" : "No holds yet"} text={holds?.length ? "Try another tab or search." : "When customers reserve your products, they appear here."} />
        </section>
      ) : (
        <div className="vd-orders">
          {shown.map((h) => (
            <article className={`vd-order${h.status === "active" && h.visitDate === todayStr() ? " vd-order-new" : ""}`} key={h._id}>
              <header className="vd-order-head">
                <strong>{h.customer.name || h.customer.email || "Customer"}</strong>
                <Badge tone={h.status === "active" ? "info" : h.status === "past" ? "ok" : "err"} dot>
                  {h.status === "active" ? "Upcoming" : h.status === "past" ? "Completed" : "Cancelled"}
                </Badge>
                <Badge tone={h.paymentStatus === "paid" ? "ok" : "neutral"}>{h.paymentStatus === "paid" ? "Paid online" : "Pay at store"}</Badge>
                <span className="vd-order-time">{timeAgo(h.createdAt)}</span>
              </header>
              <div className="vd-order-body">
                <div className="vd-order-items">
                  {h.items.map((i, idx) => (
                    <div className="vd-order-item" key={idx}>
                      <span><strong>{i.quantity} ×</strong> {i.name}</span>
                      <span className="vd-num">{inr(i.price * i.quantity)}</span>
                    </div>
                  ))}
                  <div className="vd-order-total">
                    <span>{h.paymentStatus === "paid" ? "Paid" : "To collect"}</span>
                    <span className="vd-num">{inr(h.total)}</span>
                  </div>
                </div>
                <dl className="vd-kv">
                  <dt>Visit</dt>
                  <dd><strong>{h.visitDate === todayStr() ? "Today" : h.visitDate}</strong> at {h.visitTime}</dd>
                  <dt>Phone</dt>
                  <dd>{h.customer.phone ? <a href={`tel:${h.customer.phone}`} style={{ color: "var(--purple)", fontWeight: 600 }}>{h.customer.phone}</a> : "—"}</dd>
                  <dt>Email</dt>
                  <dd>{h.customer.email || "—"}</dd>
                </dl>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
