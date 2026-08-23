"use client";

import Link from "next/link";

import { Container } from "@/components/ui/container";

type ErrorPageProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>;

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-[var(--border-soft)] bg-[var(--surface-card)] p-7 text-center shadow-[var(--shadow-card)] sm:p-10">
        <p className="text-sm font-bold tracking-[0.16em] text-[var(--accent-strong)] uppercase">
          Temporary interruption
        </p>
        <h1 className="font-display mt-3 text-4xl font-semibold tracking-tight text-[var(--text-strong)]">
          Something went wrong
        </h1>
        <p className="mx-auto mt-4 max-w-lg leading-7 text-[var(--text-muted)]">
          The page encountered an unexpected problem. Try it again, or return to
          the homepage.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--accent-solid)] px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--accent-solid-hover)]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-strong)] px-5 py-2 text-sm font-bold text-[var(--text-strong)] transition-colors hover:bg-[var(--surface-warm)]"
          >
            Return home
          </Link>
        </div>
      </div>
    </Container>
  );
}
