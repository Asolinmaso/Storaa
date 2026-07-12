import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export type StoreStatus = "under_review" | "approved" | "rejected";

export interface IStore extends Document {
  name: string;
  category: string;
  emoji: string;
  color: string;
  rating: number;
  distanceKm: number;
  isOpen: boolean;
  hoursLabel: string;
  owner: string;
  address: string;
  shortAddress: string;
  phone: string;
  email: string;
  website: string;
  featured: boolean;
  reviewCount: number;

  // Vendor onboarding fields
  ownerId: Types.ObjectId | null;
  city: string;
  state: string;
  postalCode: string;
  storeTime: string;
  weeklyOff: string;
  storePhotoUrl: string;
  bizRegDocUrl: string;
  bizRegDocName: string;
  description: string;
  ownerContact: string;
  ownerGovIdUrl: string;
  ownerGovIdName: string;
  bankName: string;
  accountHolderName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  gstNumber: string;
  panNumber: string;
  status: StoreStatus;
  rejectionReason: string;
}

const StoreSchema = new Schema<IStore>(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    emoji: { type: String, default: "🏬" },
    color: { type: String, default: "#f3ecfa" },
    rating: { type: Number, default: 4.5 },
    distanceKm: { type: Number, default: 1 },
    isOpen: { type: Boolean, default: true },
    hoursLabel: { type: String, default: "Open -  Closes 10 PM" },
    owner: { type: String, default: "" },
    address: { type: String, default: "" },
    shortAddress: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    website: { type: String, default: "" },
    featured: { type: Boolean, default: false },
    reviewCount: { type: Number, default: 0 },

    ownerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    storeTime: { type: String, default: "" },
    weeklyOff: { type: String, default: "" },
    storePhotoUrl: { type: String, default: "" },
    bizRegDocUrl: { type: String, default: "" },
    bizRegDocName: { type: String, default: "" },
    description: { type: String, default: "" },
    ownerContact: { type: String, default: "" },
    ownerGovIdUrl: { type: String, default: "" },
    ownerGovIdName: { type: String, default: "" },
    bankName: { type: String, default: "" },
    accountHolderName: { type: String, default: "" },
    bankAccountNumber: { type: String, default: "" },
    bankIfsc: { type: String, default: "" },
    gstNumber: { type: String, default: "" },
    panNumber: { type: String, default: "" },
    status: {
      type: String,
      enum: ["under_review", "approved", "rejected"],
      default: "approved",
    },
    rejectionReason: { type: String, default: "" },
  },
  { timestamps: true }
);

const Store: Model<IStore> =
  mongoose.models.Store || mongoose.model<IStore>("Store", StoreSchema);

export default Store;
