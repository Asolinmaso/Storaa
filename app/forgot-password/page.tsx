"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TextField from "@/components/TextField";
import Button from "@/components/Button";
import { validateEmail } from "@/lib/validation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    const emailError = validateEmail(email);
    setError(emailError);
    if (emailError) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        setTimeout(() => {
          router.push(`/reset-password?email=${encodeURIComponent(email)}`);
        }, 1200);
      } else {
        setFormError(data.message ?? "Something went wrong. Please try again.");
      }
    } catch {
      setFormError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="center-page">
      <div className="card">
        <h1 className="card-title">Forgot Password?</h1>
        <p className="card-text">
          No worries! Enter your registered email address we will send you a code
          to reset password.
        </p>

        <form className="card-form" onSubmit={handleSubmit} noValidate>
          {formError && <div className="form-banner form-banner-error">{formError}</div>}
          {success && <div className="form-banner form-banner-success">{success}</div>}

          <TextField
            id="email"
            type="email"
            boxed
            label="Email Address"
            placeholder="Enter your registered email address"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
          />

          <Button type="submit" loading={loading}>
            Send Reset Code
          </Button>
        </form>

        <p className="card-footer">
          Remembered your password? <Link href="/login">Sign In here</Link>
        </p>
      </div>
    </div>
  );
}
