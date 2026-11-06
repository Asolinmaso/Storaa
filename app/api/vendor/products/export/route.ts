import Product from "@/models/Product";
import { vendorStore } from "@/lib/vendor/session";
import { CSV_COLUMNS, toCsv } from "@/lib/vendor/csv";

export const dynamic = "force-dynamic";

/** The vendor's catalog as CSV, in the same format the importer reads. */
export async function GET() {
  const { store, res } = await vendorStore();
  if (res) return res;
  const products = await Product.find({ storeId: store._id }).sort({ name: 1 }).lean();
  const rows = products.map((p) => ({
    sku: p.sku ?? "",
    barcode: p.barcode ?? "",
    name: p.name,
    category: p.category,
    brand: p.brand ?? "",
    price: p.price,
    mrp: p.mrp || "",
    unit: p.unit ?? "",
    stock: p.stock ?? 0,
    lowStockThreshold: p.lowStockThreshold ?? 5,
    gstRate: p.gstRate ?? 0,
    hsnCode: p.hsnCode ?? "",
    specifications: (p.specifications ?? []).join(" | "),
    images: (p.images ?? []).join(" | "),
    ondcListed: p.ondc?.listed === false ? "no" : "yes",
    returnable: p.ondc?.returnable ? "yes" : "no",
    cancellable: p.ondc?.cancellable === false ? "no" : "yes",
    vegType: p.ondc?.vegType ?? "na",
    countryOfOrigin: p.ondc?.countryOfOrigin ?? "IND",
    manufacturer: p.ondc?.manufacturer ?? "",
  }));
  const date = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(CSV_COLUMNS, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="storaa-products-${date}.csv"`,
    },
  });
}
