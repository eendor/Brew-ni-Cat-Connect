"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Container } from "@/components/ui/container";
import { useAuth } from "@/context/auth-context";

export function SignInView() {
  const { signIn } = useAuth();
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
        const msg = res.error.message.toLowerCase();
        const status =
          "status" in res.error && typeof res.error.status === "number"
            ? res.error.status
            : undefined;
        if (
          msg.includes("invalid login credentials") ||
          msg.includes("invalid credentials") ||
          msg.includes("wrong password") ||
          msg.includes("not found") ||
          status === 400
        ) {
          setGeneralError(
            "Incorrect email or password. Please check your credentials and try again.",
          );
        } else if (msg.includes("email not confirmed")) {
          setGeneralError(
            "Your email address has not been confirmed yet. Please check your inbox for the confirmation link.",
          );
        } else {
          setGeneralError(res.error.message);
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

          <div className="mt-8 rounded-3xl border border-[var(--border-soft)] bg-[var(--surface-card)] p-6 sm:p-8 shadow-[var(--shadow-subtle)]">
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
                  htmlFor="signin-email"
                  className="block text-sm font-bold text-[var(--text-strong)]"
                >
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
                  className="mt-2 block w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-input)] min-h-12 px-4 py-3 text-base text-[var(--text-strong)] placeholder-[var(--text-subtle)] aria-[invalid=true]:border-[var(--danger)] focus:border-[var(--accent-solid)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-solid)]"
                />
                {errors.email ? (
                  <p
                    id="signin-email-error"
                    role="alert"
                    className="mt-1.5 text-sm font-bold text-[var(--danger)]"
                  >
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="signin-password"
                    className="block text-sm font-bold text-[var(--text-strong)]"
                  >
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
                  className="mt-2 block w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface-input)] min-h-12 px-4 py-3 text-base text-[var(--text-strong)] placeholder-[var(--text-subtle)] aria-[invalid=true]:border-[var(--danger)] focus:border-[var(--accent-solid)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-solid)]"
                />
                {errors.password ? (
                  <p
                    id="signin-password-error"
                    role="alert"
                    className="mt-1.5 text-sm font-bold text-[var(--danger)]"
                  >
                    {errors.password}
                  </p>
                ) : null}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="button-primary w-full text-center py-3.5 text-base disabled:opacity-50"
                >
                  {isSubmitting ? "Signing in…" : "Sign In"}
                </button>
              </div>

              <div className="pt-4 text-center text-sm text-[var(--text-muted)] border-t border-[var(--border-soft)]">
                Don&apos;t have an account?{" "}
                <Link
                  href="/account/sign-up"
                  className="font-bold text-[var(--accent-solid)] hover:underline"
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
