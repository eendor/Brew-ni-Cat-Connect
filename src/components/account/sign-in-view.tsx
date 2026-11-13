"use client";

import Link from "next/link";

import { GoogleSignInButton } from "@/components/account/google-sign-in-button";
import { Container } from "@/components/ui/container";
import { PRIVACY_POLICY_PATH } from "@/config/privacy";
import { useAuth } from "@/context/auth-context";

export { safeReturnTo } from "@/lib/auth/safe-return-to";

export type AuthMode = "sign-in" | "sign-up";

const COPY: Record<
  AuthMode,
  {
    title: string;
    intro: string;
    button: string;
    switchText: string;
    switchLink: string;
    switchHref: string;
  }
> = {
  "sign-in": {
    title: "Sign In",
    intro: "Welcome back! Sign in with your Google account.",
    button: "Sign in with Google",
    switchText: "New to Brew ni Cat?",
    switchLink: "Create an account",
    switchHref: "/account/sign-up",
  },
  "sign-up": {
    title: "Create an Account",
    intro:
      "Join Brew ni Cat with your Google account. There's no password to remember.",
    button: "Sign up with Google",
    switchText: "Already have an account?",
    switchLink: "Sign in",
    switchHref: "/account/sign-in",
  },
};

/** Sign-in and sign-up both use Google (ADR-030); only the wording differs. */
export function GoogleAuthView({ mode }: { mode: AuthMode }) {
  const { user, isLoading } = useAuth();
  const copy = COPY[mode];

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
              {copy.title}
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {copy.intro}
            </p>
          </div>

          <div className="ios-card mt-8 space-y-5 p-6 sm:p-8">
            <GoogleSignInButton label={copy.button} />
            <p className="text-center text-xs leading-5 text-[var(--text-muted)]">
              We get your name and email from Google to sign you in and to reach
              you about your account. Read our{" "}
              <Link
                href={PRIVACY_POLICY_PATH}
                className="font-semibold text-[var(--accent-solid)] underline underline-offset-4"
              >
                Privacy Policy
              </Link>
              .
            </p>
            <div className="border-t border-[var(--separator)] pt-4 text-center text-sm text-[var(--text-muted)]">
              {copy.switchText}{" "}
              <Link
                href={copy.switchHref}
                className="font-semibold text-[var(--accent-solid)] hover:underline"
              >
                {copy.switchLink}
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

export function SignInView() {
  return <GoogleAuthView mode="sign-in" />;
}
