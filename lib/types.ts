export type StoreStatus = "under_review" | "approved" | "rejected";

export interface StoreDTO {
  _id: string;
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

  ownerId?: string | null;
  city?: string;
  state?: string;
  postalCode?: string;
  storeTime?: string;
  weeklyOff?: string;
  storePhotoUrl?: string;
  bizRegDocUrl?: string;
  bizRegDocName?: string;
  description?: string;
  ownerContact?: string;
  ownerGovIdUrl?: string;
  ownerGovIdName?: string;
  bankName?: string;
  accountHolderName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  gstNumber?: string;
  panNumber?: string;
  status?: StoreStatus;
  rejectionReason?: string;
}

export interface ProductDTO {
  _id: string;
  storeId: string | StoreDTO;
  name: string;
  category: string;
  emoji: string;
  price: number;
  unit: string;
  rating: number;
  reviewCount: number;
  brand?: string;
  stock?: number;
  specifications?: string[];
  images?: string[];
}

export interface HoldItemDTO {
  productId: string;
  name: string;
  emoji: string;
  price: number;
  quantity: number;
}

export interface HoldDTO {
  _id: string;
  storeId: string;
  storeName: string;
  storeEmoji: string;
  storeColor: string;
  items: HoldItemDTO[];
  total: number;
  visitDate: string;
  visitTime: string;
  status: "active" | "cancelled" | "past";
  createdAt: string;
}

export interface AddressDTO {
  _id: string;
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

export interface ProfileDTO {
  _id: string;
  email: string;
  role: string;
  name: string;
  phone: string;
  location: string;
  addresses: AddressDTO[];
  prefs: { holdUpdates: boolean; offers: boolean; newStores: boolean };
  createdAt: string;
}
