import type { PosProvider } from "@/models/Store";

export interface PosProviderInfo {
  id: PosProvider;
  name: string;
  blurb: string;
  /** How the vendor wires this POS to the Storaa API. */
  setup: string;
}

/**
 * POS systems vendors commonly use. Every one connects through the same Storaa POS API;
 * the choice only tailors the setup instructions and labels the sync history.
 */
export const POS_PROVIDERS: PosProviderInfo[] = [
  { id: "gofrugal", name: "GOFRUGAL", blurb: "Retail & grocery ERP", setup: "Ask your GOFRUGAL partner or support to send stock and bill updates to the web address below, using your secret key. Give them the \"instructions\" button's text." },
  { id: "petpooja", name: "Petpooja", blurb: "Restaurant & retail POS", setup: "Ask your Petpooja account manager whether they can send stock to a third-party web address. If they can, give them the address and key below." },
  { id: "marg", name: "Marg ERP", blurb: "Pharma, FMCG & distribution", setup: "Ask your Marg dealer to set up a scheduled stock export that posts to the web address below — or upload your item list as a file instead." },
  { id: "tally", name: "Tally Prime", blurb: "Accounting & inventory", setup: "Tally does not push to the internet by itself. Ask your Tally partner for a connector, or export your stock to a file and upload it." },
  { id: "busy", name: "BUSY", blurb: "Accounting & billing", setup: "Export your item list from BUSY and upload it as a file, or ask your BUSY partner to post it to the web address below." },
  { id: "vyapar", name: "Vyapar", blurb: "Billing for small business", setup: "Export your item list from Vyapar and upload it as a file whenever your stock changes a lot." },
  { id: "shopify_pos", name: "Shopify POS", blurb: "Omnichannel POS", setup: "A developer can create a Shopify webhook on inventory changes that posts { sku, stock } to the web address below." },
  { id: "custom", name: "Custom / Other", blurb: "Any system that can make HTTPS calls", setup: "Any software that can send a web request can use this. Give your developer or software provider the instructions below." },
];

/** Plain-text brief a shop owner can send to whoever maintains their billing software (no secrets in it). */
export function providerBrief(base: string, storeName: string): string {
  return [
    `Hi, I'd like my billing software to keep stock in sync with Storaa (store: ${storeName}).`,
    ``,
    `Web address (API base URL): ${base}`,
    `Authentication: header "Authorization: Bearer <my secret key>" — I will send you the key separately.`,
    ``,
    `What to call:`,
    `  POST ${base}/inventory   body {"items":[{"sku":"ATTA-5KG","stock":42}]}   -> sets stock to what is on the shelf`,
    `  POST ${base}/sales       body {"billId":"INV-1042","items":[{"sku":"ATTA-5KG","quantity":2}]}   -> reduces stock for a bill (billId makes retries safe)`,
    `  POST ${base}/products    -> create/update product records`,
    `  GET  ${base}/products    -> download the catalog`,
    `  GET  ${base}/ping        -> test that the key works`,
    ``,
    `Items are matched by SKU, then barcode. Up to 1,000 items per request. Please send a unique billId (or an Idempotency-Key header) with every bill.`,
  ].join("\n");
}

export const providerName = (id: string) =>
  POS_PROVIDERS.find((p) => p.id === id)?.name ?? (id || "API");
