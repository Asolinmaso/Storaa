import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export type ProductStatus = "under_review" | "approved" | "rejected";

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
  },
  { timestamps: true }
);

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;
