import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export type TicketStatus = "Pending" | "In progress" | "Resolved";

export interface ISupportTicket extends Document {
  userId: Types.ObjectId;
  raisedBy: string;
  type: "Customer" | "Store";
  subject: string;
  category: string;
  message: string;
  contact: string;
  email: string;
  status: TicketStatus;
  adminNotes: string;
  response: string;
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    raisedBy: { type: String, default: "" },
    type: { type: String, enum: ["Customer", "Store"], required: true },
    subject: { type: String, required: true },
    category: { type: String, default: "Other" },
    message: { type: String, required: true },
    contact: { type: String, default: "" },
    email: { type: String, default: "" },
    status: { type: String, enum: ["Pending", "In progress", "Resolved"], default: "Pending", index: true },
    adminNotes: { type: String, default: "" },
    response: { type: String, default: "" },
  },
  { timestamps: true }
);

const SupportTicket: Model<ISupportTicket> =
  mongoose.models.SupportTicket ||
  mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);

export default SupportTicket;
