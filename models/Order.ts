import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export interface IOrder extends Document {
  orderNumber: string;
  storeId: Types.ObjectId;
  customerName: string;
  itemCount: number;
  amount: number;
  orderDate: Date;
  payoutId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true, index: true },
    customerName: { type: String, required: true },
    itemCount: { type: Number, default: 1 },
    amount: { type: Number, required: true },
    orderDate: { type: Date, required: true },
    payoutId: { type: Schema.Types.ObjectId, ref: "Payout", default: null, index: true },
  },
  { timestamps: true }
);

const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export default Order;
