"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";
import type { UserRole } from "@/models/User";

function CustomerIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function VendorIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      <path d="M5 12v8h14v-8" />
      <path d="M9 20v-5h6v5" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg className="role-chevron" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function SelectRolePage() {
  const router = useRouter();
  const [loadingRole, setLoadingRole] = useState<UserRole | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function chooseRole(role: UserRole) {
    setFormError(null);
    setLoadingRole(role);
    try {
      const res = await fetch("/api/auth/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();

      if (res.ok) {
        router.push(role === "customer" ? "/home" : "/vendor");
        router.refresh();
        return;
      }
      setFormError(data.message ?? "Something went wrong. Please try again.");
    } catch {
      setFormError("Unable to reach the server. Please try again.");
    } finally {
      setLoadingRole(null);
    }
  }

  return (
    <AuthLayout
      heading="Welcome! Let's Get You Started"
      text="Select the role that best represents how you want to interact within the platform. Each role unlocks a different experience designed to match your needs and goals. Once selected, your interface and features will be tailored accordingly."
    >
      <h1 className="auth-title">Select Your Role</h1>
      <p className="auth-subtitle">
        Your experience will be personalized based on the role you choose.
      </p>

      {formError && (
        <div className="form-banner form-banner-error" style={{ marginTop: "1.5rem" }}>
          {formError}
        </div>
      )}

      <div className="role-list">
        <button
          type="button"
          className="role-card"
          onClick={() => chooseRole("customer")}
          disabled={loadingRole !== null}
        >
          <span className="role-icon">
            <CustomerIcon />
          </span>
          <span className="role-body">
            <span className="role-name">Customer</span>
            <span className="role-desc" style={{ display: "block" }}>
              Browse products, place orders, and shop from local stores.
            </span>
          </span>
          <Chevron />
        </button>

        <button
          type="button"
          className="role-card"
          onClick={() => chooseRole("vendor")}
          disabled={loadingRole !== null}
        >
          <span className="role-icon">
            <VendorIcon />
          </span>
          <span className="role-body">
            <span className="role-name">Vendor</span>
            <span className="role-desc" style={{ display: "block" }}>
              Manage your store, list products, and grow your business.
            </span>
          </span>
          <Chevron />
        </button>
      </div>
    </AuthLayout>
  );
}
