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
  { id: "gofrugal", name: "GOFRUGAL", blurb: "Retail & grocery ERP", setup: "In GOFRUGAL Connect, add a custom webhook for stock and bill events pointing to the endpoints below, with your API key as a Bearer token." },
  { id: "petpooja", name: "Petpooja", blurb: "Restaurant & retail POS", setup: "Ask your Petpooja account manager to enable third-party inventory push, then give them the base URL and API key below." },
  { id: "marg", name: "Marg ERP", blurb: "Pharma, FMCG & distribution", setup: "Use Marg's data export scheduler or a middleware script to POST stock to /inventory every few minutes." },
  { id: "tally", name: "Tally Prime", blurb: "Accounting & inventory", setup: "Use a TDL or connector (e.g. a scheduled export) that reads stock items and POSTs them to /inventory." },
  { id: "busy", name: "BUSY", blurb: "Accounting & billing", setup: "Schedule BUSY's item export and push it with a small script, or upload the CSV under Products → Import." },
  { id: "vyapar", name: "Vyapar", blurb: "Billing for small business", setup: "Export your item list from Vyapar and upload it under Products → Import, or push it via the API." },
  { id: "shopify_pos", name: "Shopify POS", blurb: "Omnichannel POS", setup: "Create a Shopify Flow or app webhook on inventory_levels/update that POSTs { sku, stock } to /inventory." },
  { id: "custom", name: "Custom / Other", blurb: "Any system that can make HTTPS calls", setup: "Call the REST endpoints below from your POS, middleware or a scheduled script." },
];

export const providerName = (id: string) =>
  POS_PROVIDERS.find((p) => p.id === id)?.name ?? (id || "API");
