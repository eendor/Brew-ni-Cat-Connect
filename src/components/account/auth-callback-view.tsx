"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Container } from "@/components/ui/container";
import { useAuth } from "@/context/auth-context";
import { returnToFromLocation } from "@/lib/auth/safe-return-to";

/** Google's error, from the address's query or hash, if it sent one. */
function oauthErrorFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return query.get("error") ?? hash.get("error");
}

/**
 * Where Google sends the customer back (ADR-030). The auth client swaps the
 * one-time code for the session when it starts; this page then goes on to the
 * checked `returnTo`, or says what went wrong.
 */
export function AuthCallbackView() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [oauthError] = useState(oauthErrorFromLocation);

  useEffect(() => {
    if (!oauthError && !isLoading && user) {
      router.replace(returnToFromLocation());
    }
  }, [oauthError, isLoading, user, router]);

  const failed = oauthError !== null || (!isLoading && !user);

  return (
    <div className="py-12 sm:py-16 lg:py-20">
      <Container>
        <div className="mx-auto max-w-md text-center">
          <p className="eyebrow">Customer Account</p>
          {failed ? (
            <>
              <h1 className="font-display mt-2 text-4xl tracking-tight text-[var(--text-strong)]">
                Sign-in didn&apos;t finish
              </h1>
              <p role="alert" className="mt-4 text-sm text-[var(--text-muted)]">
                {oauthError === "access_denied"
                  ? "Google sign-in was cancelled. You can try again whenever you're ready."
                  : "We couldn't finish signing you in with Google. Please try again."}
              </p>
              <div className="mt-8">
                <Link href="/account/sign-in" className="button-primary">
                  Back to Sign In
                </Link>
              </div>
            </>
          ) : (
            <div role="status">
              <h1 className="font-display mt-2 text-4xl tracking-tight text-[var(--text-strong)]">
                Signing you in…
              </h1>
              <p className="mt-4 text-sm text-[var(--text-muted)]">
                Just a moment while we finish with Google.
              </p>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
