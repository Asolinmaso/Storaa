"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, Badge, Dialog, Empty, Icon, inr, Skeleton, timeAgo, useToast, VdButton } from "@/components/vendor/ui";

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
type Action = "collected" | "cancel";

/** Today's date in the shop's own time zone, as YYYY-MM-DD (the format visit dates are stored in). */
const todayStr = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function VendorHoldsPage() {
  const [holds, setHolds] = useState<HoldDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("active");
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState<{ hold: HoldDTO; action: Action } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { toast, node } = useToast();

  const load = useCallback(async (pickTab = false) => {
    try {
      const d = await api<{ holds: HoldDTO[] }>("/api/vendor/holds");
      const list = d.holds ?? [];
      setHolds(list);
      setError(null);
      if (pickTab && list.some((h) => h.status === "active" && h.visitDate === todayStr())) setTab("today");
    } catch {
      setError("Could not load holds. Check your internet connection and refresh the page.");
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

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

  async function act(hold: HoldDTO, action: Action) {
    setBusyId(hold._id);
    try {
      await api(`/api/vendor/holds/${hold._id}`, { method: "POST", json: { action } });
      toast(
        action === "collected"
          ? "Marked as collected. Thank you!"
          : hold.paymentStatus === "paid"
            ? "Hold cancelled. The customer's payment is being refunded and the items are back on sale."
            : "Hold cancelled. The items are back on sale."
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "That didn't work. Please try again.", true);
    } finally {
      setBusyId(null);
      setConfirm(null);
      await load();
    }
  }

  const today = todayStr();

  return (
    <div className="vd">
      <div className="vd-head">
        <div>
          <h2>Customer holds</h2>
          <p>
            Products customers have reserved on Storaa. The stock is already set aside for them. When the customer comes in, press
            <strong> Customer collected it</strong>. If they don&apos;t come, press <strong>Didn&apos;t come</strong> to put the items back on sale.
          </p>
        </div>
      </div>

      <div className="vd-toolbar">
        <div className="vd-tabs" role="tablist">
          {(["today", "active", "past", "cancelled", "all"] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={`vd-tab${tab === t ? " vd-tab-active" : ""}`} onClick={() => setTab(t)}>
              {{ today: "Visiting today", active: "Upcoming", past: "Collected", cancelled: "Cancelled", all: "All" }[t]}
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
          {shown.map((h) => {
            const overdue = h.status === "active" && h.visitDate < today;
            const busy = busyId === h._id;
            return (
              <article className={`vd-order${h.status === "active" && h.visitDate === today ? " vd-order-new" : ""}`} key={h._id}>
                <header className="vd-order-head">
                  <strong>{h.customer.name || h.customer.email || "Customer"}</strong>
                  <Badge tone={h.status === "active" ? "info" : h.status === "past" ? "ok" : "err"} dot>
                    {h.status === "active" ? "Upcoming" : h.status === "past" ? "Collected" : "Cancelled"}
                  </Badge>
                  <Badge tone={h.paymentStatus === "paid" ? "ok" : "neutral"}>{h.paymentStatus === "paid" ? "Paid online" : "Pay at store"}</Badge>
                  {overdue && <Badge tone="warn"><Icon.Alert size={12} /> Visit date passed</Badge>}
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
                      <span>{h.paymentStatus === "paid" ? "Already paid online" : "To collect at the counter"}</span>
                      <span className="vd-num">{inr(h.total)}</span>
                    </div>
                  </div>
                  <dl className="vd-kv">
                    <dt>Visit</dt>
                    <dd><strong>{h.visitDate === today ? "Today" : h.visitDate}</strong> at {h.visitTime}</dd>
                    <dt>Phone</dt>
                    <dd>{h.customer.phone ? <a href={`tel:${h.customer.phone}`} style={{ color: "var(--purple)", fontWeight: 600 }}>{h.customer.phone}</a> : "—"}</dd>
                    <dt>Email</dt>
                    <dd>{h.customer.email || "—"}</dd>
                  </dl>
                </div>
                {h.status === "active" && (
                  <footer className="vd-order-foot">
                    {overdue && h.paymentStatus !== "paid" && (
                      <span className="vd-sub">Not collected? It is released automatically a day after the visit date.</span>
                    )}
                    <span className="vd-spacer" />
                    <VdButton small variant="danger" disabled={busy} onClick={() => setConfirm({ hold: h, action: "cancel" })}>Didn&apos;t come — cancel</VdButton>
                    <VdButton small variant="primary" loading={busy} onClick={() => setConfirm({ hold: h, action: "collected" })}>Customer collected it</VdButton>
                  </footer>
                )}
              </article>
            );
          })}
        </div>
      )}

      {confirm && (
        <Dialog
          title={confirm.action === "collected" ? "Customer collected the items?" : "Cancel this hold?"}
          onClose={() => setConfirm(null)}
          actions={
            <>
              <VdButton onClick={() => setConfirm(null)}>Go back</VdButton>
              <VdButton
                variant="primary"
                style={confirm.action === "cancel" ? { background: "var(--vd-err)", borderColor: "var(--vd-err)" } : undefined}
                loading={busyId === confirm.hold._id}
                onClick={() => act(confirm.hold, confirm.action)}
              >
                {confirm.action === "collected" ? "Yes, collected" : "Yes, cancel hold"}
              </VdButton>
            </>
          }
        >
          <p className="vd-sub">
            {confirm.action === "collected"
              ? confirm.hold.paymentStatus === "paid"
                ? "The customer already paid online. Hand over the items, then confirm."
                : <>Collect <strong>{inr(confirm.hold.total)}</strong> at the counter and hand over the items, then confirm.</>
              : confirm.hold.paymentStatus === "paid"
                ? <>The customer paid <strong>{inr(confirm.hold.total)}</strong> online. It will be refunded to them, and the items go back on sale.</>
                : "The items go back on sale straight away, on Storaa and on ONDC."}
          </p>
        </Dialog>
      )}
      {node}
    </div>
  );
}
