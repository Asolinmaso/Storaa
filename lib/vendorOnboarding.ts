export interface StoreDetailsForm {
  name: string;
  category: string;
  storeTime: string;
  weeklyOff: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  storePhotoUrl: string;
  storePhotoName: string;
  bizRegDocUrl: string;
  bizRegDocName: string;
  description: string;
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
  storeTime: "",
  weeklyOff: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  storePhotoUrl: "",
  storePhotoName: "",
  bizRegDocUrl: "",
  bizRegDocName: "",
  description: "",
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
