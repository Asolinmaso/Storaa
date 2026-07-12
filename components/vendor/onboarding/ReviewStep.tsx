"use client";

import Button from "@/components/Button";
import type {
  DraftProduct,
  StoreDetailsForm,
  VendorBankForm,
} from "@/lib/vendorOnboarding";

interface Props {
  storeDetails: StoreDetailsForm;
  vendorDetails: VendorBankForm;
  products: DraftProduct[];
  onEditStore: () => void;
  onEditProduct: (tempId: string) => void;
  onDeleteProduct: (tempId: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}

function maskAccount(v: string): string {
  return v ? "X".repeat(v.length) : "";
}

export default function ReviewStep({
  storeDetails,
  vendorDetails,
  products,
  onEditStore,
  onEditProduct,
  onDeleteProduct,
  onSubmit,
  loading,
  error,
}: Props) {
  return (
    <div>
      <div className="section-head">
        <h2 className="section-title">Store Details</h2>
        <Button small variant="outline-purple" onClick={onEditStore}>
          Edit
        </Button>
      </div>
      <div className="review-store-row">
        {storeDetails.storePhotoUrl && (
          <span
            className="review-store-img"
            style={{ backgroundImage: `url(${storeDetails.storePhotoUrl})` }}
          />
        )}
        <div className="review-store-info">
          <p>Store Name : {storeDetails.name}</p>
          <p>Category : {storeDetails.category}</p>
          <p>
            Address : {storeDetails.address}, {storeDetails.city}, {storeDetails.state},{" "}
            {storeDetails.postalCode}
          </p>
          <p>Store Time : {storeDetails.storeTime}</p>
          <p>Weekly Off : {storeDetails.weeklyOff}</p>
          <p>Description : {storeDetails.description}</p>
        </div>
      </div>

      <hr className="divider" />

      <div className="review-3col">
        <div>
          <h3 className="review-col-title">Owner Details</h3>
          <p>Owner : {vendorDetails.ownerName}</p>
          <p>Contact : +91 {vendorDetails.ownerContact}</p>
          <p>Email : {vendorDetails.ownerEmail}</p>
        </div>
        <div>
          <h3 className="review-col-title">Bank Details</h3>
          <p>Bank Name : {vendorDetails.bankName}</p>
          <p>Account Holder Name : {vendorDetails.accountHolderName}</p>
          <p>Bank Account Number : {maskAccount(vendorDetails.bankAccountNumber)}</p>
          <p>Bank IFSC Code : {maskAccount(vendorDetails.bankIfsc)}</p>
        </div>
        <div>
          <h3 className="review-col-title">Documents</h3>
          {storeDetails.bizRegDocName && (
            <span className="doc-chip">{storeDetails.bizRegDocName}</span>
          )}
          {vendorDetails.ownerGovIdName && (
            <span className="doc-chip">{vendorDetails.ownerGovIdName}</span>
          )}
        </div>
      </div>

      <hr className="divider" />

      <h2 className="section-title">Products</h2>
      <div className="vendor-product-list">
        {products.map((p) => (
          <div className="vendor-product-card" key={p.tempId}>
            <div className="vendor-product-media">
              <span
                className="vendor-product-main-img"
                style={p.images[0] ? { backgroundImage: `url(${p.images[0]})` } : undefined}
              />
              <div className="vendor-product-thumbs">
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="vendor-product-thumb"
                    style={p.images[i] ? { backgroundImage: `url(${p.images[i]})` } : undefined}
                  />
                ))}
              </div>
            </div>
            <div className="vendor-product-info">
              <div className="vendor-product-head">
                <h3>{p.name}</h3>
                <div className="vendor-product-actions">
                  <Button small variant="outline-purple" onClick={() => onEditProduct(p.tempId)}>
                    Edit
                  </Button>
                  <button
                    type="button"
                    className="btn-delete-outline"
                    onClick={() => onDeleteProduct(p.tempId)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p>Category : {p.category}</p>
              <p>Brand : {p.brand || "—"}</p>
              <p>
                Price / Unit : {p.price ? `₹${p.price}` : "—"} {p.unit && `/ ${p.unit}`}
              </p>
              <p>Availability : {Number(p.stock) > 0 ? "In Stock" : "Out of Stock"}</p>
            </div>
          </div>
        ))}
      </div>

      {error && <div className="form-banner form-banner-error">{error}</div>}

      <div className="wizard-actions">
        <Button small loading={loading} onClick={onSubmit}>
          Submit
        </Button>
      </div>
    </div>
  );
}
