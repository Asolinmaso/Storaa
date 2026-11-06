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
  /** Optional coordinates; required to publish the store on ONDC (or set ONDC_DEFAULT_GPS). */
  latitude: number | null;
  longitude: number | null;
  /** Vendor opt-in: publish this store on ONDC (also needs ONDC_ENABLED=true). */
  ondcEnabled: boolean;

  // Vendor onboarding fields
  ownerId: Types.ObjectId | null;
  city: string;
  state: string;
  postalCode: string;
  storeTime: string;
  openTime: string;
  closeTime: string;
  storePhotoUrl: string;
  bizRegDocUrl: string;
  bizRegDocName: string;
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
  pos: IStorePos;
}

export type PosProvider =
  | "custom"
  | "gofrugal"
  | "petpooja"
  | "marg"
  | "tally"
  | "busy"
  | "vyapar"
  | "shopify_pos";

/** Connection between the store and its point-of-sale system. */
export interface IStorePos {
  provider: PosProvider | "";
  /** SHA-256 of the API key; the key itself is shown to the vendor once. */
  apiKeyHash: string;
  /** First characters of the key, so the vendor can tell keys apart. */
  apiKeyPrefix: string;
  connectedAt: Date | null;
  lastSyncAt: Date | null;
  /** Create products the POS sends that don't exist yet (they still need admin approval). */
  autoCreateProducts: boolean;
  /** Let POS price updates overwrite the Storaa price. */
  syncPrice: boolean;
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
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    ondcEnabled: { type: Boolean, default: false, index: true },

    ownerId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    storeTime: { type: String, default: "" },
    openTime: { type: String, default: "" },
    closeTime: { type: String, default: "" },
    storePhotoUrl: { type: String, default: "" },
    bizRegDocUrl: { type: String, default: "" },
    bizRegDocName: { type: String, default: "" },
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
      default: "under_review",
    },
    rejectionReason: { type: String, default: "" },
    pos: {
      type: new Schema<IStorePos>(
        {
          provider: { type: String, default: "" },
          apiKeyHash: { type: String, default: "", index: true },
          apiKeyPrefix: { type: String, default: "" },
          connectedAt: { type: Date, default: null },
          lastSyncAt: { type: Date, default: null },
          autoCreateProducts: { type: Boolean, default: false },
          syncPrice: { type: Boolean, default: true },
        },
        { _id: false }
      ),
      default: () => ({}),
    },
  },
  { timestamps: true }
);

const Store: Model<IStore> =
  mongoose.models.Store || mongoose.model<IStore>("Store", StoreSchema);

export default Store;
