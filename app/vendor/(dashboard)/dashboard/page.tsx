import Link from "next/link";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Store from "@/models/Store";
import Product from "@/models/Product";
import Hold from "@/models/Hold";
import OndcOrder from "@/models/OndcOrder";
import PosSyncLog from "@/models/PosSyncLog";
import { ondcConfig } from "@/lib/ondc/config";
import { storeChecks } from "@/lib/ondc/readiness";
import { providerName } from "@/lib/pos/providers";
import StoreOpenToggle from "@/components/vendor/StoreOpenToggle";
import { Icon } from "@/components/vendor/icons";

export const dynamic = "force-dynamic";

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const ago = (d: Date | null | undefined) => {
  if (!d) return "never";
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return `${Math.round(m / 1440)} d ago`;
};

export default async function VendorDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  await connectDB();
  const store = await Store.findOne({ ownerId: session.userId });
  if (!store) redirect("/vendor/onboarding");
  if (store.status !== "approved") redirect("/vendor/store-status");

  const cfg = ondcConfig();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const today = new Date().toISOString().slice(0, 10);

  const [products, holdsAgg, activeHolds, todaysHolds, ondcAgg, recentOndc, recentHolds, lastSync] = await Promise.all([
    Product.find({ storeId: store._id }).select("name stock lowStockThreshold status images emoji price ondc category unit brand mrp").lean(),
    Hold.aggregate([
      { $match: { storeId: store._id, createdAt: { $gte: since }, status: { $ne: "cancelled" } } },
      { $group: { _id: null, count: { $sum: 1 }, value: { $sum: "$total" } } },
    ]),
    Hold.countDocuments({ storeId: store._id, status: "active" }),
    Hold.countDocuments({ storeId: store._id, status: "active", visitDate: today }),
    cfg.enabled
      ? OndcOrder.aggregate([
          { $match: { storeId: store._id, createdAt: { $gte: since } } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              open: { $sum: { $cond: [{ $in: ["$state", ["Accepted", "In-progress"]] }, 1, 0] } },
              value: { $sum: { $cond: [{ $eq: ["$state", "Completed"] }, "$total", 0] } },
            },
          },
        ])
      : Promise.resolve([]),
    cfg.enabled ? OndcOrder.find({ storeId: store._id }).sort({ createdAt: -1 }).limit(5).lean() : Promise.resolve([]),
    Hold.find({ storeId: store._id }).sort({ createdAt: -1 }).limit(5).lean(),
    PosSyncLog.findOne({ storeId: store._id }).sort({ createdAt: -1 }).lean(),
  ]);

  const approved = products.filter((p) => !p.status || p.status === "approved").length;
  const pending = products.filter((p) => p.status === "under_review").length;
  const out = products.filter((p) => (p.stock ?? 0) <= 0);
  const low = products
    .filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= (p.lowStockThreshold ?? 5))
    .sort((a, b) => a.stock - b.stock);
  const holds30 = holdsAgg[0] ?? { count: 0, value: 0 };
  const ondc30 = (ondcAgg as { count: number; open: number; value: number }[])[0] ?? { count: 0, open: 0, value: 0 };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const checks = cfg.enabled ? storeChecks(store, products as any) : [];
  const passed = checks.filter((c) => c.level === "ok").length;
  const score = checks.length ? Math.round((passed / checks.length) * 100) : 0;

  const alerts: { tone: "err" | "warn" | "info"; text: string; href: string; cta: string }[] = [];
  if (ondc30.open > 0) alerts.push({ tone: "info", text: `${ondc30.open} ONDC order${ondc30.open > 1 ? "s" : ""} waiting to be packed or picked up`, href: "/vendor/ondc-orders", cta: "Open orders" });
  if (todaysHolds > 0) alerts.push({ tone: "info", text: `${todaysHolds} customer visit${todaysHolds > 1 ? "s" : ""} scheduled today`, href: "/vendor/holds", cta: "View holds" });
  if (out.length > 0) alerts.push({ tone: "err", text: `${out.length} product${out.length > 1 ? "s are" : " is"} out of stock and hidden from buyers`, href: "/vendor/products?stock=out", cta: "Restock" });
  if (low.length > 0) alerts.push({ tone: "warn", text: `${low.length} product${low.length > 1 ? "s are" : " is"} running low`, href: "/vendor/products?stock=low", cta: "Review" });
  if (pending > 0) alerts.push({ tone: "warn", text: `${pending} product${pending > 1 ? "s are" : " is"} awaiting admin approval`, href: "/vendor/products?status=under_review", cta: "See products" });
  if (cfg.enabled && !store.ondcEnabled) alerts.push({ tone: "info", text: "Your store is not listed on ONDC yet — reach buyers on Paytm, Magicpin, Pincode and more", href: "/vendor/ondc", cta: "Go live" });

  const recent = [
    ...recentOndc.map((o) => ({
      key: `o${o._id}`,
      at: o.createdAt as Date,
      title: `ONDC order ${o.orderId}`,
      meta: `${o.items.length} item${o.items.length > 1 ? "s" : ""} · ${o.bapId}`,
      amount: o.total,
      badge: o.state,
      href: "/vendor/ondc-orders",
    })),
    ...recentHolds.map((h) => ({
      key: `h${h._id}`,
      at: h.createdAt as Date,
      title: `Hold · ${h.items.map((i) => i.name).join(", ")}`,
      meta: `Visit ${h.visitDate} at ${h.visitTime}`,
      amount: h.total,
      badge: h.status,
      href: "/vendor/holds",
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="vd">
      <section className="vd-hero">
        <div className="vd-hero-body">
          <h2>{greeting}, {store.owner?.split(" ")[0] || store.name}</h2>
          <p>
            {store.name} · {store.isOpen ? "open and taking orders" : "paused — customers can't place new orders"}
            {cfg.enabled ? (store.ondcEnabled ? " · live on ONDC" : " · not on ONDC yet") : ""}
          </p>
        </div>
        <StoreOpenToggle initial={store.isOpen} />
        <Link href="/vendor/products?new=1" className="vd-btn">
          <Icon.Plus /> Add product
        </Link>
      </section>

      <div className="vd-stats">
        <Link href="/vendor/products" className="vd-stat">
          <span className="vd-stat-label"><Icon.Box size={16} /> Products</span>
          <span className="vd-stat-value">{products.length}</span>
          <span className="vd-stat-foot">{approved} live{pending ? ` · ${pending} in review` : ""}</span>
        </Link>
        <Link href="/vendor/products?stock=low" className="vd-stat">
          <span className="vd-stat-label"><Icon.Alert size={16} /> Stock alerts</span>
          <span className="vd-stat-value">{low.length + out.length}</span>
          <span className={`vd-stat-foot${out.length ? " vd-stat-foot-err" : low.length ? " vd-stat-foot-warn" : ""}`}>
            {out.length} out · {low.length} low
          </span>
        </Link>
        <Link href="/vendor/holds" className="vd-stat">
          <span className="vd-stat-label"><Icon.Clock size={16} /> Active holds</span>
          <span className="vd-stat-value">{activeHolds}</span>
          <span className="vd-stat-foot">{todaysHolds} visiting today</span>
        </Link>
        {cfg.enabled && (
          <Link href="/vendor/ondc-orders" className="vd-stat">
            <span className="vd-stat-label"><Icon.Bag size={16} /> ONDC orders · 30d</span>
            <span className="vd-stat-value">{ondc30.count}</span>
            <span className={`vd-stat-foot${ondc30.open ? " vd-stat-foot-warn" : ""}`}>{ondc30.open} need action</span>
          </Link>
        )}
        <div className="vd-stat">
          <span className="vd-stat-label"><Icon.Trend size={16} /> Sales value · 30d</span>
          <span className="vd-stat-value">{INR.format(holds30.value + ondc30.value)}</span>
          <span className="vd-stat-foot">Holds {INR.format(holds30.value)}{cfg.enabled ? ` · ONDC ${INR.format(ondc30.value)}` : ""}</span>
        </div>
      </div>

      <div className="vd-grid vd-grid-main">
        <div className="vd-grid">
          <section className="vd-card">
            <div className="vd-card-head">
              <div>
                <h3>Needs your attention</h3>
                <p className="vd-sub">Things that affect sales right now</p>
              </div>
            </div>
            {alerts.length === 0 ? (
              <div className="vd-empty" style={{ padding: "1.25rem" }}>
                <span className="vd-empty-icon"><Icon.Check size={22} /></span>
                <h4>All caught up</h4>
                <p>No pending orders, stock issues or reviews.</p>
              </div>
            ) : (
              <div className="vd-list">
                {alerts.map((a) => (
                  <div className="vd-list-row" key={a.text}>
                    <span className={`vd-check-icon vd-check-icon-${a.tone === "err" ? "error" : a.tone === "warn" ? "warn" : "ok"}`} style={a.tone === "info" ? { background: "var(--vd-info-bg)", color: "var(--vd-info)" } : undefined}>
                      {a.tone === "info" ? <Icon.Bag size={14} /> : <Icon.Alert size={14} />}
                    </span>
                    <span className="vd-list-main" style={{ fontSize: "0.92rem" }}>{a.text}</span>
                    <Link href={a.href} className="vd-btn vd-btn-sm">{a.cta}</Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="vd-card">
            <div className="vd-card-head">
              <h3>Recent activity</h3>
            </div>
            {recent.length === 0 ? (
              <p className="vd-sub">No orders or holds yet. They will show up here as they come in.</p>
            ) : (
              <div className="vd-list">
                {recent.map((r) => (
                  <Link className="vd-list-row" key={r.key} href={r.href}>
                    <div className="vd-list-main">
                      <div className="vd-list-title">{r.title}</div>
                      <div className="vd-sub">{r.meta} · {ago(r.at)}</div>
                    </div>
                    <span className="vd-badge">{r.badge}</span>
                    <strong className="vd-num">{INR.format(r.amount)}</strong>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="vd-grid">
          {cfg.enabled && (
            <section className="vd-card">
              <div className="vd-card-head">
                <h3>ONDC readiness</h3>
                <span className={`vd-badge vd-badge-${store.ondcEnabled ? "ok" : "warn"}`}>
                  <span className="vd-dot" /> {store.ondcEnabled ? "Live" : "Not listed"}
                </span>
              </div>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <div className="vd-ring" style={{ ["--p" as string]: score }}><span>{score}%</span></div>
                <div>
                  <p style={{ fontSize: "0.92rem", fontWeight: 600 }}>{passed} of {checks.length} checks passed</p>
                  <p className="vd-sub" style={{ marginTop: "0.2rem" }}>
                    {checks.find((c) => c.level === "error")?.label
                      ? `Fix: ${checks.find((c) => c.level === "error")!.label}`
                      : checks.find((c) => c.level === "warn")?.label
                        ? `Improve: ${checks.find((c) => c.level === "warn")!.label}`
                        : "Your store is fully set up."}
                  </p>
                  <Link href="/vendor/ondc" className="vd-btn vd-btn-sm" style={{ marginTop: "0.6rem" }}>Manage ONDC</Link>
                </div>
              </div>
            </section>
          )}

          <section className="vd-card">
            <div className="vd-card-head">
              <h3>POS sync</h3>
              <span className={`vd-badge vd-badge-${store.pos?.apiKeyHash ? "ok" : "neutral"}`}>
                <span className="vd-dot" /> {store.pos?.apiKeyHash ? "Connected" : "Not connected"}
              </span>
            </div>
            <p className="vd-sub">
              {store.pos?.apiKeyHash
                ? `${providerName(store.pos.provider)} · last sync ${ago(store.pos.lastSyncAt)}`
                : "Connect your billing / POS system to keep stock and prices in sync automatically."}
            </p>
            {lastSync && (
              <p className="vd-sub" style={{ marginTop: "0.35rem" }}>
                Last run: {lastSync.kind.replace("_", " ")} · {lastSync.updated + lastSync.created} updated{lastSync.failed ? `, ${lastSync.failed} failed` : ""}
              </p>
            )}
            <Link href="/vendor/pos" className="vd-btn vd-btn-sm" style={{ marginTop: "0.75rem" }}>
              {store.pos?.apiKeyHash ? "View sync log" : "Connect POS"}
            </Link>
          </section>

          <section className="vd-card">
            <div className="vd-card-head">
              <h3>Low stock</h3>
              <Link href="/vendor/products?stock=low" className="vd-sub">View all</Link>
            </div>
            {low.length + out.length === 0 ? (
              <p className="vd-sub">Every product is above its low-stock level.</p>
            ) : (
              <div className="vd-list">
                {[...out, ...low].slice(0, 6).map((p) => (
                  <div className="vd-list-row" key={String(p._id)}>
                    <span className="vd-thumb" style={p.images?.[0] ? { backgroundImage: `url(${p.images[0]})` } : undefined}>
                      {!p.images?.[0] && (p.emoji || "📦")}
                    </span>
                    <div className="vd-list-main">
                      <div className="vd-list-title">{p.name}</div>
                      <div className="vd-sub">Alert at {p.lowStockThreshold ?? 5}</div>
                    </div>
                    <span className={`vd-badge vd-badge-${p.stock <= 0 ? "err" : "warn"}`}>{p.stock <= 0 ? "Out" : `${p.stock} left`}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
