"use client";

import { useState } from "react";
import Link from "next/link";

const PRODUCTS = [
  { id: 1, name: "Amul Milk", stock: "50 L", addedDate: "20 May, 2026", price: "₹62 / Ltr", holdRequests: 24 },
  { id: 2, name: "Basamati Rice", stock: "50 Kg", addedDate: "20 May, 2026", price: "₹42 / Kg", holdRequests: 1 },
  { id: 3, name: "Whole Wheat Flour", stock: "75 Kg", addedDate: "20 May, 2026", price: "₹100 / Kg", holdRequests: 0 },
];

const REVIEWS = [
  { id: 1, customerName: "Rohan Sharma", review: "Great quality products and good experience.", rating: 4.5, date: "20 May, 2026" },
  { id: 2, customerName: "Riya Mehta", review: "Great quality products and good experience.", rating: 4.5, date: "20 May, 2026" },
  { id: 3, customerName: "Rah Shamani", review: "Great quality products and good experience.", rating: 4.5, date: "20 May, 2026" },
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

export default function StoreDetailPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState<"products" | "reviews">("products");

  return (
    <div>
      {/* Back link */}
      <Link href="/admin/stores" className="admin-back-link">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back To Stores & Vendors
      </Link>

      {/* Store & Vendor Details card */}
      <div className="admin-profile-card" style={{ borderRadius: "24px", boxShadow: "0px 0px 4px rgba(0,0,0,0.25)", border: "none" }}>
        <div className="admin-profile-header">
          <h2 className="admin-profile-title" style={{ fontSize: "1.5rem" }}>Srore & Vendor Details</h2>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="admin-view-btn" style={{ fontSize: "1rem", padding: "0.65rem 1.25rem" }}>View Store</button>
            <button className="admin-block-btn" style={{ fontSize: "1rem", padding: "0.65rem 1.25rem" }}>Block Store</button>
          </div>
        </div>
        <hr style={{ border: "none", borderTop: "1px solid #D9D9D9", margin: "0 -1.5rem 1.25rem" }} />
        <div className="admin-profile-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="admin-profile-col">
            <p className="admin-profile-field">Store Name : Fresh Mart</p>
            <p className="admin-profile-field">Contact : +91 7378453784</p>
            <p className="admin-profile-field">E-mail : freshmart@gmail.com</p>
            <p className="admin-profile-field">Location : Chennai</p>
          </div>
          <div className="admin-profile-col">
            <p className="admin-profile-field">Vendor Name : Rohan Mehta</p>
            <p className="admin-profile-field">Store Category : Grocery</p>
            <p className="admin-profile-field">Verification : Verified</p>
            <p className="admin-profile-field">Store Timing : 7 AM - 8 PM</p>
          </div>
          <div className="admin-profile-col">
            <p className="admin-profile-field">Products Listed : 25</p>
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
          className={`admin-tab${activeTab === "products" ? " admin-tab-active" : ""}`}
          onClick={() => setActiveTab("products")}
        >
          Products (03)
        </button>
        <button
          className={`admin-tab${activeTab === "reviews" ? " admin-tab-active" : ""}`}
          onClick={() => setActiveTab("reviews")}
        >
          Reviews (03)
        </button>
      </div>

      {/* Products tab */}
      {activeTab === "products" && (
        <div className="admin-table-card" style={{ marginTop: "1rem" }}>
          <table className="admin-table">
            <thead>
              <tr className="admin-table-head">
                <th>Product Name</th>
                <th>Stock</th>
                <th>Added Date</th>
                <th>Price</th>
                <th>Hold Requests</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {PRODUCTS.map(p => (
                <tr key={p.id} className="admin-table-row">
                  <td>{p.name}</td>
                  <td>{p.stock}</td>
                  <td>{p.addedDate}</td>
                  <td>{p.price}</td>
                  <td>{String(p.holdRequests).padStart(2, "0")}</td>
                  <td><Link href="#" className="admin-view-btn">View Product</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
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
