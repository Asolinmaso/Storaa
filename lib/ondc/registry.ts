import { createAuthHeader } from "./crypto";
import { requireConfig } from "./config";

interface RegistryEntry {
  subscriber_id: string;
  ukId?: string;
  unique_key_id?: string;
  signing_public_key: string;
  status?: string;
  valid_until?: string;
}

const CACHE_MS = 5 * 60 * 1000;
const cache = new Map<string, { key: string; at: number }>();

/** Signing public key for a network participant, via the registry v2.0 lookup. */
export async function lookupSigningKey(
  subscriberId: string,
  uniqueKeyId: string,
  domain?: string
): Promise<string | null> {
  const cacheKey = `${subscriberId}|${uniqueKeyId}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.key;

  const cfg = requireConfig([
    "registryUrl",
    "subscriberId",
    "uniqueKeyId",
    "signingPrivateKey",
  ]);
  const body = JSON.stringify({
    subscriber_id: subscriberId,
    ukId: uniqueKeyId,
    country: "IND",
    ...(domain ? { domain } : {}),
  });
  const res = await fetch(`${cfg.registryUrl}/v2.0/lookup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: createAuthHeader(body, cfg),
    },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Registry lookup failed: HTTP ${res.status}`);

  const entries = (await res.json()) as RegistryEntry[];
  const now = Date.now();
  const entry = (Array.isArray(entries) ? entries : []).find(
    (e) =>
      e.subscriber_id === subscriberId &&
      (e.ukId ?? e.unique_key_id) === uniqueKeyId &&
      (!e.status || e.status === "SUBSCRIBED") &&
      (!e.valid_until || Date.parse(e.valid_until) > now)
  );
  if (!entry) return null;

  cache.set(cacheKey, { key: entry.signing_public_key, at: now });
  return entry.signing_public_key;
}
