// Self-contained ONDC demo: plays a buyer app against a local Stora using a throwaway Docker MongoDB,
// a mock registry and a mock buyer app. Nothing touches your real database or the real ONDC network.
//   npm run ondc:demo            (needs Docker running)
import crypto from "node:crypto";
import http from "node:http";
import { spawn, execSync } from "node:child_process";
import mongoose from "mongoose";
import { SignJWT } from "jose";

const PORT = 3100, REG = 4010, BAP = 4011, MONGO_PORT = 27018, PAUSE = Number(process.env.DEMO_PAUSE_MS ?? 2000);
const MONGO = `mongodb://127.0.0.1:${MONGO_PORT}/stora_ondc_demo`;
const CONTAINER = "stora-ondc-demo-mongo";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b64 = (b) => b.toString("base64");
const rawPub = (k) => k.export({ format: "der", type: "spki" }).subarray(-32);
const rawSeed = (k) => k.export({ format: "der", type: "pkcs8" }).subarray(-32);

const c = { dim: "\x1b[2m", bold: "\x1b[1m", green: "\x1b[32m", cyan: "\x1b[36m", yellow: "\x1b[33m", red: "\x1b[31m", reset: "\x1b[0m" };
const banner = (t) => console.log(`\n${c.bold}${c.cyan}━━ ${t} ━━${c.reset}`);
const out = (t) => console.log(`  ${c.yellow}BUYER APP → STORA${c.reset}  ${t}`);
const back = (t) => console.log(`  ${c.green}STORA → BUYER APP${c.reset}  ${t}`);
const vendor = (t) => console.log(`  ${c.yellow}VENDOR → STORA${c.reset}     ${t}`);
const note = (t) => console.log(`  ${c.dim}${t}${c.reset}`);

const bap = crypto.generateKeyPairSync("ed25519");
const bpp = crypto.generateKeyPairSync("ed25519");
const bppEnc = crypto.generateKeyPairSync("x25519");
const regEnc = crypto.generateKeyPairSync("x25519");

function sign(body) {
  const created = Math.floor(Date.now() / 1000), expires = created + 300;
  const digest = crypto.createHash("blake2b512").update(body).digest("base64");
  const str = `(created): ${created}\n(expires): ${expires}\ndigest: BLAKE-512=${digest}`;
  const sig = crypto.sign(null, Buffer.from(str), bap.privateKey).toString("base64");
  return `Signature keyId="bap.demo|bapk1|ed25519",algorithm="ed25519",created="${created}",expires="${expires}",headers="(created) (expires) digest",signature="${sig}"`;
}
function signatureValid(header, body) {
  const f = Object.fromEntries(Array.from(header.slice(10).matchAll(/(\w+)="([^"]*)"/g)).map((m) => [m[1], m[2]]));
  const digest = crypto.createHash("blake2b512").update(body).digest("base64");
  const str = `(created): ${f.created}\n(expires): ${f.expires}\ndigest: BLAKE-512=${digest}`;
  return crypto.verify(null, Buffer.from(str), bpp.publicKey, Buffer.from(f.signature, "base64"));
}

const regSrv = http.createServer((req, res) => {
  req.resume(); req.on("end", () => {
    res.end(JSON.stringify([{ subscriber_id: "bap.demo", ukId: "bapk1", signing_public_key: b64(rawPub(bap.publicKey)), status: "SUBSCRIBED", valid_until: "2099-01-01T00:00:00Z" }]));
  });
}).listen(REG);
const inbox = [];
const bapSrv = http.createServer((req, res) => {
  let d = ""; req.on("data", (x) => (d += x)); req.on("end", () => {
    inbox.push({ action: req.url.slice(1), body: JSON.parse(d), sigOk: signatureValid(req.headers.authorization ?? "", d) });
    res.end(JSON.stringify({ message: { ack: { status: "ACK" } } }));
  });
}).listen(BAP);
async function next(action) {
  for (let i = 0; i < 80; i++) {
    const idx = inbox.findIndex((m) => m.action === action);
    if (idx >= 0) return inbox.splice(idx, 1)[0];
    await sleep(100);
  }
  throw new Error(`timed out waiting for ${action}`);
}
const sig = (m) => (m.sigOk ? `${c.green}signature ✓ valid${c.reset}` : `${c.red}signature ✗ INVALID${c.reset}`);

let app;
async function cleanup() {
  try { app?.kill("SIGTERM"); } catch {}
  regSrv.close(); bapSrv.close();
  try { await mongoose.disconnect(); } catch {}
  try { execSync(`docker rm -f ${CONTAINER}`, { stdio: "ignore" }); } catch {}
}
process.on("SIGINT", async () => { await cleanup(); process.exit(130); });

let failed = false;
try {
  banner("Setting up (throwaway database, mock ONDC registry, mock buyer app)");
  try { execSync(`docker rm -f ${CONTAINER}`, { stdio: "ignore" }); } catch {}
  execSync(`docker run -d --name ${CONTAINER} -p ${MONGO_PORT}:27017 mongo:7`, { stdio: "ignore" });
  for (let i = 0; ; i++) {
    try { await mongoose.connect(MONGO, { serverSelectionTimeoutMS: 1000 }); break; }
    catch (e) { if (i > 30) throw e; await sleep(500); }
  }
  await mongoose.connection.dropDatabase();
  const db = mongoose.connection.db;
  const ownerId = new mongoose.Types.ObjectId(), storeId = new mongoose.Types.ObjectId();
  await db.collection("stores").insertOne({ _id: storeId, name: "Fresh Mart", category: "Groceries", status: "approved", isOpen: true, ownerId, latitude: 12.9716, longitude: 77.5946, address: "12 MG Road", shortAddress: "MG Road", city: "Bengaluru", state: "Karnataka", postalCode: "560001", openTime: "2026-01-01T08:00", closeTime: "2026-01-01T22:00", phone: "9999999999", email: "freshmart@example.com" });
  const mk = (name, category, price, stock, unit) => ({ _id: new mongoose.Types.ObjectId(), storeId, name, category, price, stock, unit, status: "approved", brand: "Demo", specifications: [], images: [] });
  const rice = mk("Basmati Rice", "Groceries", 120, 10, "1 kg");
  await db.collection("products").insertMany([rice, mk("Apple", "Fruits & Vegetables", 80, 20, "500 g"), mk("Toor Dal", "Groceries", 150, 5, "1 kg"), mk("Dog Food", "Pet Care", 300, 5, "1 kg")]);
  const stock = async () => (await db.collection("products").findOne({ _id: rice._id })).stock;
  note("Store: Fresh Mart · Products: Basmati Rice (10 in stock), Apple, Toor Dal, Dog Food (Pet Care is not mapped to ONDC)");

  const env = { ...process.env, PORT: String(PORT), MONGODB_URI: MONGO, JWT_SECRET: "demo-secret-demo-secret", ONDC_ENABLED: "true",
    ONDC_SUBSCRIBER_ID: "stora.demo", ONDC_SUBSCRIBER_URL: `http://127.0.0.1:${PORT}/api/ondc`, ONDC_UNIQUE_KEY_ID: "bppk1",
    ONDC_SIGNING_PRIVATE_KEY: b64(rawSeed(bpp.privateKey)), ONDC_SIGNING_PUBLIC_KEY: b64(rawPub(bpp.publicKey)),
    ONDC_ENCRYPTION_PRIVATE_KEY: b64(rawSeed(bppEnc.privateKey)), ONDC_REGISTRY_URL: `http://127.0.0.1:${REG}`,
    ONDC_REGISTRY_ENC_PUBLIC_KEY: b64(regEnc.publicKey.export({ format: "der", type: "spki" })),
    ONDC_REQUEST_ID: "demo-request-id", ONDC_PUBLIC_BASE_URL: "http://127.0.0.1:3100" };
  app = spawn("npx", ["next", "dev", "-p", String(PORT)], { env, stdio: ["ignore", "pipe", "pipe"] });
  let log = ""; app.stdout.on("data", (d) => (log += d)); app.stderr.on("data", (d) => (log += d));
  for (let i = 0; i < 80 && !/Ready in/.test(log); i++) await sleep(500);
  if (!/Ready in/.test(log)) throw new Error("Stora did not start:\n" + log);
  note(`Stora running at http://127.0.0.1:${PORT} with ONDC enabled`);

  const base = `http://127.0.0.1:${PORT}`;
  const ctx = (action) => ({ domain: "ONDC:RET10", country: "IND", city: "*", action, core_version: "1.2.0", bap_id: "bap.demo", bap_uri: `http://127.0.0.1:${BAP}`, transaction_id: "txn-demo-1", message_id: crypto.randomUUID(), timestamp: new Date().toISOString(), ttl: "PT30S" });
  const post = async (path, payload, auth = true) => {
    const body = JSON.stringify(payload);
    const res = await fetch(base + path, { method: "POST", body, headers: { "content-type": "application/json", ...(auth ? { authorization: sign(body) } : {}) } });
    return { status: res.status, json: await res.json() };
  };
  const line = { provider: { id: String(storeId) }, items: [{ id: String(rice._id), quantity: { count: 3 } }], fulfillments: [{ id: "1", type: "Self-Pickup", end: { contact: { phone: "8888888888" } } }], billing: { name: "Demo Buyer" }, payment: { type: "ON-ORDER" } };

  await sleep(PAUSE);
  banner("1. Joining the network: registry challenge");
  const shared = crypto.diffieHellman({ privateKey: regEnc.privateKey, publicKey: bppEnc.publicKey });
  const ci = crypto.createCipheriv("aes-256-ecb", shared, null);
  const challenge = b64(Buffer.concat([ci.update("demo-challenge-42"), ci.final()]));
  out("registry sends an encrypted challenge to /on_subscribe");
  const sub = await post("/on_subscribe", { subscriber_id: "stora.demo", challenge }, false);
  back(`decrypted answer: "${sub.json.answer}" ${sub.json.answer === "demo-challenge-42" ? c.green + "✓ matches" + c.reset : c.red + "✗" + c.reset}`);

  await sleep(PAUSE);
  banner("2. Security: unsigned request");
  const bad = await post("/api/ondc/search", { context: ctx("search"), message: {} }, false);
  back(`HTTP ${bad.status} ${bad.json.message.ack.status}: ${bad.json.error.message}`);

  await sleep(PAUSE);
  banner("3. Search: buyer looks for groceries");
  out("search (Self-Pickup) with a valid signature");
  const s = await post("/api/ondc/search", { context: ctx("search"), message: { intent: { fulfillment: { type: "Self-Pickup" } } } });
  back(`immediate ${s.json.message.ack.status}`);
  const onSearch = await next("on_search");
  const items = onSearch.body.message.catalog["bpp/providers"][0].items;
  back(`on_search · ${sig(onSearch)} · store "${onSearch.body.message.catalog["bpp/providers"][0].descriptor.name}" · ${items.length} items:`);
  items.forEach((i) => note(`    ${i.descriptor.name.padEnd(14)} ₹${i.price.value}  (${i.quantity.available.count} available)`));

  await sleep(PAUSE);
  banner("4. Select + Init: quote and payment terms");
  await post("/api/ondc/select", { context: ctx("select"), message: { order: line } });
  const sel = await next("on_select");
  out("select 3 × Basmati Rice");
  back(`on_select · ${sig(sel)} · quote ₹${sel.body.message.order.quote.price.value}`);
  await post("/api/ondc/init", { context: ctx("init"), message: { order: line } });
  const ini = await next("on_init");
  back(`on_init · ${sig(ini)} · payment: ${ini.body.message.order.payment.type}, collected by ${ini.body.message.order.payment.collected_by} (pay at the store)`);

  await sleep(PAUSE);
  banner("5. Confirm: order placed, stock reserved");
  note(`stock before: ${await stock()}`);
  await post("/api/ondc/confirm", { context: ctx("confirm"), message: { order: { id: "ORDER-1001", ...line, quote: { price: { value: "360.00" } } } } });
  const conf = await next("on_confirm");
  back(`on_confirm · ${sig(conf)} · order ${conf.body.message.order.id} is "${conf.body.message.order.state}"`);
  note(`stock after: ${await stock()}  (3 reserved)`);
  await post("/api/ondc/confirm", { context: ctx("confirm"), message: { order: { id: "ORDER-1001", ...line, quote: { price: { value: "360.00" } } } } });
  await next("on_confirm");
  note(`buyer app retries the same confirm → stock still ${await stock()} (no double reservation)`);

  await sleep(PAUSE);
  banner("6. Vendor workflow: store packs the order, buyer is notified");
  const token = await new SignJWT({ userId: String(ownerId), email: "vendor@example.com", role: "vendor" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(new TextEncoder().encode("demo-secret-demo-secret"));
  const order = await db.collection("ondcorders").findOne({ orderId: "ORDER-1001" });
  for (const action of ["pack", "picked_up"]) {
    await fetch(`${base}/api/vendor/ondc/orders/${order._id}`, { method: "POST", headers: { "content-type": "application/json", cookie: `storaa_session=${token}` }, body: JSON.stringify({ action }) });
    const st = await next("on_status");
    vendor(`marks the order "${action}"`);
    back(`on_status · ${sig(st)} · order "${st.body.message.order.state}", fulfillment "${st.body.message.order.fulfillments[0].state.descriptor.code}", payment ${st.body.message.order.payment.status}`);
    await sleep(PAUSE / 2);
  }

  await sleep(PAUSE);
  banner("7. Cancel: a second order, cancelled by the buyer, stock restored");
  await post("/api/ondc/confirm", { context: ctx("confirm"), message: { order: { id: "ORDER-1002", ...line, quote: { price: { value: "360.00" } } } } });
  await next("on_confirm");
  note(`ORDER-1002 confirmed · stock now ${await stock()}`);
  await post("/api/ondc/cancel", { context: ctx("cancel"), message: { order_id: "ORDER-1002", cancellation_reason_id: "001" } });
  const can = await next("on_cancel");
  back(`on_cancel · ${sig(can)} · order "${can.body.message.order.state}" by ${can.body.message.order.cancellation.cancelled_by}`);
  note(`stock restored to ${await stock()}`);

  banner("Done");
  note("Everything above ran against a mock registry and mock buyer app; no real ONDC connection was made.");
} catch (e) {
  failed = true; console.error(`\n${c.red}Demo failed:${c.reset}`, e.message ?? e);
} finally { await cleanup(); process.exit(failed ? 1 : 0); }
