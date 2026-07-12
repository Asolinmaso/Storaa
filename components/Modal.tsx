"use client";

import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  title: string;
  text: string;
  actions: React.ReactNode;
  onClose?: () => void;
}

function WarningIcon() {
  return (
    <svg className="modal-icon" viewBox="0 0 24 24" fill="#b71414" aria-hidden="true">
      <path d="M12 2 1 21h22L12 2zm0 6.5c.55 0 1 .45 1 1V14a1 1 0 1 1-2 0V9.5c0-.55.45-1 1-1zm0 9.75a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
    </svg>
  );
}

export default function Modal({ open, title, text, actions, onClose }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="modal">
        <WarningIcon />
        <h2 className="modal-title">{title}</h2>
        <p className="modal-text">{text}</p>
        <div className="modal-actions">{actions}</div>
      </div>
    </div>
  );
}
