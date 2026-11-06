import { NextResponse } from "next/server";
import Product from "@/models/Product";
import OndcOrder from "@/models/OndcOrder";
import { vendorStore } from "@/lib/vendor/session";
import { ondcConfig } from "@/lib/ondc/config";
import { productIssues, storeChecks } from "@/lib/ondc/readiness";
import { categoryFor, storeLocation } from "@/lib/ondc/mapping";
import { providerBlock } from "@/lib/ondc/messages";

export const dynamic = "force-dynamic";

/** Everything the ONDC Network page needs: checks, per-product issues, order stats, catalog preview. */
export async function GET() {
  const { store, res } = await vendorStore();
  if (res) return res;
  const cfg = ondcConfig();
  const products = await Product.find({ storeId: store._id }).sort({ name: 1 });

  const items = products.map((p) => {
    const { errors, warnings } = productIssues(p);
    const cat = categoryFor(p.category);
    return {
      _id: String(p._id),
      name: p.name,
      image: p.images?.[0] ?? "",
      category: p.category,
      ondcCategory: cat ? `${cat.domain} · ${cat.categoryId}` : null,
      price: p.price,
      stock: p.stock,
      listed: p.ondc?.listed !== false,
      errors,
      warnings,
    };
  });

  const listable = products.filter((p) => productIssues(p).errors.length === 0);
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [orderStats] = await OndcOrder.aggregate([
    { $match: { storeId: store._id, createdAt: { $gte: since } } },
    {
      $group: {
        _id: null,
        orders: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ["$state", "Completed"] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ["$state", "Cancelled"] }, 1, 0] } },
        open: { $sum: { $cond: [{ $in: ["$state", ["Accepted", "In-progress"]] }, 1, 0] } },
        revenue: { $sum: { $cond: [{ $eq: ["$state", "Completed"] }, "$total", 0] } },
        buyerApps: { $addToSet: "$bapId" },
      },
    },
  ]);

  // Exactly what buyer apps receive in on_search for this store (first 3 items).
  const preview = storeLocation(store) && listable.length ? providerBlock(store, listable.slice(0, 3)) : null;

  return NextResponse.json({
    platform: {
      enabled: cfg.enabled,
      subscriberId: cfg.subscriberId,
      registry: cfg.registryUrl,
      environment: /preprod|staging/.test(cfg.registryUrl) ? "Pre-production" : cfg.registryUrl ? "Production" : "Not configured",
      cityCode: cfg.cityCode,
    },
    store: {
      name: store.name,
      status: store.status,
      ondcEnabled: store.ondcEnabled,
      isOpen: store.isOpen,
      latitude: store.latitude,
      longitude: store.longitude,
      address: store.address,
    },
    checks: storeChecks(store, products),
    items,
    stats: {
      orders: orderStats?.orders ?? 0,
      completed: orderStats?.completed ?? 0,
      cancelled: orderStats?.cancelled ?? 0,
      open: orderStats?.open ?? 0,
      revenue: orderStats?.revenue ?? 0,
      buyerApps: orderStats?.buyerApps ?? [],
    },
    preview,
  });
}
