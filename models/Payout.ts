import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export type PayoutStatus = "pending" | "processing" | "success" | "failed";

export interface IPayout extends Document {
  payoutNumber: string;
  storeId: Types.ObjectId;
  grossSales: number;
  platformFees: number;
  gstOnFees: number;
  netPayout: number;
  status: PayoutStatus;
  initiatedOn: Date;
  completedOn: Date | null;
  failureReason: string;
  createdAt: Date;
  updatedAt: Date;
}

const PLATFORM_FEE_RATE = 0.1;
const GST_ON_FEE_RATE = 0.18;

const PayoutSchema = new Schema<IPayout>(
  {
    payoutNumber: { type: String, required: true, unique: true },
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true, index: true },
    grossSales: { type: Number, required: true },
    platformFees: { type: Number, required: true },
    gstOnFees: { type: Number, required: true },
    netPayout: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "processing", "success", "failed"],
      default: "pending",
      index: true,
    },
    initiatedOn: { type: Date, required: true },
    completedOn: { type: Date, default: null },
    failureReason: { type: String, default: "" },
  },
  { timestamps: true }
);

export function computePayoutAmounts(grossSales: number) {
  const platformFees = Math.round(grossSales * PLATFORM_FEE_RATE);
  const gstOnFees = Math.round(platformFees * GST_ON_FEE_RATE);
  const netPayout = grossSales - platformFees - gstOnFees;
  return { platformFees, gstOnFees, netPayout };
}

const Payout: Model<IPayout> =
  mongoose.models.Payout || mongoose.model<IPayout>("Payout", PayoutSchema);

export default Payout;
