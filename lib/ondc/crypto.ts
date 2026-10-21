import crypto, { type KeyObject } from "node:crypto";

// Raw 32-byte keys are wrapped in these DER prefixes so Node's KeyObject API can use them.
const ED25519_PKCS8 = Buffer.from("302e020100300506032b657004220420", "hex");
const ED25519_SPKI = Buffer.from("302a300506032b6570032100", "hex");
const X25519_PKCS8 = Buffer.from("302e020100300506032b656e04220420", "hex");
const X25519_SPKI = Buffer.from("302a300506032b656e032100", "hex");

function privateKey(b64: string, pkcs8Prefix: Buffer): KeyObject {
  const raw = Buffer.from(b64, "base64");
  // 32 = seed, 64 = libsodium seed||public; anything else is assumed to be PKCS8 DER.
  if (raw.length === 32 || raw.length === 64) {
    return crypto.createPrivateKey({
      key: Buffer.concat([pkcs8Prefix, raw.subarray(0, 32)]),
      format: "der",
      type: "pkcs8",
    });
  }
  return crypto.createPrivateKey({ key: raw, format: "der", type: "pkcs8" });
}

function publicKey(b64: string, spkiPrefix: Buffer): KeyObject {
  const raw = Buffer.from(b64, "base64");
  const der = raw.length === 32 ? Buffer.concat([spkiPrefix, raw]) : raw;
  return crypto.createPublicKey({ key: der, format: "der", type: "spki" });
}

export const ed25519Private = (b64: string) => privateKey(b64, ED25519_PKCS8);
export const ed25519Public = (b64: string) => publicKey(b64, ED25519_SPKI);
export const x25519Private = (b64: string) => privateKey(b64, X25519_PKCS8);
export const x25519Public = (b64: string) => publicKey(b64, X25519_SPKI);

export const signBase64 = (message: string, signingPrivateKey: string) =>
  crypto
    .sign(null, Buffer.from(message), ed25519Private(signingPrivateKey))
    .toString("base64");

export function verifyBase64(
  message: string,
  signature: string,
  signingPublicKey: string
): boolean {
  try {
    return crypto.verify(
      null,
      Buffer.from(message),
      ed25519Public(signingPublicKey),
      Buffer.from(signature, "base64")
    );
  } catch {
    return false;
  }
}

export const blake512Digest = (body: string) =>
  crypto.createHash("blake2b512").update(body).digest("base64");

function signingString(created: number, expires: number, digest: string) {
  return `(created): ${created}\n(expires): ${expires}\ndigest: BLAKE-512=${digest}`;
}

/** Beckn/ONDC `Authorization` header for an outbound request with exactly this body string. */
export function createAuthHeader(
  body: string,
  opts: {
    subscriberId: string;
    uniqueKeyId: string;
    signingPrivateKey: string;
    ttlSeconds?: number;
  }
): string {
  const created = Math.floor(Date.now() / 1000);
  const expires = created + (opts.ttlSeconds ?? 300);
  const signature = signBase64(
    signingString(created, expires, blake512Digest(body)),
    opts.signingPrivateKey
  );
  return (
    `Signature keyId="${opts.subscriberId}|${opts.uniqueKeyId}|ed25519",` +
    `algorithm="ed25519",created="${created}",expires="${expires}",` +
    `headers="(created) (expires) digest",signature="${signature}"`
  );
}

export interface ParsedAuthHeader {
  subscriberId: string;
  uniqueKeyId: string;
  created: number;
  expires: number;
  headers: string;
  signature: string;
}

export function parseAuthHeader(header: string): ParsedAuthHeader | null {
  if (!header.startsWith("Signature ")) return null;
  const fields: Record<string, string> = {};
  for (const m of Array.from(
    header.slice("Signature ".length).matchAll(/(\w+)="([^"]*)"/g)
  )) {
    fields[m[1]] = m[2];
  }
  const [subscriberId, uniqueKeyId, alg] = (fields.keyId ?? "").split("|");
  const created = Number(fields.created);
  const expires = Number(fields.expires);
  if (
    !subscriberId ||
    !uniqueKeyId ||
    alg !== "ed25519" ||
    !fields.signature ||
    !Number.isFinite(created) ||
    !Number.isFinite(expires)
  ) {
    return null;
  }
  return {
    subscriberId,
    uniqueKeyId,
    created,
    expires,
    headers: fields.headers ?? "",
    signature: fields.signature,
  };
}

const CLOCK_SKEW_SECONDS = 60;

export function verifyAuthHeader(
  parsed: ParsedAuthHeader,
  body: string,
  signingPublicKey: string
): boolean {
  const now = Math.floor(Date.now() / 1000);
  if (parsed.created > now + CLOCK_SKEW_SECONDS) return false;
  if (parsed.expires < now - CLOCK_SKEW_SECONDS) return false;
  if (parsed.headers !== "(created) (expires) digest") return false;
  return verifyBase64(
    signingString(parsed.created, parsed.expires, blake512Digest(body)),
    parsed.signature,
    signingPublicKey
  );
}

/** Decrypts the registry's /on_subscribe challenge (X25519 shared secret + AES-256-ECB). */
export function decryptChallenge(
  challenge: string,
  encPrivateKey: string,
  registryEncPublicKey: string
): string {
  const sharedKey = crypto.diffieHellman({
    privateKey: x25519Private(encPrivateKey),
    publicKey: x25519Public(registryEncPublicKey),
  });
  const decipher = crypto.createDecipheriv("aes-256-ecb", sharedKey, null);
  return Buffer.concat([
    decipher.update(Buffer.from(challenge, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
