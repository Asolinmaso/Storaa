"use client";

import { useState } from "react";

const CATEGORIES = ["Payment", "Account", "Product", "Store", "Other"];

/** Lets a signed-in customer or vendor send a support ticket to the Storaa team. */
export default function ReportIssueModal({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState("Other");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, subject, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not send. Please try again.");
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hold-modal-overlay" onClick={onClose}>
      <div className="hold-modal" onClick={(e) => e.stopPropagation()} style={{ padding: "1.25rem 1.5rem" }}>
        <h2 className="hold-modal-title" style={{ marginBottom: "1rem" }}>Report An Issue</h2>
        {sent ? (
          <>
            <p>Thanks. Our team has received your report and will get back to you by email.</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: "1rem" }} onClick={onClose}>Close</button>
          </>
        ) : (
          <div style={{ display: "grid", gap: "0.75rem" }}>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <input placeholder="Subject" value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} />
            <textarea placeholder="Describe the problem" rows={5} value={message} maxLength={3000} onChange={(e) => setMessage(e.target.value)} />
            {error && <p style={{ color: "#c0392b" }}>{error}</p>}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-primary btn-sm" disabled={busy || !subject.trim() || !message.trim()} onClick={submit}>
                {busy ? "Sending…" : "Send"}
              </button>
              <button className="btn btn-sm" onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
