"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Badge, dateTime, Dialog, Empty, Icon, inr, Skeleton, timeAgo, useToast, VdButton, type Tone } from "@/components/vendor/ui";

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
  domain: string;
  total: number;
  state: "Accepted" | "In-progress" | "Completed" | "Cancelled";
  fulfillmentState: "Pending" | "Packed" | "Order-picked-up" | "Cancelled";
  items: OrderItem[];
  billing?: { name?: string; phone?: string; email?: string };
  fulfillment?: {
    end?: {
      contact?: { phone?: string; email?: string };
      person?: { name?: string };
      time?: { range?: { start?: string; end?: string } };
    };
  };
  cancellation?: { reasonId: string; cancelledBy: string } | null;
  rating?: { value: number; feedback: string } | null;
  createdAt: string;
  updatedAt: string;
}

type SellerAction = "pack" | "picked_up" | "cancel";
type Tab = "new" | "packed" | "completed" | "cancelled" | "all";

const REFRESH_MS = 20_000;

const NEXT: Partial<Record<OndcOrderDTO["fulfillmentState"], { action: SellerAction; label: string }>> = {
  Pending: { action: "pack", label: "Mark as packed" },
  Packed: { action: "picked_up", label: "Picked up & paid" },
};

const TAB_OF = (o: OndcOrderDTO): Exclude<Tab, "all"> =>
  o.state === "Cancelled" ? "cancelled" : o.state === "Completed" ? "completed" : o.fulfillmentState === "Packed" ? "packed" : "new";

const STATE_TONE: Record<OndcOrderDTO["state"], Tone> = {
  Accepted: "info",
  "In-progress": "purple",
  Completed: "ok",
  Cancelled: "err",
};

const CANCEL_REASONS: Record<string, string> = {
  "001": "Price changed",
  "002": "Store not serviceable",
  "003": "Product unavailable",
  "005": "Merchant rejected",
  "006": "Buyer changed mind",
  "010": "Items not available (seller)",
  "011": "Buyer not found / no-show",
  "012": "Buyer cancelled",
};

function Steps({ o }: { o: OndcOrderDTO }) {
  if (o.state === "Cancelled") {
    return (
      <div className="vd-steps">
        <Badge tone="err"><Icon.X size={12} /> Cancelled by {o.cancellation?.cancelledBy === "SELLER" ? "you" : "buyer"}
          {o.cancellation?.reasonId ? ` · ${CANCEL_REASONS[o.cancellation.reasonId] ?? `reason ${o.cancellation.reasonId}`}` : ""}
        </Badge>
      </div>
    );
  }
  const idx = o.fulfillmentState === "Order-picked-up" ? 3 : o.fulfillmentState === "Packed" ? 2 : 1;
  const steps = ["Accepted", "Packed", "Picked up"];
  return (
    <div className="vd-steps" aria-label={`Progress: ${steps[idx - 1]}`}>
      {steps.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <div key={s} style={{ display: "contents" }}>
            {i > 0 && <span className={`vd-step-line${done ? " vd-step-line-done" : ""}`} />}
            <span className={`vd-step${done ? " vd-step-done" : current ? " vd-step-current" : ""}`}>
              <span className="vd-step-dot">{done && <Icon.Check size={10} />}</span>
              <span className="vd-step-label">{s}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function pickupWindow(o: OndcOrderDTO): string | null {
  const r = o.fulfillment?.end?.time?.range;
  if (!r?.start) return null;
  const fmt = (s: string) => new Date(s).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  const day = new Date(r.start).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  return `${day}, ${fmt(r.start)}${r.end ? ` – ${fmt(r.end)}` : ""}`;
}

export default function VendorOndcOrdersPage() {
  const [orders, setOrders] = useState<OndcOrderDTO[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("new");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<OndcOrderDTO | null>(null);
  const [lastLoaded, setLastLoaded] = useState<Date | null>(null);
  const [, tick] = useState(0);
  const knownIds = useRef<Set<string> | null>(null);
  const { toast, node } = useToast();
  const router = useRouter();

  const load = useCallback(async (quiet = false) => {
    try {
      const data = await api<{ orders: OndcOrderDTO[] }>("/api/vendor/ondc/orders");
      const list = data.orders ?? [];
      if (knownIds.current) {
        const fresh = list.filter((o) => !knownIds.current!.has(o._id));
        if (fresh.length) {
          toast(`${fresh.length} new ONDC order${fresh.length > 1 ? "s" : ""} received`);
          router.refresh(); // update the sidebar badge
        }
      }
      knownIds.current = new Set(list.map((o) => o._id));
      setOrders(list);
      setLastLoaded(new Date());
      setError("");
    } catch (e) {
      if (!quiet) setError(e instanceof Error ? e.message : "Failed to load ONDC orders.");
    }
  }, [toast, router]);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load(true);
      tick((n) => n + 1);
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const counts = useMemo(() => {
    const c = { new: 0, packed: 0, completed: 0, cancelled: 0, all: orders?.length ?? 0 };
    for (const o of orders ?? []) c[TAB_OF(o)]++;
    return c;
  }, [orders]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (orders ?? []).filter((o) => {
      if (tab !== "all" && TAB_OF(o) !== tab) return false;
      if (!needle) return true;
      return [o.orderId, o.billing?.name, o.billing?.phone, o.fulfillment?.end?.contact?.phone, o.bapId, ...o.items.map((i) => i.name)]
        .some((v) => v?.toLowerCase().includes(needle));
    });
  }, [orders, tab, q]);

  async function act(o: OndcOrderDTO, action: SellerAction) {
    setBusyId(o._id);
    try {
      await api(`/api/vendor/ondc/orders/${o._id}`, { method: "POST", json: { action } });
      toast(
        action === "pack" ? `Order ${o.orderId} marked packed — buyer notified`
          : action === "picked_up" ? `Order ${o.orderId} completed`
            : `Order ${o.orderId} cancelled — stock returned`
      );
      await load(true);
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "That action is not allowed right now.", true);
      await load(true);
    } finally {
      setBusyId(null);
      setConfirmCancel(null);
    }
  }

  return (
    <div className="vd">
      <div className="vd-head">
        <div>
          <h2>ONDC orders</h2>
          <p>Self-pickup orders from ONDC buyer apps. The buyer pays at your counter when they collect.</p>
        </div>
        <div className="vd-head-actions" style={{ alignItems: "center" }}>
          <span className="vd-sub">
            <span className="vd-dot vd-dot-pulse" style={{ display: "inline-block", color: "var(--vd-ok)", marginRight: "0.4rem" }} />
            Auto-refresh · updated {timeAgo(lastLoaded)}
          </span>
          <VdButton small icon={<Icon.Refresh />} onClick={() => load()}>Refresh</VdButton>
        </div>
      </div>

      <div className="vd-toolbar">
        <div className="vd-tabs" role="tablist">
          {(["new", "packed", "completed", "cancelled", "all"] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={`vd-tab${tab === t ? " vd-tab-active" : ""}`} onClick={() => setTab(t)}>
              {{ new: "To pack", packed: "Ready for pickup", completed: "Completed", cancelled: "Cancelled", all: "All" }[t]}
              <span className="vd-tab-count">{counts[t]}</span>
            </button>
          ))}
        </div>
        <div className="vd-input-group">
          <Icon.Search />
          <input className="vd-input" type="search" placeholder="Order id, customer, phone or item" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders" />
        </div>
      </div>

      {error && <div className="vd-error">{error}</div>}

      {orders === null ? (
        <div className="vd-orders">{[0, 1, 2].map((i) => <Skeleton key={i} h={190} />)}</div>
      ) : shown.length === 0 ? (
        <section className="vd-card">
          <Empty
            icon={<Icon.Bag size={24} />}
            title={orders.length === 0 ? "No ONDC orders yet" : "No orders here"}
            text={orders.length === 0 ? "Once your store is listed, orders from ONDC buyer apps appear here instantly." : tab === "new" ? "Nothing waiting to be packed. Nice work!" : "Try another tab or search."}
          />
        </section>
      ) : (
        <div className="vd-orders">
          {shown.map((o) => {
            const next = NEXT[o.fulfillmentState];
            const open = o.state === "Accepted" || o.state === "In-progress";
            const busy = busyId === o._id;
            const phone = o.fulfillment?.end?.contact?.phone || o.billing?.phone;
            const name = o.fulfillment?.end?.person?.name || o.billing?.name;
            const pickupAt = pickupWindow(o);
            const units = o.items.reduce((s, i) => s + i.quantity, 0);
            return (
              <article className={`vd-order${o.fulfillmentState === "Pending" && open ? " vd-order-new" : ""}`} key={o._id}>
                <header className="vd-order-head">
                  <span className="vd-order-id">#{o.orderId}</span>
                  <Badge tone={STATE_TONE[o.state]} dot>{o.state === "Accepted" ? "New" : o.state}</Badge>
                  <span className="vd-order-time" title={new Date(o.createdAt).toLocaleString("en-IN")}>{timeAgo(o.createdAt)}</span>
                </header>
                <div className="vd-order-body">
                  <div className="vd-order-items">
                    {o.items.map((i) => (
                      <div className="vd-order-item" key={i.productId}>
                        <span><strong>{i.quantity} ×</strong> {i.name}</span>
                        <span className="vd-num">{inr(i.price * i.quantity)}</span>
                      </div>
                    ))}
                    <div className="vd-order-total">
                      <span>{o.state === "Completed" ? "Collected" : "To collect at pickup"} · {units} item{units > 1 ? "s" : ""}</span>
                      <span className="vd-num">{inr(o.total)}</span>
                    </div>
                  </div>
                  <dl className="vd-kv">
                    <dt>Customer</dt>
                    <dd>{name || "—"}</dd>
                    <dt>Phone</dt>
                    <dd>{phone ? <a href={`tel:${phone}`} style={{ color: "var(--purple)", fontWeight: 600 }}>{phone}</a> : "—"}</dd>
                    {pickupAt && (<><dt>Pickup</dt><dd>{pickupAt}</dd></>)}
                    <dt>Buyer app</dt>
                    <dd>{o.bapId}</dd>
                    <dt>Placed</dt>
                    <dd>{dateTime(o.createdAt)}</dd>
                    {o.rating && (<><dt>Rating</dt><dd>{"★".repeat(Math.round(o.rating.value))} {o.rating.feedback}</dd></>)}
                  </dl>
                </div>
                <footer className="vd-order-foot">
                  <Steps o={o} />
                  <span className="vd-spacer" />
                  {open && (
                    <VdButton small variant="danger" disabled={busy} onClick={() => setConfirmCancel(o)}>Cancel</VdButton>
                  )}
                  {open && next && (
                    <VdButton small variant="primary" loading={busy} onClick={() => act(o, next.action)}>{next.label}</VdButton>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {confirmCancel && (
        <Dialog
          title={`Cancel order #${confirmCancel.orderId}?`}
          onClose={() => setConfirmCancel(null)}
          actions={
            <>
              <VdButton onClick={() => setConfirmCancel(null)}>Keep order</VdButton>
              <VdButton variant="primary" style={{ background: "var(--vd-err)", borderColor: "var(--vd-err)" }} loading={busyId === confirmCancel._id} onClick={() => act(confirmCancel, "cancel")}>
                Cancel order
              </VdButton>
            </>
          }
        >
          <p className="vd-sub">
            The buyer app is told the items are unavailable and the stock is returned to your inventory. Frequent seller cancellations can lower your
            store&apos;s ranking on ONDC.
          </p>
        </Dialog>
      )}
      {node}
    </div>
  );
}
