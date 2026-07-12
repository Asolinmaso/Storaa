"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/Button";
import { useEscape } from "@/lib/useEscape";
import type { ProductDTO } from "@/lib/types";

function defaultVisitDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function HoldModal({
  product,
  quantity = 1,
  onClose,
  onSuccess,
}: {
  product: ProductDTO;
  quantity?: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [visitDate, setVisitDate] = useState(defaultVisitDate());
  const [visitTime, setVisitTime] = useState("18:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscape(onClose);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!visitDate || !visitTime) {
      setError("Please pick a visit date and time.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/holds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product._id,
          quantity,
          visitDate,
          visitTime,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess();
      } else {
        setError(data.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Hold product"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal form-modal">
        <div className="form-modal-head">
          <h2 className="form-modal-title">Hold Product</h2>
          <button className="form-modal-close" onClick={onClose} aria-label="Close">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <p className="form-modal-sub">
          {product.emoji} {product.name} × {quantity} — ₹{product.price * quantity}
        </p>
        <form className="form-modal-form" onSubmit={handleSubmit}>
          {error && <div className="form-banner form-banner-error">{error}</div>}
          <div className="form-grid-2">
            <div className="form-field">
              <label htmlFor="visitDate">Visit Date</label>
              <input
                id="visitDate"
                type="date"
                value={visitDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setVisitDate(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label htmlFor="visitTime">Visit Time</label>
              <input
                id="visitTime"
                type="time"
                value={visitTime}
                onChange={(e) => setVisitTime(e.target.value)}
              />
            </div>
          </div>
          <div className="form-modal-actions">
            <Button type="submit" small loading={loading}>
              Confirm Hold
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
