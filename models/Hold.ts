import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export interface IHoldItem {
  productId: Types.ObjectId;
  name: string;
  emoji: string;
  price: number;
  quantity: number;
}

export interface IHold extends Document {
  userId: Types.ObjectId;
  storeId: Types.ObjectId;
  storeName: string;
  storeEmoji: string;
  storeColor: string;
  items: IHoldItem[];
  total: number;
  visitDate: string;
  visitTime: string;
  status: "active" | "cancelled" | "past";
  createdAt: Date;
  updatedAt: Date;
}

const HoldSchema = new Schema<IHold>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    storeName: { type: String, required: true },
    storeEmoji: { type: String, default: "🏬" },
    storeColor: { type: String, default: "#f3ecfa" },
    items: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product" },
        name: String,
        emoji: String,
        price: Number,
        quantity: Number,
      },
    ],
    total: { type: Number, required: true },
    visitDate: { type: String, required: true },
    visitTime: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "cancelled", "past"],
      default: "active",
    },
  },
  { timestamps: true }
);

const Hold: Model<IHold> =
  mongoose.models.Hold || mongoose.model<IHold>("Hold", HoldSchema);

export default Hold;
