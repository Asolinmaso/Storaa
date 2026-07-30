"use client";

import React from "react";

function UsersIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  );
}

function StoreIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  );
}

function ProductsIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
  );
}

function BagIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
  );
}

function WalletIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" /><path d="M4 6v12c0 1.1.9 2 2 2h14v-4" /><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" /></svg>
  );
}

function HelpIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
  );
}

function ChevronRight() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
  );
}

export default function AdminDashboardPage() {
  return (
    <div>
      <div className="admin-header">
        <h2 className="admin-welcome">Welcome Back Admin!</h2>
        <p className="admin-subtitle">Here’s what happening on your platform today.</p>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper">
            <UsersIcon />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Users</span>
            <span className="admin-stat-value">12,345</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper">
            <StoreIcon />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Stores</span>
            <span className="admin-stat-value">1,245</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper">
            <ProductsIcon />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Products</span>
            <span className="admin-stat-value">18,345</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper">
            <BagIcon />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Reservations</span>
            <span className="admin-stat-value">8,965</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper">
            <WalletIcon />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Revenue</span>
            <span className="admin-stat-value">₹ 8,965</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper">
            <HelpIcon />
          </div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Tickets</span>
            <span className="admin-stat-value">65</span>
          </div>
        </div>
      </div>

      <div className="admin-divider" />

      <div className="admin-quick-actions">
        <h3 className="admin-section-title">Quick Actions</h3>
        
        <div className="admin-action-grid">
          <div className="admin-action-card">
            <div className="admin-stat-icon-wrapper">
              <StoreIcon />
            </div>
            <div className="admin-action-info">
              <span className="admin-action-label">Store Approvals</span>
              <span className="admin-action-value">12,345</span>
            </div>
            <div className="admin-action-chevron">
              <ChevronRight />
            </div>
          </div>

          <div className="admin-action-card">
            <div className="admin-stat-icon-wrapper">
              <ProductsIcon />
            </div>
            <div className="admin-action-info">
              <span className="admin-action-label">Product Approvals</span>
              <span className="admin-action-value">12,345</span>
            </div>
            <div className="admin-action-chevron">
              <ChevronRight />
            </div>
          </div>

          <div className="admin-action-card">
            <div className="admin-stat-icon-wrapper">
              <HelpIcon />
            </div>
            <div className="admin-action-info">
              <span className="admin-action-label">Help Tickets</span>
              <span className="admin-action-value">12,345</span>
            </div>
            <div className="admin-action-chevron">
              <ChevronRight />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
