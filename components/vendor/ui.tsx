"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ format */

const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
export const inr = (n: number) => INR.format(n || 0).replace(/\.00$/, "");

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "never";
  const s = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.round(s / 86400)} d ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export const dateTime = (d: string | Date) =>
  new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

import { Icon } from "./icons";

export { Icon };

/* ------------------------------------------------------------- primitives */

export type Tone = "ok" | "warn" | "err" | "info" | "purple" | "neutral";

export function Badge({ tone = "neutral", dot, pulse, children }: { tone?: Tone; dot?: boolean; pulse?: boolean; children: React.ReactNode }) {
  return (
    <span className={`vd-badge${tone === "neutral" ? "" : ` vd-badge-${tone}`}`}>
      {dot && <span className={`vd-dot${pulse ? " vd-dot-pulse" : ""}`} />}
      {children}
    </span>
  );
}

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
}) {
  return (
    <label className="vd-switch">
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="vd-switch-track" />
      {label && <span>{label}</span>}
    </label>
  );
}

export function VdButton({
  variant = "default",
  small,
  loading,
  icon,
  children,
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "danger" | "ghost";
  small?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}) {
  const v = variant === "default" ? "" : ` vd-btn-${variant}`;
  return (
    <button type="button" className={`vd-btn${v}${small ? " vd-btn-sm" : ""} ${className}`} disabled={rest.disabled || loading} {...rest}>
      {loading ? <span className="spinner" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

export function Empty({ icon, title, text, action }: { icon: React.ReactNode; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="vd-empty">
      <span className="vd-empty-icon">{icon}</span>
      <h4>{title}</h4>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ h = 16, w = "100%" }: { h?: number; w?: number | string }) {
  return <span className="vd-skel" style={{ display: "block", height: h, width: w }} />;
}

function useEsc(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
}

export function Drawer({
  title,
  onClose,
  footer,
  children,
}: {
  title: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  useEsc(onClose);
  return (
    <div className="vd-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="vd-drawer" role="dialog" aria-modal="true">
        <div className="vd-drawer-head">
          <h3>{title}</h3>
          <button type="button" className="vd-btn vd-btn-ghost vd-btn-sm vd-icon-btn" onClick={onClose} aria-label="Close">
            <Icon.X size={18} />
          </button>
        </div>
        <div className="vd-drawer-body">{children}</div>
        {footer && <div className="vd-drawer-foot">{footer}</div>}
      </aside>
    </div>
  );
}

export function Dialog({ title, onClose, children, actions }: { title: string; onClose: () => void; children: React.ReactNode; actions: React.ReactNode }) {
  useEsc(onClose);
  return (
    <div className="vd-overlay" style={{ justifyContent: "center", alignItems: "center" }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="vd-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        {children}
        <div className="vd-dialog-actions">{actions}</div>
      </div>
    </div>
  );
}

/** Lightweight toast: `const { toast, node } = useToast()`; render `node` once. */
export function useToast() {
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const toast = useCallback((text: string, err = false) => {
    setMsg({ text, err });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 3200);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const node = msg ? (
    <div className={`vd-toast${msg.err ? " vd-toast-err" : ""}`} role="status">
      {msg.err ? <Icon.Alert /> : <Icon.Check />}
      {msg.text}
    </div>
  ) : null;
  return { toast, node };
}

export function CopyButton({ text, label = "Copy", className = "vd-copy" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard blocked: user can still select the text */
        }
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}

/** JSON fetch that throws the server's `message` on failure. */
export async function api<T = Record<string, unknown>>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    ...(json !== undefined ? { body: JSON.stringify(json), headers: { "Content-Type": "application/json", ...rest.headers } } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 207) {
    throw new Error((data as { message?: string }).message || "Something went wrong. Please try again.");
  }
  return data as T;
}
