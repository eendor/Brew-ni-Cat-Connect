"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Container } from "@/components/ui/container";
import { useAuth } from "@/context/auth-context";

export function ResetPasswordView() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    const newErrors: Record<string, string> = {};

    if (!password) {
      newErrors.password = "New password is required.";
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
      const res = await updatePassword(password);
      if (res.error) {
        const msg = res.error.message.toLowerCase();
        if (
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
        setIsSuccess(true);
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
              Set New Password
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Choose a strong, secure password for your Brew ni Cat account.
            </p>
          </div>

          <div className="mt-8 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-[var(--shadow-subtle)]">
            {isSuccess ? (
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="font-display text-2xl text-[var(--text-strong)]">
                    Password Updated
                  </h2>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    Your password has been changed successfully. You can now
                    sign in with your new credentials.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/account/sign-in"
                    className="button-primary w-full text-center py-3.5 text-base"
                  >
                    Continue to Sign In
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
                    htmlFor="reset-new-password"
                    className="block text-sm font-bold text-[var(--text-strong)]"
                  >
                    New Password{" "}
                    <span className="text-[var(--danger)]" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="reset-new-password"
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
                      errors.password ? "reset-password-error" : undefined
                    }
                    placeholder="At least 6 characters"
                    className="mt-2 block w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-input)] min-h-12 px-4 py-3 text-base text-[var(--text-strong)] placeholder-[var(--text-subtle)] aria-[invalid=true]:border-[var(--danger)] focus:border-[var(--accent-solid)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-solid)]"
                  />
                  {errors.password ? (
                    <p
                      id="reset-password-error"
                      role="alert"
                      className="mt-1.5 text-sm font-bold text-[var(--danger)]"
                    >
                      {errors.password}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="reset-confirm-password"
                    className="block text-sm font-bold text-[var(--text-strong)]"
                  >
                    Confirm New Password{" "}
                    <span className="text-[var(--danger)]" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="reset-confirm-password"
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
                        ? "reset-confirm-password-error"
                        : undefined
                    }
                    placeholder="Re-type your new password"
                    className="mt-2 block w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-input)] min-h-12 px-4 py-3 text-base text-[var(--text-strong)] placeholder-[var(--text-subtle)] aria-[invalid=true]:border-[var(--danger)] focus:border-[var(--accent-solid)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-solid)]"
                  />
                  {errors.confirmPassword ? (
                    <p
                      id="reset-confirm-password-error"
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
                    {isSubmitting ? "Updating password…" : "Update Password"}
                  </button>
                </div>

                <div className="pt-4 text-center text-sm text-[var(--text-muted)] border-t border-[var(--border-soft)]">
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
