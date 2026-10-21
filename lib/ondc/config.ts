export class OndcConfigError extends Error {}

export interface OndcConfig {
  enabled: boolean;
  /** Registered subscriber_id, e.g. "stora.example.com". */
  subscriberId: string;
  /** Public base URL ONDC calls us on, e.g. "https://stora.example.com/api/ondc". */
  subscriberUrl: string;
  uniqueKeyId: string;
  /** base64; raw 32/64-byte Ed25519 key or PKCS8 DER. */
  signingPrivateKey: string;
  /** base64; raw 32-byte Ed25519 key or SPKI DER. */
  signingPublicKey: string;
  /** base64; raw 32-byte X25519 key or PKCS8 DER. */
  encPrivateKey: string;
  encPublicKey: string;
  registryUrl: string;
  /** ONDC's X25519 public key (base64 SPKI DER) for the environment in use. */
  registryEncPublicKey: string;
  /** request_id used for the /subscribe call; signed into the site verification page. */
  requestId: string;
  /** Public origin of the Next app, used to absolutise relative image URLs. */
  publicBaseUrl: string;
  /** "lat,lng" fallback for stores without coordinates. */
  defaultGps: string;
  cityCode: string;
  supportPhone: string;
  supportEmail: string;
  supportUri: string;
  /** Dev only: accept inbound requests without verifying signatures. */
  skipVerify: boolean;
}

export function ondcConfig(): OndcConfig {
  const env = process.env;
  return {
    enabled: env.ONDC_ENABLED === "true",
    subscriberId: env.ONDC_SUBSCRIBER_ID ?? "",
    subscriberUrl: (env.ONDC_SUBSCRIBER_URL ?? "").replace(/\/+$/, ""),
    uniqueKeyId: env.ONDC_UNIQUE_KEY_ID ?? "",
    signingPrivateKey: env.ONDC_SIGNING_PRIVATE_KEY ?? "",
    signingPublicKey: env.ONDC_SIGNING_PUBLIC_KEY ?? "",
    encPrivateKey: env.ONDC_ENCRYPTION_PRIVATE_KEY ?? "",
    encPublicKey: env.ONDC_ENCRYPTION_PUBLIC_KEY ?? "",
    registryUrl: (env.ONDC_REGISTRY_URL ?? "").replace(/\/+$/, ""),
    registryEncPublicKey: env.ONDC_REGISTRY_ENC_PUBLIC_KEY ?? "",
    requestId: env.ONDC_REQUEST_ID ?? "",
    publicBaseUrl: (env.ONDC_PUBLIC_BASE_URL ?? "").replace(/\/+$/, ""),
    defaultGps: env.ONDC_DEFAULT_GPS ?? "",
    cityCode: env.ONDC_CITY_CODE ?? "*",
    supportPhone: env.ONDC_SUPPORT_PHONE ?? "",
    supportEmail: env.ONDC_SUPPORT_EMAIL ?? "",
    supportUri: env.ONDC_SUPPORT_URI ?? "",
    // Never skippable in production.
    skipVerify:
      env.ONDC_SKIP_SIGNATURE_VERIFY === "true" &&
      env.NODE_ENV !== "production",
  };
}

const ENV_NAMES: Partial<Record<keyof OndcConfig, string>> = {
  subscriberId: "ONDC_SUBSCRIBER_ID",
  subscriberUrl: "ONDC_SUBSCRIBER_URL",
  uniqueKeyId: "ONDC_UNIQUE_KEY_ID",
  signingPrivateKey: "ONDC_SIGNING_PRIVATE_KEY",
  signingPublicKey: "ONDC_SIGNING_PUBLIC_KEY",
  encPrivateKey: "ONDC_ENCRYPTION_PRIVATE_KEY",
  registryUrl: "ONDC_REGISTRY_URL",
  registryEncPublicKey: "ONDC_REGISTRY_ENC_PUBLIC_KEY",
  requestId: "ONDC_REQUEST_ID",
};

/** Throws OndcConfigError naming every missing env var among `keys`. */
export function requireConfig(keys: (keyof OndcConfig)[]): OndcConfig {
  const cfg = ondcConfig();
  const missing = keys.filter((k) => !cfg[k]).map((k) => ENV_NAMES[k] ?? k);
  if (missing.length) {
    throw new OndcConfigError(`Missing ONDC config: ${missing.join(", ")}`);
  }
  return cfg;
}
