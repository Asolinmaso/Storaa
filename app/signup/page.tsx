"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";
import TextField from "@/components/TextField";
import Button from "@/components/Button";
import GoogleButton from "@/components/GoogleButton";
import Modal from "@/components/Modal";
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
} from "@/lib/validation";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showExistsModal, setShowExistsModal] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmError = validateConfirmPassword(password, confirmPassword);
    setErrors({
      email: emailError ?? undefined,
      password: passwordError ?? undefined,
      confirmPassword: confirmError ?? undefined,
    });
    if (emailError || passwordError || confirmError) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, confirmPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        router.push("/select-role");
        router.refresh();
        return;
      }

      if (data.code === "ACCOUNT_EXISTS") setShowExistsModal(true);
      else setFormError(data.message ?? "Something went wrong. Please try again.");
    } catch {
      setFormError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      heading="Turn Local Into Opportunity"
      text="Whether you're looking for something, offering something, or delivering it — this is where local connections become real actions."
    >
      <h1 className="auth-title">Get Started!</h1>
      <p className="auth-subtitle">
        Already have an account? <Link href="/login">Login here.</Link>
      </p>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError && <div className="form-banner form-banner-error">{formError}</div>}

        <TextField
          id="email"
          type="email"
          placeholder="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <TextField
          id="password"
          type="password"
          placeholder="Password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <TextField
          id="confirmPassword"
          type="password"
          placeholder="Confirm Password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
        />

        <Button type="submit" loading={loading}>
          Create Account
        </Button>
        <GoogleButton label="Sign Up With Google" />
      </form>

      <div className="auth-legal">
        <Link href="/privacy-policy">Privacy Policy</Link>
        <Link href="/terms">Terms &amp; Conditions</Link>
      </div>

      <Modal
        open={showExistsModal}
        title="Account Already Found"
        text="An account with this email address already exists. Please log in to continue"
        onClose={() => setShowExistsModal(false)}
        actions={
          <>
            <Button
              variant="outline-purple"
              small
              onClick={() => router.push("/forgot-password")}
            >
              Forgot Password
            </Button>
            <Button small onClick={() => router.push("/login")}>
              Log In
            </Button>
          </>
        }
      />
    </AuthLayout>
  );
}
