"use client";

import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "outline-purple";
  small?: boolean;
  loading?: boolean;
}

export default function Button({
  variant = "primary",
  small = false,
  loading = false,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const variantClass =
    variant === "primary"
      ? "btn-primary"
      : variant === "outline"
        ? "btn-outline"
        : "btn-outline-purple";

  return (
    <button
      className={`btn ${variantClass}${small ? " btn-sm" : ""}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
