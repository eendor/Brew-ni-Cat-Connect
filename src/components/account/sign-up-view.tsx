"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Container } from "@/components/ui/container";
import { useAuth } from "@/context/auth-context";

export function SignUpView() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    const newErrors: Record<string, string> = {};

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long.";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const res = await signUp(trimmedEmail, password);
      if (res.error) {
        const msg = res.error.message.toLowerCase();
        const status =
          "status" in res.error && typeof res.error.status === "number"
            ? res.error.status
            : undefined;
        if (
          msg.includes("already registered") ||
          msg.includes("already in use") ||
          msg.includes("unique constraint") ||
          status === 422
        ) {
          setGeneralError(
            "This email is already in use. Please sign in instead or reset your password.",
          );
        } else if (
          msg.includes("weak") ||
          msg.includes("least 6") ||
          msg.includes("short")
        ) {
          setErrors({
            password: "Password must be at least 6 characters long.",
          });
        } else {
          setGeneralError(res.error.message);
        }
      } else {
        setIsSubmitted(true);
      }
    } catch {
      setGeneralError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-12 sm:py-16 lg:py-20">
      <Container>
        <div className="mx-auto max-w-md">
          <div className="text-center">
            <p className="eyebrow">Customer Account</p>
            <h1 className="font-display mt-2 text-4xl sm:text-5xl tracking-tight text-[var(--text-strong)]">
              Create an Account
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Register for a Brew ni Cat customer account to manage your orders.
            </p>
          </div>

          <div className="mt-8 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-[var(--shadow-subtle)]">
            {isSubmitted ? (
              <div className="space-y-6 text-center" role="status">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-solid)]">
                  <svg
                    className="size-7"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="font-display text-2xl text-[var(--text-strong)]">
                    Confirm your email
                  </h2>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    We have sent a confirmation email to{" "}
                    <strong className="text-[var(--text-strong)] font-semibold">
                      {email}
                    </strong>
                    . Please click the link inside to verify your account before
                    signing in.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/account/sign-in"
                    className="button-primary w-full text-center py-3.5 text-base"
                  >
                    Proceed to Sign In
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {generalError ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-[var(--danger)] bg-[rgb(255_133_119_/_10%)] p-4 text-sm font-bold text-[var(--danger)]"
                  >
                    {generalError}
                  </div>
                ) : null}

                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-sm font-bold text-[var(--text-strong)]"
                  >
                    Email address{" "}
                    <span className="text-[var(--danger)]" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) {
                        setErrors((prev) => ({ ...prev, email: "" }));
                      }
                    }}
                    aria-invalid={!!errors.email}
                    aria-describedby={
                      errors.email ? "signup-email-error" : undefined
                    }
                    placeholder="e.g. maria@example.com"
                    className="mt-2 block w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-input)] min-h-12 px-4 py-3 text-base text-[var(--text-strong)] placeholder-[var(--text-subtle)] aria-[invalid=true]:border-[var(--danger)] focus:border-[var(--accent-solid)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-solid)]"
                  />
                  {errors.email ? (
                    <p
                      id="signup-email-error"
                      role="alert"
                      className="mt-1.5 text-sm font-bold text-[var(--danger)]"
                    >
                      {errors.email}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-sm font-bold text-[var(--text-strong)]"
                  >
                    Password{" "}
                    <span className="text-[var(--danger)]" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) {
                        setErrors((prev) => ({ ...prev, password: "" }));
                      }
                    }}
                    aria-invalid={!!errors.password}
                    aria-describedby={
                      errors.password ? "signup-password-error" : undefined
                    }
                    placeholder="At least 6 characters"
                    className="mt-2 block w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-input)] min-h-12 px-4 py-3 text-base text-[var(--text-strong)] placeholder-[var(--text-subtle)] aria-[invalid=true]:border-[var(--danger)] focus:border-[var(--accent-solid)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-solid)]"
                  />
                  {errors.password ? (
                    <p
                      id="signup-password-error"
                      role="alert"
                      className="mt-1.5 text-sm font-bold text-[var(--danger)]"
                    >
                      {errors.password}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="signup-confirm-password"
                    className="block text-sm font-bold text-[var(--text-strong)]"
                  >
                    Confirm Password{" "}
                    <span className="text-[var(--danger)]" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="signup-confirm-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) {
                        setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                      }
                    }}
                    aria-invalid={!!errors.confirmPassword}
                    aria-describedby={
                      errors.confirmPassword
                        ? "signup-confirm-error"
                        : undefined
                    }
                    placeholder="Re-type your password"
                    className="mt-2 block w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-input)] min-h-12 px-4 py-3 text-base text-[var(--text-strong)] placeholder-[var(--text-subtle)] aria-[invalid=true]:border-[var(--danger)] focus:border-[var(--accent-solid)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-solid)]"
                  />
                  {errors.confirmPassword ? (
                    <p
                      id="signup-confirm-error"
                      role="alert"
                      className="mt-1.5 text-sm font-bold text-[var(--danger)]"
                    >
                      {errors.confirmPassword}
                    </p>
                  ) : null}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="button-primary w-full text-center py-3.5 text-base disabled:opacity-50"
                  >
                    {isSubmitting ? "Creating account…" : "Create Account"}
                  </button>
                </div>

                <div className="pt-4 text-center text-sm text-[var(--text-muted)] border-t border-[var(--border-soft)]">
                  Already have an account?{" "}
                  <Link
                    href="/account/sign-in"
                    className="font-bold text-[var(--accent-solid)] hover:underline"
                  >
                    Sign in
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
