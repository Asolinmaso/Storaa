import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export type PosSyncKind = "inventory" | "products" | "sales" | "csv_import" | "catalog_pull";

/** One POS / bulk sync call against a store, for the vendor's sync history. */
export interface IPosSyncLog extends Document {
  storeId: Types.ObjectId;
  kind: PosSyncKind;
  source: string;
  ok: boolean;
  received: number;
  updated: number;
  created: number;
  failed: number;
  /** First few row-level problems, e.g. "SKU ABC-1: not found". */
  issues: string[];
  createdAt: Date;
}

const PosSyncLogSchema = new Schema<IPosSyncLog>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true, index: true },
    kind: { type: String, required: true },
    source: { type: String, default: "" },
    ok: { type: Boolean, default: true },
    received: { type: Number, default: 0 },
    updated: { type: Number, default: 0 },
    created: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    issues: { type: [String], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Keep 90 days of history.
PosSyncLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

const PosSyncLog: Model<IPosSyncLog> =
  mongoose.models.PosSyncLog || mongoose.model<IPosSyncLog>("PosSyncLog", PosSyncLogSchema);

export default PosSyncLog;
