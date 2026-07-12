"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import TextField from "@/components/TextField";
import Button from "@/components/Button";
import { validateEmail, validatePassword } from "@/lib/validation";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    code?: string;
    newPassword?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);

    const emailError = validateEmail(email);
    const codeError = code.trim() ? null : "Reset code is required.";
    const passwordError = validatePassword(newPassword);
    setErrors({
      email: emailError ?? undefined,
      code: codeError ?? undefined,
      newPassword: passwordError ?? undefined,
    });
    if (emailError || codeError || passwordError) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        setTimeout(() => router.push("/login"), 1500);
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
        <h1 className="card-title">Reset Password</h1>
        <p className="card-text">
          Enter the code we sent to your email along with your new password.
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
            error={errors.email}
          />
          <TextField
            id="code"
            type="text"
            boxed
            label="Reset Code"
            placeholder="Enter the 6-digit code"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={errors.code}
          />
          <TextField
            id="newPassword"
            type="password"
            boxed
            label="New Password"
            placeholder="Enter your new password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={errors.newPassword}
          />

          <Button type="submit" loading={loading}>
            Reset Password
          </Button>
        </form>

        <p className="card-footer">
          Remembered your password? <Link href="/login">Sign In here</Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
