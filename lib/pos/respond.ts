import { NextResponse } from "next/server";
import type { IStore } from "@/models/Store";
import { storeForApiKey } from "./keys";

export const unauthorized = () =>
  NextResponse.json(
    { code: "UNAUTHORIZED", message: "Send a valid store API key as 'Authorization: Bearer stk_live_…'." },
    { status: 401 }
  );

/** Runs `fn` for the store owning the request's API key; JSON errors otherwise. */
export async function withPosStore(
  req: Request,
  fn: (store: IStore) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const store = await storeForApiKey(req);
    if (!store) return unauthorized();
    return await fn(store);
  } catch (err) {
    console.error("[POS] request failed:", err);
    return NextResponse.json({ code: "SERVER_ERROR", message: "Something went wrong." }, { status: 500 });
  }
}

export async function readItems(req: Request): Promise<unknown> {
  const body = await req.json().catch(() => null);
  if (Array.isArray(body)) return body;
  return (body as { items?: unknown } | null)?.items;
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
