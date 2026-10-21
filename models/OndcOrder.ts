import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export type OndcOrderState =
  | "Accepted"
  | "In-progress"
  | "Completed"
  | "Cancelled";

export type OndcFulfillmentState =
  | "Pending"
  | "Packed"
  | "Order-picked-up"
  | "Cancelled";

export interface IOndcOrderItem {
  productId: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
}

export interface IOndcOrder extends Document {
  /** Order id assigned by the buyer app in /confirm. */
  orderId: string;
  bapId: string;
  bapUri: string;
  transactionId: string;
  domain: string;
  city: string;
  coreVersion: string;
  storeId: Types.ObjectId;
  items: IOndcOrderItem[];
  total: number;
  state: OndcOrderState;
  fulfillmentState: OndcFulfillmentState;
  billing: Record<string, unknown>;
  /** Buyer-supplied fulfillment (contact, pickup window), echoed back in responses. */
  fulfillment: Record<string, unknown>;
  payment: Record<string, unknown>;
  cancellation: { reasonId: string; cancelledBy: string } | null;
  rating: { value: number; feedback: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

const OndcOrderSchema = new Schema<IOndcOrder>(
  {
    orderId: { type: String, required: true },
    bapId: { type: String, required: true },
    bapUri: { type: String, required: true },
    transactionId: { type: String, required: true, index: true },
    domain: { type: String, required: true },
    city: { type: String, default: "*" },
    coreVersion: { type: String, default: "1.2.0" },
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true, index: true },
    items: [
      {
        _id: false,
        productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
        name: String,
        price: Number,
        quantity: Number,
      },
    ],
    total: { type: Number, required: true },
    state: {
      type: String,
      enum: ["Accepted", "In-progress", "Completed", "Cancelled"],
      default: "Accepted",
      index: true,
    },
    fulfillmentState: {
      type: String,
      enum: ["Pending", "Packed", "Order-picked-up", "Cancelled"],
      default: "Pending",
    },
    billing: { type: Schema.Types.Mixed, default: {} },
    fulfillment: { type: Schema.Types.Mixed, default: {} },
    payment: { type: Schema.Types.Mixed, default: {} },
    cancellation: {
      type: new Schema(
        { reasonId: String, cancelledBy: String },
        { _id: false }
      ),
      default: null,
    },
    rating: {
      type: new Schema({ value: Number, feedback: String }, { _id: false }),
      default: null,
    },
  },
  { timestamps: true, minimize: false }
);

// A buyer app's order id is only unique within that buyer app.
OndcOrderSchema.index({ bapId: 1, orderId: 1 }, { unique: true });

const OndcOrder: Model<IOndcOrder> =
  mongoose.models.OndcOrder ||
  mongoose.model<IOndcOrder>("OndcOrder", OndcOrderSchema);

export default OndcOrder;
