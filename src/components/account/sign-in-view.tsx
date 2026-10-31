"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Container } from "@/components/ui/container";
import { useAuth } from "@/context/auth-context";

export function SignInView() {
  const { signIn, user, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGeneralError("");
    const newErrors: Record<string, string> = {};

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = "Email is required.";
    }

    if (!password) {
      newErrors.password = "Password is required.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const res = await signIn(trimmedEmail, password);
      if (res.error) {
        const errorCode =
          "code" in res.error && typeof res.error.code === "string"
            ? res.error.code
            : "";
        if (errorCode === "email_not_confirmed") {
          setGeneralError(
            "Please verify your email address before signing in. Check your inbox for the confirmation link.",
          );
        } else if (
          errorCode === "invalid_credentials" ||
          errorCode === "invalid_grant"
        ) {
          setGeneralError(
            "Incorrect email or password. Please check your credentials and try again.",
          );
        } else if (errorCode === "over_email_send_rate_limit") {
          setGeneralError(
            "Too many requests. Please wait a moment and try again.",
          );
        } else {
          setGeneralError("Something went wrong. Please try again.");
        }
      } else {
        router.push("/");
      }
    } catch {
      setGeneralError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoading && user) {
    return (
      <div className="py-12 sm:py-16 lg:py-20">
        <Container>
          <div className="mx-auto max-w-md text-center">
            <p className="eyebrow">Customer Account</p>
            <h1 className="font-display mt-2 text-4xl tracking-tight text-[var(--text-strong)]">
              You&apos;re already signed in
            </h1>
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              Signed in as{" "}
              <span className="font-semibold text-[var(--text-strong)]">
                {user.email}
              </span>
              .
            </p>
            <div className="mt-8">
              <Link href="/" className="button-primary">
                Back to Home
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
              Sign In
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Welcome back! Please enter your details to access your account.
            </p>
          </div>

          <div className="ios-card mt-8 p-6 sm:p-8">
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
                <label htmlFor="signin-email" className="ios-label block">
                  Email address{" "}
                  <span className="text-[var(--danger)]" aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  id="signin-email"
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
                    errors.email ? "signin-email-error" : undefined
                  }
                  placeholder="e.g. maria@example.com"
                  className="ios-field mt-2"
                />
                {errors.email ? (
                  <p
                    id="signin-email-error"
                    role="alert"
                    className="mt-1.5 text-sm font-semibold text-[var(--danger)]"
                  >
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="signin-password" className="ios-label block">
                    Password{" "}
                    <span className="text-[var(--danger)]" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <Link
                    href="/account/forgot-password"
                    className="text-xs font-semibold text-[var(--accent-solid)] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="signin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) {
                      setErrors((prev) => ({ ...prev, password: "" }));
                    }
                  }}
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "signin-password-error" : undefined
                  }
                  placeholder="Enter your password"
                  className="ios-field mt-2"
                />
                {errors.password ? (
                  <p
                    id="signin-password-error"
                    role="alert"
                    className="mt-1.5 text-sm font-semibold text-[var(--danger)]"
                  >
                    {errors.password}
                  </p>
                ) : null}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="button-primary w-full disabled:opacity-50"
                >
                  {isSubmitting ? "Signing in…" : "Sign In"}
                </button>
              </div>

              <div className="border-t border-[var(--separator)] pt-4 text-center text-sm text-[var(--text-muted)]">
                Don&apos;t have an account?{" "}
                <Link
                  href="/account/sign-up"
                  className="font-semibold text-[var(--accent-solid)] hover:underline"
                >
                  Create one now
                </Link>
              </div>
            </form>
          </div>
        </div>
      </Container>
    </div>
  );
}
