"use client";

import { useState } from "react";
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

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [storeDetails, setStoreDetails] = useState<StoreDetailsForm>(emptyStoreDetails);
  const [vendorDetails, setVendorDetails] = useState<VendorBankForm>(emptyVendorBank);
  const [products, setProducts] = useState<DraftProduct[]>([]);
  const [storeErrors, setStoreErrors] = useState<StoreErrors>({});
  const [vendorErrors, setVendorErrors] = useState<VendorErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    // ProductsStep manages its own edit state via the products list; jumping
    // back to step 3 lets the vendor find and edit the product there.
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
