# Storaa — Auth

Next.js (App Router, TypeScript) authentication app for Storaa: login, signup, role selection, password reset, and a protected dashboard, backed by MongoDB.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in MONGODB_URI and JWT_SECRET
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/login`.

## Features

- **Pages**: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/select-role`, `/dashboard` (protected)
- **API**: `POST /api/auth/register | login | logout | role | forgot-password | reset-password`, `GET /api/auth/me`
- Passwords hashed with **bcrypt** (12 rounds); reset codes hashed and single-use with 15-minute expiry
- **JWT sessions** (jose, HS256) in an `httpOnly` cookie, 7-day expiry
- **Middleware** protects `/dashboard` and `/select-role`, and redirects authenticated users away from `/login` / `/signup`
- Duplicate registration blocked (unique email index + `ACCOUNT_EXISTS` handling)
- Error dialogs matching the design: Account Not Found, Account Already Found, Account Blocked
- Client + server validation, loading spinners, and friendly error banners
- Fully responsive (desktop / tablet / mobile)

## Structure

```
app/            pages + API route handlers
components/     reusable UI (AuthLayout, TextField, Button, Modal, …)
lib/            db connection, auth (JWT/cookies), validation
models/         Mongoose User model
middleware.ts   route protection
```

## Notes

- The password reset code is currently logged to the server console (`[Storaa] Password reset code for …`) — wire up an email provider in `app/api/auth/forgot-password/route.ts` for production.
- "Login with Google" is a UI placeholder; add an OAuth provider to enable it.

## ONDC integration (seller app)

Storaa can list approved stores and products on the [ONDC](https://ondc.org) retail network as a **seller app (BPP)**. Each store is an ONDC *provider*, each product an *item*, and an order is a **Self-Pickup** order that the customer pays for at the store (`ON-FULFILLMENT`, collected by the seller). Off by default (`ONDC_ENABLED=false`).

### Endpoints

| Path | Purpose |
| --- | --- |
| `POST /api/ondc/{search,select,init,confirm,status,cancel,update,track,rating,support}` | Buyer-app calls. Verified, ACKed, then answered with a signed `POST {bap_uri}/on_*` |
| `POST /on_subscribe` (also `/api/ondc/on_subscribe`) | Registry challenge during `/subscribe` |
| `GET /ondc-site-verification.html` | Signed `request_id` page the registry fetches |
| `GET /api/vendor/ondc/orders` | Vendor's ONDC orders |
| `POST /api/vendor/ondc/orders/[id]` `{action: "pack" \| "picked_up" \| "cancel"}` | Vendor moves the order on; the buyer app gets `on_status` / `on_cancel` |

### Going live

1. Generate an Ed25519 signing pair and an X25519 encryption pair (Node `crypto` or libsodium). Signing keys are base64 raw; the encryption public key is base64 DER. Private keys may be raw 32/64 bytes or PKCS8 DER.
2. Fill the `ONDC_*` variables from `.env.example`. `ONDC_REGISTRY_ENC_PUBLIC_KEY` is ONDC's public key for the environment you target (see ONDC's onboarding docs); `ONDC_REGISTRY_URL` is `https://preprod.registry.ondc.org` or `https://prod.registry.ondc.org`.
3. Deploy on a public HTTPS domain, then register with ONDC's `/subscribe` using `subscriber_id` = your domain, `subscriber_url` = the path of `ONDC_SUBSCRIBER_URL`, `callback_url` = `/`, your public keys and `ops_no` 2 (seller app). The registry then calls `/on_subscribe` and fetches `/ondc-site-verification.html`.
4. Each approved vendor opts in from **Store Status → ONDC Network** (off by default); only opted-in stores are published. With `ONDC_ENABLED=false` the ONDC endpoints, nav item and toggle are all hidden/disabled.
5. Give each store coordinates (`latitude` / `longitude` on the Store) or set `ONDC_DEFAULT_GPS`. Stores with neither are not published.

### Behaviour worth knowing

- Only **approved, open** stores and **approved, in-stock** products are published, and only categories listed in `CATEGORY_MAP` ([lib/ondc/mapping.ts](lib/ondc/mapping.ts)); Pet Care, Stationery, Sports & Fitness and Jewelry are not mapped. Category ids there are best-effort and should be aligned with the ONDC taxonomy for the domains you certify.
- `/confirm` reserves stock atomically and is idempotent per `(bap_id, order id)`; cancelling returns the stock. ONDC orders live in their own `OndcOrder` collection and do not appear in the admin Transactions / Payouts screens.
- Inbound signatures are checked against the registry (v2.0 lookup, cached 5 min). `ONDC_SKIP_SIGNATURE_VERIFY=true` disables this for local testing and is ignored in production.
- The `on_*` callback runs after the ACK is sent. On Vercel it is kept alive with `waitUntil` ([lib/background.ts](lib/background.ts)), so buyer apps still receive it; on a long-lived Node server it simply continues.
- `/search` only returns stores within `ONDC_SEARCH_RADIUS_KM` (default 15) of the buyer's `fulfillment.end.location.gps`, and at most `ONDC_SEARCH_MAX_ITEMS` (default 2000) items, so the `on_search` payload stays a sane size.
- Orders nobody collects are auto-cancelled and their stock returned: after the buyer's pickup window + 2 h, or `ONDC_ORDER_EXPIRY_HOURS` (default 48) when there is no window. A daily Vercel Cron ([vercel.json](vercel.json) → `/api/cron/ondc-expire`) runs it; set `CRON_SECRET` in Vercel for the job to authorise. A vendor opening their orders also sweeps their own store.
- Vendors are emailed (via `RESEND_API_KEY` / `EMAIL_FROM`) when an order arrives, and the orders page chimes and shows the waiting count in the tab title.
- `issue`, `issue_status` and `receiver_recon` answer with a clear NACK ("not supported yet") instead of a 404.

### POS sync behaviour

- `stock` sent to `/api/pos/v1/inventory` (and `/products`) means *units on your shelf*; units reserved by active customer holds and open ONDC orders are subtracted automatically so a POS push can never resell them. `delta` and `/sales` adjust atomically in the database.
- Send `billId` in the body (or an `Idempotency-Key` header) with every `/sales`, `/inventory` and `/products` call: a retried request replays the first response (`"duplicate": true`) instead of being applied twice. Keys are remembered for 7 days.
- Inventory and sales are applied with bulk writes (1,000 rows ≈ a few DB calls). The API allows 300 requests/min per store and rate-limits repeated bad keys per IP (per server instance).
- A `/products` update that changes name, category, brand, images or description sends the product back to admin review; the sync response and the vendor's update history say so.
- If you also ring up Storaa/ONDC pickups in your POS, send your shelf count to `/inventory` rather than reporting those bills to `/sales`, or the item is deducted twice.

### Tests

`npm test` runs unit tests (ONDC signing, geo parsing, expiry, stock maths, rate limiter). `npm run lint` is configured (ESLint, `next/core-web-vitals`).

### Not built yet

Delivery fulfilment, online payments and settlement terms, GST / tax breakup lines in the quote, returns and refunds, IGM (issues & grievances), and bulk catalog push. The packaged-goods declaration is only sent when the vendor states a manufacturer; its address is the store's address. Error codes, tags and category ids follow the ONDC retail spec as best understood and have **not** been run through ONDC's Pramaan / log-verification tooling.
