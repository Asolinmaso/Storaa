"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ReadinessCheck } from "@/lib/ondc/readiness";
import { parseCoordinates } from "@/lib/geo";
import { api, Badge, Dialog, Empty, Icon, inr, Skeleton, Switch, useToast, VdButton } from "@/components/vendor/ui";

interface Item {
  _id: string;
  name: string;
  image: string;
  category: string;
  ondcCategory: string | null;
  price: number;
  stock: number;
  listed: boolean;
  errors: string[];
  warnings: string[];
}

interface Readiness {
  platform: { enabled: boolean; subscriberId: string; registry: string; environment: string; network: string; cityCode: string };
  store: { name: string; status: string; ondcEnabled: boolean; isOpen: boolean; latitude: number | null; longitude: number | null; address: string };
  checks: ReadinessCheck[];
  items: Item[];
  stats: { orders: number; completed: number; cancelled: number; open: number; revenue: number; buyerApps: string[] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  preview: any;
}

type Tab = "issues" | "ready" | "hidden" | "all";

function CheckIcon({ level }: { level: ReadinessCheck["level"] }) {
  return (
    <span className={`vd-check-icon vd-check-icon-${level}`}>
      {level === "ok" ? <Icon.Check size={14} /> : level === "warn" ? <Icon.Alert size={13} /> : <Icon.X size={13} />}
    </span>
  );
}

export default function OndcNetworkPage() {
  const [data, setData] = useState<Readiness | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [locating, setLocating] = useState(false);
  const [pasted, setPasted] = useState("");
  const [savingLoc, setSavingLoc] = useState(false);
  const [tab, setTab] = useState<Tab>("issues");
  const [showJson, setShowJson] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const { toast, node } = useToast();

  const load = useCallback(async () => {
    const d = await api<Readiness>("/api/vendor/ondc/readiness");
    setData(d);
    setLat(d.store.latitude != null ? String(d.store.latitude) : "");
    setLng(d.store.longitude != null ? String(d.store.longitude) : "");
    return d;
  }, []);

  useEffect(() => {
    load()
      .then((d) => {
        if (!d.items.some((i) => i.listed && i.errors.length)) setTab("all");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load ONDC status."));
  }, [load]);

  const counts = useMemo(() => {
    const items = data?.items ?? [];
    return {
      all: items.length,
      ready: items.filter((i) => i.listed && !i.errors.length).length,
      issues: items.filter((i) => i.listed && i.errors.length).length,
      hidden: items.filter((i) => !i.listed).length,
    };
  }, [data]);

  const shown = useMemo(() => {
    const items = data?.items ?? [];
    if (tab === "ready") return items.filter((i) => i.listed && !i.errors.length);
    if (tab === "issues") return items.filter((i) => i.listed && i.errors.length);
    if (tab === "hidden") return items.filter((i) => !i.listed);
    return items;
  }, [data, tab]);

  async function setListing(next: boolean) {
    setBusy(true);
    try {
      await api("/api/vendor/store", { method: "PATCH", json: { ondcEnabled: next } });
      await load();
      toast(next ? "Done — your store is switched on for ONDC" : "Done — your store is no longer shown on ONDC. Storaa and your POS keep working as before.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not update", true);
    } finally {
      setBusy(false);
      setConfirmOff(false);
    }
  }

  async function saveLocation(la = lat, ln = lng) {
    setSavingLoc(true);
    try {
      await api("/api/vendor/store", { method: "PATCH", json: { latitude: Number(la), longitude: Number(ln) } });
      await load();
      toast("Pickup location saved");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save location", true);
    } finally {
      setSavingLoc(false);
    }
  }

  /** Accepts "13.08, 80.27" or a Google Maps link and fills both fields. */
  function onPaste(text: string) {
    setPasted(text);
    if (!text.trim()) return;
    const c = parseCoordinates(text);
    if (c) {
      setLat(c.lat.toFixed(6));
      setLng(c.lng.toFixed(6));
      toast("Location read from what you pasted. Check it on the map, then save.");
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast("Your browser can't share location. Enter the coordinates instead.", true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude.toFixed(6);
        const ln = pos.coords.longitude.toFixed(6);
        setLat(la);
        setLng(ln);
        setLocating(false);
        toast(`Location found (±${Math.round(pos.coords.accuracy)} m). Check it and save.`);
      },
      () => {
        setLocating(false);
        toast("Location permission was denied.", true);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function toggleItem(item: Item) {
    try {
      await api(`/api/vendor/products/${item._id}`, { method: "PATCH", json: { ondc: { listed: !item.listed } } });
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not update product", true);
    }
  }

  if (error) return <div className="vd"><div className="vd-error">{error}</div></div>;
  if (!data) {
    return (
      <div className="vd">
        <Skeleton h={110} />
        <div className="vd-stats">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={92} />)}</div>
        <Skeleton h={320} />
      </div>
    );
  }

  const { platform, store, checks, stats } = data;
  const passed = checks.filter((c) => c.level === "ok").length;
  const blocking = checks.filter((c) => c.level === "error" && c.id !== "optin" && c.id !== "platform");
  const networkLive = platform.network === "subscribed";
  const visible = store.ondcEnabled && networkLive && blocking.length === 0;
  const canList = platform.enabled && store.status === "approved";
  const cantListWhy = !platform.enabled
    ? "ONDC isn't switched on for Storaa yet."
    : store.status !== "approved"
      ? "Your store must be approved by Storaa before you can list it."
      : "";
  const latValid = lat !== "" && Math.abs(Number(lat)) <= 90 && Number.isFinite(Number(lat));
  const lngValid = lng !== "" && Math.abs(Number(lng)) <= 180 && Number.isFinite(Number(lng));
  const locChanged = lat !== String(store.latitude ?? "") || lng !== String(store.longitude ?? "");

  return (
    <div className="vd">
      <section className="vd-hero">
        <div className="vd-hero-body">
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.35rem" }}>
            <Badge tone={visible ? "ok" : store.ondcEnabled ? "warn" : "neutral"} dot pulse={visible}>
              {visible ? "Live on ONDC" : store.ondcEnabled ? "Switched on · not visible to buyers yet" : "Off"}
            </Badge>
            <Badge tone="purple">{platform.environment}</Badge>
          </div>
          <h2>Sell on the ONDC network</h2>
          <p>
            List {store.name} on India&apos;s Open Network for Digital Commerce. Buyers on any ONDC app can discover your products and
            place self-pickup orders, paid at your counter.
          </p>
        </div>
        <Switch
          checked={store.ondcEnabled}
          disabled={busy || !canList}
          onChange={(next) => (next ? setListing(true) : setConfirmOff(true))}
          label={store.ondcEnabled ? "On" : "Turn on ONDC"}
        />
        {cantListWhy && <p className="vd-sub" style={{ flexBasis: "100%", margin: 0 }}>{cantListWhy}</p>}
      </section>

      {!networkLive && (
        <div className="vd-note vd-note-warn">
          <strong>Buyers can&apos;t see any Storaa store on ONDC yet.</strong> {checks.find((c) => c.id === "platform")?.detail}
        </div>
      )}
      {platform.enabled && blocking.length > 0 && (
        <div className="vd-note vd-note-warn">
          {store.ondcEnabled ? "Your store is switched on, but buyers can't see it until you fix: " : "Before you turn it on, fix: "}
          <strong>{blocking.map((b) => b.label).join(", ")}</strong>. Use the buttons in the checklist below.
        </div>
      )}

      <details className="vd-card" open={!store.ondcEnabled}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>What is ONDC, and should I turn it on?</summary>
        <div className="vd-grid vd-grid-3" style={{ marginTop: "0.9rem" }}>
          <div>
            <div className="vd-check-title">What it is</div>
            <p className="vd-check-detail">
              ONDC (Open Network for Digital Commerce) is a Government of India–backed network that connects shops to many shopping apps at once.
              Turning it on lets shoppers on those apps find {store.name} and order for pickup.
            </p>
          </div>
          <div>
            <div className="vd-check-title">What you get</div>
            <ul className="vd-check-detail" style={{ margin: 0, paddingLeft: "1.1rem" }}>
              <li>More customers, from apps you don&apos;t have to join one by one</li>
              <li>Same products, prices and stock as on Storaa — nothing to type twice</li>
              <li>Customers pay you at the counter when they pick up</li>
              <li>Stock is set aside the moment an order comes in, so you never oversell</li>
            </ul>
          </div>
          <div>
            <div className="vd-check-title">If you turn it off</div>
            <ul className="vd-check-detail" style={{ margin: 0, paddingLeft: "1.1rem" }}>
              <li>Your shop stops showing on ONDC apps straight away</li>
              <li>Orders you already have stay in ONDC Orders so you can finish them</li>
              <li>Storaa, customer holds and your POS / billing sync keep working exactly as before</li>
              <li>You can turn it back on any time</li>
            </ul>
          </div>
        </div>
      </details>

      <div className="vd-stats">
        <Link className="vd-stat" href="/vendor/ondc-orders">
          <span className="vd-stat-label"><Icon.Bag size={16} /> Orders · 30 days</span>
          <span className="vd-stat-value">{stats.orders}</span>
          <span className={`vd-stat-foot${stats.open ? " vd-stat-foot-warn" : ""}`}>{stats.open} open · {stats.cancelled} cancelled</span>
        </Link>
        <div className="vd-stat">
          <span className="vd-stat-label"><Icon.Rupee size={16} /> Collected · 30 days</span>
          <span className="vd-stat-value">{inr(stats.revenue)}</span>
          <span className="vd-stat-foot">{stats.completed} completed pickups</span>
        </div>
        <div className="vd-stat">
          <span className="vd-stat-label"><Icon.Box size={16} /> Listable products</span>
          <span className="vd-stat-value">{counts.ready}</span>
          <span className="vd-stat-foot">of {counts.all} in your catalog</span>
        </div>
        <div className="vd-stat">
          <span className="vd-stat-label"><Icon.Network size={16} /> ONDC apps that ordered</span>
          <span className="vd-stat-value">{stats.buyerApps.length}</span>
          <span className="vd-stat-foot" title={stats.buyerApps.join(", ")}>{stats.buyerApps.slice(0, 2).join(", ") || "No orders yet"}</span>
        </div>
      </div>

      <div className="vd-grid vd-grid-2" style={{ alignItems: "start" }}>
        <section className="vd-card">
          <div className="vd-card-head">
            <div>
              <h3>Go-live checklist</h3>
              <p className="vd-sub">{passed} of {checks.length} complete</p>
            </div>
            <div className="vd-ring" style={{ ["--p" as string]: Math.round((passed / checks.length) * 100), width: "3.6rem", height: "3.6rem" }}>
              <span style={{ width: "2.8rem", height: "2.8rem", fontSize: "0.85rem" }}>{Math.round((passed / checks.length) * 100)}%</span>
            </div>
          </div>
          <div className="vd-checklist">
            {checks.map((c) => (
              <div className="vd-check-row" key={c.id}>
                <CheckIcon level={c.level} />
                <div style={{ minWidth: 0 }}>
                  <div className="vd-check-title">{c.label}</div>
                  <div className="vd-check-detail">{c.detail}</div>
                  {c.action && (
                    c.action.href.startsWith("#") ? (
                      <a className="vd-btn vd-btn-sm" style={{ marginTop: "0.4rem" }} href={c.action.href}>{c.action.label}</a>
                    ) : (
                      <Link className="vd-btn vd-btn-sm" style={{ marginTop: "0.4rem" }} href={c.action.href}>{c.action.label}</Link>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="vd-grid">
          <section className="vd-card" id="pickup-location">
            <div className="vd-card-head">
              <div>
                <h3>Pickup location</h3>
                <p className="vd-sub">Buyer apps show stores by distance, so this must be your shop&apos;s exact location.</p>
              </div>
              {store.latitude != null ? <Badge tone="ok" dot>Set</Badge> : <Badge tone="err" dot>Missing</Badge>}
            </div>
            <p className="vd-sub" style={{ marginBottom: "0.85rem" }}><Icon.Pin size={14} /> {store.address}</p>
            <div className="vd-field" style={{ marginBottom: "0.85rem" }}>
              <label htmlFor="ondc-paste">Easiest: paste a Google Maps link or the numbers</label>
              <input id="ondc-paste" className="vd-input" placeholder="Paste a Google Maps link, or 13.0827, 80.2707" value={pasted} onChange={(e) => onPaste(e.target.value)} />
            </div>
            <div className="vd-form-grid">
              <div className="vd-field">
                <label htmlFor="ondc-lat">Latitude</label>
                <input id="ondc-lat" className="vd-input" inputMode="decimal" placeholder="13.0827" value={lat} onChange={(e) => setLat(e.target.value.trim())} />
              </div>
              <div className="vd-field">
                <label htmlFor="ondc-lng">Longitude</label>
                <input id="ondc-lng" className="vd-input" inputMode="decimal" placeholder="80.2707" value={lng} onChange={(e) => setLng(e.target.value.trim())} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.9rem" }}>
              <VdButton small icon={<Icon.Pin size={15} />} loading={locating} onClick={useMyLocation}>Use my current location</VdButton>
              {latValid && lngValid && (
                <a className="vd-btn vd-btn-sm" href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer">
                  <Icon.Link /> Check on map
                </a>
              )}
              <VdButton small variant="primary" disabled={!latValid || !lngValid || !locChanged} loading={savingLoc} onClick={() => saveLocation()}>
                Save location
              </VdButton>
            </div>
            <p className="vd-sub" style={{ marginTop: "0.6rem" }}>How: open Google Maps, find your shop, tap <strong>Share</strong> and copy the link — then paste it above. Or stand in your shop and press &quot;Use my current location&quot;.</p>
          </section>

          <section className="vd-card">
            <div className="vd-card-head">
              <h3>How ONDC orders work</h3>
            </div>
            <ol className="vd-list" style={{ listStyle: "none" }}>
              {[
                ["Buyer orders on an ONDC app", "Stock is reserved instantly so you never oversell."],
                ["You pack the order", "Mark it Packed in ONDC Orders — the buyer is notified."],
                ["Buyer picks up and pays", "Collect payment at your counter, then mark Picked up."],
              ].map(([t, d], i) => (
                <li className="vd-list-row" key={t} style={{ alignItems: "flex-start" }}>
                  <span className="vd-check-icon" style={{ background: "var(--purple-100)", color: "var(--purple)", fontWeight: 700, fontSize: "0.8rem" }}>{i + 1}</span>
                  <div className="vd-list-main">
                    <div className="vd-check-title">{t}</div>
                    <div className="vd-check-detail">{d}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <section className="vd-card vd-card-flush">
        <div className="vd-card-head">
          <div>
            <h3>Catalog on ONDC</h3>
            <p className="vd-sub">Only approved, in-stock products in ONDC categories are published. The reason a product isn&apos;t listed is shown under its name.</p>
          </div>
          <div className="vd-tabs" role="tablist">
            {(["issues", "ready", "hidden", "all"] as Tab[]).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} className={`vd-tab${tab === t ? " vd-tab-active" : ""}`} onClick={() => setTab(t)}>
                {{ issues: "Needs attention", ready: "Ready", hidden: "Hidden", all: "All" }[t]}
                <span className="vd-tab-count">{counts[t]}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginTop: "1rem" }}>
          {shown.length === 0 ? (
            <Empty
              icon={tab === "issues" ? <Icon.Check size={22} /> : <Icon.Box size={22} />}
              title={tab === "issues" ? "Nothing needs attention" : "No products here"}
              text={tab === "issues" ? "Every product you've chosen to list is ready." : undefined}
            />
          ) : (
            <div className="vd-table-wrap">
              <table className="vd-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="vd-hide-sm">Sold on ONDC as</th>
                    <th className="vd-num">Price</th>
                    <th className="vd-num vd-hide-sm">Stock</th>
                    <th>Status</th>
                    <th className="vd-num">Sell on ONDC</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((i) => (
                    <tr key={i._id}>
                      <td>
                        <div className="vd-prod-cell">
                          <span className="vd-thumb" style={i.image ? { backgroundImage: `url(${i.image})` } : undefined}>{!i.image && "📦"}</span>
                          <div style={{ minWidth: 0 }}>
                            <div className="vd-prod-name">{i.name}</div>
                            {i.errors.length + i.warnings.length === 0 ? (
                              <div className="vd-prod-meta">{i.category}</div>
                            ) : (
                              <ul className="vd-prod-meta" style={{ margin: 0, paddingLeft: "1rem" }}>
                                {i.errors.map((m) => <li key={m} style={{ color: "var(--vd-err)" }}>{m}</li>)}
                                {i.warnings.map((m) => <li key={m} style={{ color: "var(--vd-warn)" }}>{m}</li>)}
                              </ul>
                            )}
                            {i.errors.length + i.warnings.length > 0 && (
                              <Link href="/vendor/products" className="vd-sub" style={{ color: "var(--purple)", fontWeight: 600 }}>Fix in Products →</Link>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="vd-hide-sm">{i.ondcCategory ?? <span className="vd-sub">Not sold on ONDC</span>}</td>
                      <td className="vd-num">{inr(i.price)}</td>
                      <td className="vd-num vd-hide-sm">{i.stock}</td>
                      <td>
                        <span>
                          {!i.listed ? <Badge>Hidden</Badge> : i.errors.length ? <Badge tone="err">Not listed</Badge> : i.warnings.length ? <Badge tone="warn">Listed · tips</Badge> : <Badge tone="ok">Listed</Badge>}
                        </span>
                      </td>
                      <td className="vd-num">
                        <Switch checked={i.listed} onChange={() => toggleItem(i)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="vd-card">
        <div className="vd-card-head">
          <div>
            <h3>What buyer apps receive</h3>
            <p className="vd-sub">This is how your shop and products look to people searching on ONDC apps (first 3 products).</p>
          </div>
          {data.preview && (
            <VdButton small onClick={() => setShowJson((v) => !v)}>{showJson ? "Hide" : "Show"} technical details</VdButton>
          )}
        </div>
        {!data.preview ? (
          <p className="vd-sub">Nothing to preview yet — set your pickup location and make at least one product listable.</p>
        ) : (
          <>
            <div style={{ display: "flex", gap: "0.9rem", alignItems: "center", marginBottom: "0.9rem" }}>
              <span className="vd-thumb" style={{ width: "3.4rem", height: "3.4rem", ...(data.preview.descriptor?.symbol ? { backgroundImage: `url(${data.preview.descriptor.symbol})` } : {}) }} />
              <div>
                <div className="vd-prod-name">{data.preview.descriptor?.name}</div>
                <div className="vd-sub">{data.preview.descriptor?.long_desc} · Self-pickup</div>
              </div>
            </div>
            <div className="vd-grid vd-grid-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {data.preview.items?.map((it: any) => (
                <div key={it.id} className="vd-card" style={{ boxShadow: "none", padding: "0.85rem" }}>
                  <div style={{ display: "flex", gap: "0.7rem" }}>
                    <span className="vd-thumb" style={it.descriptor?.symbol ? { backgroundImage: `url(${it.descriptor.symbol})` } : undefined} />
                    <div style={{ minWidth: 0 }}>
                      <div className="vd-prod-name" style={{ fontSize: "0.88rem" }}>{it.descriptor?.name}</div>
                      <div className="vd-prod-meta">{it.category_id} · {it.quantity?.available?.count} available</div>
                      <div style={{ marginTop: "0.25rem", fontWeight: 700, fontSize: "0.9rem" }}>
                        {inr(Number(it.price?.value))}
                        {Number(it.price?.maximum_value) > Number(it.price?.value) && <span className="vd-strike">{inr(Number(it.price.maximum_value))}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {showJson && <pre className="vd-code" style={{ marginTop: "1rem", maxHeight: "24rem" }}>{JSON.stringify(data.preview, null, 2)}</pre>}
          </>
        )}
      </section>

      {confirmOff && (
        <Dialog
          title="Turn off ONDC for your store?"
          onClose={() => setConfirmOff(false)}
          actions={
            <>
              <VdButton onClick={() => setConfirmOff(false)}>Keep it on</VdButton>
              <VdButton variant="primary" style={{ background: "var(--vd-err)", borderColor: "var(--vd-err)" }} loading={busy} onClick={() => setListing(false)}>
                Turn off
              </VdButton>
            </>
          }
        >
          <p className="vd-sub">
            Shoppers on ONDC apps won&apos;t be able to find or order from {store.name}.{" "}
            {stats.open > 0
              ? <>You still have <strong>{stats.open} open ONDC order{stats.open > 1 ? "s" : ""}</strong> — they stay in ONDC Orders so you can pack and hand them over as normal.</>
              : "You have no open ONDC orders."}{" "}
            Storaa and your POS sync are not affected.
          </p>
        </Dialog>
      )}
      {node}
    </div>
  );
}
