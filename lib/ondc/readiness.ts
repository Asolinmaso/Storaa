import type { IProduct } from "@/models/Product";
import type { IStore } from "@/models/Store";
import { ondcConfig } from "./config";
import { categoryFor, storeGps, unitMeasure } from "./mapping";

export type CheckLevel = "ok" | "warn" | "error";

export interface ReadinessCheck {
  id: string;
  label: string;
  level: CheckLevel;
  detail: string;
}

const isApproved = (p: IProduct) => !p.status || p.status === "approved";

/** Why a product won't appear in ONDC search (errors) or may list poorly (warnings). */
export function productIssues(p: IProduct): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (p.ondc?.listed === false) errors.push("Hidden from ONDC by you");
  if (!isApproved(p)) errors.push(p.status === "rejected" ? "Rejected by admin" : "Awaiting admin approval");
  if (!categoryFor(p.category)) errors.push(`Category "${p.category}" is not sold on ONDC`);
  if ((p.stock ?? 0) <= 0) errors.push("Out of stock");
  if (!(p.price > 0)) errors.push("No price");
  if (!p.images?.length) warnings.push("No image — buyer apps rank items without images lower");
  if (unitMeasure(p.unit).unit === "unit" && p.unit && !/^(\d+\s*)?(pc|pcs|piece|pieces|unit|units|pack|nos?)$/i.test(p.unit.trim())) {
    warnings.push(`Unit "${p.unit}" is sent as "1 unit"`);
  }
  if (p.mrp && p.mrp < p.price) warnings.push("MRP is lower than the price");
  if (categoryFor(p.category)?.domain === "ONDC:RET10" && (!p.ondc?.vegType || p.ondc.vegType === "na")) {
    warnings.push("Grocery items should say veg / non-veg");
  }
  if (!p.ondc?.manufacturer && !p.brand) warnings.push("No brand or manufacturer (needed for packaged goods)");
  return { errors, warnings };
}

export function storeChecks(store: IStore, products: IProduct[]): ReadinessCheck[] {
  const cfg = ondcConfig();
  const gps = storeGps(store);
  const hasOwnGps = store.latitude != null && store.longitude != null;
  const listable = products.filter((p) => productIssues(p).errors.length === 0).length;

  return [
    {
      id: "platform",
      label: "Storaa is connected to ONDC",
      level: cfg.enabled ? "ok" : "error",
      detail: cfg.enabled
        ? `Seller app ${cfg.subscriberId || "(subscriber id not set)"} · registry ${cfg.registryUrl.replace(/^https?:\/\//, "") || "not set"}`
        : "The platform's ONDC integration is switched off. Contact Storaa support.",
    },
    {
      id: "approved",
      label: "Store approved",
      level: store.status === "approved" ? "ok" : "error",
      detail: store.status === "approved" ? "Your store passed verification." : "Your store must be approved before it can be listed.",
    },
    {
      id: "location",
      label: "Pickup location (GPS)",
      level: hasOwnGps ? "ok" : gps ? "warn" : "error",
      detail: hasOwnGps
        ? `${store.latitude}, ${store.longitude}`
        : gps
          ? "Using the platform's default location. Set your exact store location so nearby buyers find you."
          : "Set your store's coordinates — buyer apps search by distance.",
    },
    {
      id: "open",
      label: "Store open for orders",
      level: store.isOpen ? "ok" : "warn",
      detail: store.isOpen ? "Accepting orders." : "Store is paused — it is hidden from ONDC search.",
    },
    {
      id: "tax",
      label: "Tax details",
      level: store.gstNumber ? "ok" : "warn",
      detail: store.gstNumber ? `GSTIN ${store.gstNumber}` : "No GSTIN on file. Some buyer apps require it for invoices.",
    },
    {
      id: "catalog",
      label: "Products ready to list",
      level: listable > 0 ? "ok" : "error",
      detail: `${listable} of ${products.length} products can be listed.`,
    },
    {
      id: "optin",
      label: "Listed on ONDC",
      level: store.ondcEnabled ? "ok" : "warn",
      detail: store.ondcEnabled ? "Your catalog is published to buyer apps." : "Turn on listing to publish your catalog.",
    },
  ];
}
