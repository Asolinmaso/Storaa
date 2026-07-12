"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/AuthLayout";
import TextField from "@/components/TextField";
import Button from "@/components/Button";
import GoogleButton from "@/components/GoogleButton";
import Modal from "@/components/Modal";
import { validateEmail } from "@/lib/validation";

type ModalKind = "not-found" | "blocked" | null;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const emailError = validateEmail(email);
    const passwordError = password ? null : "Password is required.";
    setErrors({ email: emailError ?? undefined, password: passwordError ?? undefined });
    if (emailError || passwordError) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok) {
        const dest = !data.user.role
          ? "/select-role"
          : data.user.role === "customer"
            ? "/home"
            : "/vendor";
        router.push(dest);
        router.refresh();
        return;
      }

      if (data.code === "ACCOUNT_NOT_FOUND") setModal("not-found");
      else if (data.code === "ACCOUNT_BLOCKED") setModal("blocked");
      else setFormError(data.message ?? "Something went wrong. Please try again.");
    } catch {
      setFormError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      heading="Find What You Need, Right Around You"
      text="A platform where local products, people, and possibilities come together making it easier to find, connect, and get things done around you."
    >
      <h1 className="auth-title">Welcome Back!</h1>
      <p className="auth-subtitle">
        Don&apos;t have an account? <Link href="/signup">create new account</Link>
        <br />
        It&apos;s free, takes less than a minute.
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />

        <Button type="submit" loading={loading}>
          Continue
        </Button>
        <GoogleButton label="Login With Google" />
      </form>

      <p className="auth-footer-link">
        Forgot Password <Link href="/forgot-password">Click here</Link>
      </p>

      <Modal
        open={modal === "not-found"}
        title="Account Not Found"
        text="No account is associated with this email address. Please sign up to create new account."
        onClose={() => setModal(null)}
        actions={
          <>
            <Button variant="outline-purple" small onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button small onClick={() => router.push("/signup")}>
              Sign Up
            </Button>
          </>
        }
      />
      <Modal
        open={modal === "blocked"}
        title="Account Blocked"
        text="Your account has been restricted from accessing Storaa. Please contact support for assistance."
        onClose={() => setModal(null)}
        actions={
          <Button small onClick={() => setModal(null)}>
            Contact Support
          </Button>
        }
      />
    </AuthLayout>
  );
}
