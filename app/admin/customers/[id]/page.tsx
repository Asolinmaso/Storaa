"use client";

import { useState } from "react";
import Link from "next/link";

const FREEZE_PRODUCTS = [
  { id: 1, name: "Amul Milk", store: "Fresh Mart", date: "20 May, 2026", rating: 4 },
  { id: 2, name: "Boat Airdopes 141", store: "City Electronics", date: "20 May, 2026", rating: 4 },
  { id: 3, name: "Whole Wheat Flour", store: "Balaji Store", date: "20 May, 2026", rating: 4 },
];

const RATINGS = [
  { id: 1, name: "Amul Milk", store: "Fresh Mart", date: "20 May, 2026", rating: 4 },
  { id: 2, name: "Boat Airdopes 141", store: "City Electronics", date: "20 May, 2026", rating: 4 },
  { id: 3, name: "Whole Wheat Flour", store: "Balaji Store", date: "20 May, 2026", rating: 4 },
];

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span className="admin-star-rating">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < rating ? "admin-star admin-star-filled" : "admin-star admin-star-empty"}>★</span>
      ))}
    </span>
  );
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<"freeze" | "ratings">("freeze");

  const rows = activeTab === "freeze" ? FREEZE_PRODUCTS : RATINGS;

  return (
    <div>
      {/* Back link */}
      <Link href="/admin/customers" className="admin-back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back To Customers
      </Link>

      {/* Profile card */}
      <div className="admin-profile-card">
        <div className="admin-profile-header">
          <h2 className="admin-profile-title">Profile Details</h2>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="admin-view-btn">View Profile</button>
            <button className="admin-block-btn">Block User</button>
          </div>
        </div>
        <div className="admin-profile-grid">
          <div className="admin-profile-col">
            <p className="admin-profile-field">Name : Asolin Maso</p>
            <p className="admin-profile-field">Contact : +91 7378453784</p>
            <p className="admin-profile-field">E-mail : asolin@gmail.com</p>
            <p className="admin-profile-field">Location : Chennai</p>
          </div>
          <div className="admin-profile-col">
            <p className="admin-profile-field">Account Status : Active</p>
            <p className="admin-profile-field">Joined On : Jul 20, 2025</p>
            <p className="admin-profile-field">Last Login : 19 May, 2026, 6.06 PM</p>
          </div>
        </div>
      </div>

      <hr className="admin-divider" />

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab${activeTab === "freeze" ? " admin-tab-active" : ""}`}
          onClick={() => setActiveTab("freeze")}
        >
          Freeze Products (03)
        </button>
        <button
          className={`admin-tab${activeTab === "ratings" ? " admin-tab-active" : ""}`}
          onClick={() => setActiveTab("ratings")}
        >
          Ratings (03)
        </button>
      </div>

      {/* Table */}
      <div className="admin-table-card" style={{ marginTop: "1rem" }}>
        <table className="admin-table">
          <thead>
            <tr className="admin-table-head">
              <th>Product Name</th>
              <th>Store</th>
              <th>Date</th>
              <th>Ratings</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="admin-table-row">
                <td>{r.name}</td>
                <td>{r.store}</td>
                <td>{r.date}</td>
                <td><StarRating rating={r.rating} /></td>
                <td>
                  <Link href="#" className="admin-view-btn">View Store</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
