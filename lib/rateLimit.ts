/**
 * Small in-memory fixed-window limiter. On serverless each instance counts separately, so this is a
 * brake on runaway or abusive clients, not an exact quota.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  if (now - lastSweep > 60_000) {
    lastSweep = now;
    buckets.forEach((b, k) => {
      if (b.resetAt <= now) buckets.delete(k);
    });
  }
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (b.count >= limit) return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  b.count++;
  return { ok: true };
}
