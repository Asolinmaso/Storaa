import mongoose, { Schema, type Document, type Model, Types } from "mongoose";

export type UserRole = "customer" | "vendor";

export interface IAddress {
  _id?: Types.ObjectId;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface IPrefs {
  holdUpdates: boolean;
  offers: boolean;
  newStores: boolean;
}

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: UserRole | null;
  name: string;
  phone: string;
  location: string;
  addresses: IAddress[];
  prefs: IPrefs;
  isBlocked: boolean;
  resetCodeHash: string | null;
  resetCodeExpiry: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>({
  label: { type: String, default: "Home" },
  name: { type: String, default: "" },
  phone: { type: String, default: "" },
  line1: { type: String, required: true },
  line2: { type: String, default: "" },
  city: { type: String, default: "" },
  state: { type: String, default: "" },
  postalCode: { type: String, default: "" },
  country: { type: String, default: "" },
  isDefault: { type: Boolean, default: false },
});

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["customer", "vendor"],
      default: null,
    },
    name: { type: String, default: "" },
    phone: { type: String, default: "" },
    location: { type: String, default: "Chennai, Tamilnadu" },
    addresses: { type: [AddressSchema], default: [] },
    prefs: {
      holdUpdates: { type: Boolean, default: true },
      offers: { type: Boolean, default: true },
      newStores: { type: Boolean, default: true },
    },
    isBlocked: { type: Boolean, default: false },
    resetCodeHash: { type: String, default: null },
    resetCodeExpiry: { type: Date, default: null },
  },
  { timestamps: true }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
