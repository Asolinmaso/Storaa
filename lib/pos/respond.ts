import { NextResponse } from "next/server";
import type { IStore } from "@/models/Store";
import PosRequest from "@/models/PosRequest";
import { rateLimit } from "@/lib/rateLimit";
import { storeForApiKey } from "./keys";

export const unauthorized = () =>
  NextResponse.json(
    { code: "UNAUTHORIZED", message: "Send a valid store API key as 'Authorization: Bearer stk_live_…'." },
    { status: 401 }
  );

const tooMany = (retryAfterSeconds: number) =>
  NextResponse.json(
    { code: "RATE_LIMITED", message: `Too many requests. Try again in ${retryAfterSeconds}s.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );

/** Requests per minute per store key, and failed/unknown-key attempts per minute per IP. */
const STORE_LIMIT_PER_MIN = 300;
const BAD_KEY_LIMIT_PER_MIN = 30;

const clientIp = (req: Request) =>
  (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";

/** Runs `fn` for the store owning the request's API key; JSON errors otherwise. */
export async function withPosStore(
  req: Request,
  fn: (store: IStore) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const ip = clientIp(req);
    const store = await storeForApiKey(req);
    if (!store) {
      const r = rateLimit(`badkey:${ip}`, BAD_KEY_LIMIT_PER_MIN, 60_000);
      return r.ok ? unauthorized() : tooMany(r.retryAfterSeconds);
    }
    const lim = rateLimit(`store:${store._id}`, STORE_LIMIT_PER_MIN, 60_000);
    if (!lim.ok) return tooMany(lim.retryAfterSeconds);
    return await fn(store);
  } catch (err) {
    console.error("[POS] request failed:", err);
    return NextResponse.json({ code: "SERVER_ERROR", message: "Something went wrong." }, { status: 500 });
  }
}

export interface PosBody {
  items: unknown;
  /** Idempotency key: `Idempotency-Key` header, else `billId` / `requestId` in the body. */
  key: string | null;
}

const validKey = (v: unknown) => (typeof v === "string" && v.trim() && v.trim().length <= 128 ? v.trim() : null);

/** Reads `{ items: [...] }` (or a bare array) plus the optional idempotency key. */
export async function readPosBody(req: Request): Promise<PosBody> {
  const body = await req.json().catch(() => null);
  const fromBody = body && !Array.isArray(body) ? validKey((body as Record<string, unknown>).billId) ?? validKey((body as Record<string, unknown>).requestId) : null;
  const key = validKey(req.headers.get("idempotency-key")) ?? fromBody;
  if (Array.isArray(body)) return { items: body, key };
  return { items: (body as { items?: unknown } | null)?.items, key };
}

/**
 * Applies a change at most once per idempotency key. A retry of a finished request replays the
 * stored response (`duplicate: true`); a retry while the first is still running gets 409.
 * Without a key the change simply runs.
 */
export async function once(
  store: IStore,
  kind: string,
  key: string | null,
  run: () => Promise<NextResponse>
): Promise<NextResponse> {
  if (!key) return run();

  const where = { storeId: store._id, kind, key };
  try {
    await PosRequest.create({ ...where, status: "pending" });
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
    const prior = await PosRequest.findOne(where);
    if (prior?.status === "done") {
      return NextResponse.json({ ...(prior.response ?? {}), duplicate: true }, { status: prior.httpStatus });
    }
    // Crashed or still running? Give a live request two minutes before taking over.
    if (prior && Date.now() - prior.createdAt.getTime() < 120_000) {
      return NextResponse.json(
        { code: "IN_PROGRESS", message: "The first request with this key is still being processed. Retry shortly." },
        { status: 409 }
      );
    }
    await PosRequest.updateOne(where, { status: "pending", createdAt: new Date() });
  }

  let res: NextResponse;
  try {
    res = await run();
  } catch (err) {
    await PosRequest.deleteOne(where).catch(() => undefined);
    throw err;
  }
  if (res.status >= 500) {
    await PosRequest.deleteOne(where).catch(() => undefined);
    return res;
  }
  const response = await res.clone().json().catch(() => null);
  await PosRequest.updateOne(where, { status: "done", httpStatus: res.status, response });
  return res;
}

/** Turns a sync result into a response: 200 all good, 207 partial, 400 bad request. */
export function syncResponse(result: { error: string } | { ok: boolean; failed: number; received: number }) {
  if ("error" in result) {
    return NextResponse.json({ code: "VALIDATION_ERROR", message: result.error }, { status: 400 });
  }
  const status = result.failed === 0 ? 200 : result.failed < result.received ? 207 : 422;
  return NextResponse.json(result, { status });
}

export const sourceOf = (req: Request, store: IStore) =>
  (req.headers.get("x-pos-source") || store.pos?.provider || "api").slice(0, 40);
