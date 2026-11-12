import { waitUntil } from "@vercel/functions";

/**
 * Keeps `work` alive after the HTTP response has been sent. On Vercel a serverless function is
 * frozen as soon as it responds, so un-awaited promises (e.g. ONDC callbacks sent after the ACK)
 * can be cut off; `waitUntil` tells the platform to wait for them. Elsewhere it simply runs.
 * Never throws and never rejects.
 */
export function runInBackground(work: Promise<unknown>): void {
  const safe = work.catch((err) => console.error("[background] task failed:", err));
  try {
    waitUntil(safe);
  } catch {
    // Not running on Vercel: the promise continues on its own.
  }
}
