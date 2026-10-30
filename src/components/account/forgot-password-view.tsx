"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Container } from "@/components/ui/container";
import { useAuth } from "@/context/auth-context";

export function ForgotPasswordView() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await resetPassword(trimmedEmail);
      if (res.error) {
        const errorCode =
          "code" in res.error && typeof res.error.code === "string"
            ? res.error.code
            : "";
        if (errorCode === "over_email_send_rate_limit") {
          setGeneralError(
            "Too many requests. Please wait a moment and try again.",
          );
        } else {
          setGeneralError("Something went wrong. Please try again.");
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
              Reset Password
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Enter your registered email address and we will send you a link to
              reset your password.
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
                    Check your email
                  </h2>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    If an account exists with{" "}
                    <strong className="text-[var(--text-strong)] font-semibold">
                      {email}
                    </strong>
                    , you will receive a password reset link shortly. Please
                    check your spam folder if it doesn&apos;t arrive in a few
                    minutes.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/account/sign-in"
                    className="button-primary w-full text-center py-3.5 text-base"
                  >
                    Return to Sign In
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {generalError ? (
                  <div
                    role="alert"
                    className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] p-4 text-sm font-bold text-[var(--danger)]"
                  >
                    {generalError}
                  </div>
                ) : null}

                <div>
                  <label
                    htmlFor="forgot-email"
                    className="block text-sm font-bold text-[var(--text-strong)]"
                  >
                    Email address{" "}
                    <span className="text-[var(--danger)]" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    aria-invalid={!!error}
                    aria-describedby={error ? "forgot-email-error" : undefined}
                    placeholder="e.g. maria@example.com"
                    className="mt-2 block w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-input)] min-h-12 px-4 py-3 text-base text-[var(--text-strong)] placeholder-[var(--text-subtle)] aria-[invalid=true]:border-[var(--danger)] focus:border-[var(--accent-solid)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-solid)]"
                  />
                  {error ? (
                    <p
                      id="forgot-email-error"
                      role="alert"
                      className="mt-1.5 text-sm font-bold text-[var(--danger)]"
                    >
                      {error}
                    </p>
                  ) : null}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="button-primary w-full text-center py-3.5 text-base disabled:opacity-50"
                  >
                    {isSubmitting ? "Sending link…" : "Send Reset Link"}
                  </button>
                </div>

                <div className="pt-4 text-center text-sm text-[var(--text-muted)] border-t border-[var(--border-soft)]">
                  Remember your password?{" "}
                  <Link
                    href="/account/sign-in"
                    className="font-bold text-[var(--accent-solid)] hover:underline"
                  >
                    Back to Sign In
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
