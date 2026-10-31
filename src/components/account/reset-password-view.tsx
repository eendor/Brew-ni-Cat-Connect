"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Container } from "@/components/ui/container";
import { useAuth } from "@/context/auth-context";

export function ResetPasswordView() {
  const { updatePassword, isPasswordRecovery, isLoading } = useAuth();
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
        const errorCode =
          "code" in res.error && typeof res.error.code === "string"
            ? res.error.code
            : "";
        if (errorCode === "weak_password") {
          setErrors({
            password: "Password must be at least 6 characters long.",
          });
        } else {
          setGeneralError("Something went wrong. Please try again.");
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

  if (!isLoading && !isPasswordRecovery) {
    return (
      <div className="py-12 sm:py-16 lg:py-20">
        <Container>
          <div className="mx-auto max-w-md text-center">
            <p className="eyebrow">Customer Account</p>
            <h1 className="font-display mt-2 text-4xl tracking-tight text-[var(--text-strong)]">
              Invalid or Expired Link
            </h1>
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              This link is invalid or has expired.
            </p>
            <div className="mt-8">
              <Link href="/account/forgot-password" className="button-primary">
                Forgot password
              </Link>
            </div>
          </div>
        </Container>
      </div>
    );
  }

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

          <div className="ios-card mt-8 p-6 sm:p-8">
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
                    className="button-primary w-full"
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
                    className="rounded-[var(--shape-md)] border border-[var(--danger)] bg-[var(--danger-soft)] p-4 text-sm font-semibold text-[var(--danger)]"
                  >
                    {generalError}
                  </div>
                ) : null}

                <div>
                  <label
                    htmlFor="reset-new-password"
                    className="ios-label block"
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
                    className="ios-field mt-2"
                  />
                  {errors.password ? (
                    <p
                      id="reset-password-error"
                      role="alert"
                      className="mt-1.5 text-sm font-semibold text-[var(--danger)]"
                    >
                      {errors.password}
                    </p>
                  ) : null}
                </div>

                <div>
                  <label
                    htmlFor="reset-confirm-password"
                    className="ios-label block"
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
                    className="ios-field mt-2"
                  />
                  {errors.confirmPassword ? (
                    <p
                      id="reset-confirm-password-error"
                      role="alert"
                      className="mt-1.5 text-sm font-semibold text-[var(--danger)]"
                    >
                      {errors.confirmPassword}
                    </p>
                  ) : null}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="button-primary w-full disabled:opacity-50"
                  >
                    {isSubmitting ? "Updating password…" : "Update Password"}
                  </button>
                </div>

                <div className="border-t border-[var(--separator)] pt-4 text-center text-sm text-[var(--text-muted)]">
                  <Link
                    href="/account/sign-in"
                    className="font-semibold text-[var(--accent-solid)] hover:underline"
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
