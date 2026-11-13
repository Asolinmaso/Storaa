import { ondcConfig } from "./config";
import { createAuthHeader } from "./crypto";

export type NetworkState = "off" | "not_configured" | "subscribed" | "not_registered" | "key_mismatch" | "unreachable";

export interface NetworkStatus {
  state: NetworkState;
  environment: "Pre-production" | "Production" | "Not configured";
  checkedAt: string;
}

const CACHE_MS = 5 * 60 * 1000;
let cached: { status: NetworkStatus; at: number } | null = null;

/** Last 32 bytes of a base64 key, so a raw key and its SPKI/DER form compare equal. */
const raw32 = (b64: string) => {
  try {
    const b = Buffer.from(b64, "base64");
    return b.length >= 32 ? b.subarray(b.length - 32).toString("base64") : "";
  } catch {
    return "";
  }
};

export const environmentOf = (registryUrl: string): NetworkStatus["environment"] =>
  !registryUrl ? "Not configured" : /preprod|staging/i.test(registryUrl) ? "Pre-production" : "Production";

/**
 * Asks the ONDC registry whether Storaa itself is a SUBSCRIBED seller app with the signing key we
 * hold. This, not ONDC_ENABLED, is what decides whether buyer apps can actually reach vendors.
 * Cached for 5 minutes per server instance; never throws.
 */
export async function networkStatus(): Promise<NetworkStatus> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.status;
  const cfg = ondcConfig();
  const environment = environmentOf(cfg.registryUrl);
  const done = (state: NetworkState): NetworkStatus => {
    const status = { state, environment, checkedAt: new Date().toISOString() };
    // Only "subscribed" is kept for the full 5 minutes: a pending approval or a network blip is
    // re-checked within a minute, so vendors see the change soon after it happens.
    const ttl = state === "subscribed" ? CACHE_MS : state === "unreachable" ? 30_000 : 60_000;
    cached = { status, at: Date.now() - CACHE_MS + ttl };
    return status;
  };
  if (!cfg.enabled) return done("off");
  if (!cfg.registryUrl || !cfg.subscriberId || !cfg.uniqueKeyId || !cfg.signingPrivateKey) return done("not_configured");
  try {
    const body = JSON.stringify({ subscriber_id: cfg.subscriberId, ukId: cfg.uniqueKeyId, country: "IND" });
    const res = await fetch(`${cfg.registryUrl}/v2.0/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: createAuthHeader(body, cfg) },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json().catch(() => null);
    // The v2.0 lookup must be signed by a registered participant, so an unregistered Storaa gets
    // 401 "Subscriber not found" (15040) rather than an empty list.
    if (res.status === 401 || res.status === 404) return done("not_registered");
    if (!res.ok) throw new Error(`Registry lookup failed: HTTP ${res.status}`);
    const entry = (Array.isArray(data) ? data : []).find(
      (e: { subscriber_id?: string; ukId?: string; unique_key_id?: string }) =>
        e.subscriber_id === cfg.subscriberId && (e.ukId ?? e.unique_key_id) === cfg.uniqueKeyId
    ) as { status?: string; signing_public_key?: string; valid_until?: string } | undefined;
    if (!entry || (entry.status && entry.status !== "SUBSCRIBED")) return done("not_registered");
    if (entry.valid_until && Date.parse(entry.valid_until) < Date.now()) return done("not_registered");
    if (cfg.signingPublicKey && raw32(entry.signing_public_key ?? "") !== raw32(cfg.signingPublicKey)) return done("key_mismatch");
    return done("subscribed");
  } catch (err) {
    console.error("[ONDC] registry self-check failed:", err);
    return done("unreachable");
  }
}

/** Plain-language explanation of the platform's ONDC status for vendors. */
export function describeNetwork(s: NetworkStatus): { level: "ok" | "warn" | "error"; detail: string } {
  switch (s.state) {
    case "subscribed":
      return { level: "ok", detail: `Storaa is approved on the ONDC network (${s.environment}).` };
    case "off":
      return { level: "error", detail: "Storaa hasn't switched ONDC on yet. You can still get your products ready below." };
    case "not_configured":
      return { level: "error", detail: "Storaa's ONDC set-up isn't finished yet. Nothing for you to do — Storaa's team is on it." };
    case "not_registered":
      return {
        level: "error",
        detail: `Storaa is waiting for ONDC to approve its registration (${s.environment}). Until then buyer apps can't see any store. Nothing for you to do — your listing goes live by itself once ONDC approves.`,
      };
    case "key_mismatch":
      return { level: "error", detail: "Storaa's ONDC security keys don't match its registration. Storaa's team needs to fix this." };
    case "unreachable":
      return { level: "warn", detail: "Couldn't reach ONDC just now to confirm Storaa's registration. This usually clears up by itself." };
  }
}
