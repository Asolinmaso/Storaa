"use client";

import { useState } from "react";
import Link from "next/link";

const REVIEWS = [
  { id: 1, customerName: "Rohan Sharma", review: "Good quality milk. Always fresh.", rating: 4.5, date: "20 May, 2026" },
  { id: 2, customerName: "Riya Mehta", review: "Fresh and tasty. Will buy again.", rating: 4.5, date: "20 May, 2026" },
  { id: 3, customerName: "Rah Shamani", review: "Packaging was not good.", rating: 2.5, date: "20 May, 2026" },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="admin-star-rating">
      {[1, 2, 3, 4, 5].map(i => {
        const filled = i <= Math.floor(rating);
        const half = !filled && i === Math.ceil(rating) && rating % 1 !== 0;
        return (
          <span key={i} className={filled ? "admin-star admin-star-filled" : half ? "admin-star admin-star-half" : "admin-star admin-star-empty"}>★</span>
        );
      })}
    </span>
  );
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<"info" | "reviews">("info");

  return (
    <div>
      {/* Back link */}
      <Link href="/admin/products" className="admin-back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back To Products
      </Link>

      {/* Product Details card */}
      <div className="admin-profile-card">
        <div className="admin-profile-header">
          <h2 className="admin-profile-title">Product Details</h2>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="admin-tab" style={{ borderRadius: "8px", padding: "0.6rem 1.1rem" }}>View Store</button>
            <button className="admin-block-btn" style={{ borderRadius: "8px", padding: "0.6rem 1.1rem", fontSize: "0.9rem" }}>Reject</button>
            <button className="admin-view-btn" style={{ borderRadius: "8px", padding: "0.6rem 1.1rem", fontSize: "0.9rem", background: "#4B2080" }}>Approve</button>
          </div>
        </div>

        <div className="product-detail-body">
          {/* Image placeholder */}
          <div className="product-img-placeholder" />

          {/* Info columns */}
          <div className="product-detail-grid">
            <div className="admin-profile-col">
              <p className="admin-profile-field">Product Name : Amul Milk</p>
              <p className="admin-profile-field">Category : Dairy</p>
              <p className="admin-profile-field">Price : ₹62</p>
              <p className="admin-profile-field">Unit : 1 Litre</p>
            </div>
            <div className="admin-profile-col">
              <p className="admin-profile-field">Stock : 120</p>
              <p className="admin-profile-field">Status : Pending</p>
              <p className="admin-profile-field">Added On : 10 Feb, 2026</p>
              <p className="admin-profile-field">Last Updated : 26 May, 2026</p>
            </div>
            <div className="admin-profile-col">
              <p className="admin-profile-field">Store name : Fresh Mart</p>
              <p className="admin-profile-field">Vendor : Rohan Mehta</p>
              <p className="admin-profile-field">Contact : 8967567898</p>
              <p className="admin-profile-field">Email : rohan@gmail.com</p>
            </div>
          </div>
        </div>
      </div>

      <hr className="admin-divider" />

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab${activeTab === "info" ? " admin-tab-active" : ""}`}
          onClick={() => setActiveTab("info")}
        >
          Product Information
        </button>
        <button
          className={`admin-tab${activeTab === "reviews" ? " admin-tab-active" : ""}`}
          onClick={() => setActiveTab("reviews")}
        >
          Ratings (03)
        </button>
      </div>

      {/* Product Information tab */}
      {activeTab === "info" && (
        <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <p className="admin-profile-field">Description : Pasteurized full cream cow milk. Rich in nutrition and suitable for daily use.</p>
          <p className="admin-profile-field">Brand : Amul</p>
          <p className="admin-profile-field">Weight / Volume : 1 Litre</p>
          <p className="admin-profile-field">Packaging Type : Pouch</p>
          <p className="admin-profile-field">Shelf Life : 7 Days</p>
          <p className="admin-profile-field">Availability : In Stock</p>
          <p className="admin-profile-field">Minimum Order Quantity : 1</p>
          <p className="admin-profile-field">Returnable : No</p>
        </div>
      )}

      {/* Reviews tab */}
      {activeTab === "reviews" && (
        <div className="admin-table-card" style={{ marginTop: "1rem" }}>
          <table className="admin-table">
            <thead>
              <tr className="admin-table-head">
                <th>Customer Name</th>
                <th>Review</th>
                <th>Ratings</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {REVIEWS.map(r => (
                <tr key={r.id} className="admin-table-row">
                  <td>{r.customerName}</td>
                  <td>{r.review}</td>
                  <td><StarRating rating={r.rating} /></td>
                  <td>{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
