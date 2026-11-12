import type { IOndcOrder, IOndcOrderItem } from "@/models/OndcOrder";
import type { IProduct } from "@/models/Product";
import type { IStore } from "@/models/Store";
import { ondcConfig } from "./config";
import {
  absoluteUrl,
  categoryFor,
  itemDescriptor,
  money,
  storeLocation,
  unitMeasure,
} from "./mapping";
import type { Json } from "./types";

export const FULFILLMENT_ID = "1";
export const FULFILLMENT_TYPE = "Self-Pickup";
const CURRENCY = "INR";

export const price = (n: number) => ({ currency: CURRENCY, value: money(n) });

function consumerCare(store: IStore) {
  const cfg = ondcConfig();
  return [store.name, cfg.supportEmail || store.email, cfg.supportPhone || store.phone].join(",");
}

/** ISO-8601 duration for a number of minutes ("PT45M", "PT2H"). */
export function isoMinutes(min: number): string {
  const m = Math.max(1, Math.round(min || 60));
  return m % 60 === 0 ? `PT${m / 60}H` : `PT${m}M`;
}

function itemTags(p: IProduct) {
  const tags: Json[] = [];
  const veg = p.ondc?.vegType;
  if (veg && veg !== "na") {
    tags.push({
      code: "veg_nonveg",
      list: [{ code: veg === "non_veg" ? "non_veg" : veg, value: "yes" }],
    });
  }
  tags.push({ code: "origin", list: [{ code: "country", value: p.ondc?.countryOfOrigin || "IND" }] });
  return tags;
}

function catalogItem(p: IProduct, store: IStore, locationId: string) {
  const stock = Math.max(0, Math.floor(p.stock));
  const ts = new Date(p.get("updatedAt") ?? Date.now()).toISOString();
  const o = p.ondc ?? ({} as IProduct["ondc"]);
  const mrp = p.mrp && p.mrp > p.price ? p.mrp : p.price;
  // Legal packaged-goods declaration: only what the vendor stated, never guessed from the brand.
  const manufacturer = o.manufacturer;
  return {
    id: String(p._id),
    time: { label: "enable", timestamp: ts },
    descriptor: { ...itemDescriptor(p), ...(p.barcode ? { code: `1:${p.barcode}` } : {}) },
    quantity: {
      unitized: { measure: unitMeasure(p.unit) },
      available: { count: String(stock) },
      maximum: { count: String(Math.min(stock, 20)) },
    },
    price: { ...price(p.price), maximum_value: money(mrp) },
    category_id: categoryFor(p.category)?.categoryId ?? "",
    fulfillment_id: FULFILLMENT_ID,
    location_id: locationId,
    "@ondc/org/returnable": !!o.returnable,
    ...(o.returnable ? { "@ondc/org/return_window": `P${Math.max(1, o.returnWindowDays || 7)}D` } : {}),
    "@ondc/org/cancellable": o.cancellable !== false,
    "@ondc/org/seller_pickup_return": false,
    "@ondc/org/time_to_ship": isoMinutes(o.timeToShipMinutes ?? 60),
    "@ondc/org/available_on_cod": true,
    "@ondc/org/contact_details_consumer_care": consumerCare(store),
    ...(manufacturer
      ? {
          "@ondc/org/statutory_reqs_packaged_commodities": {
            manufacturer_or_packer_name: manufacturer,
            manufacturer_or_packer_address: store.address,
            common_or_generic_name_of_commodity: p.name,
            month_year_of_manufacture_packing_import: "N/A",
          },
        }
      : {}),
    tags: itemTags(p),
    matched: true,
    recommended: false,
  };
}

/** One on_search provider; null if the store has no coordinates or no items. */
export function providerBlock(store: IStore, products: IProduct[]): Json | null {
  const location = storeLocation(store);
  if (!location || products.length === 0) return null;
  const ts = new Date(store.get("updatedAt") ?? Date.now()).toISOString();
  const image = absoluteUrl(store.storePhotoUrl);
  return {
    id: String(store._id),
    time: { label: "enable", timestamp: ts },
    fulfillments: [
      {
        id: FULFILLMENT_ID,
        type: FULFILLMENT_TYPE,
        contact: { phone: store.phone, email: store.email },
      },
    ],
    descriptor: {
      name: store.name,
      symbol: image,
      short_desc: store.name,
      long_desc: `${store.name}, ${store.shortAddress || store.address}`,
      images: image ? [image] : [],
    },
    ttl: "P1D",
    locations: [location],
    items: products.map((p) => catalogItem(p, store, location.id)),
  };
}

export function catalogBlock(providers: Json[]): Json {
  const cfg = ondcConfig();
  return {
    "bpp/fulfillments": [{ id: FULFILLMENT_ID, type: FULFILLMENT_TYPE }],
    "bpp/descriptor": {
      name: process.env.ONDC_SELLER_APP_NAME || "Stora",
      symbol: cfg.publicBaseUrl ? `${cfg.publicBaseUrl}/favicon.ico` : "",
      short_desc: "Local stores near you",
      long_desc: "Local stores near you on Stora",
      images: [],
    },
    "bpp/providers": providers,
  };
}

export function quoteFrom(lines: Pick<IOndcOrderItem, "productId" | "name" | "price" | "quantity">[]): Json {
  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  return {
    price: price(total),
    breakup: lines.map((l) => ({
      "@ondc/org/item_id": String(l.productId),
      "@ondc/org/item_quantity": { count: l.quantity },
      title: l.name,
      "@ondc/org/title_type": "item",
      price: price(l.price * l.quantity),
      item: { price: price(l.price) },
    })),
    ttl: "P1D",
  };
}

export const itemsBlock = (
  lines: Pick<IOndcOrderItem, "productId" | "quantity">[]
) =>
  lines.map((l) => ({
    id: String(l.productId),
    fulfillment_id: FULFILLMENT_ID,
    quantity: { count: l.quantity },
  }));

/** Full Self-Pickup fulfillment: store is both start and end; buyer's pickup window/contact are echoed. */
export function fulfillmentBlock(
  store: IStore,
  requested: Json | undefined,
  state?: string
): Json {
  const loc = storeLocation(store);
  const location = loc && {
    id: loc.id,
    gps: loc.gps,
    address: loc.address,
    descriptor: { name: store.name },
  };
  const end = requested?.end ?? {};
  return {
    id: String(requested?.id ?? FULFILLMENT_ID),
    type: FULFILLMENT_TYPE,
    ...(state ? { state: { descriptor: { code: state } } } : {}),
    "@ondc/org/provider_name": store.name,
    tracking: false,
    start: {
      location,
      contact: { phone: store.phone, email: store.email },
    },
    end: {
      location,
      ...(end.time ? { time: end.time } : {}),
      ...(end.contact ? { contact: end.contact } : {}),
    },
  };
}

/** Payment is collected by the store at pickup; buyer-app finder-fee terms are echoed. */
export function paymentBlock(requested: Json | undefined, paid: boolean): Json {
  const keep = (k: string) => (requested?.[k] !== undefined ? { [k]: requested[k] } : {});
  return {
    type: "ON-FULFILLMENT",
    collected_by: "BPP",
    status: paid ? "PAID" : "NOT-PAID",
    ...keep("@ondc/org/buyer_app_finder_fee_type"),
    ...keep("@ondc/org/buyer_app_finder_fee_amount"),
  };
}

/** The `order` object returned by on_confirm / on_status / on_update / on_cancel. */
export function orderBlock(order: IOndcOrder, store: IStore): Json {
  const loc = storeLocation(store);
  const reqFulfillment = order.fulfillment as Json;
  return {
    id: order.orderId,
    state: order.state,
    provider: { id: String(store._id), locations: loc ? [{ id: loc.id }] : [] },
    items: itemsBlock(order.items),
    billing: order.billing,
    fulfillments: [fulfillmentBlock(store, reqFulfillment, order.fulfillmentState)],
    quote: quoteFrom(order.items),
    payment: paymentBlock(order.payment as Json, order.state === "Completed"),
    ...(order.cancellation
      ? {
          cancellation: {
            cancelled_by: order.cancellation.cancelledBy,
            reason: { id: order.cancellation.reasonId },
          },
        }
      : {}),
    created_at: order.createdAt.toISOString(),
    updated_at: order.updatedAt.toISOString(),
  };
}
