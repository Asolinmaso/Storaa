import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

/**
 * Remembers POS calls that carried an idempotency key (`Idempotency-Key` header or `billId`), so a
 * retry after a timeout returns the original result instead of applying the change twice.
 */
export interface IPosRequest extends Document {
  storeId: Types.ObjectId;
  key: string;
  kind: string;
  status: "pending" | "done";
  httpStatus: number;
  response: Record<string, unknown> | null;
  createdAt: Date;
}

const PosRequestSchema = new Schema<IPosRequest>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    key: { type: String, required: true },
    kind: { type: String, required: true },
    status: { type: String, enum: ["pending", "done"], default: "pending" },
    httpStatus: { type: Number, default: 200 },
    response: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PosRequestSchema.index({ storeId: 1, kind: 1, key: 1 }, { unique: true });
// A POS retries within minutes or hours; a week is plenty.
PosRequestSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });

const PosRequest: Model<IPosRequest> =
  mongoose.models.PosRequest || mongoose.model<IPosRequest>("PosRequest", PosRequestSchema);

export default PosRequest;
