import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { connectDB } from "@/lib/db";
import Store, { type IStore } from "@/models/Store";

const PREFIX = "stk_live_";

export const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

/** A new random API key; only its hash is stored. */
export function generateKey(): { key: string; hash: string; prefix: string } {
  const key = PREFIX + randomBytes(24).toString("base64url");
  return { key, hash: hashKey(key), prefix: key.slice(0, PREFIX.length + 6) };
}

/** Store for `Authorization: Bearer stk_live_…` (or `X-Api-Key`), or null. */
export async function storeForApiKey(req: Request): Promise<IStore | null> {
  const auth = req.headers.get("authorization") ?? "";
  const key = (auth.match(/^Bearer\s+(\S+)$/i)?.[1] ?? req.headers.get("x-api-key") ?? "").trim();
  if (!key.startsWith(PREFIX)) return null;
  const hash = hashKey(key);
  await connectDB();
  const store = await Store.findOne({ "pos.apiKeyHash": hash });
  if (!store) return null;
  // Belt and braces: compare in constant time even though the lookup matched.
  const a = Buffer.from(store.pos.apiKeyHash, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (store.status !== "approved") return null;
  return store;
}
