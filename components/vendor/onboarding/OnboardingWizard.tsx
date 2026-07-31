"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VendorTopbar from "@/components/vendor/VendorTopbar";
import Stepper from "@/components/vendor/Stepper";
import StoreDetailsStep from "@/components/vendor/onboarding/StoreDetailsStep";
import VendorBankStep from "@/components/vendor/onboarding/VendorBankStep";
import ProductsStep from "@/components/vendor/onboarding/ProductsStep";
import ReviewStep from "@/components/vendor/onboarding/ReviewStep";
import { validateEmail } from "@/lib/validation";
import {
  emptyStoreDetails,
  emptyVendorBank,
  type StoreDetailsForm,
  type VendorBankForm,
  type DraftProduct,
} from "@/lib/vendorOnboarding";

type StoreErrors = Partial<Record<keyof StoreDetailsForm, string>>;
type VendorErrors = Partial<Record<keyof VendorBankForm, string>>;

function mapStoreToDraftDetails(s: Record<string, string>): StoreDetailsForm {
  // Extract address parts: "address, city, state, postalCode" format stored in `address`
  return {
    name: s.name ?? "",
    category: s.category ?? "",
    storeTime: s.storeTime ?? "",
    weeklyOff: s.weeklyOff ?? "",
    address: s.address ?? "",
    city: s.city ?? "",
    state: s.state ?? "",
    postalCode: s.postalCode ?? "",
    storePhotoUrl: s.storePhotoUrl ?? "",
    storePhotoName: s.bizRegDocName ?? "",
    bizRegDocUrl: s.bizRegDocUrl ?? "",
    bizRegDocName: s.bizRegDocName ?? "",
    description: s.description ?? "",
  };
}

function mapStoreToVendorBank(s: Record<string, string>): VendorBankForm {
  return {
    ownerName: s.owner ?? "",
    ownerContact: s.ownerContact ?? "",
    ownerEmail: s.email ?? "",
    ownerGovIdUrl: s.ownerGovIdUrl ?? "",
    ownerGovIdName: s.ownerGovIdName ?? "",
    accountHolderName: s.accountHolderName ?? "",
    bankName: s.bankName ?? "",
    bankAccountNumber: s.bankAccountNumber ?? "",
    bankIfsc: s.bankIfsc ?? "",
    gstNumber: s.gstNumber ?? "",
    panNumber: s.panNumber ?? "",
  };
}

export default function OnboardingWizard() {
  const router = useRouter();
  const [initialised, setInitialised] = useState(false);
  const [step, setStep] = useState(1);
  const [storeDetails, setStoreDetails] = useState<StoreDetailsForm>(emptyStoreDetails);
  const [vendorDetails, setVendorDetails] = useState<VendorBankForm>(emptyVendorBank);
  const [products, setProducts] = useState<DraftProduct[]>([]);
  const [storeErrors, setStoreErrors] = useState<StoreErrors>({});
  const [vendorErrors, setVendorErrors] = useState<VendorErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Pre-fill with rejected store data for resubmission
  useEffect(() => {
    fetch("/api/vendor/store")
      .then((r) => r.json())
      .then((data) => {
        const s = data.store;
        if (s && s.status === "rejected") {
          setStoreDetails(mapStoreToDraftDetails(s));
          setVendorDetails(mapStoreToVendorBank(s));
          // Pre-fill products from the rejected submission
          if (Array.isArray(data.products) && data.products.length > 0) {
            setProducts(
              data.products.map(
                (p: Record<string, unknown>, i: number) => ({
                  tempId: `prefill-${i}`,
                  name: String(p.name ?? ""),
                  category: String(p.category ?? ""),
                  brand: String(p.brand ?? ""),
                  price: String(p.price ?? ""),
                  unit: String(p.unit ?? ""),
                  stock: String(p.stock ?? ""),
                  specifications: Array.isArray(p.specifications) ? (p.specifications as string[]) : [],
                  images: Array.isArray(p.images) ? (p.images as string[]) : [],
                })
              )
            );
          }
        }
      })
      .catch(() => {/* silent – proceed with empty form */})
      .finally(() => setInitialised(true));
  }, []);

  function validateStoreDetails(): boolean {
    const errors: StoreErrors = {};
    const required: Array<keyof StoreDetailsForm> = [
      "name",
      "category",
      "storeTime",
      "weeklyOff",
      "address",
      "city",
      "state",
      "postalCode",
      "description",
    ];
    for (const key of required) {
      if (!storeDetails[key].trim()) errors[key] = "This field is required.";
    }
    if (!storeDetails.storePhotoUrl) errors.storePhotoUrl = "Please upload a store photo.";
    if (!storeDetails.bizRegDocUrl)
      errors.bizRegDocUrl = "Please upload a business registration document.";
    setStoreErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateVendorDetails(): boolean {
    const errors: VendorErrors = {};
    const required: Array<keyof VendorBankForm> = [
      "ownerName",
      "ownerContact",
      "ownerEmail",
      "accountHolderName",
      "bankName",
      "bankAccountNumber",
      "bankIfsc",
      "panNumber",
    ];
    for (const key of required) {
      if (!vendorDetails[key].trim()) errors[key] = "This field is required.";
    }
    if (vendorDetails.ownerEmail.trim()) {
      const emailError = validateEmail(vendorDetails.ownerEmail);
      if (emailError) errors.ownerEmail = emailError;
    }
    if (!vendorDetails.ownerGovIdUrl)
      errors.ownerGovIdUrl = "Please upload a government ID proof.";
    setVendorErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleEditProduct(tempId: string) {
    setStep(3);
    void tempId;
  }

  function handleDeleteProduct(tempId: string) {
    setProducts((prev) => prev.filter((p) => p.tempId !== tempId));
  }

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/vendor/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeDetails,
          vendorDetails,
          products: products.map((p) => ({
            name: p.name,
            category: p.category,
            brand: p.brand,
            price: Number(p.price),
            unit: p.unit,
            stock: Number(p.stock) || 0,
            specifications: p.specifications,
            images: p.images,
          })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/vendor/store-status");
        router.refresh();
        return;
      }
      if (data.code === "ALREADY_SUBMITTED") {
        router.push("/vendor/store-status");
        return;
      }
      setSubmitError(data.message ?? "Something went wrong. Please try again.");
    } catch {
      setSubmitError("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!initialised) {
    return (
      <div className="vendor-onboarding-shell">
        <VendorTopbar location="Chennai, Tamilnadu" />
        <main className="wizard-main">
          <p style={{ color: "#888", textAlign: "center", marginTop: "4rem" }}>Loading…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="vendor-onboarding-shell">
      <VendorTopbar location="Chennai, Tamilnadu" />
      <main className="wizard-main">
        <h1 className="wizard-title">Let&apos;s Set Up Your Store</h1>
        <p className="wizard-subtitle">
          Complete all the steps below to get your store verified and live on Storaa
        </p>

        <Stepper current={step} />
        <hr className="divider wizard-stepper-divider" />

        {step === 1 && (
          <StoreDetailsStep
            value={storeDetails}
            onChange={setStoreDetails}
            errors={storeErrors}
            onNext={() => {
              if (validateStoreDetails()) setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <VendorBankStep
            value={vendorDetails}
            onChange={setVendorDetails}
            errors={vendorErrors}
            onBack={() => setStep(1)}
            onNext={() => {
              if (validateVendorDetails()) setStep(3);
            }}
          />
        )}
        {step === 3 && (
          <ProductsStep
            products={products}
            onChange={setProducts}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <ReviewStep
            storeDetails={storeDetails}
            vendorDetails={vendorDetails}
            products={products}
            onEditStore={() => setStep(1)}
            onEditProduct={handleEditProduct}
            onDeleteProduct={handleDeleteProduct}
            onSubmit={handleSubmit}
            loading={submitting}
            error={submitError}
          />
        )}
      </main>
    </div>
  );
}
