"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { POS_PROVIDERS } from "@/lib/pos/providers";
import { api, Badge, CopyButton, dateTime, Dialog, Empty, Icon, Skeleton, Switch, timeAgo, useToast, VdButton } from "@/components/vendor/ui";

interface PosStatus {
  connected: boolean;
  provider: string;
  apiKeyPrefix: string;
  connectedAt: string | null;
  lastSyncAt: string | null;
  autoCreateProducts: boolean;
  syncPrice: boolean;
}

interface SyncLog {
  _id: string;
  kind: string;
  source: string;
  ok: boolean;
  received: number;
  updated: number;
  created: number;
  failed: number;
  issues: string[];
  createdAt: string;
}

interface PosData {
  pos: PosStatus;
  logs: SyncLog[];
  coverage: { total: number; withSku: number; synced: number };
}

const LOGO_COLORS: Record<string, string> = {
  gofrugal: "#e4572e",
  petpooja: "#d7263d",
  marg: "#1b4f9c",
  tally: "#2f6f3e",
  busy: "#0e7c86",
  vyapar: "#e84a5f",
  shopify_pos: "#5e8e3e",
  custom: "#6b2f9e",
};

const KIND_LABEL: Record<string, string> = {
  inventory: "Stock update",
  sales: "Sales",
  products: "Product sync",
  csv_import: "CSV import",
  catalog_pull: "Catalog pull",
};

type Example = "inventory" | "sales" | "products" | "pull";

function examples(base: string, key: string): Record<Example, { title: string; body: string }> {
  const k = key || "stk_live_YOUR_API_KEY";
  return {
    inventory: {
      title: "Update stock / price",
      body: `curl -X POST ${base}/inventory \\
  -H "Authorization: Bearer ${k}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "items": [
      { "sku": "ATTA-5KG", "stock": 42 },
      { "barcode": "8901725181222", "delta": -2 },
      { "sku": "OIL-1L", "price": 189, "mrp": 210 }
    ]
  }'`,
    },
    sales: {
      title: "Report a bill",
      body: `curl -X POST ${base}/sales \\
  -H "Authorization: Bearer ${k}" \\
  -H "Content-Type: application/json" \\
  -d '{ "items": [ { "sku": "ATTA-5KG", "quantity": 2 } ] }'

# A negative quantity records a return and adds the stock back.`,
    },
    products: {
      title: "Create / update products",
      body: `curl -X POST ${base}/products \\
  -H "Authorization: Bearer ${k}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "items": [{
      "sku": "ATTA-5KG", "barcode": "8901725181222",
      "name": "Whole Wheat Atta", "category": "Groceries",
      "brand": "Aashirvaad", "unit": "5 kg",
      "price": 289, "mrp": 315, "stock": 40,
      "gstRate": 5, "hsnCode": "1101"
    }]
  }'`,
    },
    pull: {
      title: "Pull catalog",
      body: `# Full catalog (paged, 500 per page)
curl "${base}/products?page=1" -H "Authorization: Bearer ${k}"

# Only what changed since your last pull
curl "${base}/products?updatedSince=2026-01-01T00:00:00Z" \\
  -H "Authorization: Bearer ${k}"`,
    },
  };
}

export default function PosPage() {
  const [data, setData] = useState<PosData | null>(null);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("custom");
  const [newKey, setNewKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<"rotate" | "disconnect" | null>(null);
  const [example, setExample] = useState<Example>("inventory");
  const [testing, setTesting] = useState(false);
  const [openLog, setOpenLog] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const { toast, node } = useToast();

  const load = useCallback(async () => {
    const d = await api<PosData>("/api/vendor/pos");
    setData(d);
    if (d.pos.provider) setProvider(d.pos.provider);
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    load().catch((e) => setError(e instanceof Error ? e.message : "Could not load POS settings."));
  }, [load]);

  async function connect(action: "connect" | "rotate") {
    setBusy(true);
    try {
      const r = await api<{ apiKey: string; pos: PosStatus }>("/api/vendor/pos", { method: "POST", json: { action, provider } });
      setNewKey(r.apiKey);
      await load();
      toast(action === "rotate" ? "New key created — the old key no longer works" : "POS connected — copy your API key now");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not create key", true);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await api("/api/vendor/pos", { method: "DELETE" });
      setNewKey("");
      await load();
      toast("POS disconnected");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not disconnect", true);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function updateSetting(patch: Partial<PosStatus>) {
    try {
      await api("/api/vendor/pos", { method: "PATCH", json: patch });
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save", true);
    }
  }

  async function testConnection() {
    if (!newKey) return;
    setTesting(true);
    try {
      const r = await fetch("/api/pos/v1/ping", { headers: { Authorization: `Bearer ${newKey}` } });
      const d = await r.json();
      if (r.ok) toast(`Connection OK — authenticated as ${d.store?.name}`);
      else toast(d.message || "Key was rejected", true);
    } catch {
      toast("Could not reach the API", true);
    } finally {
      setTesting(false);
    }
  }

  if (error) return <div className="vd"><div className="vd-error">{error}</div></div>;
  if (!data) {
    return (
      <div className="vd">
        <Skeleton h={60} />
        <Skeleton h={220} />
        <Skeleton h={300} />
      </div>
    );
  }

  const { pos, logs, coverage } = data;
  const base = `${origin}/api/pos/v1`;
  const info = POS_PROVIDERS.find((p) => p.id === provider) ?? POS_PROVIDERS[POS_PROVIDERS.length - 1];
  const ex = examples(base, newKey);
  const skuPct = coverage.total ? Math.round((coverage.withSku / coverage.total) * 100) : 0;

  return (
    <div className="vd">
      <div className="vd-head">
        <div>
          <h2>POS &amp; inventory sync</h2>
          <p>Connect your billing software so stock and prices on Storaa{" "}and ONDC update automatically whenever you sell at the counter.</p>
        </div>
        <Badge tone={pos.connected ? "ok" : "neutral"} dot pulse={pos.connected}>{pos.connected ? "Connected" : "Not connected"}</Badge>
      </div>

      <div className="vd-grid vd-grid-main">
        <div className="vd-grid">
          <section className="vd-card">
            <div className="vd-card-head">
              <div>
                <h3>{pos.connected ? "Your POS" : "1. Choose your POS"}</h3>
                <p className="vd-sub">{pos.connected ? "Change it any time; your key keeps working." : "Every POS uses the same secure Storaa API — this tailors the setup steps."}</p>
              </div>
            </div>
            <div className="vd-providers">
              {POS_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`vd-provider${provider === p.id ? " vd-provider-active" : ""}`}
                  aria-pressed={provider === p.id}
                  onClick={() => {
                    setProvider(p.id);
                    if (pos.connected) updateSetting({ provider: p.id });
                  }}
                >
                  <span className="vd-provider-logo" style={{ background: LOGO_COLORS[p.id] }}>
                    {p.id === "custom" ? <Icon.Link size={16} /> : p.name.slice(0, 2).toUpperCase()}
                  </span>
                  <strong>{p.name}</strong>
                  <span>{p.blurb}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="vd-card">
            <div className="vd-card-head">
              <div>
                <h3>{pos.connected ? "API key" : "2. Create an API key"}</h3>
                <p className="vd-sub">The key lets your POS update this store only. Treat it like a password.</p>
              </div>
            </div>

            {newKey ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div className="vd-note vd-note-warn">
                  <strong>Copy this key now.</strong> For your security it won&apos;t be shown again — if you lose it, create a new one.
                </div>
                <div className="vd-keybox">
                  <Icon.Key />
                  <code>{newKey}</code>
                  <CopyButton text={newKey} className="vd-btn vd-btn-sm vd-btn-primary" />
                </div>
                <div>
                  <VdButton small loading={testing} onClick={testConnection}>Test connection</VdButton>
                </div>
              </div>
            ) : pos.connected ? (
              <dl className="vd-kv" style={{ fontSize: "0.9rem" }}>
                <dt>Key</dt>
                <dd><code className="vd-code-inline">{pos.apiKeyPrefix}••••••••••••</code></dd>
                <dt>Connected</dt>
                <dd>{pos.connectedAt ? dateTime(pos.connectedAt) : "—"}</dd>
                <dt>Last sync</dt>
                <dd>{timeAgo(pos.lastSyncAt)}</dd>
              </dl>
            ) : (
              <VdButton variant="primary" icon={<Icon.Key size={16} />} loading={busy} onClick={() => connect("connect")}>
                Connect {info.name} &amp; create key
              </VdButton>
            )}

            {pos.connected && (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
                <VdButton small icon={<Icon.Refresh />} onClick={() => setConfirm("rotate")}>Create new key</VdButton>
                <VdButton small variant="danger" onClick={() => setConfirm("disconnect")}>Disconnect</VdButton>
              </div>
            )}
          </section>

          <section className="vd-card">
            <div className="vd-card-head">
              <div>
                <h3>{pos.connected ? "Integration guide" : "3. Point your POS at Storaa"}</h3>
                <p className="vd-sub">{info.setup}</p>
              </div>
            </div>
            <div className="vd-field" style={{ marginBottom: "1rem" }}>
              <span className="vd-label">Base URL</span>
              <div className="vd-keybox" style={{ borderStyle: "solid", borderColor: "var(--vd-line-strong)", background: "#faf8fc" }}>
                <code>{base}</code>
                <CopyButton text={base} className="vd-btn vd-btn-sm" />
              </div>
            </div>
            <div className="vd-endpoints" style={{ marginBottom: "1rem" }}>
              {[
                ["GET", "/ping", "Check the key"],
                ["POST", "/inventory", "Set stock (stock), adjust it (delta), or update price / MRP"],
                ["POST", "/sales", "Reduce stock for items sold on the POS"],
                ["POST", "/products", "Create or update full product records"],
                ["GET", "/products", "Download the catalog (supports updatedSince)"],
              ].map(([m, path, d]) => (
                <div className="vd-endpoint" key={m + path}>
                  <span className={`vd-method vd-method-${m.toLowerCase()}`}>{m}</span>
                  <code className="vd-code-inline">{path}</code>
                  <span className="vd-sub">{d}</span>
                </div>
              ))}
            </div>
            <div className="vd-tabs" role="tablist" style={{ marginBottom: "0.75rem" }}>
              {(Object.keys(ex) as Example[]).map((k) => (
                <button key={k} role="tab" aria-selected={example === k} className={`vd-tab${example === k ? " vd-tab-active" : ""}`} onClick={() => setExample(k)}>
                  {ex[k].title}
                </button>
              ))}
            </div>
            <div className="vd-code">
              <CopyButton text={ex[example].body} />
              {ex[example].body}
            </div>
            <p className="vd-sub" style={{ marginTop: "0.75rem" }}>
              Products are matched by <strong>SKU</strong>, then <strong>barcode</strong>. Up to 1,000 items per request. Responses: <code className="vd-code-inline">200</code> all applied,{" "}
              <code className="vd-code-inline">207</code> some rows failed (see <code className="vd-code-inline">issues</code>), <code className="vd-code-inline">401</code> bad key.
              Optional header <code className="vd-code-inline">X-Pos-Source</code> labels entries in the sync log.
            </p>
          </section>
        </div>

        <div className="vd-grid">
          <section className="vd-card">
            <div className="vd-card-head">
              <h3>Sync settings</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <Switch checked={pos.syncPrice} disabled={!pos.connected} onChange={(v) => updateSetting({ syncPrice: v })} label="POS controls prices" />
                <p className="vd-sub" style={{ marginTop: "0.3rem", paddingLeft: "3.25rem" }}>Price and MRP sent by the POS overwrite Storaa prices.</p>
              </div>
              <div>
                <Switch checked={pos.autoCreateProducts} disabled={!pos.connected} onChange={(v) => updateSetting({ autoCreateProducts: v })} label="Create new products from POS" />
                <p className="vd-sub" style={{ marginTop: "0.3rem", paddingLeft: "3.25rem" }}>Unknown SKUs become new products (pending admin approval).</p>
              </div>
            </div>
          </section>

          <section className="vd-card">
            <div className="vd-card-head">
              <h3>Catalog match rate</h3>
              <Badge tone={skuPct === 100 ? "ok" : skuPct > 50 ? "warn" : "err"}>{skuPct}%</Badge>
            </div>
            <div className="vd-progress" aria-label="Products with SKU"><span style={{ width: `${skuPct}%` }} /></div>
            <p className="vd-sub" style={{ marginTop: "0.6rem" }}>
              {coverage.withSku} of {coverage.total} products have a SKU your POS can match. {coverage.synced} have been updated by the POS.
            </p>
            {skuPct < 100 && (
              <Link href="/vendor/products" className="vd-btn vd-btn-sm" style={{ marginTop: "0.75rem" }}>Add missing SKUs</Link>
            )}
          </section>

          <section className="vd-card">
            <div className="vd-card-head">
              <h3>No API? Use CSV</h3>
            </div>
            <p className="vd-sub">Export items from Tally, BUSY, Vyapar or Excel and upload them. Existing products are updated by SKU or barcode.</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
              <Link href="/vendor/products" className="vd-btn vd-btn-sm"><Icon.Upload size={15} /> Import CSV</Link>
              <a href="/api/vendor/products/export" className="vd-btn vd-btn-sm" download><Icon.Download size={15} /> Export CSV</a>
            </div>
          </section>
        </div>
      </div>

      <section className="vd-card vd-card-flush">
        <div className="vd-card-head">
          <div>
            <h3>Sync history</h3>
            <p className="vd-sub">Last 50 POS calls and CSV imports · kept for 90 days</p>
          </div>
          <VdButton small icon={<Icon.Refresh />} onClick={() => load()}>Refresh</VdButton>
        </div>
        <div style={{ marginTop: "1rem" }}>
          {logs.length === 0 ? (
            <Empty icon={<Icon.Refresh size={22} />} title="No syncs yet" text="Calls from your POS and CSV imports will be listed here with any rows that failed." />
          ) : (
            <div className="vd-table-wrap">
              <table className="vd-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Type</th>
                    <th className="vd-hide-sm">Source</th>
                    <th className="vd-num">Rows</th>
                    <th className="vd-num">Applied</th>
                    <th className="vd-num">Failed</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <Fragment key={l._id}>
                      <tr
                        style={l.issues.length ? { cursor: "pointer" } : undefined}
                        onClick={() => l.issues.length && setOpenLog(openLog === l._id ? null : l._id)}
                      >
                        <td title={new Date(l.createdAt).toLocaleString("en-IN")}>{timeAgo(l.createdAt)}</td>
                        <td>{KIND_LABEL[l.kind] ?? l.kind}</td>
                        <td className="vd-hide-sm">{l.source || "—"}</td>
                        <td className="vd-num">{l.received || "—"}</td>
                        <td className="vd-num">{l.updated + l.created}{l.created ? ` (${l.created} new)` : ""}</td>
                        <td className="vd-num" style={l.failed ? { color: "var(--vd-err)", fontWeight: 600 } : undefined}>{l.failed}</td>
                        <td>
                          {l.ok ? <Badge tone="ok">Success</Badge> : l.updated + l.created > 0 ? <Badge tone="warn">Partial</Badge> : <Badge tone="err">Failed</Badge>}
                          {l.issues.length > 0 && <span className="vd-sub" style={{ marginLeft: "0.4rem" }}>{openLog === l._id ? "▴" : "▾"}</span>}
                        </td>
                      </tr>
                      {openLog === l._id && (
                        <tr>
                          <td colSpan={7} style={{ background: "#fcfbfd" }}>
                            <div className="vd-error" style={{ background: "transparent", padding: 0 }}>
                              {l.issues.map((i) => <div key={i}>• {i}</div>)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {confirm && (
        <Dialog
          title={confirm === "rotate" ? "Create a new API key?" : "Disconnect your POS?"}
          onClose={() => setConfirm(null)}
          actions={
            <>
              <VdButton onClick={() => setConfirm(null)}>Cancel</VdButton>
              <VdButton
                variant="primary"
                style={confirm === "disconnect" ? { background: "var(--vd-err)", borderColor: "var(--vd-err)" } : undefined}
                loading={busy}
                onClick={() => (confirm === "rotate" ? connect("rotate") : disconnect())}
              >
                {confirm === "rotate" ? "Create new key" : "Disconnect"}
              </VdButton>
            </>
          }
        >
          <p className="vd-sub">
            {confirm === "rotate"
              ? "The current key stops working immediately. Update your POS with the new key straight away to avoid missed stock updates."
              : "The API key stops working immediately and stock will no longer sync. Your products and sync history are kept."}
          </p>
        </Dialog>
      )}
      {node}
    </div>
  );
}
