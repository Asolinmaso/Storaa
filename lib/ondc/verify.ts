import { ondcConfig } from "./config";
import { parseAuthHeader, verifyAuthHeader } from "./crypto";
import { lookupSigningKey } from "./registry";

interface VerifyOptions {
  header: string | null;
  body: string;
  /** Subscriber the signature must belong to (the BAP for Authorization, anything for the gateway). */
  expectedSubscriberId?: string;
  domain?: string;
}

/** True when `header` is a valid, unexpired signature over `body` by a registered participant. */
export async function verifyInbound({
  header,
  body,
  expectedSubscriberId,
  domain,
}: VerifyOptions): Promise<boolean> {
  if (ondcConfig().skipVerify) return true;
  if (!header) return false;

  const parsed = parseAuthHeader(header);
  if (!parsed) return false;
  if (expectedSubscriberId && parsed.subscriberId !== expectedSubscriberId) {
    return false;
  }

  try {
    const key = await lookupSigningKey(
      parsed.subscriberId,
      parsed.uniqueKeyId,
      domain
    );
    return key ? verifyAuthHeader(parsed, body, key) : false;
  } catch (err) {
    console.error("[ONDC] signature verification error:", err);
    return false;
  }
}
