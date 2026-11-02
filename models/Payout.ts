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
  transferReference: string;
  createdAt: Date;
  updatedAt: Date;
}

// Configurable: PLATFORM_FEE_RATE (default 0.10) and GST_ON_FEE_RATE (default 0.18).
const rate = (v: string | undefined, d: number) => {
  const n = Number(v);
  return v !== undefined && v !== "" && n >= 0 && n < 1 ? n : d;
};

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
    transferReference: { type: String, default: "" },
  },
  { timestamps: true }
);

export function computePayoutAmounts(grossSales: number) {
  const platformFees = Math.round(grossSales * rate(process.env.PLATFORM_FEE_RATE, 0.1));
  const gstOnFees = Math.round(platformFees * rate(process.env.GST_ON_FEE_RATE, 0.18));
  const netPayout = grossSales - platformFees - gstOnFees;
  return { platformFees, gstOnFees, netPayout };
}

const Payout: Model<IPayout> =
  mongoose.models.Payout || mongoose.model<IPayout>("Payout", PayoutSchema);

export default Payout;
