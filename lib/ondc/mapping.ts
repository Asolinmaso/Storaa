import type { IProduct } from "@/models/Product";
import type { IStore } from "@/models/Store";
import { ondcConfig } from "./config";

interface OndcCategory {
  domain: string;
  categoryId: string;
}

/**
 * Stora category -> ONDC retail domain and category_id. Categories missing here
 * (Pet Care, Stationery, Sports & Fitness, Jewelry) are not published on ONDC.
 * Align category ids with the ONDC retail taxonomy for the domains you certify.
 */
export const CATEGORY_MAP: Record<string, OndcCategory> = {
  Groceries: { domain: "ONDC:RET10", categoryId: "Grocery" },
  "Fruits & Vegetables": { domain: "ONDC:RET10", categoryId: "Fruits and Vegetables" },
  Snacks: { domain: "ONDC:RET10", categoryId: "Packaged Foods" },
  Beverages: { domain: "ONDC:RET10", categoryId: "Beverages" },
  "Dairy & Eggs": { domain: "ONDC:RET10", categoryId: "Dairy and Eggs" },
  Fashion: { domain: "ONDC:RET12", categoryId: "Fashion" },
  "Personal care": { domain: "ONDC:RET13", categoryId: "Personal Care" },
  "Baby Care": { domain: "ONDC:RET13", categoryId: "Baby Care" },
  Electronics: { domain: "ONDC:RET14", categoryId: "Electronics" },
  "Kitchen & Appliances": { domain: "ONDC:RET15", categoryId: "Kitchen Appliances" },
  "Home Essentials": { domain: "ONDC:RET16", categoryId: "Home Decor" },
  Furniture: { domain: "ONDC:RET16", categoryId: "Furniture" },
  "Garden Essentials": { domain: "ONDC:RET16", categoryId: "Garden" },
  "Health & Wellness": { domain: "ONDC:RET18", categoryId: "Health and Wellness" },
};

export const categoryFor = (storaCategory: string) =>
  CATEGORY_MAP[storaCategory] ?? null;

/** Stora categories whose products are published under the given ONDC domain. */
export const categoriesForDomain = (domain: string) =>
  Object.entries(CATEGORY_MAP)
    .filter(([, c]) => c.domain === domain)
    .map(([name]) => name);

export const SUPPORTED_DOMAINS = Array.from(
  new Set(Object.values(CATEGORY_MAP).map((c) => c.domain))
);

export const money = (n: number) => n.toFixed(2);

export const absoluteUrl = (url: string) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${ondcConfig().publicBaseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

/** "lat,lng" for a store, falling back to ONDC_DEFAULT_GPS; null if neither is set. */
export function storeGps(store: IStore): string | null {
  if (store.latitude != null && store.longitude != null) {
    return `${store.latitude},${store.longitude}`;
  }
  return ondcConfig().defaultGps || null;
}

/** Product.unit is free text ("1 kg", "500 ml", "pack") -> Beckn unitized measure. */
export function unitMeasure(unit: string): { unit: string; value: string } {
  const m = /^\s*(\d+(?:\.\d+)?)?\s*([a-zA-Z]+)\s*$/.exec(unit ?? "");
  const units: Record<string, string> = {
    kg: "kilogram", kgs: "kilogram", g: "gram", gm: "gram", gms: "gram",
    gram: "gram", grams: "gram", l: "litre", ltr: "litre", litre: "litre",
    liter: "litre", litres: "litre", ml: "millilitre", dozen: "dozen",
  };
  const mapped = m ? units[m[2].toLowerCase()] : undefined;
  return mapped ? { unit: mapped, value: m?.[1] ?? "1" } : { unit: "unit", value: "1" };
}

/** Ondc time of day ("0900") from the datetime-local strings stored on Store. */
export function clock(value: string, fallback: string): string {
  const m = /T(\d{2}):(\d{2})/.exec(value ?? "");
  return m ? `${m[1]}${m[2]}` : fallback;
}

export function storeLocation(store: IStore) {
  const gps = storeGps(store);
  if (!gps) return null;
  return {
    id: `loc-${store._id}`,
    gps,
    address: {
      locality: store.shortAddress || store.address,
      street: store.address,
      city: store.city,
      area_code: store.postalCode,
      state: store.state,
    },
    time: {
      label: "enable",
      days: "1,2,3,4,5,6,7",
      schedule: { holidays: [] },
      range: {
        start: clock(store.openTime, "0900"),
        end: clock(store.closeTime, "2100"),
      },
    },
  };
}

export function itemDescriptor(p: IProduct) {
  const images = (p.images ?? []).map(absoluteUrl).filter(Boolean);
  const desc = [p.brand, ...(p.specifications ?? [])].filter(Boolean).join(" · ");
  return {
    name: p.name,
    symbol: images[0] ?? "",
    short_desc: desc || p.name,
    long_desc: desc || p.name,
    images,
  };
}
