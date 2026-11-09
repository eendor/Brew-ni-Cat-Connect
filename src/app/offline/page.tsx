"use client";

import Link from "next/link";

import { Container } from "@/components/ui/container";

/**
 * The cached offline page (FR-068). It has no prices, menu data or Supabase
 * calls, so it can be shown from the service worker's cache.
 */
export default function OfflinePage() {
  return (
    <Container className="py-16 sm:py-24">
      <div className="ios-card mx-auto max-w-2xl p-7 text-center sm:p-10">
        <p className="eyebrow">No connection</p>
        <h1 className="font-display mt-3 text-4xl text-[var(--text-strong)]">
          You&apos;re offline
        </h1>
        <p className="mx-auto mt-4 max-w-lg leading-7 text-[var(--text-muted)]">
          Check your internet connection, then try again.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="button-primary"
          >
            Try again
          </button>
          <Link href="/" className="button-secondary">
            Return home
          </Link>
        </div>
      </div>
    </Container>
  );
}
