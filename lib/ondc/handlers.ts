import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import OndcOrder, {
  type IOndcOrder,
  type OndcFulfillmentState,
  type OndcOrderState,
} from "@/models/OndcOrder";
import Product, { type IProduct } from "@/models/Product";
import Store, { type IStore } from "@/models/Store";
import { callbackContext, sendCallback } from "./client";
import { ondcConfig } from "./config";
import { categoriesForDomain, categoryFor, storeLocation, SUPPORTED_DOMAINS } from "./mapping";
import {
  catalogBlock,
  FULFILLMENT_ID,
  FULFILLMENT_TYPE,
  fulfillmentBlock,
  itemsBlock,
  orderBlock,
  paymentBlock,
  providerBlock,
  quoteFrom,
} from "./messages";
import {
  ERR,
  type BecknContext,
  type BecknError,
  type BecknRequest,
  type HandlerResult,
  type InboundAction,
  type Json,
} from "./types";

const INTERNAL_ERROR: BecknError = {
  type: "DOMAIN-ERROR",
  code: "23001",
  message: "Internal error",
};

// Same rule as the customer product listing: legacy products without a status count as approved.
const APPROVED: Record<string, unknown>[] = [
  { status: "approved" },
  { status: { $exists: false } },
];
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const fail = (error: BecknError): { error: BecknError } => ({ error });

/** Why a request's context can't be served, or null if it can. */
export function contextProblem(
  ctx: BecknContext | undefined,
  action: string
): string | null {
  if (!ctx || typeof ctx !== "object") return "Missing context";
  for (const k of ["domain", "country", "city", "core_version", "bap_id", "bap_uri", "transaction_id", "message_id", "timestamp"]) {
    if (!ctx[k]) return `context.${k} is required`;
  }
  if (ctx.action !== action) return "context.action does not match the endpoint";
  if (ctx.country !== "IND") return "Unsupported country";
  if (!String(ctx.core_version).startsWith("1.2")) return "Unsupported core_version";
  if (!SUPPORTED_DOMAINS.includes(ctx.domain)) return `Unsupported domain ${ctx.domain}`;
  if (ctx.bpp_id && ctx.bpp_id !== ondcConfig().subscriberId) return "context.bpp_id is not this seller";
  if (Number.isNaN(Date.parse(ctx.timestamp))) return "context.timestamp is invalid";
  const city = ondcConfig().cityCode;
  if (ctx.city !== "*" && city !== "*" && ctx.city !== city) return "City not served";
  return null;
}

// ---------------------------------------------------------------- search

async function search(req: BecknRequest): Promise<HandlerResult | null> {
  const intent = req.message?.intent ?? {};
  const fulfillmentType = intent.fulfillment?.type;
  if (fulfillmentType && fulfillmentType !== FULFILLMENT_TYPE) return null;

  let categories = categoriesForDomain(req.context.domain);
  const wantedCategory = intent.category?.id;
  if (wantedCategory) {
    categories = categories.filter((c) => categoryFor(c)?.categoryId === wantedCategory);
  }
  if (categories.length === 0) return null;

  const filter: Record<string, unknown> = {
    category: { $in: categories },
    stock: { $gt: 0 },
    $or: APPROVED,
  };
  const name = intent.item?.descriptor?.name ?? intent.descriptor?.name;
  if (name) filter.name = { $regex: escapeRegex(String(name)), $options: "i" };
  const providerId = intent.provider?.id;
  if (providerId) {
    if (!isValidObjectId(providerId)) return null;
    filter.storeId = providerId;
  }

  const products = await Product.find(filter).limit(5000);
  const byStore = new Map<string, IProduct[]>();
  for (const p of products) {
    const key = String(p.storeId);
    byStore.set(key, [...(byStore.get(key) ?? []), p]);
  }
  const stores = await Store.find({
    _id: { $in: Array.from(byStore.keys()) },
    status: "approved",
    isOpen: true,
  });

  const providers = stores
    .map((s) => providerBlock(s, byStore.get(String(s._id)) ?? []))
    .filter(Boolean);
  if (providers.length === 0) return null;
  return { message: { catalog: catalogBlock(providers) } };
}

// ------------------------------------------------- select / init / confirm

interface Line {
  product: IProduct;
  quantity: number;
}

interface Resolved {
  store: IStore;
  lines: Line[];
}

async function openStore(providerId: unknown): Promise<IStore | null> {
  if (typeof providerId !== "string" || !isValidObjectId(providerId)) return null;
  const store = await Store.findById(providerId);
  if (!store || store.status !== "approved" || !store.isOpen) return null;
  return storeLocation(store) ? store : null;
}

/** Validates provider, items and stock for a select/init/confirm order. */
async function resolveOrder(order: Json): Promise<Resolved | { error: BecknError }> {
  const store = await openStore(order?.provider?.id);
  if (!store) return fail(ERR.providerNotFound);

  const requested: { id: string; quantity: number }[] = (order?.items ?? []).map(
    (i: Json) => ({ id: String(i?.id), quantity: Number(i?.quantity?.count) })
  );
  if (requested.length === 0 || requested.some((r) => !Number.isInteger(r.quantity) || r.quantity < 1)) {
    return fail(ERR.badRequest("order.items must list items with a positive integer quantity.count"));
  }
  if (requested.some((r) => !isValidObjectId(r.id))) return fail(ERR.itemNotFound);

  const products = await Product.find({
    _id: { $in: requested.map((r) => r.id) },
    storeId: store._id,
    $or: APPROVED,
  });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines: Line[] = [];
  const totalPerProduct = new Map<string, number>();
  for (const r of requested) {
    const product = byId.get(r.id);
    if (!product || !categoryFor(product.category)) return fail(ERR.itemNotFound);
    lines.push({ product, quantity: r.quantity });
    totalPerProduct.set(r.id, (totalPerProduct.get(r.id) ?? 0) + r.quantity);
  }
  const short = Array.from(totalPerProduct).some(
    ([id, qty]) => (byId.get(id)?.stock ?? 0) < qty
  );
  if (short) return fail(ERR.outOfStock);
  return { store, lines };
}

const toOrderItems = (lines: Line[]) =>
  lines.map((l) => ({
    productId: l.product._id,
    name: l.product.name,
    price: l.product.price,
    quantity: l.quantity,
  }));

async function select(req: BecknRequest): Promise<HandlerResult> {
  const order = req.message?.order;
  const r = await resolveOrder(order);
  if ("error" in r) return r;
  const items = toOrderItems(r.lines);
  const loc = storeLocation(r.store);
  return {
    message: {
      order: {
        provider: { id: String(r.store._id), locations: loc ? [{ id: loc.id }] : [] },
        items: itemsBlock(items),
        fulfillments: [
          {
            id: String(order?.fulfillments?.[0]?.id ?? FULFILLMENT_ID),
            type: FULFILLMENT_TYPE,
            "@ondc/org/provider_name": r.store.name,
            tracking: false,
            state: { descriptor: { code: "Serviceable" } },
          },
        ],
        quote: quoteFrom(items),
      },
    },
  };
}

async function init(req: BecknRequest): Promise<HandlerResult> {
  const order = req.message?.order;
  const r = await resolveOrder(order);
  if ("error" in r) return r;
  const items = toOrderItems(r.lines);
  const loc = storeLocation(r.store);
  return {
    message: {
      order: {
        provider: { id: String(r.store._id) },
        provider_location: { id: loc?.id },
        items: itemsBlock(items),
        billing: order?.billing,
        fulfillments: [fulfillmentBlock(r.store, order?.fulfillments?.[0])],
        quote: quoteFrom(items),
        payment: paymentBlock(order?.payment, false),
      },
    },
  };
}

type Reserved = { productId: IProduct["_id"]; quantity: number };

async function reserveStock(items: Reserved[]): Promise<boolean> {
  const done: Reserved[] = [];
  for (const item of items) {
    const ok = await Product.findOneAndUpdate(
      { _id: item.productId, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } }
    );
    if (!ok) {
      await releaseStock(done);
      return false;
    }
    done.push(item);
  }
  return true;
}

async function releaseStock(items: Reserved[]) {
  await Promise.all(
    items.map((i) =>
      Product.updateOne({ _id: i.productId }, { $inc: { stock: i.quantity } })
    )
  );
}

async function confirm(req: BecknRequest): Promise<HandlerResult> {
  const order = req.message?.order;
  if (!order?.id) return fail(ERR.badRequest("order.id is required"));

  // /confirm is retried by buyer apps; answer from the stored order rather than reserving twice.
  const existing = await OndcOrder.findOne({ bapId: req.context.bap_id, orderId: order.id });
  if (existing) return existingOrderResult(existing);

  const r = await resolveOrder(order);
  if ("error" in r) return r;
  const items = toOrderItems(r.lines);

  const quotedTotal = Number(order.quote?.price?.value);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  if (Number.isFinite(quotedTotal) && Math.abs(quotedTotal - total) > 0.005) {
    return fail(ERR.quoteMismatch);
  }

  if (!(await reserveStock(items))) return fail(ERR.outOfStock);

  try {
    const doc = await OndcOrder.create({
      orderId: order.id,
      bapId: req.context.bap_id,
      bapUri: req.context.bap_uri,
      transactionId: req.context.transaction_id,
      domain: req.context.domain,
      city: req.context.city,
      coreVersion: req.context.core_version,
      storeId: r.store._id,
      items,
      total,
      billing: order.billing ?? {},
      fulfillment: order.fulfillments?.[0] ?? {},
      payment: order.payment ?? {},
    });
    return { message: { order: orderBlock(doc, r.store) } };
  } catch (err) {
    await releaseStock(items);
    // Lost a race with a concurrent retry of the same /confirm.
    if ((err as { code?: number }).code === 11000) {
      const dup = await OndcOrder.findOne({ bapId: req.context.bap_id, orderId: order.id });
      if (dup) return existingOrderResult(dup);
    }
    throw err;
  }
}

// ------------------------------------------- status / cancel / update / ...

async function existingOrderResult(order: IOndcOrder): Promise<HandlerResult> {
  const store = await Store.findById(order.storeId);
  if (!store) return fail(ERR.providerNotFound);
  return { message: { order: orderBlock(order, store) } };
}

const findOrder = (req: BecknRequest, orderId: unknown) =>
  typeof orderId === "string"
    ? OndcOrder.findOne({ bapId: req.context.bap_id, orderId })
    : Promise.resolve(null);

async function status(req: BecknRequest): Promise<HandlerResult> {
  const order = await findOrder(req, req.message?.order_id);
  return order ? existingOrderResult(order) : fail(ERR.orderNotFound);
}

const OPEN_STATES: OndcOrderState[] = ["Accepted", "In-progress"];

/** Cancels an open order and returns its stock; null if it was no longer cancellable. */
export async function cancelOrder(
  orderDoc: IOndcOrder,
  cancelledBy: string,
  reasonId: string
): Promise<IOndcOrder | null> {
  const updated = await OndcOrder.findOneAndUpdate(
    { _id: orderDoc._id, state: { $in: OPEN_STATES } },
    {
      state: "Cancelled",
      fulfillmentState: "Cancelled",
      cancellation: { reasonId, cancelledBy },
    },
    { new: true }
  );
  if (updated) await releaseStock(updated.items);
  return updated;
}

async function cancel(req: BecknRequest): Promise<HandlerResult> {
  const order = await findOrder(req, req.message?.order_id);
  if (!order) return fail(ERR.orderNotFound);
  if (order.state === "Cancelled") return existingOrderResult(order);

  const cancelled = await cancelOrder(
    order,
    req.context.bap_id,
    String(req.message?.cancellation_reason_id ?? "")
  );
  if (!cancelled) return fail(ERR.cannotCancel);
  return existingOrderResult(cancelled);
}

async function update(req: BecknRequest): Promise<HandlerResult> {
  const target = req.message?.update_target;
  const requested = req.message?.order;
  const order = await findOrder(req, requested?.id);
  if (!order) return fail(ERR.orderNotFound);
  if (target !== "fulfillment" || !requested?.fulfillments?.[0]?.end) {
    return fail(ERR.badRequest("Only fulfillment.end (pickup window/contact) can be updated."));
  }
  if (!OPEN_STATES.includes(order.state)) return fail(ERR.cannotCancel);

  const end = requested.fulfillments[0].end;
  const current = order.fulfillment as Json;
  order.fulfillment = {
    ...current,
    end: {
      ...current.end,
      ...(end.time ? { time: end.time } : {}),
      ...(end.contact ? { contact: end.contact } : {}),
    },
  };
  order.markModified("fulfillment");
  await order.save();
  return existingOrderResult(order);
}

async function track(req: BecknRequest): Promise<HandlerResult> {
  const order = await findOrder(req, req.message?.order_id);
  if (!order) return fail(ERR.orderNotFound);
  // Pickup orders have nothing to track live.
  return { message: { tracking: { id: order.orderId, status: "inactive" } } };
}

async function rating(req: BecknRequest): Promise<HandlerResult> {
  const order = await findOrder(req, req.message?.id);
  const value = Number(req.message?.value);
  if (order && Number.isFinite(value)) {
    order.rating = { value, feedback: String(req.message?.feedback_form?.feedback ?? "") };
    await order.save();
  }
  return { message: { feedback_ack: true, rating_ack: true } };
}

async function support(): Promise<HandlerResult> {
  const cfg = ondcConfig();
  return { message: { phone: cfg.supportPhone, email: cfg.supportEmail, uri: cfg.supportUri } };
}

// --------------------------------------------------------------- dispatch

const HANDLERS: Record<InboundAction, (req: BecknRequest) => Promise<HandlerResult | null>> = {
  search, select, init, confirm, status, cancel, update, track, rating, support,
};

/**
 * Runs the handler for `action` and POSTs the signed on_{action} callback to the buyer app.
 * Meant to be started after the request has been ACKed; never throws.
 */
export async function processAndCallback(action: InboundAction, req: BecknRequest) {
  try {
    await connectDB();
    let result: HandlerResult | null;
    try {
      result = await HANDLERS[action](req);
    } catch (err) {
      console.error(`[ONDC] ${action} handler failed:`, err);
      result = fail(INTERNAL_ERROR);
    }
    if (!result) return; // nothing to offer (e.g. empty catalog): stay silent
    await sendCallback(callbackContext(req.context, `on_${action}`), result);
  } catch (err) {
    console.error(`[ONDC] ${action} callback failed:`, err);
  }
}

// -------------------------------------------- seller-initiated transitions

export type SellerAction = "pack" | "picked_up" | "cancel";

const TRANSITIONS: Record<
  Exclude<SellerAction, "cancel">,
  { from: OndcFulfillmentState; state: OndcOrderState; fulfillmentState: OndcFulfillmentState }
> = {
  pack: { from: "Pending", state: "In-progress", fulfillmentState: "Packed" },
  picked_up: { from: "Packed", state: "Completed", fulfillmentState: "Order-picked-up" },
};

/** Default reason when a seller cancels: "one or more items not available". */
const SELLER_CANCEL_REASON = "010";

/** Applies a vendor action to an order and pushes the update to the buyer app. Null if not allowed. */
export async function applySellerAction(
  orderDoc: IOndcOrder,
  action: SellerAction
): Promise<IOndcOrder | null> {
  let updated: IOndcOrder | null;
  let callbackAction: "on_status" | "on_cancel" = "on_status";

  if (action === "cancel") {
    updated = await cancelOrder(orderDoc, "SELLER", SELLER_CANCEL_REASON);
    callbackAction = "on_cancel";
  } else {
    const t = TRANSITIONS[action];
    updated = await OndcOrder.findOneAndUpdate(
      { _id: orderDoc._id, fulfillmentState: t.from, state: { $in: OPEN_STATES } },
      { state: t.state, fulfillmentState: t.fulfillmentState },
      { new: true }
    );
  }
  if (!updated) return null;

  const store = await Store.findById(updated.storeId);
  if (store) {
    const context = callbackContext(
      {
        domain: updated.domain,
        country: "IND",
        city: updated.city,
        core_version: updated.coreVersion,
        bap_id: updated.bapId,
        bap_uri: updated.bapUri,
        transaction_id: updated.transactionId,
      },
      callbackAction,
      crypto.randomUUID()
    );
    void sendCallback(context, { message: { order: orderBlock(updated, store) } });
  }
  return updated;
}
