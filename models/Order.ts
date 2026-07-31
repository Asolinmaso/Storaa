import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export type OrderStatus = "success" | "failed";

export interface IOrder extends Document {
  orderNumber: string;
  storeId: Types.ObjectId;
  customerName: string;
  customerContact: string;
  customerEmail: string;
  itemCount: number;
  amount: number;
  orderDate: Date;
  status: OrderStatus;
  payoutId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true, index: true },
    customerName: { type: String, required: true },
    customerContact: { type: String, default: "" },
    customerEmail: { type: String, default: "" },
    itemCount: { type: Number, default: 1 },
    amount: { type: Number, required: true },
    orderDate: { type: Date, required: true },
    status: { type: String, enum: ["success", "failed"], default: "success", index: true },
    payoutId: { type: Schema.Types.ObjectId, ref: "Payout", default: null, index: true },
  },
  { timestamps: true }
);

const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export default Order;
