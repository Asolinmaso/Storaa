export interface StoreDetailsForm {
  name: string;
  category: string;
  openTime: string;
  closeTime: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  storePhotoUrl: string;
  storePhotoName: string;
  bizRegDocUrl: string;
  bizRegDocName: string;
}

export interface VendorBankForm {
  ownerName: string;
  ownerContact: string;
  ownerEmail: string;
  ownerGovIdUrl: string;
  ownerGovIdName: string;
  accountHolderName: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  gstNumber: string;
  panNumber: string;
}

export interface DraftProduct {
  tempId: string;
  name: string;
  category: string;
  brand: string;
  price: string;
  unit: string;
  stock: string;
  specifications: string[];
  images: string[];
}

export const emptyStoreDetails: StoreDetailsForm = {
  name: "",
  category: "",
  openTime: "",
  closeTime: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  storePhotoUrl: "",
  storePhotoName: "",
  bizRegDocUrl: "",
  bizRegDocName: "",
};

export const emptyVendorBank: VendorBankForm = {
  ownerName: "",
  ownerContact: "",
  ownerEmail: "",
  ownerGovIdUrl: "",
  ownerGovIdName: "",
  accountHolderName: "",
  bankName: "",
  bankAccountNumber: "",
  bankIfsc: "",
  gstNumber: "",
  panNumber: "",
};

export const emptyDraftProduct: Omit<DraftProduct, "tempId"> = {
  name: "",
  category: "",
  brand: "",
  price: "",
  unit: "",
  stock: "",
  specifications: [],
  images: [],
};

export const MIN_PRODUCTS = 5;

function formatClock(value: string): string {
  const m = /T(\d{2}):(\d{2})/.exec(value ?? "");
  if (!m) return "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

/** "9:00 AM – 9:00 PM" from two datetime-local values; "" if either is invalid. */
export function formatStoreTime(openTime: string, closeTime: string): string {
  const open = formatClock(openTime);
  const close = formatClock(closeTime);
  return open && close ? `${open} – ${close}` : "";
}
