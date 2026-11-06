import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export type ProductStatus = "under_review" | "approved" | "rejected";
export type VegType = "veg" | "non_veg" | "egg" | "na";
export type ProductSource = "manual" | "pos" | "csv";

/** Per-product ONDC listing attributes (retail spec item fields). */
export interface IProductOndc {
  /** Vendor opt-out per product; the store-level switch still applies. */
  listed: boolean;
  returnable: boolean;
  cancellable: boolean;
  /** Days the buyer may return within, when returnable. */
  returnWindowDays: number;
  /** Minutes the store needs to have the order ready for pickup. */
  timeToShipMinutes: number;
  vegType: VegType;
  countryOfOrigin: string;
  manufacturer: string;
}

export interface IProduct extends Document {
  storeId: Types.ObjectId;
  name: string;
  category: string;
  emoji: string;
  price: number;
  unit: string;
  rating: number;
  reviewCount: number;
  brand: string;
  stock: number;
  specifications: string[];
  images: string[];
  status: ProductStatus;
  rejectionReason: string;

  /** Stock-keeping unit; unique per store when set. POS systems match on this. */
  sku: string;
  /** EAN / UPC / GTIN barcode. POS systems may match on this too. */
  barcode: string;
  /** Maximum retail price; 0 means "same as price". */
  mrp: number;
  hsnCode: string;
  /** GST percentage (0, 5, 12, 18, 28). */
  gstRate: number;
  /** Alert when stock falls to or below this. */
  lowStockThreshold: number;
  ondc: IProductOndc;
  source: ProductSource;
  posSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true, index: true },
    emoji: { type: String, default: "📦" },
    price: { type: Number, required: true },
    unit: { type: String, default: "" },
    rating: { type: Number, default: 4.5 },
    reviewCount: { type: Number, default: 0 },
    brand: { type: String, default: "" },
    stock: { type: Number, default: 0 },
    specifications: { type: [String], default: [] },
    images: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["under_review", "approved", "rejected"],
      default: "under_review",
    },
    rejectionReason: { type: String, default: "" },

    sku: { type: String, default: "", trim: true },
    barcode: { type: String, default: "", trim: true },
    mrp: { type: Number, default: 0 },
    hsnCode: { type: String, default: "" },
    gstRate: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    ondc: {
      type: new Schema<IProductOndc>(
        {
          listed: { type: Boolean, default: true },
          returnable: { type: Boolean, default: false },
          cancellable: { type: Boolean, default: true },
          returnWindowDays: { type: Number, default: 0 },
          timeToShipMinutes: { type: Number, default: 60 },
          vegType: { type: String, enum: ["veg", "non_veg", "egg", "na"], default: "na" },
          countryOfOrigin: { type: String, default: "IND" },
          manufacturer: { type: String, default: "" },
        },
        { _id: false }
      ),
      default: () => ({}),
    },
    source: { type: String, enum: ["manual", "pos", "csv"], default: "manual" },
    posSyncedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// POS systems address products by SKU, so it must be unique within a store.
ProductSchema.index(
  { storeId: 1, sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $gt: "" } } }
);
ProductSchema.index({ storeId: 1, barcode: 1 });

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
