import { createAuthHeader } from "./crypto";
import { requireConfig } from "./config";
import type { BecknContext, BecknError, Json } from "./types";

/** Context for a callback to the buyer app, derived from the request's (or stored order's) context. */
export function callbackContext(
  from: Pick<
    BecknContext,
    | "domain"
    | "country"
    | "city"
    | "core_version"
    | "bap_id"
    | "bap_uri"
    | "transaction_id"
  > &
    Partial<BecknContext>,
  action: string,
  messageId?: string
): BecknContext {
  const cfg = requireConfig(["subscriberId", "subscriberUrl"]);
  return {
    domain: from.domain,
    country: from.country,
    city: from.city,
    action,
    core_version: from.core_version,
    bap_id: from.bap_id,
    bap_uri: from.bap_uri,
    bpp_id: cfg.subscriberId,
    bpp_uri: cfg.subscriberUrl,
    transaction_id: from.transaction_id,
    message_id: messageId ?? from.message_id ?? crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ttl: from.ttl ?? "PT30S",
  };
}

/** Signs and POSTs `{context, message|error}` to `{bap_uri}/{context.action}`. */
export async function sendCallback(
  context: BecknContext,
  payload: { message: Json } | { error: BecknError }
): Promise<boolean> {
  const cfg = requireConfig(["subscriberId", "uniqueKeyId", "signingPrivateKey"]);
  const body = JSON.stringify({ context, ...payload });
  const url = `${context.bap_uri.replace(/\/+$/, "")}/${context.action}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: createAuthHeader(body, cfg),
        },
        body,
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) return true;
      console.error(`[ONDC] ${context.action} -> ${url}: HTTP ${res.status}`);
      if (res.status < 500) return false;
    } catch (err) {
      console.error(`[ONDC] ${context.action} -> ${url} failed:`, err);
    }
  }
  return false;
}
