import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false },
};

/**
 * The cached offline page (FR-068). It has no prices, menu data, Supabase
 * calls or client JavaScript, so it can be shown from the service worker's
 * cache even when the page's own scripts were never downloaded.
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
          {/* A plain form submit reloads the current page without needing a
              client component that may not be cached yet. */}
          <form method="get" className="contents">
            <button type="submit" className="button-primary">
              Try again
            </button>
          </form>
          <Link href="/" className="button-secondary">
            Return home
          </Link>
        </div>
      </div>
    </Container>
  );
}
