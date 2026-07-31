"use client";

import { useState } from "react";

type TicketStatus = "Pending" | "In progress" | "Resolved";

type Ticket = {
  id: number;
  raisedBy: string;
  type: "Customer" | "Store";
  subject: string;
  category: string;
  status: TicketStatus;
  date: string;
  contact: string;
  email: string;
  message: string;
};

const TICKETS: Ticket[] = [
  { id: 1, raisedBy: "Rohan Sharma", type: "Customer", subject: "Payment Failed but Amount deducted", category: "Payment", status: "Pending", date: "20 May, 2026", contact: "8967456789", email: "rohan@gmail.com", message: "I am facing an issue while trying to make a payment. The amount got deducted from my account but the order was not placed. Kindly help resolve this as soon as possible." },
  { id: 2, raisedBy: "Riya Mehta", type: "Store", subject: "Account details are not updating", category: "Account", status: "Pending", date: "20 May, 2026", contact: "9812345678", email: "riya@gmail.com", message: "I updated my store account details but the changes are not reflecting on the dashboard even after multiple attempts. Please help resolve this." },
  { id: 3, raisedBy: "Rah Shamani", type: "Customer", subject: "Product not getting freeze", category: "Product", status: "In progress", date: "20 May, 2026", contact: "8967456789", email: "rah@gmail.com", message: "I am facing an issue while trying to hold a product in the store. The hold does not get applied even after multiple attempts. Kindly help resolve this as soon as possible." },
  { id: 4, raisedBy: "Rah Shamani", type: "Store", subject: "Payment Failed but Amount deducted", category: "Payment", status: "In progress", date: "20 May, 2026", contact: "8967456789", email: "rah@gmail.com", message: "A customer's payment failed but the amount was deducted from their account. The order does not reflect on my store dashboard. Please help resolve this." },
  { id: 5, raisedBy: "Rah Shamani", type: "Customer", subject: "Account details are not updating", category: "Account", status: "Resolved", date: "20 May, 2026", contact: "8967456789", email: "rah@gmail.com", message: "I updated my account details but the changes are not reflecting even after multiple attempts. Please help resolve this." },
  { id: 6, raisedBy: "Rah Shamani", type: "Store", subject: "Product not getting freeze", category: "Product", status: "Resolved", date: "20 May, 2026", contact: "8967456789", email: "rah@gmail.com", message: "I am facing an issue while trying to hold a product in the store. The hold does not get applied even after multiple attempts. Kindly help resolve this as soon as possible." },
];

const STATUS_OPTIONS: TicketStatus[] = ["Pending", "In progress", "Resolved"];

function TicketIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a2 2 0 0 0-2-2V8a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2a2 2 0 0 0 0-4Z" /><path d="M10 8v8" strokeDasharray="2 2" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ticketStatusClass(status: TicketStatus) {
  if (status === "Pending") return "admin-status-badge admin-status-blocked";
  if (status === "In progress") return "admin-status-badge admin-status-ticket-progress";
  return "admin-status-badge admin-status-active";
}

export default function HelpSupportPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [date, setDate] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [draftStatus, setDraftStatus] = useState<TicketStatus>("Pending");
  const [adminNotes, setAdminNotes] = useState("");
  const [responseMessage, setResponseMessage] = useState("");

  const filtered = TICKETS.filter(t => {
    const matchSearch = search === "" || t.raisedBy.toLowerCase().includes(search.toLowerCase());
    const matchStatus = status === "All" || t.status === status;
    const matchDate = date === "" || t.date === formatFilterDate(date);
    return matchSearch && matchStatus && matchDate;
  });

  const selectedTicket = TICKETS.find(t => t.id === selectedTicketId) ?? null;

  function openTicket(t: Ticket) {
    setSelectedTicketId(t.id);
    setDraftStatus(t.status);
    setAdminNotes("");
    setResponseMessage("");
  }

  function closeTicket() {
    setSelectedTicketId(null);
  }

  return (
    <div>
      {/* Stat cards */}
      <div className="admin-stats-grid" style={{ marginBottom: "2rem" }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><TicketIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Total Tickets</span>
            <span className="admin-stat-value">12,345</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><TicketIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">In Progress Tickets</span>
            <span className="admin-stat-value">1,245</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrapper"><TicketIcon /></div>
          <div className="admin-stat-info">
            <span className="admin-stat-label">Resolved Tickets</span>
            <span className="admin-stat-value">1,245</span>
          </div>
        </div>
      </div>

      <hr className="admin-divider" style={{ marginTop: 0 }} />

      {/* Filters */}
      <div className="admin-filters">
        <div className="admin-filter-group">
          <label className="admin-filter-label">Search user</label>
          <input type="text" className="admin-filter-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="admin-filter-group">
          <label className="admin-filter-label">Filter By Status</label>
          <div className="admin-filter-select-wrap">
            <select className="admin-filter-select" value={status} onChange={e => setStatus(e.target.value)}>
              <option>All</option>
              <option>Pending</option>
              <option>In progress</option>
              <option>Resolved</option>
            </select>
          </div>
        </div>
        <div className="admin-filter-group">
          <label className="admin-filter-label">Filter By Date</label>
          <div className="admin-filter-input-wrap">
            <input type="date" className="admin-filter-input" value={date} onChange={e => setDate(e.target.value)} />
            <span className="admin-filter-icon"><CalendarIcon /></span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-card">
        <table className="admin-table">
          <thead>
            <tr className="admin-table-head">
              <th>Raised By</th>
              <th>Type</th>
              <th>Subject</th>
              <th>Category</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id} className="admin-table-row">
                <td>{t.raisedBy}</td>
                <td>{t.type}</td>
                <td>{t.subject}</td>
                <td>{t.category}</td>
                <td><span className={ticketStatusClass(t.status)}>{t.status}</span></td>
                <td>{t.date}</td>
                <td>
                  <button className="admin-view-btn" onClick={() => openTicket(t)}>View Details</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr className="admin-table-row">
                <td colSpan={7} style={{ textAlign: "center", padding: "2rem" }}>No tickets found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selectedTicket && (
        <div className="hold-modal-overlay" onClick={closeTicket}>
          <div className="hold-modal" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="hold-modal-header">
              <h2 className="hold-modal-title">Help Ticket Details</h2>
              <button className="hold-modal-close" onClick={closeTicket}>
                <CloseIcon />
              </button>
            </div>

            <hr className="hold-modal-divider" />

            {/* Ticket info */}
            <div className="hold-modal-info-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <p className="hold-modal-field">Raised By : {selectedTicket.raisedBy}</p>
                <p className="hold-modal-field">Type : {selectedTicket.type}</p>
                <p className="hold-modal-field">Contact : {selectedTicket.contact}</p>
                <p className="hold-modal-field">Email : {selectedTicket.email}</p>
              </div>
              <div>
                <p className="hold-modal-field">Category : {selectedTicket.category}</p>
                <p className="hold-modal-field">Date : {selectedTicket.date}</p>
                <p className="hold-modal-field">Status : {selectedTicket.status}</p>
              </div>
            </div>

            <hr className="hold-modal-divider" />

            {/* Message */}
            <div style={{ padding: "1.25rem 1.75rem" }}>
              <p className="hold-modal-field" style={{ marginBottom: "0.35rem" }}>Message :</p>
              <p className="hold-modal-note">{selectedTicket.message}</p>
            </div>

            {/* Set/Update Status */}
            <div className="ticket-modal-field-group">
              <p className="ticket-modal-field-label">Set/Update Status</p>
              <div className="admin-filter-select-wrap" style={{ width: "100%" }}>
                <select
                  className="admin-filter-select"
                  style={{ width: "100%" }}
                  value={draftStatus}
                  onChange={e => setDraftStatus(e.target.value as TicketStatus)}
                >
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Admin Notes */}
            <div className="ticket-modal-field-group">
              <p className="ticket-modal-field-label">Admin Notes :</p>
              <textarea
                className="ticket-modal-textarea"
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
              />
            </div>

            {/* Response Message */}
            <div className="ticket-modal-field-group">
              <p className="ticket-modal-field-label">Response Messsage to User :</p>
              <textarea
                className="ticket-modal-textarea"
                value={responseMessage}
                onChange={e => setResponseMessage(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="ticket-modal-actions">
              <button className="ticket-modal-cancel-btn" onClick={closeTicket}>Cancel</button>
              <button className="ticket-modal-update-btn" onClick={closeTicket}>Update Ticket</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatFilterDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day} ${months[month - 1]}, ${year}`;
}
