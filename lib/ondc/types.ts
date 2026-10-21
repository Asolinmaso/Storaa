export interface BecknContext {
  domain: string;
  country: string;
  city: string;
  action: string;
  core_version: string;
  bap_id: string;
  bap_uri: string;
  bpp_id?: string;
  bpp_uri?: string;
  transaction_id: string;
  message_id: string;
  timestamp: string;
  ttl?: string;
  [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;

export interface BecknError {
  type: "CONTEXT-ERROR" | "DOMAIN-ERROR" | "POLICY-ERROR" | "JSON-SCHEMA-ERROR";
  code: string;
  message: string;
}

export interface BecknRequest {
  context: BecknContext;
  message: Json;
}

/** What a handler produces: the `message` of the on_* callback, or an error. */
export type HandlerResult = { message: Json } | { error: BecknError };

export const INBOUND_ACTIONS = [
  "search",
  "select",
  "init",
  "confirm",
  "status",
  "cancel",
  "update",
  "track",
  "rating",
  "support",
] as const;
export type InboundAction = (typeof INBOUND_ACTIONS)[number];

// Codes follow the ONDC retail error list; verify against the current list during certification.
export const ERR = {
  invalidSignature: { type: "CONTEXT-ERROR", code: "10001", message: "Invalid signature" },
  badContext: (m: string): BecknError => ({ type: "CONTEXT-ERROR", code: "10000", message: m }),
  providerNotFound: { type: "DOMAIN-ERROR", code: "30001", message: "Provider not found" },
  itemNotFound: { type: "DOMAIN-ERROR", code: "30004", message: "Item not found" },
  outOfStock: { type: "DOMAIN-ERROR", code: "40002", message: "Item quantity unavailable" },
  quoteMismatch: { type: "DOMAIN-ERROR", code: "40007", message: "Quote does not match current prices" },
  orderNotFound: { type: "DOMAIN-ERROR", code: "35001", message: "Order not found" },
  cannotCancel: { type: "DOMAIN-ERROR", code: "35002", message: "Order can no longer be cancelled" },
  badRequest: (m: string): BecknError => ({ type: "JSON-SCHEMA-ERROR", code: "50000", message: m }),
} as const satisfies Record<string, BecknError | ((m: string) => BecknError)>;
