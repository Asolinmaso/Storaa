import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import Store from "@/models/Store";
import { getSession } from "@/lib/auth";

function maskAccount(v: string): string {
  return v ? "X".repeat(v.length) : "—";
}

export default async function VendorStoreDetailsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await connectDB();
  const store = await Store.findOne({ ownerId: session.userId });
  if (!store) redirect("/vendor/onboarding");

  return (
    <div className="page-stack">
      <h2 className="section-title">Store Details</h2>

      <div className="review-store-row">
        {store.storePhotoUrl && (
          <span
            className="review-store-img"
            style={{ backgroundImage: `url(${store.storePhotoUrl})` }}
          />
        )}
        <div className="review-store-info">
          <p>Store Name : {store.name}</p>
          <p>Category : {store.category}</p>
          <p>Address : {store.address}</p>
          <p>Store Time : {store.storeTime}</p>
          <p>Weekly Off : {store.weeklyOff}</p>
          <p>Description : {store.description}</p>
        </div>
      </div>

      <hr className="divider" />

      <div className="review-3col">
        <div>
          <h3 className="review-col-title">Owner Details</h3>
          <p>Owner : {store.owner}</p>
          <p>Contact : +91 {store.ownerContact}</p>
          <p>Email : {store.email}</p>
        </div>
        <div>
          <h3 className="review-col-title">Bank Details</h3>
          <p>Bank Name : {store.bankName}</p>
          <p>Account Holder Name : {store.accountHolderName}</p>
          <p>Bank Account Number : {maskAccount(store.bankAccountNumber)}</p>
          <p>Bank IFSC Code : {maskAccount(store.bankIfsc)}</p>
        </div>
        <div>
          <h3 className="review-col-title">Documents</h3>
          {store.bizRegDocUrl && (
            <a
              className="doc-chip doc-chip-link"
              href={store.bizRegDocUrl}
              target="_blank"
              rel="noreferrer"
            >
              {store.bizRegDocName || "Business registration document"}
            </a>
          )}
          {store.ownerGovIdUrl && (
            <a
              className="doc-chip doc-chip-link"
              href={store.ownerGovIdUrl}
              target="_blank"
              rel="noreferrer"
            >
              {store.ownerGovIdName || "Owner government ID"}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
