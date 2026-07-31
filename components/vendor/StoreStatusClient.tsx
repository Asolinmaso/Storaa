"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type StoreStatus = "under_review" | "approved" | "rejected";

interface StoreData {
  _id: string;
  name: string;
  status: StoreStatus;
  rejectionReason: string;
}

const POLL_INTERVAL_MS = 10_000;

const WHATS_NEXT = [
  "Start selling products on Storaa",
  "Manage inventory and product listings",
  "Receive customer hold requests",
  "Track payouts and earnings",
  "Access store analytics and reviews",
  "Build trust through customer ratings and reviews",
  "Boost visibility through promotions",
];

function StoreIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7l1-3h14l1 3" />
      <path d="M4 7a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-5h6v5" />
    </svg>
  );
}

export default function VendorStoreStatusClient({
  initialStore,
}: {
  initialStore: StoreData | null;
}) {
  const [store, setStore] = useState<StoreData | null>(initialStore);
  const [loading, setLoading] = useState(!initialStore);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  function fetchStatus() {
    fetch("/api/vendor/store")
      .then((r) => r.json())
      .then((data) => {
        if (data.store) setStore(data.store as StoreData);
      })
      .catch(() => {/* silent – keep showing last known state */});
  }

  useEffect(() => {
    // If we have no initial store, fetch immediately
    if (!initialStore) {
      setLoading(true);
      fetch("/api/vendor/store")
        .then((r) => r.json())
        .then((data) => { if (data.store) setStore(data.store as StoreData); })
        .finally(() => setLoading(false));
    }

    // Poll only while under_review
    function startPolling() {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        fetchStatus();
      }, POLL_INTERVAL_MS);
    }

    if (!store || store.status === "under_review") {
      startPolling();
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop polling once approved or rejected
  useEffect(() => {
    if (store && store.status !== "under_review") {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [store?.status]);

  if (loading) {
    return (
      <div className="page-stack">
        <h2 className="section-title">Store Status</h2>
        <p className="muted">Loading store status…</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="page-stack">
        <h2 className="section-title">Store Status</h2>
        <p className="muted">No store found. <Link href="/vendor/onboarding" className="btn btn-primary btn-sm" style={{ marginLeft: "0.5rem" }}>Start Onboarding</Link></p>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <h2 className="section-title">Store Status</h2>

      {store.status === "approved" && (
        <div className="status-card status-card-approved">
          <span className="status-icon status-icon-approved">
            <StoreIcon />
          </span>
          <div>
            <div className="status-title-row">
              <h3 className="status-title status-title-approved">Store Approved</h3>
              <span className="status-pill status-pill-approved">Live</span>
            </div>
            <p className="status-text">
              <strong>Congratulations! Your store is live on Storaa.</strong>
            </p>
            <p className="status-text">
              Customers can now discover {store.name} and place hold requests on your products.
            </p>
          </div>
        </div>
      )}

      {store.status === "under_review" && (
        <div className="status-card status-card-review">
          <span className="status-icon status-icon-review">
            <StoreIcon />
          </span>
          <div>
            <div className="status-title-row">
              <h3 className="status-title">Store Verification In Progress</h3>
              <span className="status-pill status-pill-review">Under Review</span>
            </div>
            <p className="status-text">
              <strong>Thank you for completing your store setup.</strong>
            </p>
            <p className="status-text">
              Our team is currently reviewing your store information, uploaded documents, and product listings to ensure they meet Storaa&apos;s quality and compliance standards.
            </p>
            <p className="status-text">
              <strong>Estimated Review Time</strong>: 12–24 Hours
            </p>
            <p className="status-text">
              You will receive an email and in-app notification once the review is complete.
            </p>
            <p className="status-text" style={{ color: "#888", fontSize: "0.82rem", marginTop: "0.5rem" }}>
              This page checks for updates automatically every 10 seconds.
            </p>
          </div>
        </div>
      )}

      {store.status === "rejected" && (
        <div className="status-card status-card-rejected">
          <span className="status-icon status-icon-rejected">✕</span>
          <div>
            <h3 className="status-title status-title-rejected">
              Store Verification Rejected
            </h3>
            <p className="status-text">
              Unfortunately, your store application could not be approved at this time.
            </p>
            <p className="status-text status-reason-label">Reason For Rejection</p>
            <p className="status-text">
              {store.rejectionReason || "No reason was provided by our review team."}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
              <Link href="/vendor/onboarding" className="btn btn-primary btn-sm">
                Update &amp; Resubmit
              </Link>
              <a href="mailto:support@storaa.example.com" className="btn btn-primary btn-sm status-contact-btn">
                Contact Support
              </a>
            </div>
          </div>
        </div>
      )}

      <hr className="divider" />

      <div className="profile-panels">
        <div className="panel">
          <h2 className="section-title">What&apos;s Next?</h2>
          <p className="panel-intro">Once your store is approved:</p>
          <ul className="bullet-list">
            {WHATS_NEXT.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h2 className="section-title">Help &amp; Support</h2>
          <ul className="panel-list">
            <li>
              <div>
                <p className="panel-row-title">Contact Us</p>
                <p className="panel-row-text">Get updates about your holds &amp; visit reminders</p>
              </div>
              <span className="panel-chevron" aria-hidden="true">›</span>
            </li>
            <li>
              <div>
                <p className="panel-row-title">Report An Issue</p>
                <p className="panel-row-text">Let us know if something isn&apos;t right</p>
              </div>
              <span className="panel-chevron" aria-hidden="true">›</span>
            </li>
            <li>
              <div>
                <p className="panel-row-title">About Us</p>
                <p className="panel-row-text">Know More about Storaa</p>
              </div>
              <span className="panel-chevron" aria-hidden="true">›</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
